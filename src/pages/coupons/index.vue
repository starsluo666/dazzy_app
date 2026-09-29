<template>
  <view class="dz-page dz-list-page coupon-page">
    <DzNavBar title="我的优惠券" :back-action="goBack" />

    <view class="dz-list-toolbar dz-list-container">
      <DzListFilters :value="activeTab" :options="filterOptions" label="优惠券状态" mode="tabs" @change="switchTab" />
    </view>
    <main class="coupon-content dz-list-content dz-list-container" :class="{ 'dz-list-content--empty': !loading && !error && !visibleCoupons.length }">

      <view v-if="loading" class="coupon-list" aria-label="正在加载优惠券">
        <view v-for="index in 2" :key="index" class="coupon-skeleton">
          <view class="dz-skeleton skeleton-value" />
          <view class="skeleton-info"><view class="dz-skeleton skeleton-status" /><view class="dz-skeleton skeleton-date" /></view>
        </view>
      </view>

      <NetworkState v-else-if="error" :message="error" error @retry="load" />

      <DzListEmpty v-else-if="!visibleCoupons.length" icon="coupon" :title="activeTab === 'available' ? '暂无可用优惠券' : '暂无历史记录'" :description="activeTab === 'available' ? '获得优惠券后会在这里展示' : '已使用、已过期或撤回的优惠券会保留在这里'" />

      <template v-else>
        <view class="coupon-list">
          <view
            v-for="coupon in visibleCoupons"
            :key="coupon.public_id"
            class="coupon-card"
            :class="coupon.status"
          >
            <view class="ticket-value">
              <view class="ticket-decoration" aria-hidden="true" />
              <text class="coupon-name">{{ coupon.template_name }}</text>
              <view class="face-amount"><text class="currency-sign">¥</text><text class="face-number">{{ displayAmount(coupon.face_amount) }}</text></view>
              <text class="threshold">订单原价大于 ¥{{ displayAmount(coupon.min_order_amount) }} 可用</text>
            </view>
            <view class="ticket-info">
              <view class="ticket-seam" aria-hidden="true" />
              <view class="status-pill">
                <i />
                <text class="status-label">{{ statusLabel(coupon.status) }}</text>
              </view>
              <view class="coupon-meta">
                <text>{{ statusDetail(coupon) }}</text>
                <text v-if="coupon.status === 'revoked' && coupon.revoke_reason" class="revoke-reason">原因：{{ coupon.revoke_reason }}</text>
              </view>
            </view>
          </view>
        </view>

        <section class="usage-note">
          <view class="note-icon" aria-hidden="true">!</view>
          <text>{{ activeTab === 'available' ? '优惠券可在达人服务订单确认页选择，每笔订单限用一张。' : '历史记录仅用于查询，不可再次用于抵扣订单。' }}</text>
        </section>
      </template>
    </main>
  </view>
</template>

<script setup lang="ts">
import { navigateBackOr } from '@/utils/navigation'
import DzNavBar from '@/components/DzNavBar.vue'
import DzListFilters from '@/components/DzListFilters.vue'
import DzListEmpty from '@/components/DzListEmpty.vue'
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'

import NetworkState from '@/components/NetworkState.vue'
import { getMyCoupons } from '@/services/orders'
import { guardCurrentPage } from '@/services/session'
import type { UserCoupon } from '@/types/api'
import { formatAmount, getErrorMessage } from '@/utils/formatters'

type CouponTab = 'available' | 'history'

const coupons = ref<UserCoupon[]>([])
const loading = ref(true)
const error = ref('')
const activeTab = ref<CouponTab>('available')
const tabs = [
  { key: 'available' as const, label: '可使用' },
  { key: 'history' as const, label: '历史记录' },
]

