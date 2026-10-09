<template>
  <view class="cancel-rules">
    <text class="cancel-rules__intro">费用与退款以本单下单时同意的规则为准</text>
    <view v-for="(line, index) in policy.clauses || []" :key="index" class="cancel-rules__item">
      <text class="cancel-rules__number">{{ index + 1 }}</text><text class="cancel-rules__text">{{ line }}</text>
    </view>
    <text v-if="!policy.version" class="cancel-rules__text">未支付订单可直接取消；已支付订单请联系客服处理取消或退款。达人责任或服务争议请提交售后，不自动扣违约费用。</text>
    <text v-if="policy.version" class="cancel-rules__version">规则版本 {{ policy.version }}</text>
  </view>
</template>
<script setup lang="ts">
import type { CancellationPolicy } from '@/types/cancellation'
defineProps<{ policy: CancellationPolicy }>()
</script>
<style scoped>
.cancel-rules { padding: 16rpx 4rpx 32rpx; }
.cancel-rules__intro { display: block; color: #9a5825; background: #fff7ed; padding: 24rpx; border-radius: 20rpx; font-size: 26rpx; line-height: 1.6; margin-bottom: 16rpx; }
.cancel-rules__item { display: flex; gap: 18rpx; padding: 20rpx 0; border-bottom: 1rpx solid #edf1f2; }
.cancel-rules__number { flex: 0 0 34rpx; color: #008b92; font-weight: 600; font-size: 28rpx; }
.cancel-rules__text { font-size: 28rpx; line-height: 1.7; color: #344054; }
.cancel-rules__version { display: block; margin-top: 24rpx; color: #667085; font-size: 22rpx; overflow-wrap: anywhere; }
</style>
