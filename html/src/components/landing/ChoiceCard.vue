<script setup>
// One way into the designer: a picture or drawing, a title, a short text and where it leads.
// A `picture` is shown on white like paper; without one the `art` slot draws on dark.
defineProps({
  href:    { type: String, required: true },
  title:   { type: String, required: true },
  text:    { type: String, default: '' },
  go:      { type: String, default: 'Start with this →' },
  picture: { type: String, default: null },
})
</script>

<template>
  <a class="card" :href="href">
    <span class="card-art" :class="{ picture }" aria-hidden="true">
      <img v-if="picture" :src="picture" alt="" />
      <slot v-else name="art" />
    </span>
    <span class="card-title">{{ title }}</span>
    <span class="card-text">{{ text }}</span>
    <span class="card-go">{{ go }}</span>
  </a>
</template>

<style lang="less" scoped>
@import '@/assets/theme.less';

.card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 22px 22px 24px;
  border-radius: 20px;
  border: 1px solid @hairline;
  background: @panel;
  color: @text;
  font: inherit;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s;

  &:hover { border-color: @accent-line; transform: translateY(-2px); }
  &:hover .card-go { color: @accent; }
}
.card-art {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 16 / 9;
  margin-bottom: 10px;
  overflow: hidden;
  border-radius: 14px;
  background: #0e0e10;
  color: @accent;

  :slotted(svg) { width: 58%; height: auto; }

  &.picture { background: #fff; }
  img { width: 100%; height: 100%; object-fit: contain; }
}
.card-title { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
.card-text  { font-size: 15px; color: @muted; }
.card-go    { margin-top: 8px; font-size: 14px; font-weight: 600; color: @text; transition: color 0.15s; }
</style>
