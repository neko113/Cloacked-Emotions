// react
import { useState } from 'react';
import { Comment } from '~/lib/types';
import { extractError } from '~/lib/error';

// hooks
import { useQueryClient } from '@tanstack/react-query';
import { useDeleteComment } from '~/hooks/queries/comment';
import { useGetPostComments } from '~/hooks/queries/post';
import useUser from '~/hooks/useUser';
import useCommnetLikeManager from '~/hooks/useCommentLikeManager';

// stores
import useModalStore from '~/stores/useModalStore';

// components
import styled from '@emotion/styled';
import { Pencil, Trash } from '~/components/vectors';
import SubCommentList from '~/components/post/SubCommentList';
import ReplyComment from '~/components/post/ReplyComment';
import MoreVertMenu from '~/components/post/MoreVertMenu';
import LikeButton from '~/components/base/LikeButton';

interface Props {
  comment: Comment;
  isSubcomment?: boolean;
}

//TODO:  adjust textarea height
const CommentItem = ({ comment, isSubcomment }: Props) => {
  const queryClient = useQueryClient();
  const user = useUser();
  const [isReplying, setIsReplying] = useState(false);
  const { openModal } = useModalStore();
  const { isLiked, likeCount, toggleLike } = useCommnetLikeManager({
    commentId: comment.id,
    initialIsLiked: comment.isLiked,
    initialLikeCount: comment.likes,
    postId: comment.postId,
  });

  const isDeleted = comment.isDeleted;
  const isMyComment = user?.id === comment.user.id;
  const commentDate = new Intl.DateTimeFormat('ko-kr', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(comment.createdAt));

  const { mutate } = useDeleteComment({
    onSuccess: async () => {
      await queryClient.refetchQueries(
        useGetPostComments.getKey(comment.postId),
      );
    },
    onError: (e) => {
      const error = extractError(e);
      alert(error.message);
    },
  });

  const handleDelete = () => {
    mutate(comment.id);
  };

  const handleOpenReply = () => {
    setIsReplying(true);
  };
  const handleCloseReply = () => {
    setIsReplying(false);
  };

  const items = [
    {
      icon: <Pencil />,
      name: '수정',
      onClick: () => {
        //TODO: open edit modal
      },
    },
    {
      icon: <Trash />,
      name: '삭제',
      onClick: () =>
        openModal({
          title: '댓글 삭제',
          message: '정말로 댓글을 삭제하시겠습니까?',
          confirmText: '확인',
          cancelText: '취소',
          onConfirm: handleDelete,
        }),
    },
  ];

  // if comment is deleted
  if (isDeleted) {
    return (
      <Container>
        <DeletedText>삭제된 댓글입니다.</DeletedText>
        {!isSubcomment && comment.subcomments && (
          <SubCommentList subcomments={comment.subcomments} />
        )}
      </Container>
    );
  }

  return (
    <Container>
      <CommentHeader>
        <LeftWrapper>
          <Username>{comment.user.username}</Username>
          <Time>{commentDate}</Time>
        </LeftWrapper>
        {isMyComment && <MoreVertMenu items={items} />}
      </CommentHeader>
      <CommentBody>
        <p>{comment.text}</p>
      </CommentBody>
      <CommentFooter>
        <LikeWrapper>
          <LikeButton size="sm" isLiked={isLiked} onClick={toggleLike} />
          <LikeCount>
            {likeCount === 0 ? '' : likeCount.toLocaleString()}
          </LikeCount>
        </LikeWrapper>
        <ReplyButton onClick={handleOpenReply}>답글</ReplyButton>
      </CommentFooter>

      {/* if reply button is clicked, show ReplyComment component */}
      {isReplying && (
        <ReplyComment parentComment={comment} onClose={handleCloseReply} />
      )}

      {/* if subcomments exist, show SubCommentList component */}
      {!isSubcomment && comment.subcomments && (
        <SubCommentList subcomments={comment.subcomments} />
      )}
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
`;

const DeletedText = styled.div`
  color: #999;
`;

const CommentHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const CommentBody = styled.div`
  margin-top: 0.3rem;
  margin-bottom: 0.5rem;
  p {
    color: #000;
    line-height: 1.5;
    font-size: 1rem;
  }
`;
const CommentFooter = styled.div`
  display: flex;
  align-items: center;
  flex-direction: row;
  gap: 0.5rem;
`;

const LeftWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Username = styled.div`
  font-size: 1rem;
  font-weight: 900;
  line-height: 1.5;
`;

const Time = styled.div`
  font-size: 0.8rem;
  line-height: 1.5;
  margin-left: 0.5rem;
  color: #999;
`;

const LikeWrapper = styled.div`
  display: flex;
  align-items: flex-end;
`;

const LikeCount = styled.div`
  margin-left: 8px;
  font-size: 14px;
  line-height: 14px;
  padding: 0;
`;

const ReplyButton = styled.button`
  padding: 0;
`;

export default CommentItem;