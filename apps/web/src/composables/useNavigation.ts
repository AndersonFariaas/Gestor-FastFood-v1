import {
  PhCalculator,
  PhCookingPot,
  PhListDashes,
  PhReceipt,
  PhStorefront,
  PhTelevisionSimple,
  PhUsers,
} from '@phosphor-icons/vue';
import { computed, type Component } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useOrdersStore } from '@/stores/orders';

export interface NavLink {
  to: string;
  label: string;
  icon: Component;
  badge?: number;
}

/** Itens do menu conforme o perfil do usuário (fonte única para a barra lateral e a navegação móvel). */
export function useNavigation() {
  const auth = useAuthStore();
  const orders = useOrdersStore();

  const links = computed<NavLink[]>(() => [
    { to: '/', label: 'Caixa', icon: PhStorefront },
    { to: '/pedidos', label: 'Pedidos', icon: PhReceipt, badge: orders.countByStatus.PRONTO },
    ...(auth.isAdmin
      ? [
          { to: '/cardapio', label: 'Cardápio', icon: PhListDashes },
          { to: '/fechamento', label: 'Caixa do dia', icon: PhCalculator },
          { to: '/usuarios', label: 'Equipe', icon: PhUsers },
        ]
      : []),
  ]);

  /** Telas de exibição, abertas em outra aba/dispositivo. */
  const screens: NavLink[] = [
    { to: '/cozinha', label: 'Cozinha', icon: PhCookingPot },
    { to: '/painel', label: 'Painel TV', icon: PhTelevisionSimple },
  ];

  return { links, screens };
}
