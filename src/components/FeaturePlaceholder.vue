<template>
  <view class="dz-page dz-page--with-tabbar">
    <view class="dz-safe-top" />
    <main class="content dz-container">
      <view class="mark">{{ mark }}</view>
      <text class="title">{{ title }}</text>
      <text class="description">{{ description }}</text>
    </main>
    <DazzyTabBar :active="active" />
  </view>
</template>

<script setup lang="ts">
import DazzyTabBar from './DazzyTabBar.vue'
defineProps<{ active: string; mark: string; title: string; description: string }>()
</script>

<style lang="scss" scoped>
@use '../styles/tokens.scss' as *;
.content{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:70vh;text-align:center}.mark{display:flex;align-items:center;justify-content:center;width:112rpx;height:112rpx;border-radius:$dz-radius-lg;color:$dz-text-inverse;background:$dz-gradient-brand;font-size:$dz-fs-title;font-weight:$dz-fw-bold;box-shadow:$dz-shadow-card}.title{margin-top:32rpx;font-size:$dz-fs-heading;font-weight:$dz-fw-bold}.description{max-width:520rpx;margin-top:14rpx;color:$dz-text-secondary;font-size:$dz-fs-caption;line-height:1.6}
</style>
