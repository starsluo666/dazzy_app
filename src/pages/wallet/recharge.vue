<template>
  <view class="dz-page recharge-page">

    <DzNavBar title="余额充值" :back-action="goBack" />
    <main v-if="campaign" class="recharge-content dz-container">
      <section class="recharge-hero">
        <view class="hero-copy"><text>固定面值充值</text><strong><i>¥</i>{{ money(campaign.unit_face_amount) }}<small>/ 张</small></strong><p>购买多张可享阶梯折扣，余额按面值全额到账</p></view>
        <view class="coin coin-a">¥</view><view class="coin coin-b">¥</view>
      </section>
      <section class="quantity-card">
        <view class="section-title"><strong>购买张数</strong><text>最多 {{ campaign.max_quantity_per_order }} 张</text></view>
        <view class="stepper"><button :disabled="paying || quantity <= 1" hover-class="stepper-pressed" @tap="setQuantity(quantity - 1)">−</button><view><strong>{{ quantity }}</strong><text>张</text></view><button :disabled="paying || quantity >= campaign.max_quantity_per_order" hover-class="stepper-pressed" @tap="setQuantity(quantity + 1)">＋</button></view>
        <scroll-view class="quick-quantities" scroll-x show-scrollbar="false">
          <button v-for="count in quickQuantities" :key="count" :disabled="paying" :class="{ active: quantity === count }" hover-class="quick-pressed" @tap="setQuantity(count)"><strong>{{ count }} 张</strong><text>{{ tierLabel(count) }}</text></button>
        </scroll-view>
      </section>
      <section class="summary-card">
        <view><text>余额到账</text><strong>¥{{ money(creditedAmount) }}</strong></view>
        <view><text>充值折扣</text><strong class="discount">{{ discountLabel }}</strong></view>
        <view v-if="discountAmount"><text>本次优惠</text><strong class="discount">-¥{{ money(discountAmount) }}</strong></view>
        <view class="payable"><text>需支付</text><strong>¥{{ money(payableAmount) }}</strong></view>
      </section>
      <section class="rules"><strong>充值说明</strong><text>{{ campaign.rules_text }}</text><text>充值成功以服务端支付确认结果为准，请勿重复支付。</text></section>
    </main>
    <view v-else-if="loading" class="loading-state">正在加载充值规则…</view>
    <NetworkState v-else :message="error || '充值活动暂不可用'" error @retry="load" />
    <footer v-if="campaign" class="recharge-footer"><button :disabled="paying || !campaign.is_enabled" hover-class="pay-button-pressed" @tap="pay">{{ !campaign.is_enabled ? '充值暂未开放' : paying ? '正在处理…' : `微信支付 ¥${money(payableAmount)}` }}</button><text>支付即表示同意充值说明</text></footer>
  </view>
</template>

<script setup lang="ts">
import { navigateBackOr } from '@/utils/navigation'
import DzNavBar from '@/components/DzNavBar.vue'
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import NetworkState from '@/components/NetworkState.vue'
import { confirmRechargePayment, createRechargeOrder, createRechargePaymentSession, getRechargeCampaign, getRechargePaymentAuthorization } from '@/services/wallet'
import type { RechargeCampaign, WalletRechargeOrder } from '@/types/api'
import { handlePaymentRecovery, invokeWechatPay, isWechatBrowser } from '@/services/wechatPay'
import { formatAmount, getErrorMessage } from '@/utils/formatters'

