<template>
  <view class="dz-page payment-page">
    <DzNavBar title="活动发布收银台" :back-action="goBack" />
    <view v-if="loading" class="state">正在创建支付单…</view>
    <view v-else-if="error" class="state"><text>{{ error }}</text><button @tap="loadOrder">重新加载</button></view>
    <main v-else-if="order" class="payment-content">
      <section class="amount-card panel"><text>发起人应付金额</text><strong>¥{{ money(order.payable_amount) }}</strong><small>支付完成后活动将提交平台审核</small></section>
      <section class="fee-card panel"><view><text>本人AA分摊本金</text><strong>¥{{ money(order.aa_principal_amount) }}</strong></view><view><text>平台组局服务费</text><strong>¥{{ money(order.platform_service_fee_amount) }}</strong></view><view class="total"><text>合计</text><strong>¥{{ money(order.payable_amount) }}</strong></view></section>
      <text class="section-title">支付方式</text>
      <section class="methods panel">
        <button v-if="order.wallet_amount" class="active"><i class="balance">余</i><strong>余额支付</strong><small>¥{{ money(order.wallet_amount) }}</small><text>✓</text></button>
        <button v-if="order.external_amount" class="active"><i class="wechat">微</i><strong>微信支付</strong><small>¥{{ money(order.external_amount) }}</small><text>✓</text></button>
      </section>
      <section class="notice"><strong>⬟ 平台担保交易</strong><text>{{ paymentMode==='mock'?'本地模拟支付已开启，不会产生真实扣款。':'页面回跳不代表支付成功，最终结果以服务端汇付查单为准。' }}</text></section>
    </main>
    <footer v-if="order" class="payment-footer"><button :disabled="paying" @tap="pay">{{ paying?'正在确认支付…':`${paymentMode==='mock'?'模拟支付':order.external_amount?'余额 + 微信支付':'余额支付'} ¥${money(order.payable_amount)}` }}</button></footer>
  </view>
