<template>
  <view class="dz-page payment-page">
    <header class="booking-head"><button aria-label="返回" @tap="goBack">‹</button><text>收银台</text></header>
    <view v-if="loading" class="booking-empty">正在加载订单…</view>
    <view v-else-if="order" class="payment-content">
      <section class="countdown booking-card"><view><text>支付剩余</text><strong>{{ countdown }}</strong><small>超时后将释放达人档期</small></view></section>
      <section class="amount-card booking-card"><strong>¥{{ money(order.payable_amount) }}</strong><text>{{ order.provider_name }} · {{ order.service_name }}</text><small>{{ timeLabel }}</small></section>
      <text class="booking-section-title">支付方式</text>
      <section class="payment-methods booking-card"><button :class="{active:method==='wechat'}" @tap="method='wechat'"><i class="wechat">微</i><strong>微信支付</strong><text>{{ method==='wechat'?'✓':'' }}</text></button><button :class="{active:method==='alipay'}" @tap="method='alipay'"><i class="alipay">支</i><strong>支付宝</strong><text>{{ method==='alipay'?'✓':'' }}</text></button></section>
      <section class="safe-note"><strong>⬟ 平台担保交易 · 服务完成后结算</strong><text>当前为本地联调收银台，不会发起真实扣款。</text></section>
    </view>
    <view v-else class="booking-empty">{{ error || '订单不存在' }}</view>
    <footer v-if="order" class="booking-footer"><button :disabled="paying||expired" @tap="pay">{{ expired?'订单已超时':paying?'处理中…':`模拟支付 ¥${money(order.payable_amount)}` }}</button></footer>
  </view>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'; import { onLoad } from '@dcloudio/uni-app'; import { getProviderOrder, simulateProviderOrderPayment } from '@/services/orders'; import type { ProviderOrder } from '@/types/api'; import { formatAmount, formatOrderTimeRange, getErrorMessage } from '@/utils/formatters'
const orderNo=ref(''),order=ref<ProviderOrder|null>(null),loading=ref(true),error=ref(''),paying=ref(false),method=ref<'wechat'|'alipay'>('wechat'),secondsLeft=ref(0);let timer:number|undefined
const expired=computed(()=>secondsLeft.value<=0),countdown=computed(()=>`${String(Math.floor(secondsLeft.value/60)).padStart(2,'0')}:${String(secondsLeft.value%60).padStart(2,'0')}`),timeLabel=computed(()=>order.value?formatOrderTimeRange(order.value.starts_at,order.value.ends_at):'')
const money=formatAmount
function goBack(){uni.navigateBack()}
function startTimer(){if(!order.value)return;const tick=()=>{secondsLeft.value=Math.max(0,Math.floor((new Date(order.value!.payment_expires_at).getTime()-Date.now())/1000))};tick();timer=setInterval(tick,1000) as unknown as number}
async function load(){loading.value=true;try{order.value=(await getProviderOrder(orderNo.value)).data;startTimer()}catch(reason){error.value=getErrorMessage(reason)}finally{loading.value=false}}
async function pay(){if(!order.value||paying.value||expired.value)return;paying.value=true;try{const paid=(await simulateProviderOrderPayment(order.value.order_no)).data;uni.redirectTo({url:`/pages/booking/success?orderNo=${paid.order_no}`})}catch(reason){uni.showToast({title:getErrorMessage(reason,'支付失败'),icon:'none'})}finally{paying.value=false}}
onLoad(query=>{orderNo.value=typeof query?.orderNo==='string'?query.orderNo:'';if(orderNo.value)load();else{loading.value=false;error.value='缺少订单号'}});onUnmounted(()=>{if(timer)clearInterval(timer)})
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *; @use '../../styles/booking.scss';
.payment-page{min-height:100vh;padding-bottom:calc(130rpx + env(safe-area-inset-bottom));background:linear-gradient(160deg,#e5fbfb,#f5f7f8 42%)}.payment-content{padding:24rpx}.countdown{min-height:112rpx;padding:18rpx 24rpx;border:1rpx solid #ffb38f;background:linear-gradient(140deg,#fff,#fff4ed)}.countdown view{display:grid;grid-template-columns:1fr auto;align-items:center}.countdown text{font-size:22rpx;font-weight:700}.countdown strong{grid-row:span 2;color:$dz-price-primary;font-size:34rpx}.countdown small{margin-top:9rpx;color:$dz-text-secondary;font-size:18rpx}.amount-card{display:flex;flex-direction:column;align-items:center;margin-top:22rpx;padding:45rpx 24rpx}.amount-card strong{color:$dz-price-primary;font-size:58rpx}.amount-card text{margin-top:24rpx;font-size:25rpx;font-weight:600}.amount-card small{margin-top:10rpx;color:$dz-text-secondary;font-size:19rpx}.payment-methods{padding:0 20rpx}.payment-methods button{display:flex;align-items:center;width:100%;height:100rpx;margin:0;padding:0;border:0;border-bottom:1rpx solid $dz-border-subtle;background:#fff;text-align:left}.payment-methods button:last-child{border:0}.payment-methods button::after{display:none}.payment-methods i{display:flex;align-items:center;justify-content:center;width:52rpx;height:52rpx;border-radius:14rpx;color:#fff;font-size:24rpx;font-style:normal}.wechat{background:#11b94d}.alipay{background:#1688f5}.payment-methods strong{flex:1;margin-left:18rpx;font-size:23rpx}.payment-methods button>text{display:flex;align-items:center;justify-content:center;width:32rpx;height:32rpx;border:2rpx solid #c5cccf;border-radius:50%;color:#fff}.payment-methods .active>text{border-color:$dz-brand-primary;background:$dz-brand-primary}.safe-note{display:flex;flex-direction:column;gap:10rpx;margin-top:24rpx;padding:20rpx;border-radius:17rpx;color:$dz-brand-deep;background:$dz-brand-soft;font-size:20rpx}.safe-note text{font-size:18rpx}
</style>
