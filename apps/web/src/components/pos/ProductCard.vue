<script setup lang="ts">
import { formatCents, type Product } from '@fastfood/shared';
import { PhPlus } from '@phosphor-icons/vue';
import { computed } from 'vue';
import { categoryVisual } from '@/utils/visuals';

const props = defineProps<{ product: Product; quantity: number }>();
const emit = defineEmits<{ add: [product: Product] }>();

const visual = computed(() => categoryVisual(props.product.category));
</script>

<template>
  <button
    type="button"
    class="group relative flex flex-col overflow-hidden rounded-3xl bg-white text-left shadow-card ring-1 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-offset-4 active:translate-y-0 active:scale-[0.98]"
    :class="quantity ? 'ring-2 ring-brand-500' : 'ring-stone-900/5'"
    :aria-label="`Adicionar ${product.name}, ${formatCents(product.priceCents)}${quantity ? `. ${quantity} no pedido` : ''}`"
    @click="emit('add', product)"
  >
    <div class="relative flex aspect-[5/3] items-center justify-center" :class="visual.tile">
      <component
        :is="visual.icon"
        class="size-14 drop-shadow-sm transition-transform duration-200 group-hover:scale-110"
        :class="visual.iconClass"
        weight="duotone"
        aria-hidden="true"
      />
      <span
        v-if="quantity"
        class="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-brand-600 font-display text-sm font-bold text-white shadow-md"
        aria-hidden="true"
      >
        {{ quantity }}
      </span>
    </div>
    <div class="flex flex-1 flex-col gap-1 p-4">
      <p class="font-display text-base leading-tight font-semibold text-stone-900">{{ product.name }}</p>
      <p v-if="product.description" class="line-clamp-2 text-xs text-stone-500">{{ product.description }}</p>
      <div class="mt-auto flex items-center justify-between pt-2">
        <span class="font-display text-lg font-bold text-brand-600 tabular-nums">
          {{ formatCents(product.priceCents) }}
        </span>
        <span
          class="flex size-9 items-center justify-center rounded-full bg-accent-400 text-stone-900 transition-colors group-hover:bg-brand-600 group-hover:text-white"
          aria-hidden="true"
        >
          <PhPlus class="size-5" weight="bold" />
        </span>
      </div>
    </div>
  </button>
</template>
