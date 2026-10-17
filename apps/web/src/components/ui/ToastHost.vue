<script setup lang="ts">
import { PhCheckCircle, PhInfo, PhWarningCircle } from '@phosphor-icons/vue';
import { useToast } from '@/composables/useToast';

const { toasts, dismiss } = useToast();

const STYLES = {
  info: { class: 'bg-gray-900 text-white', icon: PhInfo },
  success: { class: 'bg-green-700 text-white', icon: PhCheckCircle },
  error: { class: 'bg-red-700 text-white', icon: PhWarningCircle },
};
</script>

<template>
  <div
    class="pointer-events-none fixed right-4 bottom-4 z-50 flex w-full max-w-sm flex-col gap-2"
    aria-live="polite"
  >
    <TransitionGroup
      enter-from-class="translate-y-4 opacity-0"
      leave-to-class="opacity-0"
      enter-active-class="transition duration-200"
      leave-active-class="transition duration-200"
    >
      <button
        v-for="t in toasts"
        :key="t.id"
        type="button"
        role="status"
        class="pointer-events-auto flex items-start gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium shadow-xl"
        :class="STYLES[t.tone].class"
        @click="dismiss(t.id)"
      >
        <component
          :is="STYLES[t.tone].icon"
          class="mt-0.5 size-5 shrink-0"
          weight="fill"
          aria-hidden="true"
        />
        <span>{{ t.message }}</span>
      </button>
    </TransitionGroup>
  </div>
</template>
