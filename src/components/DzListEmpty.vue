<template>
  <view class="dz-list-empty" role="status">
    <view class="dz-list-empty__icon" aria-hidden="true"><image :src="`/static/lists/${icon}.svg`" mode="aspectFit" /></view>
    <text class="dz-list-empty__title">{{ title }}</text>
    <text v-if="description" class="dz-list-empty__description">{{ description }}</text>
    <button
      v-if="actionText"
      class="dz-list-empty__action"
      role="button"
      tabindex="0"
      hover-class="dz-list-empty__pressed"
      :hover-stay-time="60"
      @tap="$emit('action')"
      @keydown.enter.prevent="$emit('action')"
      @keydown.space.prevent="$emit('action')"
    >{{ actionText }}</button>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  description?: string
  actionText?: string
  icon?: 'order' | 'coupon' | 'activity' | 'notification' | 'history' | 'favorite'
}>(), { description: '', actionText: '', icon: 'order' })
defineEmits<{ action: [] }>()
</script>

<style lang="scss" scoped>
@use '../styles/tokens.scss' as *;

.dz-list-empty { display: flex; width: 100%; min-height: 320px; flex: 1; flex-direction: column; align-items: center; justify-content: center; padding: 24px 0 86px; text-align: center; box-sizing: border-box; }
.dz-list-empty__icon { display: flex; width: 56px; height: 56px; flex: none; align-items: center; justify-content: center; }
.dz-list-empty__icon image { width: 40px; height: 40px; }
.dz-list-empty__title { margin-top: 18px; color: $dz-text-primary; font-size: max(18px, #{$dz-fs-price-md}); font-weight: $dz-fw-semibold; line-height: 1.5; }
.dz-list-empty__description { max-width: 276px; margin-top: 8px; color: $dz-list-text; font-size: max(14px, #{$dz-fs-body}); line-height: 24px; }
.dz-list-empty__action { display: flex; min-width: 148px; min-height: 44px; align-items: center; justify-content: center; margin: 24px 0 0; padding: 0 24px; border: 0; border-radius: $dz-radius-full; color: $dz-text-inverse; background: $dz-list-accent; font-size: max(15px, #{$dz-fs-body-strong}); font-weight: $dz-fw-semibold; line-height: 24px; }
.dz-list-empty__action::after { display: none; }
.dz-list-empty__pressed, .dz-list-empty__action:active { transform: scale(.97); opacity: .86; }
.dz-list-empty__action:focus-visible { outline: 2px solid $dz-list-accent; outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .dz-list-empty__pressed, .dz-list-empty__action:active { transform: none; } }
</style>
