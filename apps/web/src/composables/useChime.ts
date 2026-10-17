import { onScopeDispose, ref } from 'vue';

type Chime = 'new-order' | 'order-ready';

// Notas (Hz) e duração de cada som. Gerados via Web Audio: sem arquivos externos, funciona offline.
const MELODIES: Record<Chime, { freq: number; at: number; duration: number }[]> = {
  'new-order': [
    { freq: 880, at: 0, duration: 0.15 },
    { freq: 1175, at: 0.18, duration: 0.25 },
  ],
  'order-ready': [
    { freq: 659, at: 0, duration: 0.3 },
    { freq: 523, at: 0.32, duration: 0.5 },
  ],
};

/**
 * Sons de alerta. Navegadores só liberam áudio após uma interação do usuário,
 * por isso `unlocked` indica se é preciso pedir um clique na tela.
 */
export function useChime() {
  let ctx: AudioContext | null = null;
  const unlocked = ref(false);

  async function unlock() {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') await ctx.resume().catch(() => undefined);
    unlocked.value = ctx.state === 'running';
  }

  function play(chime: Chime) {
    if (!ctx || ctx.state !== 'running') return;
    const start = ctx.currentTime;
    for (const note of MELODIES[chime]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = note.freq;
      gain.gain.setValueAtTime(0.0001, start + note.at);
      gain.gain.exponentialRampToValueAtTime(0.4, start + note.at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + note.at + note.duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start + note.at);
      osc.stop(start + note.at + note.duration + 0.05);
    }
  }

  const onFirstInteraction = () => void unlock();
  window.addEventListener('pointerdown', onFirstInteraction, { once: true });
  window.addEventListener('keydown', onFirstInteraction, { once: true });
  onScopeDispose(() => {
    window.removeEventListener('pointerdown', onFirstInteraction);
    window.removeEventListener('keydown', onFirstInteraction);
    void ctx?.close();
  });

  return { unlocked, unlock, play };
}
