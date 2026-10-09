<template>
  <view class="dz-page recharge-page">

    <DzNavBar title="余额充值" :back-action="goBack" />
    <main v-if="campaign" class="recharge-content dz-container">
      <section class="recharge-hero">
        <view class="hero-copy"><text>固定面值充值</text><strong><i>¥</i>{{ money(campaign.unit_face_amount) }}<small>/ 张</small></strong><p>充多少到账多少，达人服务消费享对应档位折扣</p></view>
        <view class="coin coin-a">¥</view><view class="coin coin-b">¥</view>
      </section>
      <section class="quantity-card">
        <view class="section-title"><strong>选择充值金额</strong><text>最多 {{ campaign.max_quantity_per_order }} 张</text></view>
        <view class="stepper">
          <button role="button" aria-label="减少一张" :tabindex="paying || quantity <= 1 ? -1 : 0" :disabled="paying || quantity <= 1" hover-class="stepper-pressed" @tap="setQuantity(quantity - 1)" @keydown.enter.prevent="setQuantity(quantity - 1)" @keydown.space.prevent="setQuantity(quantity - 1)">−</button>
          <view><strong>{{ quantity }}</strong><text>张</text></view>
          <button role="button" aria-label="增加一张" :tabindex="paying || quantity >= campaign.max_quantity_per_order ? -1 : 0" :disabled="paying || quantity >= campaign.max_quantity_per_order" hover-class="stepper-pressed" @tap="setQuantity(quantity + 1)" @keydown.enter.prevent="setQuantity(quantity + 1)" @keydown.space.prevent="setQuantity(quantity + 1)">＋</button>
        </view>
        <scroll-view class="quick-quantities" scroll-x :show-scrollbar="false">
          <view class="quick-quantities-row">
            <button v-for="count in quickQuantities" :key="count" :disabled="paying" role="button" :tabindex="paying ? -1 : 0" :aria-pressed="quantity === count" :class="{ active: quantity === count }" hover-class="quick-pressed" @tap="setQuantity(count)" @keydown.enter.prevent="setQuantity(count)" @keydown.space.prevent="setQuantity(count)">
              <strong>¥{{ quickAmount(count) }}</strong><text>{{ tierLabel(count) }}</text>
            </button>
          </view>
        </scroll-view>
      </section>
      <section class="summary-card">
        <view><text>余额到账</text><strong>¥{{ money(creditedAmount) }}</strong></view>
        <view><text>{{ legacyPending ? '历史充值折扣' : '达人服务消费折扣' }}</text><strong class="discount">{{ discountLabel }}</strong></view>
        <view v-if="discountAmount"><text>历史充值优惠</text><strong class="discount">-¥{{ money(discountAmount) }}</strong></view>
        <view class="payable"><text>需支付</text><strong>¥{{ money(payableAmount) }}</strong></view>
      </section>
      <section class="rules"><strong>充值说明</strong><text>{{ campaign.rules_text }}</text><text v-if="legacyPending">本笔为历史充值单，仍按原金额支付，不额外获得消费折扣。</text><text v-else>折扣随本次充值余额保留，用完为止。达人订单先减优惠券，再按可用余额的最优档位整单打折，最后加路费；优先扣最优惠余额，全部余额不足时由微信补差额。</text><text>充值成功以服务端支付确认结果为准，请勿重复支付。</text></section>
    </main>
    <view v-else-if="loading" class="loading-state">正在加载充值规则…</view>
    <NetworkState v-else :message="error || '充值活动暂不可用'" error @retry="load" />
    <footer v-if="campaign" class="recharge-footer">
      <button :disabled="paying || !campaign.is_enabled" role="button" :tabindex="paying || !campaign.is_enabled ? -1 : 0" hover-class="pay-button-pressed" @tap="pay" @keydown.enter.prevent="pay" @keydown.space.prevent="pay">{{ !campaign.is_enabled ? '充值暂未开放' : paying ? '正在处理…' : `微信支付 ¥${money(payableAmount)}` }}</button>
      <text>{{ campaign.is_enabled ? '支付即表示同意充值说明' : '平台暂未开放充值，请稍后再试' }}</text>
    </footer>
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
function quickAmount(count: number) { return money((campaign.value?.unit_face_amount || 0) * count) }
function rateFor(count: number) { return [...(campaign.value?.tiers || [])].filter((tier) => tier.min_quantity <= count).sort((a, b) => b.min_quantity - a.min_quantity)[0]?.discount_rate_bps || 10000 }
const creditedAmount = computed(() => pendingOrder.value?.credited_amount ?? (campaign.value?.unit_face_amount || 0) * quantity.value)
const legacyPending = computed(() => Boolean(pendingOrder.value && pendingOrder.value.discount_usage !== 'consumption'))
const payableAmount = computed(() => pendingOrder.value?.payable_amount ?? creditedAmount.value)
const discountAmount = computed(() => creditedAmount.value - payableAmount.value)
const discountLabel = computed(() => { const rate = pendingOrder.value?.discount_rate_bps ?? rateFor(quantity.value); return rate === 10000 ? '原价' : `${(rate / 1000).toFixed(rate % 1000 ? 2 : 1)} 折` })
function tierLabel(count: number) { const rate = rateFor(count); return rate === 10000 ? '消费无折扣' : `消费${(rate / 1000).toFixed(rate % 1000 ? 2 : 1)}折` }
function goBack() { navigateBackOr(() => uni.redirectTo({ url: '/pages/wallet/index' })) }
function clearPendingOrder() { pendingOrder.value = null; pendingOrderNo.value = ''; uni.removeStorageSync('pendingRechargeOrderNo') }
function setQuantity(count: number) {
  if (paying.value || count === quantity.value || count < 1 || count > (campaign.value?.max_quantity_per_order || 1)) return
  clearPendingOrder()
  quantity.value = count
}
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
    const displayedRate = rateFor(quantity.value)
    const created = (await createRechargeOrder(quantity.value)).data
    rememberOrder(created)
    if (created.payable_amount !== displayedAmount || created.discount_rate_bps !== displayedRate) throw new Error('充值规则已更新，请确认最新金额和消费折扣后再次支付')
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
.recharge-page{padding-bottom:calc(170rpx + env(safe-area-inset-bottom));background:linear-gradient(180deg,#effcfc,#f4f6f7 42%)}.dz-page-head text{font-size:$dz-fs-title;font-weight:$dz-fw-bold}.head-space{width:72rpx}.recharge-content{display:flex;flex-direction:column;gap:24rpx;padding-top:14rpx}.recharge-hero{position:relative;overflow:hidden;min-height:260rpx;padding:36rpx;border-radius:34rpx;color:#fff;background:linear-gradient(135deg,#0b797d,#13bec0);box-shadow:0 24rpx 56rpx rgba(8,141,145,.22)}.hero-copy{position:relative;z-index:2;display:flex;flex-direction:column}.hero-copy>text{font-size:25rpx;opacity:.84}.hero-copy strong{margin-top:14rpx;font-size:70rpx;line-height:1;letter-spacing:-3rpx}.hero-copy strong i{margin-right:8rpx;font-size:34rpx;font-style:normal}.hero-copy strong small{margin-left:8rpx;font-size:26rpx;font-weight:600;letter-spacing:0}.hero-copy p{margin:26rpx 0 0;font-size:24rpx;opacity:.86}.coin{position:absolute;display:flex;align-items:center;justify-content:center;border:2rpx solid rgba(255,255,255,.22);border-radius:50%;color:rgba(255,255,255,.35);background:rgba(255,255,255,.08);font-weight:800}.coin-a{right:-20rpx;bottom:-34rpx;width:190rpx;height:190rpx;font-size:74rpx;transform:rotate(12deg)}.coin-b{right:150rpx;top:28rpx;width:72rpx;height:72rpx;font-size:28rpx;transform:rotate(-12deg)}.quantity-card,.summary-card{padding:28rpx;border:1rpx solid $dz-border-subtle;border-radius:28rpx;background:#fff;box-shadow:$dz-shadow-card}.section-title{display:flex;align-items:center;justify-content:space-between}.section-title strong{font-size:29rpx}.section-title text{color:$dz-text-tertiary;font-size:22rpx}
.stepper {display:grid;grid-template-columns:max(44px, 90rpx) 1fr max(44px, 90rpx);align-items:center;gap:20rpx;margin:30rpx 0}

.stepper button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: max(44px, 88rpx);
  height: max(44px, 88rpx);
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 25rpx;
  color: $dz-list-accent;
  background: $dz-brand-soft;
  font-size: 42rpx;
  line-height: 1;
  transition: transform 100ms ease-out;
}

.stepper button:disabled,
.stepper button[disabled] {
  color: $dz-text-secondary;
  background: $dz-surface-page;
}
.stepper-pressed{transform:scale(.94)}.stepper view{display:flex;align-items:baseline;justify-content:center;gap:10rpx}.stepper strong{font-size:58rpx}.stepper text{color:$dz-text-secondary;font-size:25rpx}.quick-quantities{width:100%;white-space:nowrap}
.quick-quantities button {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  min-width: max(84px, 164rpx);
  min-height: max(56px, 112rpx);
  margin: 0;
  padding: $dz-space-2 $dz-space-3;
  border: 1rpx solid $dz-border-subtle;
  border-radius: 22rpx;
  color: $dz-text-primary;
  background: $dz-surface-subtle;
  font-size: max(14px, #{$dz-fs-body});
  font-weight: $dz-fw-semibold;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
  box-sizing: border-box;
}

.quick-quantities button.active {border-color:$dz-brand-primary;color:$dz-list-accent;background:$dz-brand-soft}

.quick-quantities text {font-size:max(12px, #{$dz-fs-caption});font-weight:$dz-fw-regular;line-height:1.4}
.summary-card>view{display:flex;align-items:center;justify-content:space-between;min-height:66rpx;color:$dz-text-secondary}.summary-card strong{color:$dz-text-primary}.summary-card .discount{color:#ef6d3d}.summary-card .payable{margin-top:10rpx;padding-top:18rpx;border-top:1rpx solid $dz-border-subtle;color:$dz-text-primary;font-weight:700}.summary-card .payable strong{color:#ef5a32;font-size:38rpx}.rules{display:flex;flex-direction:column;gap:10rpx;padding:24rpx;border-radius:22rpx;color:#5e7277;background:#e9f5f5}.rules strong{font-size:25rpx}.rules text{font-size:22rpx;line-height:1.6}.recharge-footer{position:fixed;z-index:20;right:0;bottom:0;left:0;padding:18rpx 30rpx calc(14rpx + env(safe-area-inset-bottom));border-top:1rpx solid rgba(255,255,255,.7);background:rgba(249,251,251,.86);backdrop-filter:blur(24rpx) saturate(160%)}
.recharge-footer button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: max(44px, 94rpx);
  margin: 0;
  padding: $dz-space-2 $dz-space-4;
  border: 0;
  border-radius: 30rpx;
  color: $dz-text-inverse;
  background: linear-gradient(135deg,#14c7c8,#08aeb5);
  font-size: max(14px, #{$dz-fs-body-strong});
  font-weight: $dz-fw-bold;
  line-height: 1.4;
  box-sizing: border-box;
  box-shadow: 0 16rpx 34rpx rgba(9,174,181,.24);
  transition: transform 100ms ease-out;
}

.recharge-footer button:disabled,
.recharge-footer button[disabled] {box-shadow:none;color:$dz-text-secondary;background:$dz-brand-soft;opacity:1}
.pay-button-pressed{transform:scale(.98)}.recharge-footer text{display:block;margin-top:10rpx;color:$dz-text-tertiary;font-size:20rpx;text-align:center}.loading-state{padding:160rpx 0;color:$dz-text-tertiary;text-align:center}@media(prefers-reduced-motion:reduce){.stepper button,.recharge-footer button{transition:none}}@media(prefers-reduced-transparency:reduce){.recharge-footer{background:#fff;backdrop-filter:none}}
.quick-quantities-row {
  display: inline-flex;
  gap: $dz-space-3;
  vertical-align: top;
}
.stepper button:focus-visible,
.quick-quantities button:focus-visible,
.recharge-footer button:focus-visible {
  outline: 2px solid $dz-list-accent;
  outline-offset: -3px;
}
.quick-quantities strong { font-weight: $dz-fw-semibold; }
.quick-pressed { opacity: .75; }
.stepper button::after,
.quick-quantities button::after,
.recharge-footer button::after { border: 0; }
</style>
