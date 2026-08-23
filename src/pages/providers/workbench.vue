<template>
  <view class="dz-page workbench">
    <view class="dz-safe-top" />
    <header class="nav dz-container">
      <button aria-label="返回" @tap="goBack">‹</button>
      <strong>达人工作台</strong>
      <view aria-hidden="true" />
    </header>

    <main class="dz-container">
      <NetworkState v-if="loading" message="正在加载工作台…" />
      <NetworkState v-else-if="error" :message="error" action-text="重新加载" @action="load" />

      <template v-else-if="data">
        <section class="identity">
          <view class="avatar">
            <image v-if="data.avatar_url" :src="data.avatar_url" mode="aspectFill" />
            <text v-else>{{ data.nickname.slice(0, 1) }}</text>
          </view>
          <view>
            <strong>{{ data.nickname }} <small>✓ 已认证</small></strong>
            <text><i /> {{ data.is_accepting_orders ? '接单中' : '暂停接单' }}</text>
          </view>
        </section>

        <section class="metrics">
          <view><text>今日订单</text><strong>{{ data.today_order_count }}</strong></view>
          <view><text>本月收入</text><strong class="orange">¥{{ money(data.month_income_amount) }}</strong></view>
          <view><text>服务次数</text><strong>{{ data.service_count }}</strong></view>
        </section>

        <section class="accepting">
          <view>
            <strong>{{ data.is_accepting_orders ? '当前可接单' : '已暂停接单' }}</strong>
            <text>{{ acceptingDescription }}</text>
          </view>
          <switch
            :checked="data.is_accepting_orders"
            :disabled="toggling || data.admin_order_restricted"
            color="#18c7c6"
            @change="toggle"
          />
        </section>

        <button
          class="location-card"
          :class="{ missing: !data.has_service_location }"
          @tap="openLocation"
        >
          <view class="location-pin" aria-hidden="true"><i /></view>
          <view class="location-copy">
            <view>
              <strong>{{ data.has_service_location ? '常驻服务地点' : '完善常驻服务地点' }}</strong>
              <small>{{ data.has_service_location ? '已设置' : '接单前必填' }}</small>
            </view>
            <text v-if="data.has_service_location">
              {{ data.service_location_name || data.service_city_name }} · {{ data.max_service_radius_km }}km内
            </text>
            <text v-else>设置后才能计算距离并在附近达人列表展示</text>
          </view>
          <b>{{ data.has_service_location ? '修改' : '去设置' }} ›</b>
        </button>

        <section class="entries">
          <button @tap="open('/pages/providers/services')"><i>▣</i><text>服务管理</text><b>›</b></button>
          <button class="active" @tap="open('/pages/providers/schedule')"><i>▤</i><text>档期管理</text><b>›</b></button>
          <button @tap="open('/pages/providers/orders')"><i>▧</i><text>达人订单</text><b>›</b></button>
          <button @tap="pending('收入明细')"><i class="orange">¥</i><text>收入明细</text><b>›</b></button>
        </section>

        <section class="next">
          <strong>下一单</strong>
          <view v-if="data.upcoming_order">
            <i>◷</i>
            <view>
              <strong>{{ timeRange(data.upcoming_order.starts_at, data.upcoming_order.ends_at) }}</strong>
              <text>{{ data.upcoming_order.service_name }}</text>
            </view>
          </view>
          <text v-else>暂无待服务订单</text>
        </section>
      </template>
    </main>
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import NetworkState from '@/components/NetworkState.vue'
import { getProviderWorkbench, updateAcceptingOrders } from '@/services/providers'
import { guardCurrentPage } from '@/services/session'
import type { ProviderWorkbench } from '@/types/api'
import { getErrorMessage } from '@/utils/formatters'

const data = ref<ProviderWorkbench | null>(null)
const loading = ref(true)
const error = ref('')
const toggling = ref(false)

const acceptingDescription = computed(() => {
  if (data.value?.admin_order_restricted) {
    return data.value.admin_restriction_reason || '平台当前限制接单，请联系客服处理'
  }
  if (!data.value?.has_service_location) return '设置常驻服务地点后才能开启接单'
  return data.value.is_accepting_orders
    ? '关闭后用户将无法预约新的档期'
    : '开启后用户可以预约可用档期'
})

function goBack() {
  uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/profile/index' }) })
}
function money(value: number) {
  return (value / 100).toLocaleString('zh-CN', { minimumFractionDigits: 0 })
}
function twoDigits(value: number) { return String(value).padStart(2, '0') }
function timeRange(startsAt: string, endsAt: string) {
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  const date = `${start.getMonth() + 1}月${start.getDate()}日`
  return `${date} ${twoDigits(start.getHours())}:${twoDigits(start.getMinutes())}–${twoDigits(end.getHours())}:${twoDigits(end.getMinutes())}`
}
function open(url: string) { uni.navigateTo({ url }) }
function openLocation() { open('/pages/providers/location') }
function pending(value: string) { uni.showToast({ title: `${value}即将接入`, icon: 'none' }) }

