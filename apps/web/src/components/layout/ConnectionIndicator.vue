<script setup lang="ts">
import { computed } from 'vue';
import { connectionState } from '@/services/realtime';

const props = withDefaults(defineProps<{ dark?: boolean }>(), { dark: false });

const view = computed(() => {
  switch (connectionState.value) {
    case 'online':
      return { label: 'Online', dot: 'bg-emerald-400' };
    case 'connecting':
      return { label: 'Conectando...', dot: 'bg-accent-400 animate-pulse' };
    default:
      return { label: 'Offline', dot: 'bg-stone-400' };
  }
});
</script>

<template>
  <span
    class="inline-flex items-center gap-2 text-xs font-medium"
    :class="props.dark ? 'text-stone-400' : 'text-stone-500'"
    role="status"
    :title="`Tempo real: ${view.label}`"
  >
    <span class="size-2 rounded-full" :class="view.dot" aria-hidden="true" />
    {{ view.label }}
  </span>
</template>
