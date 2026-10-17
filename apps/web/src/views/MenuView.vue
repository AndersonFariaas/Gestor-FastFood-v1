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

const catalog = useCatalogStore();
const dialog = useDialog();
const toast = useToast();

const search = ref('');
const category = ref('');
const editing = ref<Product | null>(null);
const modalOpen = ref(false);

const visible = computed(() => {
  const q = normalize(search.value.trim());
  return catalog.sorted.filter(
    (p) => (!category.value || p.category === category.value) && (!q || normalize(p.name).includes(q)),
  );
});

function openEditor(product: Product | null) {
  editing.value = product;
  modalOpen.value = true;
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
  <div class="mx-auto max-w-6xl p-4 sm:p-8">
    <PageHeader title="Cardápio" description="Gerencie os itens, preços e disponibilidade.">
      <template #actions>
        <BaseButton @click="openEditor(null)"
          ><PhPlus class="size-4" aria-hidden="true" /> Novo item</BaseButton
        >
      </template>
    </PageHeader>

    <div class="mb-4 flex flex-wrap gap-3">
      <div class="relative min-w-60 flex-1">
        <PhMagnifyingGlass class="absolute top-2.5 left-3 size-5 text-gray-400" aria-hidden="true" />
        <input
          v-model="search"
          type="search"
          class="input pl-10"
          placeholder="Buscar item..."
          aria-label="Buscar item"
        />
      </div>
      <select v-model="category" class="input w-auto" aria-label="Filtrar por categoria">
        <option value="">Todas as categorias</option>
        <option v-for="c in catalog.categories" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>

    <div class="card overflow-x-auto">
      <table v-if="visible.length" class="w-full text-left text-sm">
        <thead class="border-b border-gray-200 bg-gray-50 text-gray-600">
          <tr>
            <th scope="col" class="p-4 font-semibold">Item</th>
            <th scope="col" class="p-4 font-semibold">Categoria</th>
            <th scope="col" class="p-4 text-right font-semibold">Preço</th>
            <th scope="col" class="p-4 font-semibold">Status</th>
            <th scope="col" class="p-4"><span class="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="p in visible" :key="p.id" class="hover:bg-gray-50">
            <td class="p-4">
              <p class="font-semibold text-gray-900">{{ p.name }}</p>
              <p v-if="p.description" class="text-gray-500">{{ p.description }}</p>
            </td>
            <td class="p-4 text-gray-600">{{ p.category }}</td>
            <td class="p-4 text-right font-semibold text-gray-900 tabular-nums">
              {{ formatCents(p.priceCents) }}
            </td>
            <td class="p-4">
              <span
                class="rounded-md px-2 py-0.5 text-xs font-bold"
                :class="p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
              >
                {{ p.active ? 'Disponível' : 'Indisponível' }}
              </span>
            </td>
            <td class="p-4">
              <div class="flex justify-end gap-1">
                <BaseButton size="sm" variant="ghost" :aria-label="`Editar ${p.name}`" @click="openEditor(p)">
                  <PhPencilSimple class="size-4 text-blue-600" aria-hidden="true" />
                </BaseButton>
                <BaseButton size="sm" variant="ghost" :aria-label="`Excluir ${p.name}`" @click="remove(p)">
                  <PhTrash class="size-4 text-red-500" aria-hidden="true" />
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
      />
    </div>

    <ProductFormModal :open="modalOpen" :product="editing" @close="modalOpen = false" />
  </div>
</template>
