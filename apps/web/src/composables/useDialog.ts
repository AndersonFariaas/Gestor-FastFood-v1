import { ref } from 'vue';

export interface DialogOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  tone?: 'primary' | 'danger';
  /** Quando definido, o diálogo pede um texto (ex.: motivo do cancelamento). */
  input?: { label: string; placeholder?: string; type?: 'text' | 'password'; minLength?: number };
}

interface DialogState extends DialogOptions {
  resolve: (value: string | null) => void;
}

const current = ref<DialogState | null>(null);

function open(options: DialogOptions): Promise<string | null> {
  current.value?.resolve(null);
  return new Promise((resolve) => {
    current.value = { ...options, resolve };
  });
}

function settle(value: string | null) {
  current.value?.resolve(value);
  current.value = null;
}

/** Diálogos de confirmação baseados em Promise (exibidos pelo `DialogHost`). */
export function useDialog() {
  return {
    current,
    settle,
    /** Resolve `true` se o usuário confirmar. */
    confirm: async (options: Omit<DialogOptions, 'input'>) => (await open(options)) !== null,
    /** Resolve o texto digitado, ou `null` se cancelado. */
    prompt: (options: DialogOptions & { input: NonNullable<DialogOptions['input']> }) => open(options),
  };
}