const availableCount = computed(() => coupons.value.filter((coupon) => coupon.status === 'available').length)
const historyCount = computed(() => coupons.value.length - availableCount.value)
const filterOptions = computed(() => tabs.map(tab => ({ value: tab.key, label: tab.label, count: tab.key === 'available' ? availableCount.value : historyCount.value })))
const visibleCoupons = computed(() => coupons.value.filter((coupon) => (
  activeTab.value === 'available' ? coupon.status === 'available' : coupon.status !== 'available'
)))

function displayAmount(amount: number) {
  return formatAmount(amount).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
}

function statusLabel(status: UserCoupon['status']) {
  return {
    available: '可用',
    reserved: '订单占用中',
    used: '已使用',
    expired: '已过期',
    revoked: '已撤销',
  }[status]
}

function datePart(value: string | null) {
  return value ? value.slice(0, 10) : ''
}

function statusDetail(coupon: UserCoupon) {
  const expiresAt = datePart(coupon.expires_at)
  if (coupon.status === 'reserved') return `订单占用中 · 有效期至 ${expiresAt}`
  if (coupon.status === 'used') return `已使用 · 原有效期至 ${expiresAt}`
  if (coupon.status === 'expired') return `已于 ${expiresAt} 过期`
  if (coupon.status === 'revoked') return `撤回于 ${datePart(coupon.revoked_at) || datePart(coupon.created_at)}`
  return `有效期至 ${expiresAt}`
}

function switchTab(tab: string) {
  if (tab === 'available' || tab === 'history') activeTab.value = tab
}

function goBack() {
  navigateBackOr(() => uni.redirectTo({ url: '/pages/profile/index' }))
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    coupons.value = (await getMyCoupons()).data.items
  } catch (reason) {
    error.value = getErrorMessage(reason, '优惠券加载失败')
  } finally {
    loading.value = false
  }
}

onShow(() => {
  if (guardCurrentPage()) void load()
})
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;

.coupon-list {
  display: flex;
  flex-direction: column;
  gap: $dz-space-3;
  margin-top: 0;
}

.coupon-card,
.coupon-skeleton {
  display: grid;
  grid-template-columns: 42% 58%;
  min-height: 194rpx;
  border-radius: $dz-radius-lg;
}

.coupon-card {
  box-shadow: $dz-shadow-card;
}

.ticket-value {
  position: relative;
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
  padding: $dz-space-4 $dz-space-3;
  border-radius: $dz-radius-lg 0 0 $dz-radius-lg;
  color: $dz-text-inverse;
  background: $dz-gradient-price;
  box-sizing: border-box;
}

.ticket-decoration {
  position: absolute;
  top: -60rpx;
  right: -32rpx;
  width: 180rpx;
  height: 180rpx;
  border-radius: 50%;
  background: $dz-surface-highlight;
  opacity: .16;
}

.coupon-name,
.face-amount,
.threshold {
  position: relative;
  z-index: 1;
}

