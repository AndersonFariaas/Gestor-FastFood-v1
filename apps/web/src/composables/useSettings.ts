import { ref, watch } from 'vue';

const STORAGE_KEY = 'fastfood:settings';

interface Settings {
  /** Imprime o comprovante ao finalizar cada pedido (configuração deste computador; ligado por padrão). */
  autoPrint: boolean;
}

function read(): Settings {
  try {
    return { autoPrint: true, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') };
  } catch {
    return { autoPrint: true };
  }
}

const settings = ref<Settings>(read());
watch(
  settings,
  (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      // armazenamento indisponível (modo privado): mantém só em memória
    }
  },
  { deep: true },
);

/** Preferências locais do dispositivo (não sincronizadas entre computadores). */
export function useSettings() {
  return settings;
}
