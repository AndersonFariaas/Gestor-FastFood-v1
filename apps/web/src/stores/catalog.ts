import type { Product, ProductInput } from '@fastfood/shared';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api } from '@/services/api';

const byCategoryThenName = (a: Product, b: Product) =>
  a.category.localeCompare(b.category, 'pt-BR') || a.name.localeCompare(b.name, 'pt-BR');

export const useCatalogStore = defineStore('catalog', () => {
  const products = ref<Product[]>([]);
  const loaded = ref(false);

  const sorted = computed(() => [...products.value].sort(byCategoryThenName));
  const available = computed(() => sorted.value.filter((p) => p.active));
  const categories = computed(() =>
    [...new Set(products.value.map((p) => p.category))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
  );

  async function load() {
    products.value = await api.products.list();
    loaded.value = true;
  }

  async function save(id: string | null, input: ProductInput) {
    const product = id ? await api.products.update(id, input) : await api.products.create(input);
    upsert(product);
    return product;
  }

  async function remove(id: string) {
    await api.products.remove(id);
    removeLocal(id);
  }

  function upsert(product: Product) {
    const index = products.value.findIndex((p) => p.id === product.id);
    if (index === -1) products.value.push(product);
    else products.value[index] = product;
  }

  function removeLocal(id: string) {
    products.value = products.value.filter((p) => p.id !== id);
  }

  return { products, loaded, sorted, available, categories, load, save, remove, upsert, removeLocal };
});
