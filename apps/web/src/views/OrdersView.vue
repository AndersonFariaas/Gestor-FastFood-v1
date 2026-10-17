<script setup lang="ts">
import {
  formatCents,
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  PAYMENT_METHOD_LABELS,
  type Order,
  type OrderStatus,
  type ShiftSummary,
} from '@fastfood/shared';
import {
  PhCheck,
  PhCookingPot,
  PhCurrencyDollar,
  PhMagnifyingGlass,
  PhProhibit,
  PhReceipt,
} from '@phosphor-icons/vue';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BaseButton from '@/components/ui/BaseButton.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import StatCard from '@/components/ui/StatCard.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { useDialog } from '@/composables/useDialog';
import { useToast } from '@/composables/useToast';
import { api } from '@/services/api';
import { errorMessage } from '@/services/http';
import { useAuthStore } from '@/stores/auth';
import { useOrdersStore } from '@/stores/orders';
import { formatDateTime, formatTime, normalize } from '@/utils/format';
import { PAYMENT_ICONS } from '@/utils/visuals';

const auth = useAuthStore();
const store = useOrdersStore();
const route = useRoute();
const router = useRouter();
const dialog = useDialog();
const toast = useToast();

const isStatus = (v: unknown): v is OrderStatus => ORDER_STATUSES.includes(v as OrderStatus);

const filter = ref<OrderStatus | null>(isStatus(route.query.status) ? route.query.status : null);
const search = ref('');
const busyId = ref<string | null>(null);

// Gerência pode consultar turnos anteriores (somente leitura).
const shiftId = ref<string | null>(typeof route.query.turno === 'string' ? route.query.turno : null);
const history = ref<ShiftSummary[]>([]);
const pastOrders = ref<Order[]>([]);
const loadingPast = ref(false);

const viewingPast = computed(() => shiftId.value !== null);
const source = computed(() => (viewingPast.value ? pastOrders.value : store.sorted));

const counts = computed(() => {
  const c = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;
  for (const o of source.value) c[o.status]++;
  return c;
});
const deliveredCents = computed(() =>
  source.value.filter((o) => o.status === 'ENTREGUE').reduce((s, o) => s + o.totalCents, 0),
);
const inProgress = computed(() => counts.value.NOVO + counts.value.EM_PREPARO + counts.value.PRONTO);

const visible = computed(() => {
  const q = normalize(search.value.trim());
  return [...source.value]
    .reverse()
    .filter((o) => !filter.value || o.status === filter.value)
    .filter((o) => !q || String(o.number) === q || normalize(o.customer).includes(q));
});

const itemsText = (o: Order) => o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ');

watch([filter, shiftId], () => {
  void router.replace({
    query: { ...(filter.value && { status: filter.value }), ...(shiftId.value && { turno: shiftId.value }) },
  });
});

watch(
  shiftId,
  async (id) => {
    if (!id) return;
    loadingPast.value = true;
    try {
      pastOrders.value = await api.orders.list(id);
    } catch (err) {
      toast.error(errorMessage(err));
      shiftId.value = null;
    } finally {
      loadingPast.value = false;
    }
  },
  { immediate: true },
);

onMounted(async () => {
  if (auth.isAdmin) history.value = await api.shifts.history().catch(() => []);
});

async function deliver(order: Order) {
  busyId.value = order.id;
  try {
    await store.setStatus(order.id, 'ENTREGUE');
    toast.success(`Pedido #${order.number} entregue.`);
  } catch (err) {
    toast.error(errorMessage(err));
  } finally {
    busyId.value = null;
  }
}

async function cancel(order: Order) {
  const reason = await dialog.prompt({
    title: `Cancelar pedido #${order.number}?`,
    message: `${order.customer} — ${formatCents(order.totalCents)}. O valor sai do faturamento do turno.`,
    input: { label: 'Motivo do cancelamento', placeholder: 'Ex.: cliente desistiu' },
    confirmLabel: 'Cancelar pedido',
    tone: 'danger',
  });
  if (!reason) return;
  busyId.value = order.id;
  try {
    await store.setStatus(order.id, 'CANCELADO', reason);
    toast.success(`Pedido #${order.number} cancelado.`);
  } catch (err) {
    toast.error(errorMessage(err));
  } finally {
    busyId.value = null;
  }
}

