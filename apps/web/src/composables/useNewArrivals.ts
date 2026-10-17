import { watch, type Ref } from 'vue';

/**
 * Chama `onArrival` quando surgem ids novos na lista (ex.: pedido novo na cozinha).
 * A primeira carga apenas registra o estado inicial, sem disparar alertas.
 */
export function useNewArrivals(
  ids: Ref<string[]>,
  ready: Ref<boolean>,
  onArrival: (newIds: string[]) => void,
) {
  let known: Set<string> | null = null;

  watch(
    [ids, ready],
    ([current, isReady]) => {
      if (!isReady) return;
      if (known === null) {
        known = new Set(current);
        return;
      }
      const fresh = current.filter((id) => !known!.has(id));
      known = new Set(current);
      if (fresh.length) onArrival(fresh);
    },
    { immediate: true },
  );
}
