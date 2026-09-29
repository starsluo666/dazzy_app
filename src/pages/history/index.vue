<template><view class="dz-page dz-list-page history-page"><DzNavBar title="浏览记录" :back-action="goBack"><template #right><button class="dz-navbar-action" hover-class="dz-pressed" @tap="confirmClear">清空</button></template></DzNavBar><view class="dz-list-toolbar dz-list-container"><DzListFilters :value="type" :options="tabs" label="浏览记录类型" @change="changeType" /></view><main class="dz-list-container dz-list-content" :class="{ 'dz-list-content--empty': !loading && !error && !items.length }"><NetworkState v-if="loading" message="正在加载浏览记录…"/><NetworkState v-else-if="error" :message="error" error @retry="load"/><DzListEmpty v-else-if="!items.length" icon="history" title="暂无浏览记录" description="看过的达人和活动会保存在这里" /><article v-for="item in items" v-else :key="item.id" class="row" @tap="open(item)"><image v-if="imageUrl(item)" :src="imageUrl(item)!" mode="aspectFill"/><view v-else class="fallback">{{title(item).slice(0,1)}}</view><view class="copy"><strong>{{title(item)}}</strong><text>{{item.target_type==='provider'?'达人':'活动'}} · {{subtitle(item)}}</text><small>{{formatTime(item.viewed_at)}} · 浏览{{item.view_count}}次</small></view><button @tap.stop="remove(item)">×</button></article></main></view></template>
<script setup lang="ts">
import { navigateBackOr } from '@/utils/navigation'
import DzNavBar from '@/components/DzNavBar.vue'
import DzListFilters from '@/components/DzListFilters.vue'
import DzListEmpty from '@/components/DzListEmpty.vue'
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

function goBack() { navigateBackOr(() => uni.reLaunch({ url: '/pages/profile/index' })) }
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
function changeType(value: string) { const option = tabs.find(tab => tab.value === value); if (option) { type.value = option.value; load() } }
async function remove(item: BrowsingHistoryItem) { await deleteBrowsingHistory(item.id); items.value = items.value.filter(value => value.id !== item.id) }
function confirmClear() { if (!items.value.length) return; uni.showModal({ title: '清空浏览记录', content: '确定清空全部浏览记录吗？', confirmText: '清空', success: async result => { if (result.confirm) { await clearBrowsingHistory(); items.value = []; uni.showToast({ title: '已清空', icon: 'success' }) } } }) }
onShow(load)
</script>
<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;
.row{display:flex;align-items:center;gap:17rpx;margin-bottom:15rpx;padding:18rpx;border-radius:$dz-radius-md;background:$dz-surface-card;box-shadow:$dz-shadow-card}.row image,.fallback{width:104rpx;height:88rpx;flex:none;border-radius:$dz-radius-sm}.fallback{display:flex;align-items:center;justify-content:center;color:$dz-brand-deep;background:$dz-brand-soft;font-size:$dz-fs-heading}.copy{display:flex;min-width:0;flex:1;flex-direction:column;gap:7rpx}.copy strong{overflow:hidden;font-size:$dz-fs-body;text-overflow:ellipsis;white-space:nowrap}.copy text,.copy small{overflow:hidden;color:$dz-text-secondary;font-size:$dz-fs-caption;text-overflow:ellipsis;white-space:nowrap}.row button{width:48rpx;margin:0;padding:0;border:0;color:$dz-text-tertiary;background:transparent;font-size:$dz-fs-heading}.row button::after{display:none}
.row button { min-width: 44px; min-height: 44px; }
</style>
