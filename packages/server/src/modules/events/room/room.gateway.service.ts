import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { SOCKET_EVENT } from '~/common/constants';
import { AuthService } from '~/modules/auth/auth.service';
import { JoinRoomDto, LeaveRoomDto, RoomMessageDto, TypingStatusDto } from '../dto';

@Injectable()
export class RoomGatewayService {
  private server: Server;
  private logger = new Logger('RoomGateway');

  constructor(private readonly authService: AuthService) {}

  /** Default Setting */

  onAfterInit(server: Server) {
    this.server = server;
    this.logger.verbose('Initialized RoomGateway');
  }

  async onConnection(client: Socket) {
    const { userId, email } = await this.authService.verifyAccessToken(
      client.handshake.query.access_token as string,
    );

    client.data = {
      uid: userId,
      email,
    };

    this.logger.verbose(`Client connected: ${client.id}`);
  }

  onDisconnect(client: Socket) {
    this.logger.verbose(`Client disconnected: ${client.id}`);
  }

  /** Socket Chat */

  async onJoinRoom(client: Socket, dto: JoinRoomDto) {
    await client.join(dto.roomId);
    client.to(dto.roomId).emit(SOCKET_EVENT.JOINED_ROOM, {
      message: `${client.data.email} joined ${dto.roomId}`,
    });
  }

  async onLeaveRoom(client: Socket, dto: LeaveRoomDto) {
    await client.leave(dto.roomId);
    client.to(dto.roomId).emit(SOCKET_EVENT.LEFT_ROOM, {
      message: `${client.data.email} left ${dto.roomId}`,
    });
  }

  onChatMessage(client: Socket, dto: RoomMessageDto) {
    // send to all users in room
    this.server.to(dto.roomId).emit(SOCKET_EVENT.CHAT_MESSAGE, {
      message: `FROM: ${client.data.email} ${dto.message}`,
      uid: client.data.email,
    });
  }

  onTypingStatus(client: Socket, dto: TypingStatusDto) {
    client.to(dto.roomId).emit(SOCKET_EVENT.TYPING_STATUS, {
      uid: client.data.email,
      isTyping: dto.isTyping,
    });
  }

  onChooseQuestion(client: Socket) {
    client.emit(SOCKET_EVENT.QUESTION_CHOSEN);
  }

  onAnswerQuestion(client: Socket) {
    client.emit(SOCKET_EVENT.QUESTION_ANSWERED);
  }
}
