<template>
  <view class="dz-page payment-page">
    <header class="booking-head"><button aria-label="返回" @tap="goBack">‹</button><text>收银台</text></header>
    <view v-if="loading" class="booking-empty">正在加载订单…</view>
    <view v-else-if="order" class="payment-content">
      <section class="countdown booking-card"><view><text>支付剩余</text><strong>{{ countdown }}</strong><small>超时后将释放达人档期</small></view></section>
      <section class="amount-card booking-card"><strong>¥{{ money(order.payable_amount) }}</strong><text>{{ order.provider_name }} · {{ order.service_name }}</text><small>{{ timeLabel }}</small></section>
      <text class="booking-section-title">安全支付</text>
      <section class="payment-methods booking-card"><view class="cashier-method"><i class="wechat">微</i><view><strong>微信支付</strong><text>汇付聚合支付 · 服务号安全支付</text></view><b>›</b></view></section>
      <section class="safe-note"><strong>⬟ 平台担保交易 · 服务完成后结算</strong><text>{{ mockPaymentEnabled?'本地模拟支付已开启，不会发起真实扣款。':'页面回跳不代表支付成功，订单结果以服务端确认为准。' }}</text></section>
    </view>
    <view v-else class="booking-empty">{{ error || '订单不存在' }}</view>
    <footer v-if="order" class="booking-footer"><button :disabled="paying||expired" @tap="pay">{{ expired?'订单已超时':paying?'正在调起微信支付…':`${mockPaymentEnabled?'模拟支付':'微信支付'} ¥${money(order.payable_amount)}` }}</button></footer>
  </view>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'; import { onLoad } from '@dcloudio/uni-app'; import { createProviderOrderPaymentSession, getProviderOrder, getProviderOrderPaymentAuthorization, simulateProviderOrderPayment } from '@/services/orders'; import type { ProviderOrder } from '@/types/api'; import { formatAmount, formatOrderTimeRange, getErrorMessage } from '@/utils/formatters'
