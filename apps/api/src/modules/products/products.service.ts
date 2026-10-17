import { randomUUID } from 'node:crypto';
import type { Product } from '@fastfood/shared';
import { notFound } from '../../lib/errors.ts';
import type { EventBus } from '../../lib/events.ts';
import type { ProductData, ProductsRepository } from './products.repository.ts';

interface Deps {
  products: ProductsRepository;
  bus: EventBus;
}

export function createProductsService({ products, bus }: Deps) {
  const saved = (id: string): Product => {
    const product = products.findById(id);
    if (!product) throw notFound('Produto não encontrado.');
    bus.emit('product:saved', product);
    return product;
  };

  return {
    list: (): Product[] => products.list(),

    create(data: ProductData): Product {
      const id = randomUUID();
      products.insert(id, data);
      return saved(id);
    },

    update(id: string, data: ProductData): Product {
      if (!products.update(id, data)) throw notFound('Produto não encontrado.');
      return saved(id);
    },

    remove(id: string): void {
      if (!products.softDelete(id)) throw notFound('Produto não encontrado.');
      bus.emit('product:deleted', { id });
    },
  };
}

export type ProductsService = ReturnType<typeof createProductsService>;
