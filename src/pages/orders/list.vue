<template>
  <view class="dz-page dz-list-page order-list-page">
    <DzNavBar title="我的订单" :back-action="goBack" />
    <view class="dz-list-toolbar dz-list-container">
      <DzListFilters :value="activeTab" :options="filterOptions" label="订单状态，可左右滑动" @change="selectOrderTab" />
    </view>
    <main class="list-content dz-list-content dz-list-container" :class="{ 'dz-list-content--empty': !loading && !error && !visibleOrders.length }">
      <view v-if="loading" class="state">正在加载订单…</view>
      <view v-else-if="error" class="state"><text>{{ error }}</text><button @tap="loadOrders">重新加载</button></view>
      <DzListEmpty v-else-if="!visibleOrders.length" icon="order" :title="emptyTitle" description="预约达人服务后，订单会显示在这里。" action-text="去找达人" @action="browseProviders" />
      <section v-for="order in visibleOrders" :key="order.order_no" class="order-card" @tap="openOrder(order.order_no)">
        <view class="card-head"><text>达人服务</text><view class="head-status"><text v-if="order.after_sales" class="finance-status">{{ order.after_sales.status_label }}</text><strong>{{ orderStatusCopy(order.status).title }}</strong></view></view>
        <view class="provider-row"><view class="avatar"><image v-if="order.provider_avatar_url" :src="order.provider_avatar_url" mode="aspectFill"/><text v-else>{{ order.provider_name.slice(0,1) }}</text></view><view class="provider-copy"><strong>{{ order.provider_name }} · {{ order.service_name }}</strong><text>◷ {{ formatRange(order.starts_at,order.ends_at) }}</text><text>● {{ addressLabel(order) }}</text></view><view class="amount"><text>合计</text><strong>¥{{ money(order.payable_amount) }}</strong></view></view>
        <view class="card-foot"><text>订单号 {{ order.order_no }}</text><view><button v-if="order.status==='pending_payment'" class="outline" @tap.stop="cancel(order)">取消订单</button><button v-if="order.status==='pending_payment'" class="primary" @tap.stop="continuePay(order)">继续支付</button><button v-else class="outline" @tap.stop="openOrder(order.order_no)">查看详情</button></view></view>
      </section>
    </main>
  </view>
</template>

