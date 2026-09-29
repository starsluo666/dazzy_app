<template>
  <view class="dz-page result-page">
    <DzNavBar title="支付结果" :back-action="openOrder" />
    <main class="result-content">
      <view class="result-orb" :class="state"><text v-if="state==='confirmed'">✓</text><text v-else-if="state==='failed'">!</text><view v-else class="spinner" /></view>
      <strong>{{ title }}</strong>
      <text>{{ description }}</text>
      <view v-if="order" class="order-summary booking-card"><text>订单号</text><strong>{{ order.order_no }}</strong><text>应付金额</text><b>¥{{ money(order.payable_amount) }}</b></view>
      <button v-if="state==='confirmed'" class="primary" @tap="openSuccess">查看支付结果</button>
      <button v-else-if="state==='failed'" class="primary" @tap="retryPayment">返回收银台</button>
      <button v-else class="secondary" :disabled="checking" @tap="confirmStatus">{{ checking?'正在确认…':'刷新结果' }}</button>
      <button class="link" @tap="openOrder">查看订单</button>
    </main>
  </view>
</template>

<script setup lang="ts">
import DzNavBar from '@/components/DzNavBar.vue'
import { computed, ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { confirmProviderOrderPaymentStatus } from '@/services/orders'
import type { ProviderOrder } from '@/types/api'
import { formatAmount, getErrorMessage } from '@/utils/formatters'

type ResultState = 'confirming' | 'processing' | 'confirmed' | 'failed'

const orderNo = ref('')
const order = ref<ProviderOrder | null>(null)
const state = ref<ResultState>('confirming')
const checking = ref(false)
const stopped = ref(false)
const money = formatAmount
const statusPollAttempts = 12
const statusPollIntervalMs = 5000
const title = computed(() => ({
  confirming: '正在确认支付结果', processing: '支付结果处理中', confirmed: '支付已确认', failed: '订单未支付',
})[state.value])
const description = computed(() => ({
  confirming: '请稍候，服务端正在核对汇付交易结果。',
  processing: '暂未收到最终结果，请稍后刷新；请勿重复支付。',
  confirmed: '订单已进入待接单状态。',
  failed: '订单已关闭或支付超时，请返回后重新下单。',
})[state.value])

function wait(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)) }
function isPaid(value: ProviderOrder) { return Boolean(value.paid_at) || ['paid', 'partially_refunded', 'refunded'].includes(value.payment_order?.status || '') }
function isClosed(value: ProviderOrder) { return value.status === 'cancelled' || value.payment_order?.status === 'closed' }
function openSuccess() { uni.redirectTo({ url: `/pages/booking/success?orderNo=${encodeURIComponent(orderNo.value)}` }) }
function retryPayment() { uni.redirectTo({ url: `/pages/booking/payment?orderNo=${encodeURIComponent(orderNo.value)}` }) }
function openOrder() { uni.redirectTo({ url: `/pages/orders/detail?orderNo=${encodeURIComponent(orderNo.value)}` }) }

async function fetchStatus() {
  const current = (await confirmProviderOrderPaymentStatus(orderNo.value)).data
  order.value = current
  if (isPaid(current)) { state.value = 'confirmed'; uni.removeStorageSync('pendingProviderOrderNo'); return true }
  if (isClosed(current)) { state.value = 'failed'; return true }
  return false
}

async function confirmStatus() {
  if (!orderNo.value || checking.value) return
  checking.value = true
  try {
    state.value = 'confirming'
    for (let attempt = 0; attempt < statusPollAttempts && !stopped.value; attempt += 1) {
      if (await fetchStatus()) return
      if (attempt < statusPollAttempts - 1) await wait(statusPollIntervalMs)
    }
    if (!stopped.value) state.value = 'processing'
  } catch (reason) {
    state.value = 'processing'
    uni.showToast({ title: getErrorMessage(reason, '暂时无法查询支付结果'), icon: 'none' })
  } finally {
    checking.value = false
  }
}

onLoad(query => {
  const queryOrderNo = typeof query?.orderNo === 'string' ? query.orderNo : ''
  const storedOrderNo = uni.getStorageSync('pendingProviderOrderNo')
  orderNo.value = queryOrderNo || (typeof storedOrderNo === 'string' ? storedOrderNo : '')
  if (orderNo.value) confirmStatus()
  else { state.value = 'failed'; uni.showToast({ title: '未找到待确认订单', icon: 'none' }) }
})
onUnload(() => { stopped.value = true })
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *; @use '../../styles/booking.scss';
.result-page{min-height:100vh;background:radial-gradient(circle at 50% 8%,#d4fbf8 0,$dz-surface-page 440rpx)}.result-content{display:flex;align-items:center;padding:120rpx 30rpx 50rpx;flex-direction:column;text-align:center}.result-orb{display:flex;width:148rpx;height:148rpx;align-items:center;justify-content:center;border:12rpx solid rgba(17,193,196,.18);border-radius:50%;color:$dz-text-inverse;background:$dz-gradient-brand;box-shadow:$dz-shadow-brand;font-size:70rpx;font-weight:$dz-fw-bold}.result-orb.processing,.result-orb.confirming{background:$dz-surface-card}.result-orb.failed{border-color:#ffd6cf;background:#ff6b58}.spinner{width:52rpx;height:52rpx;border:7rpx solid rgba(17,193,196,.18);border-top-color:$dz-brand-primary;border-radius:50%;animation:spin .9s linear infinite}.result-content>strong{margin-top:34rpx;color:$dz-text-primary;font-size:$dz-fs-title}.result-content>text{max-width:560rpx;margin-top:16rpx;color:$dz-text-secondary;font-size:$dz-fs-caption;line-height:1.65}.order-summary{display:grid;width:100%;margin-top:42rpx;padding:26rpx;text-align:left;box-sizing:border-box;grid-template-columns:1fr auto;gap:18rpx}.order-summary text{color:$dz-text-secondary;font-size:$dz-fs-micro}.order-summary strong{font-size:$dz-fs-caption}.order-summary b{color:$dz-price-primary;font-size:$dz-fs-body-strong}.result-content>button{width:100%;height:82rpx;margin:26rpx 0 0;border-radius:$dz-radius-full;font-size:$dz-fs-body;line-height:82rpx}.result-content>button::after{display:none}.primary{border:0;color:$dz-text-inverse;background:$dz-gradient-brand}.secondary{border:1rpx solid $dz-brand-primary;color:$dz-brand-deep;background:$dz-surface-card}.link{border:0;color:$dz-text-secondary;background:transparent!important}@keyframes spin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.spinner{animation-duration:1.8s}}
</style>
