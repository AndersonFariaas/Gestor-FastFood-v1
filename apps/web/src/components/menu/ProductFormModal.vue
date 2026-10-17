<script setup lang="ts">
import { fromCents, toCents, type Product } from '@fastfood/shared';
import { computed, reactive, ref, watch } from 'vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import { useToast } from '@/composables/useToast';
import { errorMessage } from '@/services/http';
import { useCatalogStore } from '@/stores/catalog';

const props = defineProps<{ open: boolean; product: Product | null }>();
const emit = defineEmits<{ close: [] }>();

const catalog = useCatalogStore();
const toast = useToast();

const form = reactive({ name: '', price: '', category: '', description: '', active: true });
const saving = ref(false);
const error = ref('');

watch(
  () => [props.open, props.product] as const,
  ([open, p]) => {
    if (!open) return;
    error.value = '';
    Object.assign(form, {
      name: p?.name ?? '',
      price: p ? fromCents(p.priceCents).toFixed(2) : '',
      category: p?.category ?? '',
      description: p?.description ?? '',
      active: p?.active ?? true,
    });
  },
  { immediate: true },
);

// Aceita "12,90" ou "12.90".
const priceCents = computed(() => {
  const value = Number(form.price.replace(',', '.'));
  return form.price.trim() !== '' && Number.isFinite(value) && value >= 0 ? toCents(value) : null;
});
const valid = computed(() => form.name.trim() && form.category.trim() && priceCents.value !== null);

async function submit() {
  if (!valid.value || priceCents.value === null) return;
  saving.value = true;
  error.value = '';
  try {
    await catalog.save(props.product?.id ?? null, {
      name: form.name.trim(),
      priceCents: priceCents.value,
      category: form.category.trim(),
      description: form.description.trim(),
      active: form.active,
    });
    toast.success(props.product ? 'Item atualizado.' : 'Item criado.');
    emit('close');
  } catch (err) {
    error.value = errorMessage(err);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <BaseModal :open="open" :title="product ? 'Editar item' : 'Novo item'" @close="emit('close')">
    <form id="product-form" class="space-y-4" @submit.prevent="submit">
      <div>
        <label class="label" for="p-name">Nome</label>
        <input id="p-name" v-model="form.name" class="input" maxlength="80" required autocomplete="off" />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="label" for="p-price">Preço (R$)</label>
          <input
            id="p-price"
            v-model="form.price"
            class="input"
            inputmode="decimal"
            placeholder="0,00"
            required
            autocomplete="off"
          />
        </div>
        <div>
          <label class="label" for="p-category">Categoria</label>
          <input
            id="p-category"
            v-model="form.category"
            class="input"
            list="categories"
            maxlength="40"
            placeholder="Ex.: Bebidas"
            required
            autocomplete="off"
          />
          <datalist id="categories">
            <option v-for="c in catalog.categories" :key="c" :value="c" />
          </datalist>
        </div>
      </div>
      <div>
        <label class="label" for="p-description">Descrição</label>
        <input
          id="p-description"
          v-model="form.description"
          class="input"
          maxlength="200"
          placeholder="Opcional"
          autocomplete="off"
        />
      </div>
      <label class="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input v-model="form.active" type="checkbox" class="size-4 accent-brand-500" />
        Disponível para venda
      </label>
      <p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ error }}</p>
    </form>
    <template #footer>
      <BaseButton variant="secondary" @click="emit('close')">Cancelar</BaseButton>
      <BaseButton type="submit" form="product-form" :loading="saving" :disabled="!valid">Salvar</BaseButton>
    </template>
  </BaseModal>
</template>
