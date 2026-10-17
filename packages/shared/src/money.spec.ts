import { describe, expect, it } from 'vitest';
import { formatCents, toCents } from './money.ts';

describe('money', () => {
  it('converte reais para centavos sem erro de ponto flutuante', () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(19.99)).toBe(1999);
  });

  it('formata centavos em reais', () => {
    expect(formatCents(123456).replace(/\s/g, ' ')).toBe('R$ 1.234,56');
    expect(formatCents(0).replace(/\s/g, ' ')).toBe('R$ 0,00');
  });
});
