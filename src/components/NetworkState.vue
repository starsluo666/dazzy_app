<template>
  <view
    class="network-state"
    :class="{ 'network-state--error': error }"
    role="status"
    @tap="error && $emit('retry')"
  >
    {{ message }}<text v-if="error">，点击重试</text>
  </view>
</template>

<script setup lang="ts">
defineProps<{ message: string; error?: boolean }>()
defineEmits<{ retry: [] }>()
</script>

<style lang="scss" scoped>
@use '../styles/tokens.scss' as *;

.network-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180rpx;
  border-radius: $dz-radius-sm;
  color: $dz-text-secondary;
  background: $dz-surface-page;
  font-size:$dz-fs-caption;
}

.network-state--error {
  color: $dz-price-primary;
}
</style>