const canCancel = (o: Order) =>
  auth.isAdmin && !viewingPast.value && !['ENTREGUE', 'CANCELADO'].includes(o.status);
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-6 sm:px-8">
    <PageHeader
      title="Pedidos"
      :description="
        viewingPast
          ? 'Consulta de turno encerrado (somente leitura).'
          : 'Acompanhe e finalize os pedidos do turno.'
      "
    >
      <template v-if="auth.isAdmin && history.length" #actions>
        <label class="sr-only" for="shift">Turno</label>
        <select id="shift" v-model="shiftId" class="input w-auto font-semibold">
          <option :value="null">Turno atual</option>
          <option v-for="h in history" :key="h.shift.id" :value="h.shift.id">
            Turno de {{ formatDateTime(h.shift.openedAt) }}
          </option>
        </select>
      </template>
    </PageHeader>

    <div class="mb-6 grid gap-4 sm:grid-cols-3">
      <StatCard label="Pedidos" :value="source.length">
        <template #icon><PhReceipt weight="fill" /></template>
      </StatCard>
      <StatCard label="Em andamento" :value="inProgress" tone="accent">
        <template #icon><PhCookingPot weight="fill" /></template>
      </StatCard>
      <StatCard label="Faturado (entregues)" :value="formatCents(deliveredCents)" tone="success">
        <template #icon><PhCurrencyDollar weight="bold" /></template>
      </StatCard>
    </div>

    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div
        class="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1 py-1"
        role="group"
        aria-label="Filtrar por status"
      >
        <button
          v-for="s in [null, ...ORDER_STATUSES]"
          :key="s ?? 'all'"
          type="button"
          class="flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all"
          :class="
            filter === s
              ? 'bg-stone-900 text-white shadow-md'
              : 'bg-white text-stone-600 ring-1 ring-stone-900/5 hover:bg-stone-50'
          "
          :aria-pressed="filter === s"
          @click="filter = s"
        >
          {{ s ? ORDER_STATUS_LABELS[s] : 'Todos' }}
          <span
            class="rounded-full px-1.5 text-xs tabular-nums"
            :class="filter === s ? 'bg-white/20' : 'bg-stone-100 text-stone-500'"
          >
            {{ s ? counts[s] : source.length }}
          </span>
        </button>
      </div>
      <div class="relative w-full sm:w-72">
        <PhMagnifyingGlass
          class="absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-stone-400"
          aria-hidden="true"
        />
        <input
          v-model="search"
          type="search"
          class="input pl-11"
          placeholder="Buscar por senha ou cliente"
          aria-label="Buscar pedido"
        />
      </div>
    </div>

    <div class="card overflow-x-auto">
      <table v-if="visible.length" class="data-table">
        <thead>
          <tr>
            <th scope="col">Senha</th>
            <th scope="col">Hora</th>
            <th scope="col">Cliente</th>
            <th scope="col">Itens</th>
            <th scope="col">Pagamento</th>
            <th scope="col">Status</th>
            <th scope="col" class="text-right">Total</th>
            <th v-if="!viewingPast" scope="col"><span class="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in visible" :key="o.id" :class="o.status === 'PRONTO' && 'bg-brand-50/40'">
            <td>
              <span class="font-display text-lg font-bold text-stone-900 tabular-nums">{{ o.number }}</span>
            </td>
            <td class="text-stone-500 tabular-nums">{{ formatTime(o.createdAt) }}</td>
            <td class="font-semibold text-stone-800">{{ o.customer }}</td>
            <td class="max-w-xs text-stone-500">
              <p class="truncate" :title="itemsText(o)">{{ itemsText(o) }}</p>
              <p v-if="o.note" class="truncate text-xs font-medium text-amber-700">Obs: {{ o.note }}</p>
              <p v-if="o.cancelReason" class="truncate text-xs font-medium text-brand-700">
                Motivo: {{ o.cancelReason }}
              </p>
            </td>
            <td class="text-stone-600">
              <span class="inline-flex items-center gap-1.5">
                <component
                  :is="PAYMENT_ICONS[o.paymentMethod]"
                  class="size-4 text-stone-400"
                  aria-hidden="true"
                />
                {{ PAYMENT_METHOD_LABELS[o.paymentMethod] }}
              </span>
            </td>
            <td><StatusBadge :status="o.status" /></td>
            <td class="text-right font-display font-semibold text-stone-900 tabular-nums">
              {{ formatCents(o.totalCents) }}
            </td>
            <td v-if="!viewingPast">
              <div class="flex justify-end gap-1">
                <BaseButton
                  v-if="o.status === 'PRONTO'"
                  size="sm"
                  variant="success"
                  :loading="busyId === o.id"
                  @click="deliver(o)"
                >
                  <PhCheck class="size-4" weight="bold" aria-hidden="true" /> Entregar
                </BaseButton>
                <BaseButton
                  v-if="canCancel(o)"
                  size="sm"
                  variant="ghost"
                  :disabled="busyId === o.id"
                  :aria-label="`Cancelar pedido ${o.number}`"
                  title="Cancelar pedido"
                  @click="cancel(o)"
                >
                  <PhProhibit class="size-5 text-brand-600" aria-hidden="true" />
                </BaseButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <EmptyState
        v-else
        :title="loadingPast ? 'Carregando...' : 'Nenhum pedido encontrado'"
        :description="
          !loadingPast && !source.length ? 'Os pedidos enviados pelo caixa aparecem aqui.' : undefined
        "
      />
    </div>
  </div>
</template>
