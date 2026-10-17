<script setup lang="ts">
import { PhX } from '@phosphor-icons/vue';
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';

const props = withDefaults(defineProps<{ open: boolean; title: string; size?: 'sm' | 'md' }>(), {
  size: 'md',
});
const emit = defineEmits<{ close: [] }>();

const panel = ref<HTMLElement | null>(null);
const titleId = useId();

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close');
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      document.addEventListener('keydown', onKeydown);
      await nextTick();
      // Foca o primeiro campo para agilizar o preenchimento.
      panel.value?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])')?.focus();
    } else {
      document.removeEventListener('keydown', onKeydown);
    }
  },
  { immediate: true },
);
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
      enter-active-class="transition-opacity duration-150"
      leave-active-class="transition-opacity duration-150"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-40 flex items-center justify-center bg-gray-900/50 p-4"
        @click.self="emit('close')"
      >
        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          class="flex max-h-full w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          :class="size === 'sm' ? 'max-w-sm' : 'max-w-lg'"
        >
          <header class="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 :id="titleId" class="text-lg font-bold text-gray-900">{{ title }}</h2>
            <button
              type="button"
              data-close
              class="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="Fechar"
              @click="emit('close')"
            >
              <PhX class="size-5" />
            </button>
          </header>
          <div class="overflow-y-auto px-6 py-5">
            <slot />
          </div>
          <footer
            v-if="$slots.footer"
            class="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4"
          >
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
