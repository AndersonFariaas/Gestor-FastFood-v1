import type { ChangePasswordInput, LoginInput, User } from '@fastfood/shared';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api } from '@/services/api';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const ready = ref(false);

  const isAdmin = computed(() => user.value?.role === 'admin');
  /** Logado e com senha definitiva: pode usar o sistema. */
  const isActive = computed(() => user.value !== null && !user.value.mustChangePassword);

  /** Descobre se já existe uma sessão (cookie) ao abrir o app. */
  async function init() {
    if (ready.value) return;
    try {
      user.value = (await api.auth.me()).user;
    } catch {
      user.value = null;
    } finally {
      ready.value = true;
    }
  }

  async function login(input: LoginInput) {
    user.value = (await api.auth.login(input)).user;
  }

  async function changePassword(input: ChangePasswordInput) {
    user.value = (await api.auth.changePassword(input)).user;
  }

  async function logout() {
    try {
      await api.auth.logout();
    } finally {
      clear();
    }
  }

  function clear() {
    user.value = null;
  }

  return { user, ready, isAdmin, isActive, init, login, changePassword, logout, clear };
});
