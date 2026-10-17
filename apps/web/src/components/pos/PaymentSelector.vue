<script setup lang="ts">
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS, type SelectablePaymentMethod } from '@fastfood/shared';
import { PAYMENT_ICONS } from '@/utils/visuals';

defineProps<{ modelValue: SelectablePaymentMethod | null }>();
const emit = defineEmits<{ 'update:modelValue': [method: SelectablePaymentMethod] }>();
</script>

<template>
  <fieldset>
    <legend class="mb-2 text-xs font-semibold tracking-wide text-stone-500 uppercase">Pagamento</legend>
    <div class="grid grid-cols-3 gap-2">
      <label
        v-for="method in PAYMENT_METHODS"
        :key="method"
        class="relative flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-2 px-2 py-3 text-sm font-semibold transition-all has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-500"
        :class="
          modelValue === method
            ? 'border-brand-600 bg-brand-50 text-brand-700'
            : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50'
        "
      >
        <input
          type="radio"
          name="payment"
          class="sr-only"
          :value="method"
          :checked="modelValue === method"
          @change="emit('update:modelValue', method)"
        />
        <component
          :is="PAYMENT_ICONS[method]"
          class="size-7"
          :weight="modelValue === method ? 'fill' : 'regular'"
          aria-hidden="true"
        />
        {{ PAYMENT_METHOD_LABELS[method] }}
      </label>
    </div>
  </fieldset>
</template>
