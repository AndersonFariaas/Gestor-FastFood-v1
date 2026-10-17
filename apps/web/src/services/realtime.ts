import type { ServerToClientEvents } from '@fastfood/shared';
import { io, type Socket } from 'socket.io-client';
import { ref } from 'vue';
import { useCatalogStore } from '@/stores/catalog';
import { useOrdersStore } from '@/stores/orders';

type RealtimeSocket = Socket<ServerToClientEvents, Record<string, never>>;

export type ConnectionState = 'offline' | 'connecting' | 'online';
export const connectionState = ref<ConnectionState>('offline');

interface SyncCallbacks {
  /** Sessão recusada ou encerrada pelo servidor (logout em outra aba, senha redefinida...). */
  onSessionLost: () => void;
}

let socket: RealtimeSocket | null = null;

/**
 * Conecta ao canal de tempo real e mantém as stores sincronizadas.
 * A cada (re)conexão recarrega os dados, cobrindo eventos perdidos enquanto estava offline.
 */
export function startRealtimeSync({ onSessionLost }: SyncCallbacks) {
  if (socket) return;
  const catalog = useCatalogStore();
  const orders = useOrdersStore();

  connectionState.value = 'connecting';
  socket = io({ transports: ['websocket', 'polling'] });

  socket.on('connect', () => {
    connectionState.value = 'online';
    void Promise.all([catalog.load(), orders.load()]).catch(() => undefined);
  });
  socket.on('disconnect', (reason) => {
    connectionState.value = 'connecting';
    if (reason === 'io server disconnect') {
      stopRealtimeSync();
      onSessionLost();
    }
  });
  socket.on('connect_error', (err) => {
    connectionState.value = 'connecting';
    if (err.message === 'unauthorized' || err.message === 'password_change_required') {
      stopRealtimeSync();
      onSessionLost();
    }
  });

  socket.on('order:created', orders.upsert);
  socket.on('order:updated', orders.upsert);
  socket.on('product:saved', catalog.upsert);
  socket.on('product:deleted', ({ id }) => catalog.removeLocal(id));
  socket.on('shift:closed', () => void orders.load());
}

export function stopRealtimeSync() {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
  connectionState.value = 'offline';
}
