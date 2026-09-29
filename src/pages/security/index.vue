<template>
  <view class="dz-page"><NetworkState message="正在前往设置…" /></view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import NetworkState from '@/components/NetworkState.vue'

// Keep existing saved links valid; account actions now live directly in Settings.
onLoad(() => uni.redirectTo({ url: '/pages/settings/index' }))
</script>
