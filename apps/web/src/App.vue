<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppLayout from '@/components/layout/AppLayout.vue';
import DialogHost from '@/components/ui/DialogHost.vue';
import ToastHost from '@/components/ui/ToastHost.vue';
import { useToast } from '@/composables/useToast';
import { onSessionLost } from '@/services/http';
import { startRealtimeSync, stopRealtimeSync } from '@/services/realtime';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const toast = useToast();

const useAppLayout = computed(() => route.meta.layout !== 'bare');

async function handleSessionLost() {
  if (!auth.user) return;
  auth.clear();
  toast.error('Sua sessão foi encerrada. Faça login novamente.');
  await router.push({ name: 'login', query: { redirect: route.fullPath } });
}

onSessionLost(async (error) => {
  if (error.code === 'PASSWORD_CHANGE_REQUIRED') {
    await router.push({ name: 'change-password', query: { redirect: route.fullPath } });
  } else {
    await handleSessionLost();
  }
});

// Tempo real ativo apenas com sessão válida e senha definitiva.
watch(
  () => auth.isActive,
  (active) => (active ? startRealtimeSync({ onSessionLost: handleSessionLost }) : stopRealtimeSync()),
  { immediate: true },
);
</script>

<template>
  <AppLayout v-if="useAppLayout">
    <RouterView />
  </AppLayout>
  <RouterView v-else />

  <ToastHost />
  <DialogHost />
</template>
