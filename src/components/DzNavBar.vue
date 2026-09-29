<template>
  <view :id="edgeId" class="dz-navbar-edge" aria-hidden="true" />
  <view v-if="fixed && !overlay" class="dz-navbar-placeholder" aria-hidden="true">
    <view class="dz-safe-top" /><view class="dz-navbar-placeholder__row" />
  </view>
  <view
    class="dz-navbar"
    :class="{
      'dz-navbar--transparent': transparent && !raised,
      'dz-navbar--raised': raised,
      'dz-navbar--fixed': fixed,
      'dz-navbar--sticky': sticky && !fixed,
      'dz-navbar--toolbar': mode === 'toolbar',
    }"
  >
    <view class="dz-safe-top" />
    <view class="dz-navbar__row dz-container" :class="{ 'dz-navbar__row--toolbar': mode === 'toolbar' }">
      <template v-if="mode === 'toolbar'"><slot /></template>
      <template v-else>
        <view class="dz-navbar__left">
          <button v-if="back" class="dz-navbar__back" role="button" tabindex="0" aria-label="返回" hover-class="dz-navbar__pressed" @tap="handleBack" @keydown.enter.stop.prevent="handleBack" @keydown.space.stop.prevent="handleBack">
            <view class="dz-navbar__chevron" aria-hidden="true" />
          </button>
          <slot name="left" />
        </view>
        <text class="dz-navbar__title">{{ title }}</text>
        <view class="dz-navbar__right"><slot name="right" /></view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { navigateBackOr } from '@/utils/navigation'

const props = withDefaults(defineProps<{
  title?: string
  back?: boolean
  backAction?: () => void
  transparent?: boolean
  fixed?: boolean
  sticky?: boolean
  /** 固定导航叠放在详情封面上，不在文档流里重复占位。 */
  overlay?: boolean
  mode?: 'title' | 'toolbar'
  /** auto：页首融入背景，滚动后浮起；integrated：随头图区滚动；glass：始终浮起。 */
  surface?: 'auto' | 'integrated' | 'glass'
}>(), {
  title: '', back: true, transparent: false, fixed: false, sticky: true,
  overlay: false, mode: 'title', surface: 'auto',
})
const emit = defineEmits<{ back: [] }>()
const edgeId = 'dz-navbar-edge-' + getCurrentInstance()?.uid
const scrolled = ref(false)
const raised = computed(() => props.surface === 'glass' || (
  props.surface === 'auto' && (props.sticky || props.fixed) && scrolled.value
))
let observer: ReturnType<typeof uni.createIntersectionObserver> | null = null
let disposed = false

onMounted(async () => {
  await nextTick()
  if (disposed || props.surface !== 'auto' || (!props.sticky && !props.fixed)) return
  try {
    // 使用页面作用域 + 唯一标记，兼容组件的多个根节点；只在跨越页首边界时更新。
    observer = uni.createIntersectionObserver(undefined, { thresholds: [0, 1], initialRatio: 1 })
    observer.relativeToViewport().observe('#' + edgeId, (result) => {
      if (!disposed) scrolled.value = result.boundingClientRect.top < result.relativeRect.top
    })
  } catch {
    // 不支持可见性监听的运行环境保持可读的悬浮材质。
    scrolled.value = true
  }
})
onUnmounted(() => {
  disposed = true
  observer?.disconnect()
  observer = null
})

function handleBack() {
  if (props.backAction) { props.backAction(); return }
  emit('back')
  navigateBackOr(() => uni.reLaunch({ url: '/pages/index/index' }))
}
</script>

<style lang="scss" scoped>
@use '../styles/tokens.scss' as *;

