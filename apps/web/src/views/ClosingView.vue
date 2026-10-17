<script setup lang="ts">
import {
  formatCents,
  OPEN_ORDER_STATUSES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  type PaymentMethod,
  type ShiftSummary,
} from '@fastfood/shared';
import {
  PhCheckCircle,
  PhClockCounterClockwise,
  PhCookingPot,
  PhCreditCard,
  PhCurrencyDollar,
  PhLockKey,
  PhMoney,
  PhPixLogo,
  PhTicket,
  PhXCircle,
} from '@phosphor-icons/vue';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import StatCard from '@/components/ui/StatCard.vue';
import { useDialog } from '@/composables/useDialog';
import { useToast } from '@/composables/useToast';
import { api } from '@/services/api';
import { errorMessage } from '@/services/http';
import { useOrdersStore } from '@/stores/orders';
import { formatDateTime } from '@/utils/format';

const orders = useOrdersStore();
const dialog = useDialog();
const toast = useToast();

const summary = ref<ShiftSummary | null>(null);
const history = ref<ShiftSummary[]>([]);
const closing = ref(false);

const PAYMENT_ICONS: Record<PaymentMethod, typeof PhMoney> = {
  CREDITO: PhCreditCard,
  DEBITO: PhCreditCard,
  PIX: PhPixLogo,
  DINHEIRO: PhMoney,
  VALE: PhTicket,
  NAO_INFORMADO: PhMoney,
};

const openCount = computed(() =>
  summary.value ? OPEN_ORDER_STATUSES.reduce((n, s) => n + summary.value!.counts[s], 0) : 0,
);
const paymentMethods = computed<PaymentMethod[]>(() => {
  const extra = summary.value?.byPaymentMethod.NAO_INFORMADO ? (['NAO_INFORMADO'] as const) : [];
  return [...PAYMENT_METHODS, ...extra];
});

async function load() {
  try {
    [summary.value, history.value] = await Promise.all([api.shifts.current(), api.shifts.history()]);
  } catch (err) {
    toast.error(errorMessage(err));
  }
}

onMounted(load);

// Os números acompanham, em tempo real, os pedidos do turno (agrupando rajadas de eventos).
let reloadTimer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => orders.orders,
  () => {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(load, 400);
  },
  { deep: true },
);
onBeforeUnmount(() => clearTimeout(reloadTimer));

async function closeShift() {
  const ok = await dialog.confirm({
    title: 'Encerrar o turno?',
    message: `Faturamento: ${formatCents(summary.value?.revenueCents ?? 0)}. As telas serão zeradas e a numeração das senhas reinicia.`,
    confirmLabel: 'Encerrar turno',
    tone: 'danger',
  });
  if (!ok) return;
  closing.value = true;
  try {
    await api.shifts.closeCurrent();
    toast.success('Turno encerrado. Um novo turno foi aberto.');
    await load();
  } catch (err) {
    toast.error(errorMessage(err));
  } finally {
    closing.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 sm:p-8">
    <PageHeader
      title="Fechamento de caixa"
      :description="summary ? `Turno aberto em ${formatDateTime(summary.shift.openedAt)}` : undefined"
    >
      <template #actions>
        <BaseButton
          variant="danger"
          :loading="closing"
          :disabled="!summary || openCount > 0"
          @click="closeShift"
        >
          <PhLockKey class="size-4" aria-hidden="true" /> Encerrar turno
        </BaseButton>
      </template>
    </PageHeader>

    <p
      v-if="openCount > 0"
      class="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
      role="status"
    >
      Há <strong>{{ openCount }}</strong> pedido(s) em andamento ({{ formatCents(summary?.openCents ?? 0) }}).
      Entregue ou cancele em
      <RouterLink to="/pedidos" class="font-semibold underline">Pedidos</RouterLink> para encerrar o turno.
    </p>

    <template v-if="summary">
      <div class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Faturamento"
          :value="formatCents(summary.revenueCents)"
          tone="success"
          hint="Pedidos entregues"
        >
          <template #icon><PhCurrencyDollar /></template>
        </StatCard>
        <StatCard label="Entregues" :value="summary.counts.ENTREGUE">
          <template #icon><PhCheckCircle /></template>
        </StatCard>
        <StatCard label="Em andamento" :value="openCount" tone="brand" :hint="formatCents(summary.openCents)">
          <template #icon><PhCookingPot /></template>
        </StatCard>
        <StatCard label="Cancelados" :value="summary.counts.CANCELADO" tone="danger">
          <template #icon><PhXCircle /></template>
        </StatCard>
      </div>

      <h2 class="mb-3 text-lg font-bold text-gray-900">Por forma de pagamento</h2>
      <div class="mb-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <div v-for="m in paymentMethods" :key="m" class="card flex flex-col items-center p-5 text-center">
          <div class="mb-3 flex size-11 items-center justify-center rounded-full bg-brand-50 text-brand-500">
            <component :is="PAYMENT_ICONS[m]" class="size-6" aria-hidden="true" />
          </div>
          <p class="text-sm font-semibold text-gray-700">{{ PAYMENT_METHOD_LABELS[m] }}</p>
          <p class="mt-1 text-xl font-black text-green-600 tabular-nums">
            {{ formatCents(summary.byPaymentMethod[m] ?? 0) }}
          </p>
        </div>
      </div>
    </template>

    <h2 class="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900">
      <PhClockCounterClockwise class="size-5" aria-hidden="true" /> Turnos anteriores
    </h2>
    <div class="card overflow-x-auto">
      <table v-if="history.length" class="w-full text-left text-sm">
        <thead class="border-b border-gray-200 bg-gray-50 text-gray-600">
          <tr>
            <th scope="col" class="p-4 font-semibold">Abertura</th>
            <th scope="col" class="p-4 font-semibold">Fechamento</th>
            <th scope="col" class="p-4 text-right font-semibold">Entregues</th>
            <th scope="col" class="p-4 text-right font-semibold">Cancelados</th>
            <th scope="col" class="p-4 text-right font-semibold">Faturamento</th>
            <th scope="col" class="p-4"><span class="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="h in history" :key="h.shift.id" class="hover:bg-gray-50">
            <td class="p-4 text-gray-700">{{ formatDateTime(h.shift.openedAt) }}</td>
            <td class="p-4 text-gray-700">{{ h.shift.closedAt && formatDateTime(h.shift.closedAt) }}</td>
            <td class="p-4 text-right tabular-nums">{{ h.counts.ENTREGUE }}</td>
            <td class="p-4 text-right tabular-nums">{{ h.counts.CANCELADO }}</td>
            <td class="p-4 text-right font-semibold text-gray-900 tabular-nums">
              {{ formatCents(h.revenueCents) }}
            </td>
            <td class="p-4 text-right">
              <RouterLink
                :to="{ path: '/pedidos', query: { turno: h.shift.id } }"
                class="text-sm font-medium text-brand-600 hover:underline"
              >
                Ver pedidos
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
      <EmptyState v-else title="Nenhum turno encerrado ainda" />
    </div>
  </div>
</template>