const campaign = ref<RechargeCampaign | null>(null), quantity = ref(1), loading = ref(true), error = ref(''), paying = ref(false), pendingOrderNo = ref(''), autoPay = ref(false)
const pendingOrder = ref<WalletRechargeOrder | null>(null)
const money = formatAmount
const quickQuantities = computed(() => { const max = campaign.value?.max_quantity_per_order || 1; return Array.from(new Set([1, 2, 3, 5, max].filter((item) => item <= max))).sort((a, b) => a - b) })
function rateFor(count: number) { return [...(campaign.value?.tiers || [])].filter((tier) => tier.min_quantity <= count).sort((a, b) => b.min_quantity - a.min_quantity)[0]?.discount_rate_bps || 10000 }
const creditedAmount = computed(() => pendingOrder.value?.credited_amount ?? (campaign.value?.unit_face_amount || 0) * quantity.value)
const payableAmount = computed(() => pendingOrder.value?.payable_amount ?? Math.round(creditedAmount.value * rateFor(quantity.value) / 10000))
const discountAmount = computed(() => creditedAmount.value - payableAmount.value)
const discountLabel = computed(() => { const rate = pendingOrder.value?.discount_rate_bps ?? rateFor(quantity.value); return rate === 10000 ? '原价' : `${(rate / 1000).toFixed(rate % 1000 ? 2 : 1)} 折` })
function tierLabel(count: number) { const rate = rateFor(count); return rate === 10000 ? '原价' : `${(rate / 1000).toFixed(rate % 1000 ? 2 : 1)}折` }
function goBack() { navigateBackOr(() => uni.redirectTo({ url: '/pages/wallet/index' })) }
function clearPendingOrder() { pendingOrder.value = null; pendingOrderNo.value = ''; uni.removeStorageSync('pendingRechargeOrderNo') }
function setQuantity(count: number) { if (paying.value || count === quantity.value) return; clearPendingOrder(); quantity.value = count }
function rememberOrder(order: WalletRechargeOrder) { pendingOrder.value = order; pendingOrderNo.value = order.order_no; quantity.value = order.quantity; uni.setStorageSync('pendingRechargeOrderNo', order.order_no) }
function paymentSucceeded() { clearPendingOrder(); autoPay.value = false; uni.showToast({ title: '充值成功', icon: 'success' }); setTimeout(() => uni.redirectTo({ url: '/pages/wallet/index' }), 700) }
async function restoreOrder() {
  if (!pendingOrderNo.value) return
  const order = (await confirmRechargePayment(pendingOrderNo.value)).data.order
  if (order.status === 'paid') { paymentSucceeded(); return }
  if (order.status !== 'pending_payment' || new Date(order.expires_at).getTime() <= Date.now()) { clearPendingOrder(); autoPay.value = false; return }
  rememberOrder(order)
}
async function load() { loading.value = true; error.value = ''; try { const rules = (await getRechargeCampaign()).data; await restoreOrder(); campaign.value = rules } catch (reason) { campaign.value = null; error.value = getErrorMessage(reason, '充值规则加载失败') } finally { loading.value = false } }
async function pay() { if (!campaign.value?.is_enabled || paying.value) return; paying.value = true; try {
  // #ifdef H5
  if (!isWechatBrowser()) throw new Error('请在微信服务号内完成充值')
  if (pendingOrderNo.value) {
    const originalOrderNo = pendingOrderNo.value
    await restoreOrder()
    if (pendingOrderNo.value !== originalOrderNo) return
  } else {
    const displayedAmount = payableAmount.value
    const created = (await createRechargeOrder(quantity.value)).data
    rememberOrder(created)
    if (created.payable_amount !== displayedAmount) throw new Error('充值规则已更新，请确认最新金额后再次支付')
  }
  const orderNo = pendingOrderNo.value
  const authorization = (await getRechargePaymentAuthorization(orderNo)).data
  if (!authorization.authorized) { if (!authorization.authorize_url) throw new Error('微信授权地址不可用'); uni.setStorageSync('pendingRechargeOrderNo', orderNo); window.location.assign(authorization.authorize_url); return }
  const session = (await createRechargePaymentSession(orderNo, 'official_account')).data
  await invokeWechatPay(session.pay_info)
  const confirmed = (await confirmRechargePayment(orderNo)).data.order
  if (confirmed.status !== 'paid') throw new Error('充值结果确认中，请稍后在余额明细查看')
  paymentSucceeded()
  // #endif
  // #ifndef H5
  throw new Error('当前版本请在微信服务号内完成充值')
  // #endif
} catch (reason) {
  if (await handlePaymentRecovery(reason, restoreOrder)) return
  uni.showToast({ title: getErrorMessage(reason, '充值失败'), icon: 'none' })
} finally { paying.value = false } }
onLoad((query) => { pendingOrderNo.value = typeof query?.orderNo === 'string' ? query.orderNo : String(uni.getStorageSync('pendingRechargeOrderNo') || ''); autoPay.value = query?.wechatAuthorized === '1'; void load().then(() => { if (campaign.value && autoPay.value && pendingOrderNo.value) setTimeout(() => void pay(), 0) }) })
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;
.recharge-page{padding-bottom:calc(170rpx + env(safe-area-inset-bottom));background:linear-gradient(180deg,#effcfc,#f4f6f7 42%)}.dz-page-head text{font-size:$dz-fs-title;font-weight:$dz-fw-bold}.head-space{width:72rpx}.recharge-content{display:flex;flex-direction:column;gap:24rpx;padding-top:14rpx}.recharge-hero{position:relative;overflow:hidden;min-height:260rpx;padding:36rpx;border-radius:34rpx;color:#fff;background:linear-gradient(135deg,#0b797d,#13bec0);box-shadow:0 24rpx 56rpx rgba(8,141,145,.22)}.hero-copy{position:relative;z-index:2;display:flex;flex-direction:column}.hero-copy>text{font-size:25rpx;opacity:.84}.hero-copy strong{margin-top:14rpx;font-size:70rpx;line-height:1;letter-spacing:-3rpx}.hero-copy strong i{margin-right:8rpx;font-size:34rpx;font-style:normal}.hero-copy strong small{margin-left:8rpx;font-size:26rpx;font-weight:600;letter-spacing:0}.hero-copy p{margin:26rpx 0 0;font-size:24rpx;opacity:.86}.coin{position:absolute;display:flex;align-items:center;justify-content:center;border:2rpx solid rgba(255,255,255,.22);border-radius:50%;color:rgba(255,255,255,.35);background:rgba(255,255,255,.08);font-weight:800}.coin-a{right:-20rpx;bottom:-34rpx;width:190rpx;height:190rpx;font-size:74rpx;transform:rotate(12deg)}.coin-b{right:150rpx;top:28rpx;width:72rpx;height:72rpx;font-size:28rpx;transform:rotate(-12deg)}.quantity-card,.summary-card{padding:28rpx;border:1rpx solid $dz-border-subtle;border-radius:28rpx;background:#fff;box-shadow:$dz-shadow-card}.section-title{display:flex;align-items:center;justify-content:space-between}.section-title strong{font-size:29rpx}.section-title text{color:$dz-text-tertiary;font-size:22rpx}.stepper{display:grid;grid-template-columns:90rpx 1fr 90rpx;align-items:center;gap:20rpx;margin:30rpx 0}.stepper button{width:88rpx;height:88rpx;margin:0;padding:0;border:0;border-radius:25rpx;color:#087c81;background:#e5f8f8;font-size:42rpx;transition:transform 100ms ease-out}.stepper button:disabled{color:#b7c0c3;background:#f1f3f4}.stepper-pressed{transform:scale(.94)}.stepper view{display:flex;align-items:baseline;justify-content:center;gap:10rpx}.stepper strong{font-size:58rpx}.stepper text{color:$dz-text-secondary;font-size:25rpx}.quick-quantities{width:100%;white-space:nowrap}.quick-quantities button{display:inline-flex;width:132rpx;min-height:92rpx;align-items:center;justify-content:center;flex-direction:column;gap:5rpx;margin:0 14rpx 0 0;padding:0;border:1rpx solid $dz-border-subtle;border-radius:22rpx;color:$dz-text-primary;background:#f6f8f8}.quick-quantities button.active{border-color:#17bfc2;color:#087c81;background:#e8fbfb}.quick-quantities text{font-size:20rpx}.summary-card>view{display:flex;align-items:center;justify-content:space-between;min-height:66rpx;color:$dz-text-secondary}.summary-card strong{color:$dz-text-primary}.summary-card .discount{color:#ef6d3d}.summary-card .payable{margin-top:10rpx;padding-top:18rpx;border-top:1rpx solid $dz-border-subtle;color:$dz-text-primary;font-weight:700}.summary-card .payable strong{color:#ef5a32;font-size:38rpx}.rules{display:flex;flex-direction:column;gap:10rpx;padding:24rpx;border-radius:22rpx;color:#5e7277;background:#e9f5f5}.rules strong{font-size:25rpx}.rules text{font-size:22rpx;line-height:1.6}.recharge-footer{position:fixed;z-index:20;right:0;bottom:0;left:0;padding:18rpx 30rpx calc(14rpx + env(safe-area-inset-bottom));border-top:1rpx solid rgba(255,255,255,.7);background:rgba(249,251,251,.86);backdrop-filter:blur(24rpx) saturate(160%)}.recharge-footer button{width:100%;min-height:94rpx;margin:0;border:0;border-radius:30rpx;color:#fff;background:linear-gradient(135deg,#14c7c8,#08aeb5);font-size:30rpx;font-weight:800;box-shadow:0 16rpx 34rpx rgba(9,174,181,.24);transition:transform 100ms ease-out}.recharge-footer button:disabled{box-shadow:none;opacity:.45}.pay-button-pressed{transform:scale(.98)}.recharge-footer text{display:block;margin-top:10rpx;color:$dz-text-tertiary;font-size:20rpx;text-align:center}.loading-state{padding:160rpx 0;color:$dz-text-tertiary;text-align:center}@media(prefers-reduced-motion:reduce){.stepper button,.recharge-footer button{transition:none}}@media(prefers-reduced-transparency:reduce){.recharge-footer{background:#fff;backdrop-filter:none}}
</style>
