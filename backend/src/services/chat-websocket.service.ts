import { WebSocket } from 'ws';
import { ChatConnectedUser, ChatMessage, JWTPayload } from '../types/index.js';
import { IUserRepository, userRepository } from '../repositories/user.repository.js';
import {
  SendChatMessageUseCase,
  sendChatMessageUseCase,
} from '../usecases/chat/send-chat-message.usecase.js';

interface ConnectedClient {
  socket: WebSocket;
  user: JWTPayload;
  avatar: string;
}

export class ChatWebSocketService {
  private clients = new Set<ConnectedClient>();

  constructor(
    private readonly userRepo: IUserRepository = userRepository,
    private readonly sendUseCase: SendChatMessageUseCase = sendChatMessageUseCase
  ) {}

  async handleConnection(socket: WebSocket, user: JWTPayload) {
    let avatar = '';
    try {
      const dbUser = await this.userRepo.findById(user.id);
      if (dbUser?.avatar) {
        avatar = dbUser.avatar;
      }
    } catch {
      // ignore
    }

    const client: ConnectedClient = { socket, user, avatar };
    this.clients.add(client);

    // Send initial state to newly connected client
    this.sendToSocket(socket, {
      type: 'presence',
      users: this.getOnlineUsers(),
    });

    // Broadcast updated presence to all clients
    this.broadcastPresence();

    socket.on('message', async (raw: any) => {
      try {
        const text = typeof raw === 'string' ? raw : raw.toString();
        const data = JSON.parse(text);

        if (data.type === 'ping') {
          this.sendToSocket(socket, { type: 'pong' });
          return;
        }

        if (data.type === 'send_message') {
          const createdMessage = await this.sendUseCase.execute({
            userId: user.id,
            username: user.username,
            message: data.message,
            to: data.to,
            to_username: data.to_username,
          });

          this.broadcastChatMessage(createdMessage);
        }
      } catch (err: any) {
        this.sendToSocket(socket, {
          type: 'error',
          message: err.message || 'Erreur lors du traitement du message',
        });
      }
    });

    socket.on('close', () => {
      this.clients.delete(client);
      this.broadcastPresence();
    });

    socket.on('error', () => {
      this.clients.delete(client);
      this.broadcastPresence();
    });
  }

  getOnlineUsers(): ChatConnectedUser[] {
    const userMap = new Map<number, ChatConnectedUser>();
    for (const client of this.clients) {
      if (!userMap.has(client.user.id)) {
        userMap.set(client.user.id, {
          id: client.user.id,
          username: client.user.username,
          avatar: client.avatar,
          profil: client.user.profil,
        });
      }
    }
    return Array.from(userMap.values()).sort((a, b) =>
      a.username.localeCompare(b.username)
    );
  }

  broadcastPresence() {
    const users = this.getOnlineUsers();
    this.broadcast({
      type: 'presence',
      users,
    });
  }

  broadcastChatMessage(message: ChatMessage) {
    const isPrivate = Boolean(message.to || message.to_username);

    if (!isPrivate) {
      // Public message to general room
      this.broadcast({
        type: 'chat_message',
        message,
      });
      return;
    }

    // Private message: deliver to sender clients and recipient clients
    const targetUserIdStr = String(message.to);
    const targetUsername = message.to_username.toLowerCase();
    const senderUsername = message.username.toLowerCase();

    for (const client of this.clients) {
      const isSender = client.user.username.toLowerCase() === senderUsername;
      const isRecipient =
        (targetUserIdStr && String(client.user.id) === targetUserIdStr) ||
        (targetUsername && client.user.username.toLowerCase() === targetUsername);

      if (isSender || isRecipient) {
        this.sendToSocket(client.socket, {
          type: 'chat_message',
          message,
        });
      }
    }
  }

  private broadcast(data: any) {
    const json = JSON.stringify(data);
    for (const client of this.clients) {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(json);
      }
    }
  }

  private sendToSocket(socket: WebSocket, data: any) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data));
    }
  }

  clear() {
    this.clients.clear();
  }
}

export const chatWebSocketService = new ChatWebSocketService();