</template>
<script setup lang="ts">
import { navigateBackOr } from '@/utils/navigation'
import DzNavBar from '@/components/DzNavBar.vue'
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { confirmActivityPublishPaymentStatus, createActivityPublishOrder, createActivityPublishPaymentSession, getActivityPublishPaymentAuthorization, simulateActivityPublishPayment } from '@/services/activities'
import { requireActivityPaymentCapability } from '@/services/payments'
import type { ActivityPaymentMode } from '@/services/payments'
import { handlePaymentRecovery, invokeWechatPay, isWechatBrowser } from '@/services/wechatPay'
import type { ActivityPublishOrder } from '@/types/api'
import { formatAmount, getErrorMessage } from '@/utils/formatters'
const activityId=ref(0),order=ref<ActivityPublishOrder|null>(null),loading=ref(true),error=ref(''),paying=ref(false),paymentMode=ref<ActivityPaymentMode|null>(null),autoPayAfterAuthorization=ref(false),completionHandled=ref(false),money=formatAmount
function goBack(){navigateBackOr(() => uni.reLaunch({ url: '/pages/activities/index' }))}
async function loadOrder(){loading.value=true;error.value='';try{order.value=(await createActivityPublishOrder(activityId.value)).data;if(order.value.status==='paid'){showSuccess();return}if(['partially_refunded','refunded'].includes(order.value.status)){showRefundStatus();return}paymentMode.value=order.value.external_amount===0?'official_account':await requireActivityPaymentCapability('activity_publish');if(autoPayAfterAuthorization.value){autoPayAfterAuthorization.value=false;setTimeout(()=>void pay(),0)}}catch(reason){error.value=getErrorMessage(reason,'支付单创建失败')}finally{loading.value=false}}
async function confirmPayment(){for(let attempt=0;attempt<5;attempt+=1){const result=(await confirmActivityPublishPaymentStatus(activityId.value)).data;order.value=result.publish_order;if(result.state==='paid')return;if(result.state==='refund_pending')throw new Error('支付已超时，系统正在原路退款');if(result.state==='refunded')throw new Error('该笔支付已原路退款');if(result.state==='refund_failed')throw new Error('自动退款失败，请联系客服核对');if(result.state==='failed')throw new Error('支付未成功，请重新支付');await new Promise(resolve=>setTimeout(resolve,1200))}throw new Error('支付结果确认中，请稍后重新进入本页查看')}
function showSuccess(){if(completionHandled.value)return;completionHandled.value=true;const goToMine=()=>uni.redirectTo({url:'/pages/activities/mine?role=organized'});uni.showModal({title:'活动提交成功',content:'支付已确认，平台正在审核中。你可以在“我的活动”中查看进展，审核结果也会通过消息通知。',showCancel:false,confirmText:'查看活动',success:goToMine,fail:()=>{uni.showToast({title:'活动已提交审核',icon:'success'});setTimeout(goToMine,1200)}})}
function showRefundStatus(){if(completionHandled.value)return;completionHandled.value=true;uni.showModal({title:'支付已退款',content:'该发布支付已进入退款流程或已退款，请在“我的活动”查看最终记录。',showCancel:false,success:()=>uni.redirectTo({url:'/pages/activities/mine'})})}
async function pay(){if(!order.value||paying.value)return;paying.value=true;try{if(paymentMode.value==='mock'){await simulateActivityPublishPayment(activityId.value);showSuccess();return}
if(order.value.external_amount===0){const session=(await createActivityPublishPaymentSession(activityId.value)).data;if(session.invoke_type!=='BALANCE')throw new Error('余额支付状态已变化，请刷新后重试');showSuccess();return}
// #ifdef H5
if(!isWechatBrowser())throw new Error('请在微信服务号内打开页面完成支付');const authorization=(await getActivityPublishPaymentAuthorization(activityId.value)).data;if(!authorization.authorized){if(!authorization.authorize_url)throw new Error('微信授权地址不可用');window.location.assign(authorization.authorize_url);return}const session=(await createActivityPublishPaymentSession(activityId.value)).data;if(session.invoke_type==='BALANCE'){showSuccess();return}if(session.invoke_type!=='WECHAT_JSAPI'||!session.pay_info)throw new Error('支付通道未返回有效的微信调起参数');await invokeWechatPay(session.pay_info);await confirmPayment();showSuccess()
// #endif
// #ifndef H5
throw new Error('当前版本暂未开放 App 支付，请在微信服务号 H5 完成支付')
// #endif
} catch (reason) {
  if (await handlePaymentRecovery(reason, async () => { await confirmPayment(); showSuccess() })) return
  uni.showToast({ title: getErrorMessage(reason, '支付失败'), icon: 'none' })
  await loadOrder()
} finally { paying.value = false } }
onLoad(query=>{activityId.value=Number(query?.id)||0;autoPayAfterAuthorization.value=query?.wechatAuthorized==='1';if(activityId.value)loadOrder();else{loading.value=false;error.value='缺少活动编号'}})
</script>
<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;
.payment-page{min-height:100vh;padding-bottom:calc(126rpx + env(safe-area-inset-bottom));background:linear-gradient(160deg,$dz-brand-soft,$dz-surface-page 42%)}.page-head{position:relative;display:flex;align-items:flex-end;justify-content:center;height:calc(98rpx + env(safe-area-inset-top));padding-bottom:18rpx;box-sizing:border-box}.page-head button{position:absolute;left:20rpx;bottom:7rpx;width:70rpx;height:70rpx;margin:0;padding:0;border:0;background:transparent;font-size:$dz-fs-price-lg;line-height:70rpx}.page-head button::after,.methods button::after,.payment-footer button::after,.state button::after{display:none}.page-head text{font-size:$dz-fs-body-strong;font-weight:$dz-fw-bold}.payment-content{padding:24rpx}.panel{border-radius:$dz-radius-md;background:$dz-surface-card;box-shadow:$dz-shadow-card}.amount-card{display:flex;flex-direction:column;align-items:center;padding:48rpx 24rpx}.amount-card>text{color:$dz-text-secondary;font-size:$dz-fs-caption}.amount-card strong{margin-top:17rpx;color:$dz-price-primary;font-size:60rpx}.amount-card small{margin-top:16rpx;color:$dz-brand-deep;font-size:$dz-fs-caption}.fee-card{margin-top:20rpx;padding:20rpx 24rpx}.fee-card>view{display:flex;justify-content:space-between;padding:13rpx 0;color:$dz-text-secondary;font-size:$dz-fs-caption}.fee-card .total{margin-top:8rpx;padding-top:20rpx;border-top:1rpx dashed $dz-border-subtle;color:$dz-text-primary;font-size:$dz-fs-caption}.fee-card .total strong{color:$dz-price-primary;font-size:$dz-fs-body-strong}.section-title{display:block;margin:30rpx 4rpx 15rpx;font-size:$dz-fs-caption;font-weight:$dz-fw-bold}.methods{padding:0 20rpx}.methods button{display:flex;align-items:center;width:100%;height:98rpx;margin:0;padding:0;border:0;border-bottom:1rpx solid $dz-border-subtle;background:$dz-surface-card;text-align:left}.methods button:last-child{border:0}.methods i{display:flex;align-items:center;justify-content:center;width:52rpx;height:52rpx;border-radius:$dz-radius-sm;color:$dz-text-inverse;font-size:$dz-fs-caption;font-style:normal}.wechat{background:#11b94d}.balance{background:$dz-gradient-brand}.methods strong{flex:1;margin-left:18rpx;font-size:$dz-fs-caption}.methods small{margin-right:16rpx;color:$dz-text-secondary;font-size:$dz-fs-caption}.methods button>text{display:flex;align-items:center;justify-content:center;width:32rpx;height:32rpx;border:2rpx solid $dz-border-subtle;border-radius:50%;color:$dz-text-inverse}.methods .active>text{border-color:$dz-brand-primary;background:$dz-brand-primary}.notice{display:flex;flex-direction:column;gap:10rpx;margin-top:22rpx;padding:20rpx;border-radius:$dz-radius-sm;color:$dz-brand-deep;background:$dz-brand-soft;font-size:$dz-fs-caption}.notice text{font-size:$dz-fs-micro;line-height:1.6}.payment-footer{position:fixed;z-index:20;right:0;bottom:0;left:0;max-width:750px;height:calc(112rpx + env(safe-area-inset-bottom));margin:auto;padding:12rpx 24rpx env(safe-area-inset-bottom);background:$dz-surface-card;box-shadow:$dz-shadow-floating;box-sizing:border-box}.payment-footer button{width:100%;height:76rpx;margin:0;border:0;border-radius:$dz-radius-lg;color:$dz-text-inverse;background:$dz-gradient-brand;font-size:$dz-fs-caption;font-weight:$dz-fw-bold;line-height:76rpx}.state{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:600rpx;color:$dz-text-secondary}.state button{margin-top:24rpx;border:0;color:$dz-text-inverse;background:$dz-brand-primary}
</style>
