import { onScopeDispose, ref } from 'vue';

/** Data/hora atual que se atualiza sozinha (relógios e cronômetros de pedidos). */
export function useNow(intervalMs = 1000) {
  const now = ref(new Date());
  const timer = setInterval(() => (now.value = new Date()), intervalMs);
  onScopeDispose(() => clearInterval(timer));
  return now;
}