.dz-navbar-edge {
  width: 1px;
  height: 1px;
  flex: none;
  margin-bottom: -1px;
  opacity: 0;
  pointer-events: none;
  transform: translateY(16px);
}
.dz-navbar {
  position: relative;
  z-index: 80;
  width: 100%;
  flex: none;
  color: $dz-text-primary;
  background: transparent;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
.dz-navbar--sticky { position: sticky; top: 0; }
.dz-navbar--fixed { position: fixed; top: 0; right: 0; left: 0; z-index: 90; }
.dz-navbar--transparent { color: $dz-text-inverse; }
.dz-navbar--raised { background: $dz-surface-glass-strong; }
.dz-navbar--raised::after {
  position: absolute;
  right: 0;
  bottom: -16rpx;
  left: 0;
  height: 16rpx;
  background: linear-gradient(180deg, rgba(31, 65, 72, .045), transparent);
  content: '';
  pointer-events: none;
}
.dz-navbar__row, .dz-navbar-placeholder__row { height: $dz-navbar-height; min-height: 44px; box-sizing: border-box; }
.dz-navbar__row { display: grid; grid-template-columns: 176rpx minmax(0, 1fr) 176rpx; align-items: center; }
.dz-navbar__row--toolbar { display: flex; gap: $dz-space-3; }
.dz-navbar__left, .dz-navbar__right { display: flex; min-width: 0; align-items: center; height: 100%; }
.dz-navbar__right { justify-content: flex-end; }
.dz-navbar__back {
  display: flex;
  width: $dz-touch-min;
  height: $dz-touch-min;
  min-width: 44px;
  min-height: 44px;
  flex: none;
  align-items: center;
  justify-content: center;
  margin: 0 0 0 -16rpx;
  padding: 0;
  border: 0;
  border-radius: $dz-radius-full;
  color: inherit;
  background: transparent;
  line-height: 1;
  transition: transform $dz-duration-fast $dz-ease-out, opacity $dz-duration-fast $dz-ease-standard;
}
.dz-navbar__back::after { border: 0; }
.dz-navbar__chevron { width: 18rpx; height: 18rpx; border-left: 3rpx solid currentColor; border-bottom: 3rpx solid currentColor; transform: translateX(4rpx) rotate(45deg); }
.dz-navbar__title {
  overflow: hidden;
  width: 100%;
  color: inherit;
  font-size: $dz-fs-body-strong;
  font-weight: $dz-fw-semibold;
  line-height: 1.25;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dz-navbar__right :deep(.dz-navbar-action) {
  display: flex;
  height: $dz-touch-min;
  min-width: 44px;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0 $dz-space-1;
  border: 0;
  border-radius: $dz-radius-full;
  color: $dz-brand-deep;
  background: transparent;
  font-size: $dz-fs-caption;
  font-weight: $dz-fw-medium;
  line-height: 1;
  white-space: nowrap;
}
.dz-navbar__right :deep(.dz-navbar-action::after) { border: 0; }
.dz-navbar__right :deep(.dz-navbar-action[disabled]) { color: $dz-text-secondary; opacity: .6; }
.dz-navbar__right :deep(.dz-navbar-icon-action) { width: $dz-touch-min; padding: 0; color: inherit; font-size: $dz-fs-heading; }
.dz-navbar__right :deep(.dz-navbar-label) { color: $dz-text-secondary; font-size: $dz-fs-caption; line-height: 1.25; white-space: nowrap; }
.dz-navbar--transparent .dz-navbar__back,
.dz-navbar--transparent .dz-navbar__right :deep(.dz-navbar-icon-action) { color: $dz-text-inverse; background: rgba(23, 33, 38, .3); }
.dz-navbar__pressed { transform: scale(.97); opacity: .65; }
/* #ifdef H5 */
.dz-navbar--raised { -webkit-backdrop-filter: saturate(180%) blur(20px); backdrop-filter: saturate(180%) blur(20px); }
.dz-navbar__back:focus-visible { outline: 2px solid $dz-brand-primary; outline-offset: 2px; }
/* #endif */
@media (prefers-reduced-motion: reduce) {
  .dz-navbar__back { transition: none; }
  .dz-navbar__pressed { transform: none; }
}
@media (prefers-reduced-transparency: reduce) {
  .dz-navbar--raised { background: $dz-surface-card; -webkit-backdrop-filter: none; backdrop-filter: none; }
}
@media (prefers-contrast: more) {
  .dz-navbar--raised { background: $dz-surface-card; box-shadow: inset 0 -1px 0 $dz-text-secondary; -webkit-backdrop-filter: none; backdrop-filter: none; }
}
</style>
