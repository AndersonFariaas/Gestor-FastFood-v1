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
  PhLockKey,
  PhWarning,
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
import { PAYMENT_ICONS } from '@/utils/visuals';

const orders = useOrdersStore();
const dialog = useDialog();
const toast = useToast();

const summary = ref<ShiftSummary | null>(null);
const history = ref<ShiftSummary[]>([]);
const closing = ref(false);

const openCount = computed(() =>
  summary.value ? OPEN_ORDER_STATUSES.reduce((n, s) => n + summary.value!.counts[s], 0) : 0,
);

/** Formas atuais sempre aparecem; as antigas (vale, não informado) só se tiverem valor no turno. */
const payments = computed(() => {
  const by = summary.value?.byPaymentMethod ?? {};
  const legacy = (['VALE', 'NAO_INFORMADO'] as const).filter((m) => by[m]);
  const revenue = summary.value?.revenueCents ?? 0;
  return ([...PAYMENT_METHODS, ...legacy] as PaymentMethod[]).map((method) => {
    const cents = by[method] ?? 0;
    return { method, cents, share: revenue ? Math.round((cents / revenue) * 100) : 0 };
  });
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
    message: `Faturamento de ${formatCents(summary.value?.revenueCents ?? 0)}. As telas serão zeradas e as senhas voltam para 1.`,
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
  <div class="mx-auto max-w-6xl px-4 py-6 sm:px-8">
    <PageHeader
      title="Caixa do dia"
      :description="summary ? `Turno aberto em ${formatDateTime(summary.shift.openedAt)}` : 'Carregando...'"
    >
      <template #actions>
        <BaseButton
          variant="dark"
          :loading="closing"
          :disabled="!summary || openCount > 0"
          @click="closeShift"
        >
          <PhLockKey class="size-5" aria-hidden="true" /> Encerrar turno
        </BaseButton>
      </template>
    </PageHeader>

    <div
      v-if="openCount > 0"
      class="mb-6 flex items-start gap-3 rounded-2xl bg-accent-100 px-4 py-3 text-sm text-amber-900 ring-1 ring-accent-300"
      role="status"
    >
      <PhWarning class="mt-0.5 size-5 shrink-0" weight="fill" aria-hidden="true" />
      <p>
        <strong>{{ openCount }} pedido(s) em andamento</strong> ({{ formatCents(summary?.openCents ?? 0) }}).
        Entregue ou cancele em
        <RouterLink to="/pedidos" class="font-semibold underline">Pedidos</RouterLink> para encerrar o turno.
      </p>
    </div>

    <template v-if="summary">
      <div class="mb-8 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <!-- Faturamento + formas de pagamento -->
        <section class="relative overflow-hidden rounded-3xl bg-ink p-6 text-white shadow-card sm:p-8">
          <div
            class="absolute -top-16 -right-16 size-56 rounded-full bg-brand-600/30 blur-2xl"
            aria-hidden="true"
          />
          <p class="relative text-sm font-semibold tracking-wider text-stone-400 uppercase">
            Faturamento do turno
          </p>
          <p class="relative mt-1 font-display text-5xl font-bold text-accent-400 tabular-nums">
            {{ formatCents(summary.revenueCents) }}
          </p>
          <p class="relative mt-1 text-sm text-stone-400">Soma dos pedidos entregues</p>

          <ul class="relative mt-6 space-y-3">
            <li v-for="p in payments" :key="p.method">
              <div class="mb-1 flex items-center justify-between text-sm">
                <span class="flex items-center gap-2 font-medium text-stone-200">
                  <component
                    :is="PAYMENT_ICONS[p.method]"
                    class="size-5 text-accent-400"
                    aria-hidden="true"
                  />
                  {{ PAYMENT_METHOD_LABELS[p.method] }}
                </span>
                <span class="font-display font-semibold tabular-nums">{{ formatCents(p.cents) }}</span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  class="h-full rounded-full bg-accent-400 transition-all duration-500"
                  :style="{ width: `${p.share}%` }"
                />
              </div>
            </li>
          </ul>
        </section>

        <div class="grid content-start gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <StatCard label="Pedidos entregues" :value="summary.counts.ENTREGUE" tone="success">
            <template #icon><PhCheckCircle weight="fill" /></template>
          </StatCard>
          <StatCard
            label="Em andamento"
            :value="openCount"
            tone="accent"
            :hint="formatCents(summary.openCents)"
          >
            <template #icon><PhCookingPot weight="fill" /></template>
          </StatCard>
          <StatCard label="Cancelados" :value="summary.counts.CANCELADO" tone="muted">
            <template #icon><PhXCircle weight="fill" /></template>
          </StatCard>
        </div>
      </div>
    </template>

    <h2 class="mb-3 flex items-center gap-2 font-display text-xl font-bold text-stone-900">
      <PhClockCounterClockwise class="size-6 text-stone-400" aria-hidden="true" /> Turnos anteriores
    </h2>
    <div class="card overflow-x-auto">
      <table v-if="history.length" class="data-table">
        <thead>
          <tr>
            <th scope="col">Abertura</th>
            <th scope="col">Fechamento</th>
            <th scope="col" class="text-right">Entregues</th>
            <th scope="col" class="text-right">Cancelados</th>
            <th scope="col" class="text-right">Faturamento</th>
            <th scope="col"><span class="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="h in history" :key="h.shift.id">
            <td class="text-stone-700">{{ formatDateTime(h.shift.openedAt) }}</td>
            <td class="text-stone-700">{{ h.shift.closedAt && formatDateTime(h.shift.closedAt) }}</td>
            <td class="text-right tabular-nums">{{ h.counts.ENTREGUE }}</td>
            <td class="text-right tabular-nums">{{ h.counts.CANCELADO }}</td>
            <td class="text-right font-display font-semibold text-stone-900 tabular-nums">
              {{ formatCents(h.revenueCents) }}
            </td>
            <td class="text-right">
              <RouterLink
                :to="{ path: '/pedidos', query: { turno: h.shift.id } }"
                class="font-semibold text-brand-600 hover:underline"
              >
                Ver pedidos
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
      <EmptyState
        v-else
        title="Nenhum turno encerrado ainda"
        description="Os turnos fechados aparecem aqui."
      />
    </div>
  </div>
</template>
