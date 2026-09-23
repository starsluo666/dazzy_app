<template>
  <view class="dz-page coupon-page">
    <header><button @tap="goBack">‹</button><strong class="page-title">我的优惠券</strong></header>
    <view class="tabs"><button v-for="tab in tabs" :key="tab.key" :class="{ active: activeTab === tab.key }" @tap="activeTab = tab.key">{{ tab.label }}</button></view>
    <view v-if="loading" class="empty">正在加载优惠券…</view>
    <view v-else-if="!visibleCoupons.length" class="empty">暂无{{ activeTab === 'available' ? '可用' : '历史' }}优惠券</view>
    <view v-else class="coupons">
      <view v-for="coupon in visibleCoupons" :key="coupon.public_id" class="coupon-card" :class="{ inactive: coupon.status !== 'available' }">
        <view><strong class="face-amount">¥{{ money(coupon.face_amount) }}</strong><text>订单原价大于 ¥{{ money(coupon.min_order_amount) }} 可用</text></view>
        <view><b>{{ statusLabel(coupon.status) }}</b><small>{{ coupon.expires_at.slice(0, 10) }} 到期</small></view>
      </view>
      <text class="tip">优惠券可在达人服务订单确认页选择，每笔订单限用一张。</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getMyCoupons } from '@/services/orders'
import type { UserCoupon } from '@/types/api'
import { formatAmount, getErrorMessage } from '@/utils/formatters'

const money = formatAmount
const coupons = ref<UserCoupon[]>([])
const loading = ref(false)
const activeTab = ref<'available' | 'history'>('available')
const tabs = [{ key: 'available' as const, label: '可使用' }, { key: 'history' as const, label: '已使用 / 过期' }]
const visibleCoupons = computed(() => coupons.value.filter((coupon) => (
  activeTab.value === 'available' ? coupon.status === 'available' : coupon.status !== 'available'
)))
function statusLabel(status: UserCoupon['status']) {
  return { available: '可用', reserved: '订单占用中', used: '已使用', expired: '已过期' }[status]
}
function goBack() { uni.navigateBack() }
onShow(async () => {
  loading.value = true
  try { coupons.value = (await getMyCoupons()).data.items }
  catch (error) { uni.showToast({ title: getErrorMessage(error, '优惠券加载失败'), icon: 'none' }) }
  finally { loading.value = false }
})
</script>

<style scoped>
.coupon-page { min-height: 100vh; background: #f6f8f9; }
header { display: flex; align-items: center; justify-content: center; height: 100rpx; background: #fff; }
header button { position: absolute; left: 20rpx; border: 0; background: transparent; font-size: 48rpx; }.page-title { font-size: 32rpx; }
.tabs { display: flex; background: #fff; }.tabs button { flex: 1; border: 0; background: #fff; color: #687582; font-size: 25rpx; }.tabs button.active { color: #08aeb2; border-bottom: 4rpx solid #08b5ba; }
.coupons { padding: 18rpx 24rpx; }.coupon-card { display: flex; justify-content: space-between; align-items: center; margin: 15rpx 0; padding: 24rpx; border-radius: 16rpx; background: #fff; border-left: 8rpx solid #08b5ba; }.coupon-card.inactive { border-left-color: #bec8cc; opacity: .68; }.coupon-card view { display: flex; flex-direction: column; gap: 9rpx; }.face-amount { color: #ed7042; font-size: 45rpx; }.coupon-card text,.coupon-card small,.tip { color: #75818c; font-size: 21rpx; }.coupon-card b { text-align: right; font-size: 24rpx; }.empty { padding: 140rpx 20rpx; color: #7a8492; text-align: center; }.tip { display: block; padding: 15rpx; text-align: center; }
</style>
