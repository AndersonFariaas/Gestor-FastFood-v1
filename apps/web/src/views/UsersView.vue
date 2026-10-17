<script setup lang="ts">
import { ROLE_LABELS, ROLES, type Role, type User } from '@fastfood/shared';
import { PhKey, PhPlus, PhTrash } from '@phosphor-icons/vue';
import { onMounted, reactive, ref } from 'vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import { useDialog } from '@/composables/useDialog';
import { useToast } from '@/composables/useToast';
import { api } from '@/services/api';
import { errorMessage } from '@/services/http';
import { useAuthStore } from '@/stores/auth';
import { formatDateTime } from '@/utils/format';

const MIN_PASSWORD = 8;

const auth = useAuthStore();
const dialog = useDialog();
const toast = useToast();

const users = ref<User[]>([]);
const modalOpen = ref(false);
const saving = ref(false);
const formError = ref('');
const form = reactive({ username: '', password: '', role: 'operator' as Role });

async function load() {
  try {
    users.value = await api.users.list();
  } catch (err) {
    toast.error(errorMessage(err));
  }
}
onMounted(load);

function openCreate() {
  Object.assign(form, { username: '', password: '', role: 'operator' });
  formError.value = '';
  modalOpen.value = true;
}

async function create() {
  saving.value = true;
  formError.value = '';
  try {
    await api.users.create({ username: form.username.trim(), password: form.password, role: form.role });
    toast.success(
      `Usuário "${form.username.trim()}" criado. Ele definirá a própria senha no primeiro acesso.`,
    );
    modalOpen.value = false;
    await load();
  } catch (err) {
    formError.value = errorMessage(err);
  } finally {
    saving.value = false;
  }
}

async function run(action: () => Promise<unknown>, success: string) {
  try {
    await action();
    toast.success(success);
  } catch (err) {
    toast.error(errorMessage(err));
  }
  await load();
}

async function changeRole(user: User, role: Role) {
  await run(() => api.users.update(user.id, { role }), `Perfil de "${user.username}" alterado.`);
}

async function resetPassword(user: User) {
  const password = await dialog.prompt({
    title: `Redefinir senha de "${user.username}"`,
    message: 'Informe uma senha provisória. O usuário precisará trocá-la no próximo acesso.',
    input: { label: 'Senha provisória', type: 'password', minLength: MIN_PASSWORD },
    confirmLabel: 'Redefinir',
  });
  if (password) await run(() => api.users.update(user.id, { password }), 'Senha redefinida.');
}

async function remove(user: User) {
  const ok = await dialog.confirm({
    title: `Remover "${user.username}"?`,
    message: 'O usuário perde o acesso imediatamente. Os pedidos registrados por ele são mantidos.',
    confirmLabel: 'Remover',
    tone: 'danger',
  });
  if (ok) await run(() => api.users.remove(user.id), 'Usuário removido.');
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-6 sm:px-8">
    <PageHeader title="Equipe" description="Quem acessa o sistema e com qual perfil.">
      <template #actions>
        <BaseButton @click="openCreate"
          ><PhPlus class="size-5" weight="bold" aria-hidden="true" /> Novo usuário</BaseButton
        >
      </template>
    </PageHeader>

    <div class="card overflow-x-auto">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">Usuário</th>
            <th scope="col">Perfil</th>
            <th scope="col">Criado em</th>
            <th scope="col"><span class="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td>
              <div class="flex items-center gap-3">
                <span
                  class="flex size-10 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold"
                  :class="u.role === 'admin' ? 'bg-brand-600 text-white' : 'bg-accent-400 text-stone-900'"
                  aria-hidden="true"
                >
                  {{ u.username.slice(0, 2).toUpperCase() }}
                </span>
                <div>
                  <p class="font-semibold text-stone-900">
                    {{ u.username }}
                    <span v-if="u.id === auth.user?.id" class="text-xs font-normal text-stone-400"
                      >(você)</span
                    >
                  </p>
                  <span
                    v-if="u.mustChangePassword"
                    class="rounded-full bg-accent-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
                  >
                    Senha provisória
                  </span>
                </div>
              </div>
            </td>
            <td>
              <select
                class="input w-auto py-1.5 font-semibold"
                :value="u.role"
                :disabled="u.id === auth.user?.id"
                :aria-label="`Perfil de ${u.username}`"
                @change="changeRole(u, ($event.target as HTMLSelectElement).value as Role)"
              >
                <option v-for="r in ROLES" :key="r" :value="r">{{ ROLE_LABELS[r] }}</option>
              </select>
            </td>
            <td class="text-stone-500">{{ formatDateTime(u.createdAt) }}</td>
            <td>
              <div v-if="u.id !== auth.user?.id" class="flex justify-end gap-1">
                <BaseButton
                  size="sm"
                  variant="ghost"
                  :aria-label="`Redefinir senha de ${u.username}`"
                  title="Redefinir senha"
                  @click="resetPassword(u)"
                >
                  <PhKey class="size-5" aria-hidden="true" />
                </BaseButton>
                <BaseButton
                  size="sm"
                  variant="ghost"
                  :aria-label="`Remover ${u.username}`"
                  title="Remover"
                  @click="remove(u)"
                >
                  <PhTrash class="size-5 text-brand-600" aria-hidden="true" />
                </BaseButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <BaseModal :open="modalOpen" title="Novo usuário" size="sm" @close="modalOpen = false">
      <form id="user-form" class="space-y-4" @submit.prevent="create">
        <div>
          <label class="label" for="u-name">Nome de usuário</label>
          <input
            id="u-name"
            v-model="form.username"
            class="input"
            minlength="3"
            maxlength="40"
            pattern="[a-zA-Z0-9._\-]+"
            autocapitalize="none"
            autocomplete="off"
            required
          />
          <p class="mt-1 text-xs text-stone-500">Letras, números, ponto, hífen ou sublinhado.</p>
        </div>
        <div>
          <label class="label" for="u-pass">Senha provisória</label>
          <input
            id="u-pass"
            v-model="form.password"
            class="input"
            type="password"
            :minlength="MIN_PASSWORD"
            autocomplete="new-password"
            required
          />
        </div>
        <div>
          <label class="label" for="u-role">Perfil</label>
          <select id="u-role" v-model="form.role" class="input">
            <option v-for="r in ROLES" :key="r" :value="r">{{ ROLE_LABELS[r] }}</option>
          </select>
        </div>
        <p
          v-if="formError"
          class="rounded-xl bg-brand-50 px-3.5 py-2.5 text-sm font-medium text-brand-700"
          role="alert"
        >
          {{ formError }}
        </p>
      </form>
      <template #footer>
        <BaseButton variant="ghost" @click="modalOpen = false">Cancelar</BaseButton>
        <BaseButton
          type="submit"
          form="user-form"
          :loading="saving"
          :disabled="form.username.trim().length < 3 || form.password.length < MIN_PASSWORD"
        >
          Criar usuário
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
