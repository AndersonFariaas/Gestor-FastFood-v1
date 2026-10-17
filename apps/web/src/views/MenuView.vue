<script setup lang="ts">
import { formatCents, type Product } from '@fastfood/shared';
import { PhMagnifyingGlass, PhPencilSimple, PhPlus, PhTrash } from '@phosphor-icons/vue';
import { computed, ref } from 'vue';
import ProductFormModal from '@/components/menu/ProductFormModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import { useDialog } from '@/composables/useDialog';
import { useToast } from '@/composables/useToast';
import { errorMessage } from '@/services/http';
import { useCatalogStore } from '@/stores/catalog';
import { normalize } from '@/utils/format';
import { categoryVisual } from '@/utils/visuals';

const catalog = useCatalogStore();
const dialog = useDialog();
const toast = useToast();

const search = ref('');
const category = ref('');
const editing = ref<Product | null>(null);
const modalOpen = ref(false);
const toggling = ref<string | null>(null);

const visible = computed(() => {
  const q = normalize(search.value.trim());
  return catalog.sorted.filter(
    (p) => (!category.value || p.category === category.value) && (!q || normalize(p.name).includes(q)),
  );
});
const unavailableCount = computed(() => catalog.products.filter((p) => !p.active).length);

function openEditor(product: Product | null) {
  editing.value = product;
  modalOpen.value = true;
}

/** Marca como esgotado/disponível sem abrir o formulário. */
async function toggleActive(product: Product) {
  toggling.value = product.id;
  try {
    const { id, ...data } = product;
    await catalog.save(id, { ...data, active: !product.active });
    toast.success(`${product.name} ${product.active ? 'indisponível' : 'disponível'} no caixa.`);
  } catch (err) {
    toast.error(errorMessage(err));
  } finally {
    toggling.value = null;
  }
}

async function remove(product: Product) {
  const ok = await dialog.confirm({
    title: `Excluir "${product.name}"?`,
    message: 'O item sai do cardápio. Pedidos já feitos com ele não são alterados.',
    confirmLabel: 'Excluir',
    tone: 'danger',
  });
  if (!ok) return;
  try {
    await catalog.remove(product.id);
    toast.success('Item excluído.');
  } catch (err) {
    toast.error(errorMessage(err));
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-6 sm:px-8">
    <PageHeader
      title="Cardápio"
      :description="`${catalog.products.length} itens${unavailableCount ? ` · ${unavailableCount} indisponível(is)` : ''}`"
    >
      <template #actions>
        <BaseButton @click="openEditor(null)"
          ><PhPlus class="size-5" weight="bold" aria-hidden="true" /> Novo item</BaseButton
        >
      </template>
    </PageHeader>

    <div class="mb-4 flex flex-wrap gap-3">
      <div class="relative min-w-60 flex-1">
        <PhMagnifyingGlass
          class="absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-stone-400"
          aria-hidden="true"
        />
        <input
          v-model="search"
          type="search"
          class="input pl-11"
          placeholder="Buscar item"
          aria-label="Buscar item"
        />
      </div>
      <select v-model="category" class="input w-auto font-semibold" aria-label="Filtrar por categoria">
        <option value="">Todas as categorias</option>
        <option v-for="c in catalog.categories" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>

    <div class="card overflow-x-auto">
      <table v-if="visible.length" class="data-table">
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col">Categoria</th>
            <th scope="col" class="text-right">Preço</th>
            <th scope="col">Disponível</th>
            <th scope="col"><span class="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in visible" :key="p.id" :class="!p.active && 'opacity-60'">
            <td>
              <div class="flex items-center gap-3">
                <span
                  class="flex size-11 shrink-0 items-center justify-center rounded-xl"
                  :class="categoryVisual(p.category).tile"
                  aria-hidden="true"
                >
                  <component
                    :is="categoryVisual(p.category).icon"
                    class="size-6"
                    :class="categoryVisual(p.category).iconClass"
                    weight="duotone"
                  />
                </span>
                <div class="min-w-0">
                  <p class="font-semibold text-stone-900">{{ p.name }}</p>
                  <p v-if="p.description" class="truncate text-xs text-stone-500">{{ p.description }}</p>
                </div>
              </div>
            </td>
            <td class="text-stone-600">{{ p.category }}</td>
            <td class="text-right font-display font-semibold text-stone-900 tabular-nums">
              {{ formatCents(p.priceCents) }}
            </td>
            <td>
              <button
                type="button"
                role="switch"
                :aria-checked="p.active"
                :aria-label="`${p.name} disponível para venda`"
                :disabled="toggling === p.id"
                class="relative inline-flex h-7 w-12 items-center rounded-full transition-colors disabled:opacity-50"
                :class="p.active ? 'bg-emerald-500' : 'bg-stone-300'"
                @click="toggleActive(p)"
              >
                <span
                  class="inline-block size-5 rounded-full bg-white shadow transition-transform"
                  :class="p.active ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </td>
            <td>
              <div class="flex justify-end gap-1">
                <BaseButton
                  size="sm"
                  variant="ghost"
                  :aria-label="`Editar ${p.name}`"
                  title="Editar"
                  @click="openEditor(p)"
                >
                  <PhPencilSimple class="size-5" aria-hidden="true" />
                </BaseButton>
                <BaseButton
                  size="sm"
                  variant="ghost"
                  :aria-label="`Excluir ${p.name}`"
                  title="Excluir"
                  @click="remove(p)"
                >
                  <PhTrash class="size-5 text-brand-600" aria-hidden="true" />
                </BaseButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <EmptyState
        v-else
        :title="catalog.products.length ? 'Nenhum item encontrado' : 'Cardápio vazio'"
        :description="catalog.products.length ? undefined : 'Comece cadastrando o primeiro item.'"
      >
        <BaseButton v-if="!catalog.products.length" @click="openEditor(null)">
          <PhPlus class="size-5" weight="bold" aria-hidden="true" /> Cadastrar item
        </BaseButton>
      </EmptyState>
    </div>

    <ProductFormModal :open="modalOpen" :product="editing" @close="modalOpen = false" />
  </div>
</template>
