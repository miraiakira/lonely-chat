import { Logger, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { REDIS_CLIENT } from '../redis/redis.module'
import Redis from 'ioredis'

@WebSocketGateway({
  cors: {
    origin: (origin, cb) => {
      const allow = new Set<string>([
        'http://localhost:3001',
        'http://localhost:5173',
        process.env.FRONTEND_ORIGIN || '',
      ]);
      if (!origin || allow.has(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  },
  transports: ['websocket'],
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('RealtimeGateway');

  @WebSocketServer()
  server!: Server;

  private instanceId = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  private sub: Redis | null = null

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  public getInstanceId() { return this.instanceId }

  async onModuleInit() {
    try {
      this.sub = this.redis.duplicate()
      await this.sub.subscribe('chat:msg')
      this.sub.on('message', (channel, message) => {
        if (channel !== 'chat:msg') return
        try {
          const evt = JSON.parse(message)
          if (!evt || typeof evt !== 'object') return
          if (evt.source && evt.source === this.instanceId) return // skip self-originated events
          switch (evt.type) {
            case 'message': {
              const recipients: string[] = Array.isArray(evt.recipients) ? evt.recipients.map((x: any) => String(x)) : []
              const rooms = recipients.map((id) => `user:${id}`)
              this.server.to(rooms).emit('message', evt.payload)
              break
            }
            case 'group_created': {
              const recipients: string[] = Array.isArray(evt.recipients) ? evt.recipients.map((x: any) => String(x)) : []
              const rooms = recipients.map((id) => `user:${id}`)
              this.server.to(rooms).emit('group_created', evt.payload)
              break
            }
            default:
              break
          }
        } catch (e: any) {
          this.logger.warn(`Failed to handle pubsub message: ${e?.message || e}`)
        }
      })
      this.logger.log(`Redis pubsub subscribed: chat:msg (instance ${this.instanceId})`)
    } catch (e: any) {
      this.logger.warn(`Failed to init Redis pubsub: ${e?.message || e}`)
    }
  }

  async onModuleDestroy() {
    try { if (this.sub) await this.sub.quit() } catch {}
  }

  private extractToken(client: Socket): string | null {
    // Prefer token from Socket.IO auth payload
    const auth: any = client.handshake.auth || {};
    if (auth && typeof auth.token === 'string' && auth.token) return auth.token as string;
    // Fallback to Authorization header
    const h = (client.handshake.headers['authorization'] || client.handshake.headers['Authorization']) as string | undefined;
    if (h && h.startsWith('Bearer ')) return h.slice('Bearer '.length);
    return null;
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Connection rejected (no token): ${client.id}`);
        client.emit('auth_error', { code: 'NO_TOKEN', message: 'Missing Bearer token' });
        client.disconnect(true);
        return;
      }
      const secret = this.config.get<string>('JWT_SECRET');
      const payload = this.jwt.verify(token, { secret });
      // attach minimal user info
      (client.data as any).user = { id: payload.sub, username: payload.username, roles: payload.roles || [] };
      this.logger.log(`Client connected: ${client.id} (user ${payload.username})`);
      // 加入用户房间，便于精准推送
      try { client.join(`user:${payload.sub}`); } catch {}
      client.emit('welcome', { ok: true, user: client.data.user });
    } catch (e: any) {
      this.logger.warn(`Connection rejected (${client.id}): ${e?.message || e}`);
      client.emit('auth_error', { code: 'INVALID_TOKEN', message: String(e?.message || 'Invalid token') });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('ping')
  handlePing(@MessageBody() body: any, @ConnectedSocket() client: Socket) {
    const user = (client.data as any)?.user;
    return { event: 'pong', data: { t: Date.now(), you: user || null } };
  }
}