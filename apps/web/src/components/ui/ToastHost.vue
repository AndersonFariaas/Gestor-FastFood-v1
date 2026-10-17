<script setup lang="ts">
import { PhCheckCircle, PhInfo, PhWarningCircle } from '@phosphor-icons/vue';
import { useToast } from '@/composables/useToast';

const { toasts, dismiss } = useToast();

const STYLES = {
  info: { class: 'bg-stone-900 text-white', icon: PhInfo },
  success: { class: 'bg-emerald-700 text-white', icon: PhCheckCircle },
  error: { class: 'bg-brand-700 text-white', icon: PhWarningCircle },
};
</script>

<template>
  <div
    class="pointer-events-none fixed top-4 left-1/2 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4"
    aria-live="polite"
  >
    <TransitionGroup
      enter-from-class="-translate-y-4 opacity-0"
      leave-to-class="opacity-0"
      enter-active-class="transition duration-200"
      leave-active-class="transition duration-200"
    >
      <button
        v-for="t in toasts"
        :key="t.id"
        type="button"
        role="status"
        class="pointer-events-auto flex items-start gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold shadow-pop"
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
