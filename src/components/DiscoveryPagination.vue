<template>
  <view class="pagination" role="status">
    <button v-if="hasMore || error" :disabled="loading" hover-class="pressed" @tap="$emit('more')">
      {{ loading ? '正在加载…' : error ? `${error}，点击重试` : '加载更多' }}
    </button>
    <text v-else-if="count">已显示全部结果</text>
  </view>
</template>
<script setup lang="ts">
defineProps<{ hasMore: boolean; loading: boolean; error: string; count: number }>()
defineEmits<{ more: [] }>()
</script>
<style lang="scss" scoped>
@use '../styles/tokens.scss' as *;
.pagination { padding:24rpx 0; text-align:center; color:$dz-text-secondary; font-size:$dz-fs-caption; }
button { min-height:88rpx; border-radius:$dz-radius-full; color:$dz-brand-deep; background:$dz-brand-soft; font-size:$dz-fs-caption; }
button::after { border:0; }.pressed { opacity:.65; }
</style>
