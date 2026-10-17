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
  <div class="mx-auto max-w-7xl p-4 sm:p-8">
    <PageHeader
      title="Pedidos"
      :description="
        viewingPast
          ? 'Consulta de turno encerrado (somente leitura).'
          : 'Acompanhe e finalize os pedidos do turno atual.'
      "
    >
      <template v-if="auth.isAdmin && history.length" #actions>
        <label class="sr-only" for="shift">Turno</label>
        <select id="shift" v-model="shiftId" class="input w-auto">
          <option :value="null">Turno atual</option>
          <option v-for="h in history" :key="h.shift.id" :value="h.shift.id">
            Turno de {{ formatDateTime(h.shift.openedAt) }}
          </option>
        </select>
      </template>
    </PageHeader>

    <div class="mb-6 grid gap-4 sm:grid-cols-3">
      <StatCard label="Pedidos" :value="source.length">
        <template #icon><PhReceipt /></template>
      </StatCard>
      <StatCard label="Em andamento" :value="inProgress" tone="brand">
        <template #icon><PhCookingPot /></template>
      </StatCard>
      <StatCard label="Entregues (faturado)" :value="formatCents(deliveredCents)" tone="success">
        <template #icon><PhCurrencyDollar /></template>
      </StatCard>
    </div>

    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div
        class="flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1"
        role="group"
        aria-label="Filtrar por status"
      >
        <button
          v-for="s in [null, ...ORDER_STATUSES]"
          :key="s ?? 'all'"
          type="button"
          class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
          :class="filter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'"
          :aria-pressed="filter === s"
          @click="filter = s"
        >
          {{ s ? ORDER_STATUS_LABELS[s] : 'Todos' }}
          <span class="ml-1 text-xs text-gray-400 tabular-nums">{{ s ? counts[s] : source.length }}</span>
        </button>
      </div>
      <div class="relative w-full sm:w-64">
        <PhMagnifyingGlass class="absolute top-2.5 left-3 size-5 text-gray-400" aria-hidden="true" />
        <input
          v-model="search"
          type="search"
          class="input pl-10"
          placeholder="Senha ou cliente..."
          aria-label="Buscar pedido"
        />
      </div>
    </div>

    <div class="card overflow-x-auto">
      <table v-if="visible.length" class="w-full text-left text-sm">
        <thead class="border-b border-gray-200 bg-gray-50 text-gray-600">
          <tr>
            <th scope="col" class="p-4 font-semibold">Senha</th>
            <th scope="col" class="p-4 font-semibold">Hora</th>
            <th scope="col" class="p-4 font-semibold">Cliente</th>
            <th scope="col" class="p-4 font-semibold">Itens</th>
            <th scope="col" class="p-4 font-semibold">Pagamento</th>
            <th scope="col" class="p-4 font-semibold">Status</th>
            <th scope="col" class="p-4 text-right font-semibold">Total</th>
            <th v-if="!viewingPast" scope="col" class="p-4"><span class="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="o in visible" :key="o.id" class="hover:bg-gray-50">
            <td class="p-4 font-bold text-gray-900 tabular-nums">#{{ o.number }}</td>
            <td class="p-4 text-gray-500 tabular-nums">{{ formatTime(o.createdAt) }}</td>
            <td class="p-4 font-medium text-gray-800">{{ o.customer }}</td>
            <td class="max-w-xs p-4 text-gray-500">
              <p class="truncate" :title="itemsText(o)">{{ itemsText(o) }}</p>
              <p v-if="o.note" class="truncate text-xs text-brand-600">Obs: {{ o.note }}</p>
              <p v-if="o.cancelReason" class="truncate text-xs text-red-600">Motivo: {{ o.cancelReason }}</p>
            </td>
            <td class="p-4 text-gray-600">{{ PAYMENT_METHOD_LABELS[o.paymentMethod] }}</td>
            <td class="p-4"><StatusBadge :status="o.status" /></td>
            <td class="p-4 text-right font-semibold text-gray-900 tabular-nums">
              {{ formatCents(o.totalCents) }}
            </td>
            <td v-if="!viewingPast" class="p-4">
              <div class="flex justify-end gap-2">
                <BaseButton
                  v-if="o.status === 'PRONTO'"
                  size="sm"
                  variant="success"
                  :loading="busyId === o.id"
                  @click="deliver(o)"
                >
                  <PhCheck class="size-4" aria-hidden="true" /> Entregar
                </BaseButton>
                <BaseButton
                  v-if="canCancel(o)"
                  size="sm"
                  variant="ghost"
                  :disabled="busyId === o.id"
                  :aria-label="`Cancelar pedido ${o.number}`"
                  @click="cancel(o)"
                >
                  <PhProhibit class="size-4 text-red-500" aria-hidden="true" />
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
