import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

declare module 'vue-router' {
  interface RouteMeta {
    title?: string;
    /** Acessível sem login. */
    public?: boolean;
    adminOnly?: boolean;
    /** `bare`: tela cheia sem cabeçalho (login, cozinha, painel da TV). */
    layout?: 'app' | 'bare';
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'pos', component: () => import('@/views/PosView.vue'), meta: { title: 'Caixa' } },
    {
      path: '/pedidos',
      name: 'orders',
      component: () => import('@/views/OrdersView.vue'),
      meta: { title: 'Pedidos' },
    },
    {
      path: '/cozinha',
      name: 'kitchen',
      component: () => import('@/views/KitchenView.vue'),
      meta: { title: 'Cozinha', layout: 'bare' },
    },
    {
      path: '/painel',
      name: 'panel',
      component: () => import('@/views/PanelView.vue'),
      meta: { title: 'Painel de senhas', layout: 'bare' },
    },
    {
      path: '/cardapio',
      name: 'menu',
      component: () => import('@/views/MenuView.vue'),
      meta: { title: 'Cardápio', adminOnly: true },
    },
    {
      path: '/fechamento',
      name: 'closing',
      component: () => import('@/views/ClosingView.vue'),
      meta: { title: 'Fechamento de caixa', adminOnly: true },
    },
    {
      path: '/usuarios',
      name: 'users',
      component: () => import('@/views/UsersView.vue'),
      meta: { title: 'Usuários', adminOnly: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { title: 'Acesso', public: true, layout: 'bare' },
    },
    {
      path: '/trocar-senha',
      name: 'change-password',
      component: () => import('@/views/ChangePasswordView.vue'),
      meta: { title: 'Trocar senha', layout: 'bare' },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});

/** Só aceita redirecionar para caminhos internos (evita open redirect). */
export const safeRedirect = (value: unknown) =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/';

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  await auth.init();

  if (to.meta.public) return auth.isActive ? safeRedirect(to.query.redirect) : true;
  if (!auth.user) return { name: 'login', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } };
  if (auth.user.mustChangePassword && to.name !== 'change-password') {
    return { name: 'change-password', query: { redirect: to.fullPath } };
  }
  if (to.meta.adminOnly && !auth.isAdmin) return { name: 'pos' };
  return true;
});

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} • Lanchonete` : 'Lanchonete';
});
