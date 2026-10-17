// Valores monetários trafegam e são armazenados em centavos (inteiros) para evitar erros de ponto flutuante.

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatCents(cents: number): string {
  return brl.format(cents / 100);
}

/** Converte um valor em reais (ex.: 12.9) para centavos (1290). */
export function toCents(reais: number): number {
  return Math.round(reais * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}
