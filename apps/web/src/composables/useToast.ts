import { readonly, ref } from 'vue';

export type ToastTone = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

const DURATION_MS = 3500;
const toasts = ref<Toast[]>([]);
let nextId = 1;

function show(message: string, tone: ToastTone = 'info') {
  const id = nextId++;
  toasts.value.push({ id, message, tone });
  setTimeout(() => dismiss(id), tone === 'error' ? DURATION_MS * 1.5 : DURATION_MS);
}

function dismiss(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}

/** Notificações rápidas (estado global, exibidas pelo `ToastHost`). */
export function useToast() {
  return {
    toasts: readonly(toasts),
    show,
    dismiss,
    success: (message: string) => show(message, 'success'),
    error: (message: string) => show(message, 'error'),
  };
}