type WechatBridgeResult={err_msg?:string}
type WechatBridge={invoke:(method:string,params:Record<string,string|number>,callback:(result:WechatBridgeResult)=>void)=>void}
const orderNo=ref(''),order=ref<ProviderOrder|null>(null),loading=ref(true),error=ref(''),paying=ref(false),secondsLeft=ref(0),autoPayAfterAuthorization=ref(false);let timer:number|undefined
const mockPaymentEnabled=import.meta.env.DEV&&import.meta.env.VITE_ENABLE_MOCK_PAYMENT==='true'
const expired=computed(()=>secondsLeft.value<=0),countdown=computed(()=>`${String(Math.floor(secondsLeft.value/60)).padStart(2,'0')}:${String(secondsLeft.value%60).padStart(2,'0')}`),timeLabel=computed(()=>order.value?formatOrderTimeRange(order.value.starts_at,order.value.ends_at):'')
const money=formatAmount
function goBack(){uni.navigateBack()}
function startTimer(){if(!order.value)return;const tick=()=>{secondsLeft.value=Math.max(0,Math.floor((new Date(order.value!.payment_expires_at).getTime()-Date.now())/1000))};tick();timer=setInterval(tick,1000) as unknown as number}
function isWechatBrowser(){return typeof navigator!=='undefined'&&/MicroMessenger/i.test(navigator.userAgent)}
function currentWechatBridge(){return typeof window==='undefined'?undefined:(window as typeof window&{WeixinJSBridge?:WechatBridge}).WeixinJSBridge}
function waitWechatBridge(){const current=currentWechatBridge();if(current)return Promise.resolve(current);return new Promise<WechatBridge>((resolve,reject)=>{if(typeof document==='undefined'){reject(new Error('当前环境无法调起微信支付'));return}const onReady=()=>{window.clearTimeout(timeout);const bridge=currentWechatBridge();if(bridge)resolve(bridge);else reject(new Error('微信支付组件不可用'))};const timeout=window.setTimeout(()=>{document.removeEventListener('WeixinJSBridgeReady',onReady);reject(new Error('微信支付组件加载超时，请刷新后重试'))},8000);document.addEventListener('WeixinJSBridgeReady',onReady,{once:true})})}
async function invokeWechatPay(payInfo:Record<string,string|number>){const bridge=await waitWechatBridge();await new Promise<void>((resolve,reject)=>{bridge.invoke('getBrandWCPayRequest',payInfo,result=>{const message=(result.err_msg||'').toLowerCase();if(message==='get_brand_wcpay_request:ok'){resolve();return}if(message==='get_brand_wcpay_request:cancel'){reject(new Error('已取消支付'));return}reject(new Error('微信支付未完成，请稍后重试'))})})}
async function load(){loading.value=true;try{order.value=(await getProviderOrder(orderNo.value)).data;startTimer();if(autoPayAfterAuthorization.value)setTimeout(()=>void pay(),0)}catch(reason){error.value=getErrorMessage(reason)}finally{loading.value=false}}
async function pay(){if(!order.value||paying.value||expired.value)return;paying.value=true;try{if(mockPaymentEnabled){const paid=(await simulateProviderOrderPayment(order.value.order_no)).data;uni.redirectTo({url:`/pages/booking/success?orderNo=${paid.order_no}`});return}
// #ifdef H5
if(!isWechatBrowser())throw new Error('请在微信服务号内打开页面完成支付');const authorization=(await getProviderOrderPaymentAuthorization(order.value.order_no)).data;if(!authorization.authorized){if(!authorization.authorize_url)throw new Error('微信授权地址不可用');uni.setStorageSync('pendingProviderOrderNo',order.value.order_no);window.location.assign(authorization.authorize_url);return}const session=(await createProviderOrderPaymentSession(order.value.order_no,'official_account')).data;if(session.invoke_type!=='WECHAT_JSAPI'||!session.pay_info)throw new Error('支付通道未返回有效的微信调起参数');uni.setStorageSync('pendingProviderOrderNo',order.value.order_no);await invokeWechatPay(session.pay_info);uni.redirectTo({url:`/pages/booking/payment-result?orderNo=${encodeURIComponent(order.value.order_no)}`})
// #endif
// #ifndef H5
throw new Error('当前版本暂未开放 App 支付，请在 H5 完成支付')
// #endif
}catch(reason){uni.showToast({title:getErrorMessage(reason,'支付失败'),icon:'none'})}finally{paying.value=false}}
onLoad(query=>{orderNo.value=typeof query?.orderNo==='string'?query.orderNo:'';autoPayAfterAuthorization.value=query?.wechatAuthorized==='1';if(orderNo.value)load();else{loading.value=false;error.value='缺少订单号'}});onUnmounted(()=>{if(timer)clearInterval(timer)})
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *; @use '../../styles/booking.scss';
.payment-page{min-height:100vh;padding-bottom:calc(130rpx + env(safe-area-inset-bottom));background:linear-gradient(160deg,#e5fbfb,$dz-surface-page 42%)}.payment-content{padding:24rpx}.countdown{min-height:112rpx;padding:18rpx 24rpx;border:1rpx solid #ffb38f;background:linear-gradient(140deg,#fff,#fff4ed)}.countdown view{display:grid;grid-template-columns:1fr auto;align-items:center}.countdown text{font-size:$dz-fs-caption;font-weight:$dz-fw-bold}.countdown strong{grid-row:span 2;color:$dz-price-primary;font-size:$dz-fs-heading}.countdown small{margin-top:9rpx;color:$dz-text-secondary;font-size:$dz-fs-micro}.amount-card{display:flex;flex-direction:column;align-items:center;margin-top:22rpx;padding:45rpx 24rpx}.amount-card strong{color:$dz-price-primary;font-size:58rpx}.amount-card text{margin-top:24rpx;font-size:$dz-fs-caption;font-weight:$dz-fw-semibold}.amount-card small{margin-top:10rpx;color:$dz-text-secondary;font-size:$dz-fs-caption}.payment-methods{padding:0 20rpx}.cashier-method{display:flex;min-height:112rpx;align-items:center}.cashier-method i{display:flex;width:58rpx;height:58rpx;align-items:center;justify-content:center;border-radius:$dz-radius-sm;color:$dz-text-inverse;box-shadow:0 8rpx 22rpx rgba(17,185,79,.2);font-size:$dz-fs-caption;font-style:normal;font-weight:$dz-fw-bold}.cashier-method i.wechat{background:linear-gradient(145deg,#20c967,#11a94d)}.cashier-method>view{display:flex;gap:6rpx;margin-left:18rpx;flex:1;flex-direction:column}.cashier-method strong{font-size:$dz-fs-caption}.cashier-method text{color:$dz-text-secondary;font-size:$dz-fs-micro}.cashier-method b{color:$dz-text-tertiary;font-size:38rpx;font-weight:400}.safe-note{display:flex;flex-direction:column;gap:10rpx;margin-top:24rpx;padding:20rpx;border-radius:$dz-radius-sm;color:$dz-brand-deep;background:$dz-brand-soft;font-size:$dz-fs-caption}.safe-note text{font-size:$dz-fs-micro}
</style>
