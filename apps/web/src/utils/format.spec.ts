import { describe, expect, it } from 'vitest';
import { escapeHtml, minutesSince, normalize } from './format';

describe('format utils', () => {
  it('escapa HTML para impressão segura', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe(
      '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;',
    );
  });

  it('normaliza acentos e caixa para busca', () => {
    expect(normalize('Pão de Açúcar')).toBe('pao de acucar');
  });

  it('calcula minutos decorridos sem valores negativos', () => {
    const now = new Date('2026-01-01T12:30:00Z');
    expect(minutesSince('2026-01-01T12:00:00Z', now)).toBe(30);
    expect(minutesSince('2026-01-01T13:00:00Z', now)).toBe(0);
  });
});
