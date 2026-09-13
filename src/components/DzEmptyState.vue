<template>
  <view class="dz-empty" :class="{ 'dz-empty--compact': compact }">
    <view class="dz-empty__figure">
      <view class="dz-empty__ring" />
      <view class="dz-empty__dot" />
    </view>
    <text class="dz-empty__title">{{ title }}</text>
    <text v-if="description" class="dz-empty__desc">{{ description }}</text>
    <DzButton
      v-if="actionText"
      type="secondary"
      size="md"
      class="dz-empty__action"
      @tap="$emit('action')"
    >
      {{ actionText }}
    </DzButton>
    <slot />
  </view>
</template>

<script setup lang="ts">
import DzButton from './DzButton.vue'

withDefaults(defineProps<{ title: string; description?: string; actionText?: string; compact?: boolean }>(), {
  description: '',
  actionText: '',
  compact: false,
})
defineEmits<{ action: [] }>()
</script>

<style lang="scss" scoped>
@use '../styles/tokens.scss' as *;

.dz-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $dz-space-3;
  padding: $dz-space-6 $dz-space-4;
  text-align: center;
}

.dz-empty--compact {
  padding: $dz-space-5 $dz-space-4;
}

.dz-empty__figure {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 128rpx;
  height: 128rpx;
  border-radius: $dz-radius-full;
  background: $dz-surface-page;
}

.dz-empty__ring {
  width: 64rpx;
  height: 64rpx;
  border: 4rpx solid $dz-border-subtle;
  border-radius: $dz-radius-full;
}

.dz-empty__dot {
  position: absolute;
  right: 26rpx;
  bottom: 26rpx;
  width: 16rpx;
  height: 16rpx;
  border-radius: $dz-radius-full;
  background: $dz-brand-soft;
  box-shadow: 0 0 0 6rpx $dz-brand-soft;
}

.dz-empty__title {
  color: $dz-text-secondary;
  font-size: $dz-fs-body;
  font-weight: $dz-fw-semibold;
  line-height: $dz-lh-body;
}

.dz-empty__desc {
  max-width: 480rpx;
  color: $dz-text-tertiary;
  font-size: $dz-fs-caption;
  line-height: $dz-lh-caption;
}

.dz-empty__action {
  margin-top: $dz-space-2;
}
</style>