.coupon-name {
  overflow: hidden;
  max-width: 100%;
  font-size: $dz-fs-body-strong;
  font-weight: $dz-fw-semibold;
  line-height: $dz-lh-body-strong;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.face-amount {
  display: flex;
  align-items: baseline;
  gap: $dz-space-1;
  margin-top: $dz-space-1;
}

.currency-sign {
  font-size: $dz-fs-body-strong;
  font-weight: $dz-fw-bold;
}

.face-number {
  overflow: hidden;
  font-size: 68rpx;
  font-weight: $dz-fw-bold;
  line-height: 1;
  letter-spacing: -2rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.threshold {
  overflow: hidden;
  margin-top: $dz-space-2;
  font-size: $dz-fs-micro;
  line-height: $dz-lh-micro;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ticket-info {
  position: relative;
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: space-between;
  padding: $dz-space-4 $dz-space-4 $dz-space-3;
  border-radius: 0 $dz-radius-lg $dz-radius-lg 0;
  background: $dz-surface-card;
  box-sizing: border-box;
}

.ticket-info::before,
.ticket-info::after {
  position: absolute;
  z-index: 2;
  left: -18rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: $dz-surface-card;
  content: '';
}

.ticket-info::before { top: -18rpx; }
.ticket-info::after { bottom: -18rpx; }

.ticket-seam {
  position: absolute;
  top: 24rpx;
  bottom: 24rpx;
  left: 0;
  border-left: 2rpx dashed $dz-border-subtle;
}

.status-pill {
  display: inline-flex;
  width: auto;
  max-width: 100%;
  align-self: flex-start;
  min-height: 42rpx;
  align-items: center;
  gap: $dz-space-1;
  padding: 0 $dz-space-2;
  border-radius: $dz-radius-full;
  color: $dz-status-success-deep;
  background: $dz-status-success-soft;
  font-size: $dz-fs-caption;
  line-height: $dz-lh-caption;
  box-sizing: border-box;
}

.status-pill i {
  width: 14rpx;
  height: 14rpx;
  flex: 0 0 auto;
  border-radius: 50%;
  background: $dz-status-success;
  box-shadow: 0 0 0 8rpx $dz-surface-highlight;
}

.status-label {
  overflow: hidden;
  font-weight: $dz-fw-semibold;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coupon-meta {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: $dz-space-1;
}

.coupon-meta text {
  overflow: hidden;
  color: $dz-text-tertiary;
  font-size: $dz-fs-caption;
  line-height: $dz-lh-caption;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coupon-meta .revoke-reason {
  font-size: $dz-fs-micro;
  line-height: $dz-lh-micro;
}

.coupon-card.reserved .ticket-value {
  background: linear-gradient(135deg, $dz-status-warning, $dz-price-primary);
}

.coupon-card.reserved .status-pill {
  color: $dz-status-warning-deep;
  background: $dz-status-warning-soft;
}

.coupon-card.reserved .status-pill i { background: $dz-status-warning; }

.coupon-card.used .ticket-value,
.coupon-card.expired .ticket-value {
  background: linear-gradient(135deg, $dz-text-tertiary, $dz-text-secondary);
}

.coupon-card.used .status-pill,
.coupon-card.expired .status-pill {
  color: $dz-text-secondary;
  background: $dz-surface-page;
}

.coupon-card.used .status-pill i,
.coupon-card.expired .status-pill i { background: $dz-text-tertiary; }

.coupon-card.revoked .ticket-value {
  background: linear-gradient(135deg, $dz-status-danger, $dz-status-danger-deep);
}

.coupon-card.revoked .status-pill {
  color: $dz-status-danger-deep;
  background: $dz-status-danger-soft;
}

.coupon-card.revoked .status-pill i { background: $dz-status-danger; }

.usage-note {
  display: grid;
  grid-template-columns: 52rpx minmax(0, 1fr);
  align-items: start;
  gap: $dz-space-3;
  margin-top: $dz-space-4;
  padding: $dz-space-4;
  border: 1rpx solid $dz-border-material;
  border-radius: $dz-radius-lg;
  color: $dz-text-secondary;
  background: $dz-brand-soft;
}

.note-icon {
  display: flex;
  width: 40rpx;
  height: 40rpx;
  align-items: center;
  justify-content: center;
  border: 3rpx solid $dz-brand-deep;
  border-radius: 50%;
  color: $dz-brand-deep;
  font-size: $dz-fs-micro;
  font-weight: $dz-fw-bold;
  line-height: 1;
  box-sizing: border-box;
}

.usage-note text {
  font-size: $dz-fs-caption;
  line-height: $dz-lh-body;
}

.coupon-skeleton {
  overflow: hidden;
  background: $dz-surface-card;
  box-shadow: $dz-shadow-card;
}

.skeleton-value {
  border-radius: $dz-radius-lg 0 0 $dz-radius-lg;
}

.skeleton-info {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: $dz-space-4;
}

.skeleton-status { width: 120rpx; height: 42rpx; }
.skeleton-date { width: 220rpx; height: 32rpx; }
</style>
