<template>
  <view class="dz-sheet" :class="{ 'dz-sheet--visible': visible }">
    <view class="dz-sheet__mask" @tap="$emit('close')" />
    <view class="dz-sheet__panel">
      <view class="dz-sheet__grabber" />
      <view v-if="title || closable" class="dz-sheet__header">
        <text class="dz-sheet__title">{{ title }}</text>
        <text v-if="closable" class="dz-sheet__close" hover-class="dz-sheet__close--pressed" @tap="$emit('close')">✕</text>
      </view>
      <scroll-view class="dz-sheet__body" scroll-y>
        <slot />
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ visible: boolean; title?: string; closable?: boolean }>(), {
  title: '',
  closable: true,
})
defineEmits<{ close: [] }>()
</script>

<style lang="scss" scoped>
@use '../styles/tokens.scss' as *;

.dz-sheet {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 999;
  pointer-events: none;
}

.dz-sheet--visible {
  pointer-events: auto;
}

.dz-sheet__mask {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(23, 33, 38, 0.36);
  opacity: 0;
  transition: opacity $dz-duration-base $dz-ease-standard;
}

.dz-sheet--visible .dz-sheet__mask {
  opacity: 1;
}

.dz-sheet__panel {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  max-height: 80vh;
  border: 1rpx solid $dz-border-material;
  border-bottom: 0;
  border-radius: 48rpx 48rpx 0 0;
  background: $dz-surface-glass-strong;
  box-shadow: $dz-shadow-floating;
  padding-bottom: env(safe-area-inset-bottom);
  opacity: .96;
  transform: translateY(calc(100% + 12rpx)) scale(.985);
  transform-origin: center bottom;
  transition: transform $dz-duration-sheet $dz-ease-drawer, opacity $dz-duration-base $dz-ease-standard;
  will-change: transform, opacity;
}

.dz-sheet--visible .dz-sheet__panel {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.dz-sheet__grabber {
  align-self: center;
  flex: 0 0 auto;
  width: 72rpx;
  height: 10rpx;
  margin-top: 12rpx;
  border-radius: $dz-radius-full;
  background: rgba(102, 115, 122, 0.24);
}

.dz-sheet__header {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  padding: $dz-space-3 $dz-space-4 $dz-space-2;
}

.dz-sheet__title {
  color: $dz-text-primary;
  font-size: $dz-fs-body-strong;
  font-weight: $dz-fw-semibold;
  line-height: $dz-lh-body-strong;
}

.dz-sheet__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: $dz-touch-min;
  height: $dz-touch-min;
  margin: -8rpx -16rpx -8rpx 0;
  border-radius: $dz-radius-full;
  color: $dz-text-secondary;
  background: $dz-surface-page;
  font-size:$dz-fs-body-strong;
  transition: opacity $dz-duration-fast $dz-ease-standard;
}

/* #ifdef H5 */
.dz-sheet__mask {
  -webkit-backdrop-filter: blur(3px);
  backdrop-filter: blur(3px);
}

.dz-sheet__panel {
  background: $dz-surface-glass-strong;
  -webkit-backdrop-filter: saturate(180%) blur(24px);
  backdrop-filter: saturate(180%) blur(24px);
}
/* #endif */

.dz-sheet__close--pressed {
  opacity: 0.6;
}

.dz-sheet__body {
  flex: 1 1 auto;
  min-height: 0;
  max-height: calc(80vh - 140rpx);
  padding: 0 $dz-space-4 calc($dz-space-4 + 8rpx);
  box-sizing: border-box;
}

@media (prefers-reduced-motion: reduce) {
  .dz-sheet__mask { transition: opacity 160ms $dz-ease-standard; }
  .dz-sheet__panel { opacity: 0; transform: none; transition: opacity 160ms $dz-ease-standard; }
  .dz-sheet--visible .dz-sheet__panel { opacity: 1; transform: none; }
}

@media (prefers-reduced-transparency: reduce) {
  .dz-sheet__mask { -webkit-backdrop-filter: none; backdrop-filter: none; }
  .dz-sheet__panel { background: $dz-surface-raised; -webkit-backdrop-filter: none; backdrop-filter: none; }
}
</style>
