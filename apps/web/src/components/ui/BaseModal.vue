<script setup lang="ts">
import { PhX } from '@phosphor-icons/vue';
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';

const props = withDefaults(
  defineProps<{ open: boolean; title?: string; size?: 'sm' | 'md'; hideHeader?: boolean }>(),
  { size: 'md', title: '', hideHeader: false },
);
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
      // Foca o elemento marcado com `autofocus` ou o primeiro campo, para agilizar o uso pelo teclado.
      const target =
        panel.value?.querySelector<HTMLElement>('[autofocus]') ??
        panel.value?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])');
      target?.focus();
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
      enter-from-class="opacity-0 [&>div]:scale-95"
      leave-to-class="opacity-0 [&>div]:scale-95"
      enter-active-class="transition duration-200 [&>div]:transition-transform [&>div]:duration-200"
      leave-active-class="transition duration-150 [&>div]:transition-transform [&>div]:duration-150"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        @click.self="emit('close')"
      >
        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="hideHeader ? undefined : titleId"
          :aria-label="hideHeader ? title : undefined"
          class="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-pop sm:rounded-3xl"
          :class="size === 'sm' ? 'sm:max-w-sm' : 'sm:max-w-lg'"
        >
          <header v-if="!hideHeader" class="flex items-center justify-between gap-4 px-6 pt-6 pb-2">
            <h2 :id="titleId" class="font-display text-xl font-bold text-stone-900">{{ title }}</h2>
            <button
              type="button"
              data-close
              class="rounded-full p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
              aria-label="Fechar"
              @click="emit('close')"
            >
              <PhX class="size-5" weight="bold" />
            </button>
          </header>
          <div class="overflow-y-auto px-6 py-4">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="flex justify-end gap-3 px-6 pt-2 pb-6">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
