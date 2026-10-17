<script setup lang="ts">
import { computed } from 'vue';
import { connectionState } from '@/services/realtime';

const props = withDefaults(defineProps<{ dark?: boolean }>(), { dark: false });

const view = computed(() => {
  switch (connectionState.value) {
    case 'online':
      return { label: 'Online', dot: 'bg-green-500' };
    case 'connecting':
      return { label: 'Reconectando...', dot: 'bg-amber-500 animate-pulse' };
    default:
      return { label: 'Offline', dot: 'bg-gray-400' };
  }
});
</script>

<template>
  <span
    class="inline-flex items-center gap-2 text-xs font-medium"
    :class="props.dark ? 'text-gray-400' : 'text-gray-500'"
    role="status"
    :title="`Tempo real: ${view.label}`"
  >
    <span class="size-2 rounded-full" :class="view.dot" aria-hidden="true" />
    {{ view.label }}
  </span>
</template>
