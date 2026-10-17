<script setup lang="ts">
import { PhSquaresFour } from '@phosphor-icons/vue';
import { categoryVisual } from '@/utils/visuals';

defineProps<{ categories: string[]; counts: Record<string, number> }>();
const selected = defineModel<string | null>({ required: true });

const tabClass = (active: boolean) =>
  active
    ? 'bg-stone-900 text-white shadow-md'
    : 'bg-white text-stone-700 ring-1 ring-stone-900/5 hover:bg-stone-50';
</script>

<template>
  <div
    class="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 py-1"
    role="tablist"
    aria-label="Categorias"
  >
    <button
      type="button"
      role="tab"
      :aria-selected="selected === null"
      class="flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all"
      :class="tabClass(selected === null)"
      @click="selected = null"
    >
      <PhSquaresFour class="size-5" weight="fill" aria-hidden="true" /> Tudo
    </button>
    <button
      v-for="c in categories"
      :key="c"
      type="button"
      role="tab"
      :aria-selected="selected === c"
      class="flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all"
      :class="tabClass(selected === c)"
      @click="selected = c"
    >
      <component
        :is="categoryVisual(c).icon"
        class="size-5"
        :class="selected === c ? 'text-accent-400' : categoryVisual(c).iconClass"
        weight="fill"
        aria-hidden="true"
      />
      {{ c }}
      <span class="text-xs font-medium opacity-60 tabular-nums">{{ counts[c] }}</span>
    </button>
  </div>
</template>
