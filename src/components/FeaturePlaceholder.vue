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
.content{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:70vh;text-align:center}.mark{display:flex;align-items:center;justify-content:center;width:112rpx;height:112rpx;border-radius:32rpx;color:#fff;background:$dz-gradient-brand;font-size:40rpx;font-weight:700;box-shadow:$dz-shadow-card}.title{margin-top:32rpx;font-size:36rpx;font-weight:700}.description{max-width:520rpx;margin-top:14rpx;color:$dz-text-secondary;font-size:24rpx;line-height:1.6}
</style>
