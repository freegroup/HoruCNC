<script setup>
// A small drawing per template (templates/*.js), for its card
defineProps({ id: { type: String, required: true } })
</script>

<template>
  <!-- Carving line art: single strokes — one path down each line -->
  <svg v-if="id === 'line-art'" viewBox="0 0 120 80" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
    <circle cx="60" cy="40" r="6"/>
    <path d="M60 34c-6-8-6-18 0-24 6 6 6 16 0 24zM60 46c-6 8-6 18 0 24 6-6 6-16 0-24zM54 40c-8-6-18-6-24 0 6 6 16 6 24 0zM66 40c8-6 18-6 24 0-6 6-16 6-24 0z"/>
  </svg>
  <!-- Grayscale to line art: an engraved star outline -->
  <svg v-else-if="id === 'grayscale-to-lines'" viewBox="0 0 120 80" fill="none" stroke-linejoin="round">
    <path d="M60 12l7.6 15.4 17 2.5-12.3 12 2.9 16.9L60 50.8l-15.2 8 2.9-16.9-12.3-12 17-2.5z" stroke="currentColor" stroke-width="2.5"/>
    <path d="M60 22l4.7 9.5 10.5 1.5-7.6 7.4 1.8 10.4L60 45.9l-9.4 4.9 1.8-10.4-7.6-7.4 10.5-1.5z" stroke="currentColor" stroke-width="1.5" opacity=".5"/>
  </svg>
  <!-- Heightmap image: depth lines -->
  <svg v-else viewBox="0 0 120 80" fill="none" stroke="currentColor" stroke-linecap="round">
    <path d="M16 24c14 0 18 6 30 6s18-10 30-10 16 6 28 6" stroke-width="2"/>
    <path d="M16 34c14 0 18 10 30 10s18-14 30-14 16 8 28 8" stroke-width="2" opacity=".85"/>
    <path d="M16 44c14 0 18 12 30 12s18-16 30-16 16 8 28 8" stroke-width="2" opacity=".65"/>
    <path d="M16 54c14 0 18 8 30 8s18-12 30-12 16 6 28 6" stroke-width="2" opacity=".45"/>
  </svg>
</template>
