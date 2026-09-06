<template>
  <view class="dz-page payment-page">
    <header class="page-head"><button aria-label="返回" @tap="goBack">‹</button><text>活动发布收银台</text></header>
    <view v-if="loading" class="state">正在创建支付单…</view>
    <view v-else-if="error" class="state"><text>{{ error }}</text><button @tap="loadOrder">重新加载</button></view>
    <main v-else-if="order" class="payment-content">
      <section class="amount-card panel"><text>发起人应付金额</text><strong>¥{{ money(order.payable_amount) }}</strong><small>支付完成后活动将提交平台审核</small></section>
      <section class="fee-card panel"><view><text>本人AA分摊本金</text><strong>¥{{ money(order.aa_principal_amount) }}</strong></view><view><text>平台组局服务费</text><strong>¥{{ money(order.platform_service_fee_amount) }}</strong></view><view class="total"><text>合计</text><strong>¥{{ money(order.payable_amount) }}</strong></view></section>
      <text class="section-title">支付方式</text>
      <section class="methods panel"><button :class="{active:method==='wechat'}" @tap="method='wechat'"><i class="wechat">微</i><strong>微信支付</strong><text>{{ method==='wechat'?'✓':'' }}</text></button><button :class="{active:method==='alipay'}" @tap="method='alipay'"><i class="alipay">支</i><strong>支付宝</strong><text>{{ method==='alipay'?'✓':'' }}</text></button></section>
      <section class="notice"><strong>⬟ 平台担保交易</strong><text>本地开发环境使用模拟支付，不会产生真实扣款。正式支付渠道接入后复用当前支付单。</text></section>
    </main>
    <footer v-if="order" class="payment-footer"><button :disabled="paying" @tap="pay">{{ paying?'处理中…':`模拟支付 ¥${money(order.payable_amount)}` }}</button></footer>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { createActivityPublishOrder, simulateActivityPublishPayment } from '@/services/activities'
import type { ActivityPublishOrder } from '@/types/api'
import { formatAmount, getErrorMessage } from '@/utils/formatters'
const activityId=ref(0),order=ref<ActivityPublishOrder|null>(null),loading=ref(true),error=ref(''),paying=ref(false),method=ref<'wechat'|'alipay'>('wechat'),money=formatAmount
function goBack(){uni.navigateBack()}
async function loadOrder(){loading.value=true;error.value='';try{order.value=(await createActivityPublishOrder(activityId.value)).data}catch(reason){error.value=getErrorMessage(reason,'支付单创建失败')}finally{loading.value=false}}
async function pay(){if(!order.value||paying.value)return;paying.value=true;try{await simulateActivityPublishPayment(activityId.value);uni.showModal({title:'提交审核成功',content:'支付已完成，活动进入平台内容审核。审核结果将通过消息通知。',showCancel:false,success:()=>uni.redirectTo({url:'/pages/activities/mine'})})}catch(reason){uni.showToast({title:getErrorMessage(reason,'支付失败'),icon:'none'});await loadOrder()}finally{paying.value=false}}
onLoad(query=>{activityId.value=Number(query?.id)||0;if(activityId.value)loadOrder();else{loading.value=false;error.value='缺少活动编号'}})
</script>
<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;
.payment-page{min-height:100vh;padding-bottom:calc(126rpx + env(safe-area-inset-bottom));background:linear-gradient(160deg,#defafa,#f5f7f8 42%)}.page-head{position:relative;display:flex;align-items:flex-end;justify-content:center;height:calc(98rpx + env(safe-area-inset-top));padding-bottom:18rpx;box-sizing:border-box}.page-head button{position:absolute;left:20rpx;bottom:7rpx;width:70rpx;height:70rpx;margin:0;padding:0;border:0;background:transparent;font-size:50rpx;line-height:70rpx}.page-head button::after,.methods button::after,.payment-footer button::after,.state button::after{display:none}.page-head text{font-size:31rpx;font-weight:800}.payment-content{padding:24rpx}.panel{border-radius:24rpx;background:#fff;box-shadow:$dz-shadow-card}.amount-card{display:flex;flex-direction:column;align-items:center;padding:48rpx 24rpx}.amount-card>text{color:$dz-text-secondary;font-size:21rpx}.amount-card strong{margin-top:17rpx;color:$dz-price-primary;font-size:60rpx}.amount-card small{margin-top:16rpx;color:$dz-brand-deep;font-size:19rpx}.fee-card{margin-top:20rpx;padding:20rpx 24rpx}.fee-card>view{display:flex;justify-content:space-between;padding:13rpx 0;color:$dz-text-secondary;font-size:21rpx}.fee-card .total{margin-top:8rpx;padding-top:20rpx;border-top:1rpx dashed $dz-border-subtle;color:$dz-text-primary;font-size:24rpx}.fee-card .total strong{color:$dz-price-primary;font-size:31rpx}.section-title{display:block;margin:30rpx 4rpx 15rpx;font-size:25rpx;font-weight:800}.methods{padding:0 20rpx}.methods button{display:flex;align-items:center;width:100%;height:98rpx;margin:0;padding:0;border:0;border-bottom:1rpx solid $dz-border-subtle;background:#fff;text-align:left}.methods button:last-child{border:0}.methods i{display:flex;align-items:center;justify-content:center;width:52rpx;height:52rpx;border-radius:14rpx;color:#fff;font-size:24rpx;font-style:normal}.wechat{background:#11b94d}.alipay{background:#1688f5}.methods strong{flex:1;margin-left:18rpx;font-size:23rpx}.methods button>text{display:flex;align-items:center;justify-content:center;width:32rpx;height:32rpx;border:2rpx solid #c5cccf;border-radius:50%;color:#fff}.methods .active>text{border-color:$dz-brand-primary;background:$dz-brand-primary}.notice{display:flex;flex-direction:column;gap:10rpx;margin-top:22rpx;padding:20rpx;border-radius:18rpx;color:$dz-brand-deep;background:$dz-brand-soft;font-size:20rpx}.notice text{font-size:18rpx;line-height:1.6}.payment-footer{position:fixed;z-index:20;right:0;bottom:0;left:0;max-width:750px;height:calc(112rpx + env(safe-area-inset-bottom));margin:auto;padding:12rpx 24rpx env(safe-area-inset-bottom);background:#fff;box-shadow:0 -6rpx 24rpx rgba(31,65,72,.1);box-sizing:border-box}.payment-footer button{width:100%;height:76rpx;margin:0;border:0;border-radius:38rpx;color:#fff;background:$dz-gradient-brand;font-size:25rpx;font-weight:700;line-height:76rpx}.state{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:600rpx;color:$dz-text-secondary}.state button{margin-top:24rpx;border:0;color:#fff;background:$dz-brand-primary}
</style>
