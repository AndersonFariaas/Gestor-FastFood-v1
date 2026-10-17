<script setup lang="ts">
import AppHeader from './AppHeader.vue';
</script>

<template>
  <div class="flex h-dvh flex-col">
    <AppHeader />
    <main class="min-h-0 flex-1 overflow-y-auto">
      <slot />
    </main>
  </div>
</template>