async function toggle(event: Event) {
  if (!data.value || toggling.value) return
  const previous = data.value.is_accepting_orders
  const value = Boolean((event as CustomEvent<{ value: boolean }>).detail.value)
  if (value && !data.value.has_service_location) {
    data.value.is_accepting_orders = false
    uni.showModal({
      title: '先完善服务地点',
      content: '设置常驻服务地点后，平台才能计算服务距离并展示你的达人主页。',
      confirmText: '去设置',
      success: result => { if (result.confirm) openLocation() },
    })
    return
  }
  data.value.is_accepting_orders = value
  toggling.value = true
  try {
    await updateAcceptingOrders(value)
    uni.showToast({ title: value ? '已开启接单' : '已暂停接单', icon: 'success' })
  } catch (reason) {
    data.value.is_accepting_orders = previous
    uni.showToast({ title: getErrorMessage(reason), icon: 'none' })
  } finally {
    toggling.value = false
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = (await getProviderWorkbench()).data
  } catch (reason) {
    error.value = getErrorMessage(reason)
  } finally {
    loading.value = false
  }
}

onShow(() => { if (guardCurrentPage()) load() })
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;

.workbench{min-height:100vh;background:#fff}.nav{display:flex;align-items:center;justify-content:space-between;height:92rpx}.nav button,.nav>view{width:70rpx;margin:0;padding:0;border:0;background:transparent}.nav button{text-align:left;font-size:55rpx}.nav button::after,.entries button::after,.location-card::after{display:none}.nav strong{font-size:31rpx}.identity{display:flex;align-items:center;padding:20rpx 12rpx}.avatar{display:flex;align-items:center;justify-content:center;overflow:hidden;width:112rpx;height:112rpx;border-radius:50%;background:$dz-brand-soft}.avatar image{width:100%;height:100%}.identity>view:last-child{display:flex;flex-direction:column;gap:13rpx;margin-left:20rpx}.identity strong{font-size:30rpx}.identity small{padding:5rpx 10rpx;border-radius:14rpx;color:$dz-brand-deep;background:$dz-brand-soft;font-size:17rpx}.identity text{font-size:20rpx}.identity i{display:inline-block;width:13rpx;height:13rpx;border-radius:50%;background:$dz-brand-primary}.metrics{display:grid;grid-template-columns:repeat(3,1fr);margin-top:12rpx;padding:25rpx 0;border-radius:22rpx;box-shadow:$dz-shadow-card}.metrics view{display:flex;flex-direction:column;align-items:center;gap:10rpx;border-right:1rpx solid $dz-border-subtle}.metrics view:last-child{border:0}.metrics text{color:$dz-text-secondary;font-size:20rpx}.metrics strong{font-size:31rpx}.metrics .orange{color:#ff6433}.accepting{display:flex;align-items:center;justify-content:space-between;margin-top:22rpx;padding:26rpx;border-radius:22rpx;color:#fff;background:$dz-gradient-brand}.accepting>view{display:flex;flex-direction:column;gap:8rpx}.accepting strong{font-size:28rpx}.accepting text{font-size:18rpx}.location-card{display:flex;align-items:center;width:100%;min-height:116rpx;margin:22rpx 0 0;padding:20rpx 22rpx;border:1rpx solid #cdeceb;border-radius:22rpx;color:$dz-text-primary;background:#f7fdfd;text-align:left;box-shadow:none}.location-card.missing{border-color:#ffd9bd;background:#fff8f2}.location-pin{position:relative;display:flex;align-items:center;justify-content:center;flex:0 0 62rpx;width:62rpx;height:62rpx;border-radius:18rpx;background:$dz-brand-soft}.location-pin::before{content:'';width:23rpx;height:29rpx;border:4rpx solid $dz-brand-deep;border-radius:50% 50% 50% 0;transform:rotate(-45deg)}.location-pin i{position:absolute;top:21rpx;width:7rpx;height:7rpx;border-radius:50%;background:$dz-brand-deep}.missing .location-pin{background:#fff0e3}.missing .location-pin::before{border-color:#ed7b30}.missing .location-pin i{background:#ed7b30}.location-copy{display:flex;flex:1;flex-direction:column;gap:9rpx;min-width:0;margin-left:18rpx}.location-copy>view{display:flex;align-items:center;gap:10rpx}.location-copy strong{font-size:25rpx}.location-copy small{padding:4rpx 8rpx;border-radius:10rpx;color:$dz-brand-deep;background:$dz-brand-soft;font-size:16rpx}.missing .location-copy small{color:#c96324;background:#ffead9}.location-copy text{overflow:hidden;color:$dz-text-secondary;font-size:19rpx;text-overflow:ellipsis;white-space:nowrap}.location-card>b{flex:0 0 auto;margin-left:12rpx;color:$dz-brand-deep;font-size:20rpx}.entries{display:grid;grid-template-columns:1fr 1fr;gap:15rpx;margin-top:22rpx}.entries button{display:flex;align-items:center;height:96rpx;margin:0;padding:0 18rpx;border:1rpx solid $dz-border-subtle;border-radius:20rpx;background:#fff;box-shadow:$dz-shadow-card;font-size:22rpx}.entries button.active{border-color:$dz-brand-primary}.entries i{display:flex;align-items:center;justify-content:center;width:48rpx;height:48rpx;border-radius:12rpx;color:#fff;background:$dz-brand-primary;font-style:normal}.entries i.orange{background:#ff8b36}.entries text{margin-left:13rpx}.entries b{flex:1;text-align:right}.next{margin:22rpx 0 36rpx;padding:24rpx;border-radius:22rpx;box-shadow:$dz-shadow-card}.next>strong{font-size:27rpx}.next>view{display:flex;align-items:center;margin-top:18rpx;padding:18rpx;border:1rpx solid $dz-border-subtle;border-radius:17rpx}.next i{font-size:36rpx}.next>view>view{display:flex;flex-direction:column;gap:7rpx;margin-left:16rpx}.next text{color:$dz-text-secondary;font-size:20rpx}
</style>
