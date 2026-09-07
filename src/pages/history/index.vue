<template><view class="dz-page history-page"><view class="hero"><view class="dz-safe-top"/><header class="nav dz-container"><view @tap="goBack">‹</view><strong>浏览记录</strong><text @tap="confirmClear">清空</text></header><view class="tabs dz-container"><text v-for="item in tabs" :key="item.value" :class="{active:type===item.value}" @tap="changeType(item.value)">{{item.label}}</text></view></view><main class="dz-container content"><NetworkState v-if="loading" message="正在加载浏览记录…"/><NetworkState v-else-if="error" :message="error" action-text="重新加载" @action="load"/><view v-else-if="!items.length" class="empty"><text>◷</text><strong>暂无浏览记录</strong><small>看过的达人和活动会保存在这里</small></view><article v-for="item in items" v-else :key="item.id" class="row" @tap="open(item)"><image v-if="imageUrl(item)" :src="imageUrl(item)!" mode="aspectFill"/><view v-else class="fallback">{{title(item).slice(0,1)}}</view><view class="copy"><strong>{{title(item)}}</strong><text>{{item.target_type==='provider'?'达人':'活动'}} · {{subtitle(item)}}</text><small>{{formatTime(item.viewed_at)}} · 浏览{{item.view_count}}次</small></view><button @tap.stop="remove(item)">×</button></article></main></view></template>
<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import NetworkState from '@/components/NetworkState.vue'
import { clearBrowsingHistory, deleteBrowsingHistory, getBrowsingHistory } from '@/services/engagements'
import type { ActivityListItem, BrowsingHistoryItem, ProviderListItem } from '@/types/api'
import { businessClock, businessDateKey, businessTimeParts } from '@/utils/businessTime'
import { getErrorMessage } from '@/utils/formatters'

const tabs = [{ label: '全部', value: 'all' }, { label: '达人', value: 'provider' }, { label: '活动', value: 'activity' }] as const
const type = ref<'all' | 'provider' | 'activity'>('all')
const items = ref<BrowsingHistoryItem[]>([])
const loading = ref(true)
const error = ref('')

function goBack() { uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/profile/index' }) }) }
function provider(item: BrowsingHistoryItem) { return item.target as ProviderListItem }
function activity(item: BrowsingHistoryItem) { return item.target as ActivityListItem }
function title(item: BrowsingHistoryItem) { return item.target_type === 'provider' ? provider(item).nickname : activity(item).title }
function imageUrl(item: BrowsingHistoryItem) { return item.target_type === 'provider' ? provider(item).avatar_url : activity(item).cover_url }
function subtitle(item: BrowsingHistoryItem) { return item.target_type === 'provider' ? `${provider(item).services[0]?.category || '达人服务'} · ${provider(item).service_city_name}` : `${activity(item).category} · ${activity(item).meeting_place_name}` }
function formatTime(value: string) {
  if (businessDateKey(value) === businessDateKey()) return `今天 ${businessClock(value)}`
  const parts = businessTimeParts(value)
  return `${parts.month}月${parts.day}日`
}
function open(item: BrowsingHistoryItem) { uni.navigateTo({ url: item.target_type === 'provider' ? `/pages/providers/detail?id=${provider(item).public_id}` : `/pages/activities/detail?id=${activity(item).id}` }) }
async function load() { loading.value = true; error.value = ''; try { items.value = (await getBrowsingHistory(type.value)).data.items } catch (e) { error.value = getErrorMessage(e) } finally { loading.value = false } }
function changeType(value: 'all' | 'provider' | 'activity') { type.value = value; load() }
async function remove(item: BrowsingHistoryItem) { await deleteBrowsingHistory(item.id); items.value = items.value.filter(value => value.id !== item.id) }
function confirmClear() { if (!items.value.length) return; uni.showModal({ title: '清空浏览记录', content: '确定清空全部浏览记录吗？', confirmText: '清空', success: async result => { if (result.confirm) { await clearBrowsingHistory(); items.value = []; uni.showToast({ title: '已清空', icon: 'success' }) } } }) }
onShow(load)
</script>
<style lang="scss" scoped>@use '../../styles/tokens.scss' as *;.history-page{background:$dz-surface-page}.hero{background:linear-gradient(150deg,#ecfcfc,#fff)}.nav{display:flex;align-items:center;justify-content:space-between;height:94rpx}.nav view{font-size:58rpx}.nav strong{font-size:34rpx}.nav>view,.nav>text{width:64rpx}.nav>text{color:$dz-brand-deep;font-size:22rpx;text-align:right}.tabs{display:flex;height:74rpx;align-items:flex-end;gap:50rpx}.tabs text{padding:0 4rpx 18rpx;color:$dz-text-secondary;font-size:25rpx}.tabs text.active{border-bottom:5rpx solid $dz-brand-primary;color:$dz-text-primary;font-weight:750}.content{padding-top:20rpx}.row{display:flex;align-items:center;gap:17rpx;margin-bottom:15rpx;padding:18rpx;border-radius:22rpx;background:#fff;box-shadow:$dz-shadow-card}.row image,.fallback{width:104rpx;height:88rpx;flex:none;border-radius:16rpx}.fallback{display:flex;align-items:center;justify-content:center;color:$dz-brand-deep;background:$dz-brand-soft;font-size:34rpx}.copy{display:flex;min-width:0;flex:1;flex-direction:column;gap:7rpx}.copy strong{overflow:hidden;font-size:26rpx;text-overflow:ellipsis;white-space:nowrap}.copy text,.copy small{overflow:hidden;color:$dz-text-secondary;font-size:19rpx;text-overflow:ellipsis;white-space:nowrap}.row button{width:48rpx;margin:0;padding:0;border:0;color:$dz-text-tertiary;background:transparent;font-size:34rpx}.row button::after{display:none}.empty{display:flex;min-height:580rpx;flex-direction:column;align-items:center;justify-content:center;gap:14rpx}.empty>text{color:$dz-brand-primary;font-size:78rpx}.empty strong{font-size:29rpx}.empty small{color:$dz-text-tertiary;font-size:21rpx}</style>
