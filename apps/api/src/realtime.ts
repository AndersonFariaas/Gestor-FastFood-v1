import type { Server as HttpServer } from 'node:http';
import type { ServerToClientEvents } from '@fastfood/shared';
import { Server } from 'socket.io';
import { PUBLIC_EVENTS, type EventBus } from './lib/events.ts';
import { SESSION_COOKIE } from './http/middleware.ts';
import { parseCookies } from './lib/security.ts';
import type { AuthService } from './modules/auth/auth.service.ts';

interface SocketData {
  tokenHash: string;
}

type NoEvents = Record<string, never>;

/**
 * Canal de tempo real (somente servidor → telas). As ações dos usuários passam pela API REST;
 * aqui apenas repassamos os eventos de domínio para quem está conectado.
 */
export function attachRealtime(httpServer: HttpServer, { auth, bus }: { auth: AuthService; bus: EventBus }) {
  const io = new Server<NoEvents, ServerToClientEvents, NoEvents, SocketData>(httpServer, {
    serveClient: false,
  });

  io.use((socket, next) => {
    const session = auth.resolve(parseCookies(socket.request.headers.cookie)[SESSION_COOKIE]);
    if (!session) return next(new Error('unauthorized'));
    if (session.user.mustChangePassword) return next(new Error('password_change_required'));
    socket.data.tokenHash = session.tokenHash;
    next();
  });

  for (const event of PUBLIC_EVENTS) {
    bus.on(event, (payload) => {
      (io.emit as (event: string, payload: unknown) => boolean)(event, payload);
    });
  }

  bus.on('session:revoked', ({ tokenHashes }) => {
    for (const socket of io.sockets.sockets.values()) {
      if (tokenHashes.includes(socket.data.tokenHash)) socket.disconnect(true);
    }
  });

  return io;
}