<script setup lang="ts">
import { navigateBackOr } from '@/utils/navigation'
import DzNavBar from '@/components/DzNavBar.vue'
import DzListFilters from '@/components/DzListFilters.vue'
import DzListEmpty from '@/components/DzListEmpty.vue'
import { computed, ref } from 'vue'; import { onLoad, onShow } from '@dcloudio/uni-app'; import { cancelProviderOrder, getProviderOrders } from '@/services/orders'; import { inOrderBucket, orderStatusCopy, orderTabs } from '@/services/orderPresentation'; import type { OrderBucket } from '@/services/orderPresentation'; import { isAuthenticated } from '@/services/session'; import type { ProviderOrder } from '@/types/api'; import { formatAmount, formatOrderTimeRange, getErrorMessage } from '@/utils/formatters'
const orders=ref<ProviderOrder[]>([]),activeTab=ref<OrderBucket>('all'),loading=ref(true),error=ref(''),hasLoaded=ref(false);const visibleOrders=computed(()=>orders.value.filter(item=>inOrderBucket(item.status,activeTab.value)));const money=formatAmount
const formatRange=formatOrderTimeRange
const filterOptions = orderTabs.map(tab => ({ value: tab.key, label: tab.label }))
const emptyTitle = computed(() => activeTab.value === 'all' ? '暂无相关订单' : `暂无${orderTabs.find(tab => tab.key === activeTab.value)?.label || ''}订单`)
function selectOrderTab(value: string) { const tab = orderTabs.find(item => item.key === value); if (tab) activeTab.value = tab.key }
function addressLabel(order:ProviderOrder){return [order.meeting_location_name,order.meeting_address].filter((value,index,values)=>value&&values.indexOf(value)===index).join('，')}
function goBack(){navigateBackOr(() => uni.reLaunch({ url: '/pages/profile/index' }))}function browseProviders(){uni.reLaunch({url:'/pages/providers/list'})}function openOrder(orderNo:string){uni.navigateTo({url:`/pages/orders/detail?orderNo=${orderNo}`})}function continuePay(order:ProviderOrder){uni.navigateTo({url:`/pages/booking/payment?orderNo=${order.order_no}`})}
function cancel(order:ProviderOrder){uni.showModal({title:'取消订单',content:'订单尚未支付，取消后将立即释放达人档期。',success:async result=>{if(!result.confirm)return;try{await cancelProviderOrder(order.order_no);await loadOrders()}catch(reason){uni.showToast({title:getErrorMessage(reason,'取消失败'),icon:'none'})}}})}
async function loadOrders(){loading.value=true;error.value='';try{orders.value=(await getProviderOrders()).data.items;hasLoaded.value=true}catch(reason){error.value=getErrorMessage(reason)}finally{loading.value=false}}
onLoad(query=>{const value=typeof query?.status==='string'?query.status:'all';if(orderTabs.some(item=>item.key===value))activeTab.value=value as OrderBucket});onShow(()=>{if(isAuthenticated())loadOrders()})
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;
.order-card{margin-bottom:18rpx;padding:0 20rpx;border-radius:$dz-radius-md;background:$dz-surface-card;box-shadow:$dz-shadow-card}.card-head{display:flex;align-items:center;justify-content:space-between;height:72rpx;border-bottom:1rpx solid $dz-border-subtle;font-size:$dz-fs-caption}.card-head text{font-weight:$dz-fw-bold}.card-head strong{color:$dz-brand-deep}.provider-row{display:flex;align-items:flex-start;padding:22rpx 0}.avatar{display:flex;align-items:center;justify-content:center;overflow:hidden;width:92rpx;height:92rpx;border-radius:$dz-radius-sm;color:$dz-brand-deep;background:$dz-brand-soft;font-size:$dz-fs-heading}.avatar image{width:100%;height:100%}.provider-copy{display:flex;flex:1;flex-direction:column;gap:9rpx;margin-left:16rpx;min-width:0}.provider-copy strong{font-size:$dz-fs-caption}.provider-copy text{overflow:hidden;color:$dz-text-secondary;font-size:$dz-fs-micro;text-overflow:ellipsis;white-space:nowrap}.amount{display:flex;flex-direction:column;align-items:flex-end;gap:8rpx;margin-left:10rpx;color:$dz-text-secondary;font-size:$dz-fs-micro}.amount strong{color:$dz-price-primary;font-size:$dz-fs-body-strong}.card-foot{display:flex;align-items:center;justify-content:space-between;min-height:84rpx;border-top:1rpx solid $dz-border-subtle}.card-foot>text{color:$dz-text-tertiary;font-size:$dz-fs-micro}.card-foot>view{display:flex;gap:10rpx}.card-foot button{height:54rpx;margin:0;padding:0 20rpx;border-radius:$dz-radius-md;font-size:$dz-fs-caption;line-height:54rpx}.card-foot .outline{border:1rpx solid $dz-border-subtle;color:$dz-text-primary;background:$dz-surface-card}.card-foot .primary{border:0;color:$dz-text-inverse;background:$dz-gradient-brand}
.head-status{display:flex;align-items:center;gap:10rpx}.head-status>strong{font-size:$dz-fs-caption}.finance-status{padding:5rpx 10rpx;border-radius:$dz-radius-sm;color:$dz-status-warning-deep;background:$dz-status-warning-soft;font-size:$dz-fs-micro!important;font-weight:$dz-fw-medium!important}

.state { display: flex; min-height: 180px; flex-direction: column; align-items: center; justify-content: center; gap: $dz-space-3; color: $dz-list-text; font-size: max(14px, #{$dz-fs-body}); text-align: center; }
.state button { min-height: 44px; margin: 0; padding: 0 $dz-space-5; border: 0; border-radius: $dz-radius-full; color: $dz-text-inverse; background: $dz-list-accent; font-size: max(14px, #{$dz-fs-body}); }
.state button::after, .card-foot button::after { display: none; }
</style>
