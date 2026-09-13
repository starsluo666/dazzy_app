<template>
  <view class="dz-navbar" :class="{ 'dz-navbar--transparent': transparent, 'dz-navbar--fixed': fixed }">
    <view class="dz-safe-top" />
    <view class="dz-navbar__row">
      <text
        v-if="back"
        class="dz-navbar__back"
        hover-class="dz-navbar__back--pressed"
        @tap="handleBack"
      >‹</text>
      <text v-else class="dz-navbar__back dz-navbar__back--placeholder" />
      <text class="dz-navbar__title" :class="{ 'dz-navbar__title--empty': !title }">{{ title }}</text>
      <view class="dz-navbar__right"><slot name="right" /></view>
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    back?: boolean
    /** 沉浸模式：置于英雄图上方，白色图标与标题、无底色 */
    transparent?: boolean
    /** 固定吸顶；false 时随文档流占位 */
    fixed?: boolean
  }>(),
  { title: '', back: true, transparent: false, fixed: true },
)
const emit = defineEmits<{ back: [] }>()

function handleBack() {
  emit('back')
  uni.navigateBack({
    delta: 1,
    fail: () => uni.switchTab({ url: '/pages/index/index' }),
  })
}
</script>

<style lang="scss" scoped>
@use '../styles/tokens.scss' as *;

.dz-navbar {
  position: relative;
  width: 100%;
  border-bottom: 1rpx solid transparent;
  background: $dz-surface-glass-strong;
}

.dz-navbar:not(.dz-navbar--transparent)::after {
  position: absolute;
  right: 0;
  bottom: -18rpx;
  left: 0;
  height: 18rpx;
  background: linear-gradient(180deg, rgba(31, 65, 72, 0.055), transparent);
  content: '';
  pointer-events: none;
}

.dz-navbar--fixed {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 90;
  box-shadow: none;
}

.dz-navbar--transparent {
  border-bottom-color: transparent;
  background: transparent;
  box-shadow: none;
}

.dz-navbar--transparent::after { display: none; }

.dz-navbar__row {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: $dz-navbar-height;
  padding: 0 $dz-space-3;
  box-sizing: border-box;
}

.dz-navbar__back {
  position: absolute;
  left: $dz-space-3;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  margin-left: -12rpx;
  border-radius: $dz-radius-full;
  color: $dz-text-primary;
  border: 1rpx solid $dz-border-material;
  background: $dz-surface-glass;
  box-shadow: $dz-shadow-raised, inset 0 1rpx 0 $dz-surface-highlight;
  font-size:$dz-fs-price-lg;
  line-height: 1;
  transition: transform $dz-duration-fast $dz-ease-out, opacity $dz-duration-fast $dz-ease-standard;
}

.dz-navbar__back--pressed {
  transform: scale(0.92);
  opacity: 0.7;
}

.dz-navbar__back--placeholder {
  visibility: hidden;
}

.dz-navbar--transparent .dz-navbar__back {
  color: $dz-text-inverse;
  background: rgba(23, 33, 38, 0.28);
  box-shadow: 0 8rpx 24rpx rgba(6, 16, 20, .16), inset 0 1rpx 0 rgba(255, 255, 255, .22);
}

/* #ifdef H5 */
.dz-navbar--fixed:not(.dz-navbar--transparent) {
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  backdrop-filter: saturate(180%) blur(20px);
}
/* #endif */

.dz-navbar__title {
  overflow: hidden;
  max-width: 60%;
  color: $dz-text-primary;
  font-size: $dz-fs-body-strong;
  font-weight: $dz-fw-semibold;
  line-height: $dz-lh-body-strong;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dz-navbar--transparent .dz-navbar__title {
  color: $dz-text-inverse;
}

.dz-navbar__right {
  position: absolute;
  right: $dz-space-3;
  display: flex;
  align-items: center;
}

@media (prefers-reduced-motion: reduce) {
  .dz-navbar__back {
    transition: none;
  }
}

@media (prefers-reduced-transparency: reduce) {
  .dz-navbar--fixed:not(.dz-navbar--transparent) { background: $dz-surface-raised; -webkit-backdrop-filter: none; backdrop-filter: none; }
}
</style>
