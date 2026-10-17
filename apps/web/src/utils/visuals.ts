import type { PaymentMethod } from '@fastfood/shared';
import {
  PhBowlFood,
  PhBread,
  PhCake,
  PhCoffee,
  PhCreditCard,
  PhForkKnife,
  PhIceCream,
  PhLeaf,
  PhMoney,
  PhPintGlass,
  PhPixLogo,
  PhPizza,
  PhQuestion,
  PhSparkle,
  PhTicket,
  PhHamburger,
} from '@phosphor-icons/vue';
import type { Component } from 'vue';
import { normalize } from './format';

type Tone = 'red' | 'amber' | 'orange' | 'sky' | 'pink' | 'green' | 'violet' | 'stone';

/** Classes por tom. Escritas por extenso para o Tailwind encontrá-las no código. */
const TONES: Record<Tone, { tile: string; icon: string }> = {
  red: { tile: 'bg-linear-to-br from-brand-100 to-orange-100', icon: 'text-brand-600' },
  amber: { tile: 'bg-linear-to-br from-accent-100 to-amber-200', icon: 'text-amber-700' },
  orange: { tile: 'bg-linear-to-br from-orange-100 to-amber-100', icon: 'text-orange-600' },
  sky: { tile: 'bg-linear-to-br from-sky-100 to-cyan-100', icon: 'text-sky-600' },
  pink: { tile: 'bg-linear-to-br from-pink-100 to-rose-100', icon: 'text-pink-600' },
  green: { tile: 'bg-linear-to-br from-lime-100 to-emerald-100', icon: 'text-emerald-600' },
  violet: { tile: 'bg-linear-to-br from-violet-100 to-fuchsia-100', icon: 'text-violet-600' },
  stone: { tile: 'bg-linear-to-br from-stone-100 to-stone-200', icon: 'text-stone-600' },
};

const CATEGORY_RULES: { match: RegExp; icon: Component; tone: Tone }[] = [
  { match: /lanche|burger|hamb|sanduiche|\bx-/, icon: PhHamburger, tone: 'red' },
  { match: /combo|promo|oferta/, icon: PhSparkle, tone: 'violet' },
  { match: /pizza/, icon: PhPizza, tone: 'orange' },
  { match: /bebida|refri|suco|drink|agua|cerveja|milk/, icon: PhPintGlass, tone: 'sky' },
  { match: /cafe|coffee|capuccino/, icon: PhCoffee, tone: 'amber' },
  { match: /sobremesa|doce|sorvete|acai|milkshake/, icon: PhIceCream, tone: 'pink' },
  { match: /bolo|torta/, icon: PhCake, tone: 'pink' },
  { match: /porc|batata|frita|petisco|acompanhamento/, icon: PhBowlFood, tone: 'amber' },
  { match: /salgad|coxinha|pastel|empada|pao/, icon: PhBread, tone: 'orange' },
  { match: /salada|vegan|veg|natural/, icon: PhLeaf, tone: 'green' },
];

export interface CategoryVisual {
  icon: Component;
  tile: string;
  iconClass: string;
}

/** Ícone e cores de uma categoria do cardápio, deduzidos pelo nome (ex.: "Bebidas" → copo azul). */
export function categoryVisual(category: string): CategoryVisual {
  const key = normalize(category);
  const rule = CATEGORY_RULES.find((r) => r.match.test(key));
  const tone = TONES[rule?.tone ?? 'stone'];
  return { icon: rule?.icon ?? PhForkKnife, tile: tone.tile, iconClass: tone.icon };
}

export const PAYMENT_ICONS: Record<PaymentMethod, Component> = {
  PIX: PhPixLogo,
  DINHEIRO: PhMoney,
  CARTAO: PhCreditCard,
  VALE: PhTicket,
  NAO_INFORMADO: PhQuestion,
};
