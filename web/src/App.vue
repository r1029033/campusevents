<script setup>
import { RouterLink, RouterView } from 'vue-router';
import ToastStack from './components/ToastStack.vue';
import {
  useNotifications
} from './composables/useNotifications.js';

const {
  toasts,
  removeToast
} = useNotifications();
</script>

<template>
  <header class="site-header">
    <RouterLink to="/" class="brand">Campus Events</RouterLink>
    <nav>
      <RouterLink to="/">Events</RouterLink>
      <RouterLink to="/stats">Occupancy</RouterLink>
      <RouterLink to="/events/new" class="button button--small">New event</RouterLink>
    </nav>
  </header>
  <main class="page">
    <RouterView />
  </main>

  <ToastStack
    :toasts="toasts"
    @dismiss="removeToast"
  />
</template>
