import { EventEmitter } from 'node:events';
import type { ServerToClientEvents } from '@fastfood/shared';

type PublicEvents = { [K in keyof ServerToClientEvents]: Parameters<ServerToClientEvents[K]>[0] };

interface InternalEvents {
  /** Sessões encerradas (logout, troca de senha, usuário removido): as conexões delas devem cair. */
  'session:revoked': { tokenHashes: string[] };
}

export type DomainEvents = PublicEvents & InternalEvents;
export type DomainEventName = keyof DomainEvents;

/** Eventos repassados para as telas via Socket.IO. */
export const PUBLIC_EVENTS = [
  'order:created',
  'order:updated',
  'product:saved',
  'product:deleted',
  'shift:closed',
] as const satisfies readonly (keyof ServerToClientEvents)[];

/**
 * Barramento de eventos de domínio: os serviços publicam o que aconteceu sem conhecer
 * quem escuta (camada de tempo real, logs, futuras integrações).
 */
export interface EventBus {
  emit<K extends DomainEventName>(event: K, payload: DomainEvents[K]): void;
  on<K extends DomainEventName>(event: K, listener: (payload: DomainEvents[K]) => void): () => void;
}

export function createEventBus(): EventBus {
  const emitter = new EventEmitter();
  return {
    emit(event, payload) {
      emitter.emit(event, payload);
    },
    on(event, listener) {
      emitter.on(event, listener);
      return () => emitter.off(event, listener);
    },
  };
}
