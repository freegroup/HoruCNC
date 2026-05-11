<script setup>
const props = defineProps({
  size:       { type: Number, default: 48 },
  insertable: { type: Boolean, default: false },
  color:      { type: String, default: '#7878b8' },
})

const emit = defineEmits(['insert'])
</script>

<template>
  <div
    class="flow-arrow"
    :class="{ insertable }"
    :style="{ '--ac': color }"
    :title="insertable ? 'Insert step here' : undefined"
    @click="insertable ? emit('insert') : undefined"
  >
    <div class="arrow-pill">
      <!-- double chevron >> -->
      <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
        <path d="M2 2L8 8L2 14"   stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M11 2L17 8L11 14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div v-if="insertable" class="insert-badge">+</div>
  </div>
</template>

<style lang="less" scoped>
@import '@/assets/theme.less';

.flow-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  flex-shrink: 0;
  width: 48px;
  position: relative;
  transition: color 0.15s;

  &.insertable {
    cursor: pointer;

    &:hover {
      .arrow-pill { opacity: 0; transform: scale(0.8); }
      .insert-badge { opacity: 1; transform: scale(1); }
    }
  }
}

.arrow-pill {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 28px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--ac, #7878b8) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--ac, #7878b8) 40%, transparent);
  color: var(--ac, #7878b8);
  transition: opacity 0.15s, transform 0.15s;
  box-shadow: 0 0 12px color-mix(in srgb, var(--ac, #7878b8) 22%, transparent);
}

.insert-badge {
  position: absolute;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: @accent;
  color: #111;
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(0.7);
  transition: opacity 0.15s, transform 0.15s;
  box-shadow: 0 0 14px color-mix(in srgb, @accent 55%, transparent);
}
</style>
