<script setup>
defineProps({
  toasts: {
    type: Array,
    required: true
  }
});

defineEmits(['dismiss']);
</script>

<template>
  <section
    class="toast-stack"
    aria-live="polite"
    aria-label="Notifications"
  >
    <article
      v-for="toast in toasts"
      :key="toast.id"
      class="toast"
      role="status"
    >
      <p>{{ toast.message }}</p>

      <button
        type="button"
        class="toast__close"
        aria-label="Dismiss notification"
        @click="$emit('dismiss', toast.id)"
      >
        ×
      </button>
    </article>
  </section>
</template>
