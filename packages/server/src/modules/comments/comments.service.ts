import { Injectable } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentsRepository } from './comments.repository';
import { Comment } from '@prisma/client';
import { PostsRepository } from '../posts/posts.repository';
import { AppErrorException } from '~/common/exceptions';

@Injectable()
export class CommentsService {
  constructor(
    private readonly commentRepository: CommentsRepository,
    private readonly postRepository: PostsRepository,
  ) {}

  async getComment(id: string) {
    const comment = await this.commentRepository.findCommentById(id);
    if (!comment || comment.deletedAt)
      throw new AppErrorException('NotFound', 'Comment not found');
    return comment;
  }

  async getComments(postId: string, userId: string | null) {
    const comments = await this.commentRepository.findComments(postId);

    const commentLikeMap = userId
      ? await this.getCommentLikeMap({
          commentIds: comments.map((comment) => comment.id),
          userId,
        })
      : {};

    const commentsWithIsLiked = comments.map((comment) => {
      return { ...comment, isLiked: !!commentLikeMap[comment.id] };
    });

    const hidedDeletedComments = this.hideDeletedComments(commentsWithIsLiked);
    const groupedComments = this.groupSubcomments(hidedDeletedComments);

    return groupedComments;
  }

  private groupSubcomments<T extends Comment>(comments: T[]) {
    const rootComments = comments.filter((comment) => !comment.parentCommentId);
    const subcommentsMap = new Map<string, T[]>(); // key: parentCommentId, value: subcomment

    comments.forEach((comment) => {
      // skip root comments
      if (!comment.parentCommentId) return;
      // skip deleted comments that is not root
      if (comment.deletedAt !== null) return;
      const subcomments = subcommentsMap.get(comment.parentCommentId) ?? [];
      subcomments.push(comment);
      subcommentsMap.set(comment.parentCommentId, subcomments);
    });

    const groupedComments = rootComments
      .map((comment) => {
        const subcomments = subcommentsMap.get(comment.id) ?? [];
        return { ...comment, subcomments };
      })
      // filter out deleted comments that has no subcomments
      .filter((c) => c.deletedAt === null || c.subcomments.length !== 0);

    return groupedComments;
  }

  private hideDeletedComments(comments: Comment[]) {
    return comments.map((comment) => {
      if (!comment.deletedAt) return { ...comment, isDeleted: false };
      const someDate = new Date(0);
      return {
        ...comment,
        likes: 0,
        subcommentsCount: 0,
        text: '',
        userId: '',
        user: {
          id: '',
          username: '',
          displayName: '',
        },
        createdAt: someDate,
        updatedAt: someDate,
        isDeleted: true,
      };
    });
  }

  async createComment(dto: CreateCommentDto, userId: string) {
    const comment = await this.commentRepository.createComment(dto, userId);

    // update parent comment's subcomment count if it has parent
    if (dto.parentCommentId) {
      const subcommentsCount = await this.commentRepository.countSubcomments(
        dto.parentCommentId,
      );

      await this.commentRepository.updateSubcommentCount(
        dto.parentCommentId,
        subcommentsCount,
      );
    }

    await this.countAndSyncComments(dto.postId);

    return { ...comment, isDeleted: false, subcomments: [], isLiked: false };
  }

  async deleteComment(id: string, userId: string) {
    const comment = await this.getComment(id);
    if (comment.userId !== userId)
      throw new AppErrorException('Forbidden', "Can't delete other's comment");

    await this.commentRepository.deleteComment(id);

    this.countAndSyncComments(comment.postId);
  }

  async likeComment({ commentId, userId }: CommentActionParams) {
    const alreadyLiked = await this.commentRepository.findCommentLike(
      commentId,
      userId,
    );
    if (!alreadyLiked) {
      await this.commentRepository.createCommentLike(commentId, userId);
    }

    const likes = await this.updateCommentLikes(commentId);
    return likes;
  }

  async unlikeComment({ commentId, userId }: CommentActionParams) {
    const alreadyLiked = await this.commentRepository.findCommentLike(
      commentId,
      userId,
    );
    if (alreadyLiked) {
      await this.commentRepository.deleteCommentLike(commentId, userId);
    }

    const likes = await this.updateCommentLikes(commentId);
    return likes;
  }

  async updateCommentLikes(commentId: string) {
    const likes = await this.commentRepository.countCommentLikes(commentId);
    await this.commentRepository.updateCommentLikes(commentId, likes);

    return likes;
  }

  async getCommentLikeMap({ commentIds, userId }: GetCommentLikedParams) {
    const list = await this.commentRepository.findCommentLikes(
      commentIds,
      userId,
    );

    return list.reduce((acc, { commentId, userId }) => {
      acc[commentId] = userId;
      return acc;
    }, {} as Record<string, string>);
  }

  async countAndSyncComments(postId: string) {
    const commentsCount = await this.commentRepository.countComments(postId);
    await this.postRepository.updatePostCommentsCount(postId, commentsCount);

    return commentsCount;
  }
}

interface GetCommentLikedParams {
  commentIds: string[];
  userId: string;
}

interface CommentActionParams {
  commentId: string;
  userId: string;
}
