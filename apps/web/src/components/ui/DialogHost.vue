<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useDialog } from '@/composables/useDialog';
import BaseButton from './BaseButton.vue';
import BaseModal from './BaseModal.vue';

const { current, settle } = useDialog();
const text = ref('');

watch(current, () => (text.value = ''));

const minLength = computed(() => current.value?.input?.minLength ?? 1);
const canConfirm = computed(() => !current.value?.input || text.value.trim().length >= minLength.value);

function confirm() {
  if (!canConfirm.value) return;
  settle(current.value?.input ? text.value.trim() : '');
}
</script>

<template>
  <BaseModal :open="current !== null" :title="current?.title ?? ''" size="sm" @close="settle(null)">
    <form id="dialog-form" class="space-y-4" @submit.prevent="confirm">
      <p v-if="current?.message" class="text-sm text-gray-600">{{ current.message }}</p>
      <div v-if="current?.input">
        <label class="label" for="dialog-input">{{ current.input.label }}</label>
        <input
          id="dialog-input"
          v-model="text"
          class="input"
          :type="current.input.type ?? 'text'"
          :placeholder="current.input.placeholder"
          :minlength="current.input.minLength"
          autocomplete="off"
          required
        />
      </div>
    </form>
    <template #footer>
      <BaseButton variant="secondary" @click="settle(null)">Voltar</BaseButton>
      <BaseButton
        type="submit"
        form="dialog-form"
        :variant="current?.tone === 'danger' ? 'danger' : 'primary'"
        :disabled="!canConfirm"
      >
        {{ current?.confirmLabel ?? 'Confirmar' }}
      </BaseButton>
    </template>
  </BaseModal>
</template>
