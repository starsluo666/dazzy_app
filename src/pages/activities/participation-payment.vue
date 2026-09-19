<template>
  <view class="dz-page checkout-page">
    <header class="page-head"><button aria-label="返回" @tap="goBack">‹</button><text>活动收银台</text></header>
    <view v-if="loading" class="state">正在锁定活动名额…</view>
    <view v-else-if="error" class="state"><text>{{ error }}</text><button @tap="loadCheckout">重新加载</button></view>
    <main v-else-if="activity && checkout" class="checkout-content">
      <section class="lock-banner">
        <view class="lock-icon">▣</view>
        <view><strong>名额已锁定</strong><text>超时将自动释放名额</text></view>
        <strong class="countdown">{{ countdown }}</strong>
      </section>

      <section class="activity-card panel">
        <text class="panel-title">活动信息</text>
        <view class="activity-row">
          <image v-if="activity.cover_url" :src="activity.cover_url" mode="aspectFill" />
          <view v-else class="cover-fallback">{{ activity.category }}</view>
          <view class="activity-copy"><strong>{{ activity.title }}</strong><text>◷ {{ formatRange(activity.starts_at, activity.ends_at) }}</text><text>⌖ {{ activity.meeting_place_name }}</text><text>♙ 1个名额 · 剩余{{ checkout.remaining_capacity }}个</text></view>
        </view>
      </section>

      <section class="amount-card panel">
        <text class="panel-title">应付金额</text><strong class="amount">¥{{ money(checkout.payment_order.payable_amount) }}</strong>
        <view><text>AA本金</text><strong>¥{{ money(checkout.payment_order.aa_principal_amount) }}</strong></view>
        <view><text>平台组局服务费</text><strong>¥{{ money(checkout.payment_order.platform_service_fee_amount) }}</strong></view>
      </section>

      <section class="methods panel">
        <text class="panel-title">选择支付方式</text>
        <button :class="{ active: method === 'mock_wechat' }" @tap="selectMethod('mock_wechat')"><i class="wechat">微</i><strong>微信支付</strong><text>{{ method === 'mock_wechat' ? '✓' : '' }}</text></button>
        <button :class="{ active: method === 'mock_alipay' }" @tap="selectMethod('mock_alipay')"><i class="alipay">支</i><strong>支付宝</strong><text>{{ method === 'mock_alipay' ? '✓' : '' }}</text></button>
      </section>

      <section class="rule-confirm"><strong>◆ 规则版本已确认</strong><text>支付即表示已阅读并同意活动规则及退款规则；本地开发环境仅模拟支付，不会产生真实扣款。</text></section>
    </main>
    <footer v-if="checkout" class="checkout-footer"><button :disabled="paying || secondsLeft <= 0" @tap="pay">{{ paying ? '处理中…' : secondsLeft <= 0 ? '名额锁定已超时' : `模拟支付 ¥${money(checkout.payment_order.payable_amount)}` }}</button></footer>
  </view>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

import { createActivityParticipationOrder, simulateActivityParticipationPayment } from '@/services/activities'
import { getActivityDetail } from '@/services/discovery'
import { requireActivityPaymentCapability } from '@/services/payments'
import type { ActivityDetail, ActivityParticipationCheckout } from '@/types/api'
import { formatActivityRange, formatAmount, getErrorMessage } from '@/utils/formatters'

const activityId = ref(0)
const activity = ref<ActivityDetail | null>(null)
const checkout = ref<ActivityParticipationCheckout | null>(null)
const method = ref<'mock_wechat' | 'mock_alipay'>('mock_wechat')
const loading = ref(true)
const paying = ref(false)
const error = ref('')
const now = ref(Date.now())
let ticker: ReturnType<typeof setInterval> | null = null
const money = formatAmount
const formatRange = formatActivityRange
const secondsLeft = computed(() => checkout.value ? Math.max(0, Math.ceil((new Date(checkout.value.payment_order.expires_at).getTime() - now.value) / 1000)) : 0)
const countdown = computed(() => `${String(Math.floor(secondsLeft.value / 60)).padStart(2, '0')}:${String(secondsLeft.value % 60).padStart(2, '0')}`)

