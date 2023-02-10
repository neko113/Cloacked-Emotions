import { Injectable } from '@nestjs/common';
import { PrismaService } from '~/prisma/prisma.service';
import { CreateSeriestDto } from './dto/create-series.dto';

@Injectable()
export class SeriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserSeriesList(username: string) {
    return await this.prisma.series.findMany({
      where: { user: { username } },
    });
  }

  async findSeriesByName(username: string, seriesName: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });
    return await this.prisma.series.findUnique({
      where: {
        name_userId: {
          name: seriesName,
          userId: user.id,
        },
      },
      include: {
        seriesPosts: {
          include: {
            post: {
              select: {
                id: true,
                title: true,
                thumbnail: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  async findSeriesById(userId: string, series: string) {
    return await this.prisma.series.findUnique({
      where: {
        id_userId: {
          id: series,
          userId,
        },
      },
    });
  }

  async findSeriesByPostId(postId: string) {
    return await this.prisma.series.findFirst({
      where: {
        seriesPosts: {
          some: {
            postId,
          },
        },
      },
      include: {
        seriesPosts: true,
      },
    });
  }

  async createSeries(dto: CreateSeriestDto, userId: string) {
    return await this.prisma.series.create({
      data: {
        name: dto.name,
        userId,
      },
    });
  }

  async createSeriesPost(seriesId: string, postId: string, index: number) {
    return await this.prisma.seriesPost.create({
      data: {
        seriesId,
        postId,
        index,
      },
    });
  }

  async deleteSeries(seriesId: string) {
    return await this.prisma.series.delete({
      where: { id: seriesId },
    });
  }

  async updateSeriesCount(seriesId: string) {
    const count = await this.prisma.seriesPost.count({
      where: { seriesId },
    });

    return await this.prisma.series.update({
      where: {
        id: seriesId,
      },
      data: {
        postsCount: count,
      },
    });
  }
}