function goBack() { uni.navigateBack() }
function startTicker() { if (ticker) clearInterval(ticker); ticker = setInterval(() => { now.value = Date.now() }, 1000) }
async function loadCheckout() {
  loading.value = true; error.value = ''
  try {
    await requireActivityPaymentCapability('activity_participation')
    const [detail, order] = await Promise.all([
      getActivityDetail(activityId.value),
      createActivityParticipationOrder(activityId.value, method.value),
    ])
    activity.value = detail.data; checkout.value = order.data; method.value = order.data.payment_order.channel === 'mock_alipay' ? 'mock_alipay' : 'mock_wechat'; now.value = Date.now(); startTicker()
  } catch (reason) { error.value = getErrorMessage(reason, '报名支付单创建失败') } finally { loading.value = false }
}
async function selectMethod(value: 'mock_wechat' | 'mock_alipay') {
  if (method.value === value || paying.value) return
  method.value = value
  try { checkout.value = (await createActivityParticipationOrder(activityId.value, value)).data } catch (reason) { uni.showToast({ title: getErrorMessage(reason, '支付方式更新失败'), icon: 'none' }) }
}
async function pay() {
  if (!checkout.value || paying.value || secondsLeft.value <= 0) return
  paying.value = true
  try {
    await simulateActivityParticipationPayment(activityId.value)
    uni.showModal({ title: '报名成功', content: '支付状态已记录，活动名额已正式占用。可在“我的活动”查看报名与退款记录。', showCancel: false, success: () => uni.redirectTo({ url: `/pages/activities/detail?id=${activityId.value}` }) })
  } catch (reason) { uni.showToast({ title: getErrorMessage(reason, '支付失败'), icon: 'none' }) } finally { paying.value = false }
}
onLoad((query) => { activityId.value = Number(query?.id) || 0; if (activityId.value) loadCheckout(); else { loading.value = false; error.value = '缺少活动编号' } })
onBeforeUnmount(() => { if (ticker) clearInterval(ticker) })
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;
.checkout-page{min-height:100vh;padding-bottom:calc(126rpx + env(safe-area-inset-bottom));background:linear-gradient(160deg,$dz-brand-soft,$dz-surface-page 42%)}.page-head{position:relative;display:flex;align-items:flex-end;justify-content:center;height:calc(98rpx + env(safe-area-inset-top));padding-bottom:18rpx;box-sizing:border-box}.page-head button{position:absolute;left:20rpx;bottom:7rpx;width:70rpx;height:70rpx;margin:0;padding:0;border:0;background:transparent;font-size:$dz-fs-price-lg;line-height:70rpx}.page-head button::after,.methods button::after,.checkout-footer button::after,.state button::after{display:none}.page-head text{font-size:$dz-fs-body-strong;font-weight:$dz-fw-bold}.checkout-content{padding:20rpx 24rpx 36rpx}.lock-banner{display:grid;grid-template-columns:72rpx minmax(0,1fr) auto;align-items:center;gap:17rpx;padding:24rpx;border:2rpx solid #ff783d;border-radius:$dz-radius-md;background:#fff8f3;box-shadow:0 8rpx 24rpx rgba(255,100,35,.1)}.lock-icon{display:flex;align-items:center;justify-content:center;width:68rpx;height:68rpx;border-radius:50%;color:$dz-text-inverse;background:linear-gradient(145deg,#ff9a52,#ff5a17);font-size:$dz-fs-body-strong}.lock-banner>view:nth-child(2){display:flex;flex-direction:column;gap:5rpx}.lock-banner strong{color:#e75a1d;font-size:$dz-fs-caption}.lock-banner text{color:#9b6c56;font-size:$dz-fs-micro}.lock-banner .countdown{font-size:$dz-fs-title}.panel{margin-top:20rpx;padding:24rpx;border-radius:$dz-radius-md;background:$dz-surface-card;box-shadow:$dz-shadow-card}.panel-title{display:block;margin-bottom:20rpx;color:$dz-text-primary;font-size:$dz-fs-body;font-weight:$dz-fw-bold}.activity-row{display:flex;gap:20rpx}.activity-row image,.cover-fallback{flex:0 0 190rpx;width:190rpx;height:150rpx;border-radius:$dz-radius-sm}.cover-fallback{display:flex;align-items:center;justify-content:center;color:$dz-text-inverse;background:$dz-gradient-brand}.activity-copy{display:flex;min-width:0;flex-direction:column;gap:11rpx}.activity-copy strong{overflow:hidden;color:$dz-text-primary;font-size:$dz-fs-body;text-overflow:ellipsis;white-space:nowrap}.activity-copy text{color:$dz-text-secondary;font-size:$dz-fs-caption}.amount-card>.amount{display:block;margin:-4rpx 0 18rpx;color:$dz-price-primary;font-size:56rpx}.amount-card>view{display:flex;justify-content:space-between;padding:13rpx 0;border-top:1rpx dashed $dz-border-subtle;color:$dz-text-secondary;font-size:$dz-fs-caption}.amount-card>view strong{color:$dz-text-primary}.methods{padding-bottom:6rpx}.methods .panel-title{margin-bottom:5rpx}.methods button{display:flex;align-items:center;width:100%;height:92rpx;margin:0;padding:0;border:0;border-bottom:1rpx solid $dz-border-subtle;background:$dz-surface-card;text-align:left}.methods button:last-child{border-bottom:0}.methods i{display:flex;align-items:center;justify-content:center;width:52rpx;height:52rpx;border-radius:$dz-radius-sm;color:$dz-text-inverse;font-size:$dz-fs-caption;font-style:normal}.wechat{background:#12b94f}.alipay{background:#1688f5}.methods strong{flex:1;margin-left:17rpx;font-size:$dz-fs-caption}.methods button>text{display:flex;align-items:center;justify-content:center;width:32rpx;height:32rpx;border:2rpx solid #c7ced1;border-radius:50%;color:$dz-text-inverse}.methods button.active>text{border-color:$dz-brand-primary;background:$dz-brand-primary}.rule-confirm{display:flex;flex-direction:column;gap:9rpx;margin-top:20rpx;padding:20rpx;border-radius:$dz-radius-sm;color:$dz-brand-deep;background:$dz-brand-soft}.rule-confirm strong{font-size:$dz-fs-caption}.rule-confirm text{font-size:$dz-fs-micro;line-height:1.6}.checkout-footer{position:fixed;z-index:20;right:0;bottom:0;left:0;max-width:750px;height:calc(112rpx + env(safe-area-inset-bottom));margin:auto;padding:12rpx 24rpx env(safe-area-inset-bottom);background:$dz-surface-card;box-shadow:$dz-shadow-floating;box-sizing:border-box}.checkout-footer button{width:100%;height:76rpx;margin:0;border:0;border-radius:$dz-radius-lg;color:$dz-text-inverse;background:$dz-gradient-brand;font-size:$dz-fs-caption;font-weight:$dz-fw-bold;line-height:76rpx}.checkout-footer button[disabled]{opacity:.45}.state{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:600rpx;color:$dz-text-secondary}.state button{margin-top:24rpx;border:0;color:$dz-text-inverse;background:$dz-brand-primary}
</style>
