<template>
  <view class="dz-page search-page">
    <DzNavBar title="同城搜索" :fixed="false" />
    <view class="dz-container">
      <button class="location" hover-class="pressed" @tap="openDiscoveryCityPicker"><strong>{{ discovery.cityName }}⌄</strong><text>{{ discoveryLocationLabel(discovery) }}</text></button>
      <view class="search-bar"><label><text aria-hidden="true">⌕</text><input v-model="keyword" maxlength="50" confirm-type="search" placeholder="搜索达人、活动" @confirm="submit" /></label><button v-if="keyword" aria-label="清空搜索" @tap="clear">×</button><button class="submit" :disabled="contextLoading || Boolean(contextError)" @tap="submit">搜索</button></view>
      <view class="tabs" role="tablist"><button :class="{ active: kind === 'provider' }" role="tab" :aria-selected="kind === 'provider'" @tap="changeKind('provider')">达人</button><button :class="{ active: kind === 'activity' }" role="tab" :aria-selected="kind === 'activity'" @tap="changeKind('activity')">活动</button></view>
      <NetworkState v-if="contextLoading" message="正在加载城市…" />
      <NetworkState v-else-if="contextError" :message="contextError" error @retry="refreshContext" />
      <template v-else-if="!submitted">
        <view class="history-title"><strong>最近搜索</strong><button v-if="history.length" @tap="clearHistory">清空</button></view>
        <view class="history"><button v-for="word in history" :key="word" hover-class="pressed" @tap="keyword = word; submit()">{{ word }}</button></view>
        <NetworkState v-if="!history.length" message="输入达人名字、服务或活动关键词" />
      </template>
      <template v-else>
        <text class="result-label">{{ discovery.cityName }} · “{{ submitted }}”的{{ kind === 'provider' ? '达人' : '活动' }}结果</text>
        <NetworkState v-if="loading" message="正在搜索…" />
        <NetworkState v-else-if="error" :message="error" error @retry="search" />
        <view v-else class="results">
          <template v-for="result in items" :key="result.key">
            <button v-if="result.kind === 'provider'" class="provider" hover-class="pressed" @tap="openPage(`/pages/providers/detail?id=${result.item.public_id}`)">
              <image v-if="result.item.avatar_url" :src="result.item.avatar_url" mode="aspectFill" /><view v-else class="avatar">{{ result.item.nickname.slice(0, 1) }}</view>
              <view class="provider-copy"><view class="provider-title"><strong>{{ result.item.nickname }}</strong><text>{{ result.item.is_online ? '在线' : '离线' }}</text></view><text class="bio">{{ result.item.bio || '查看达人服务与资料' }}</text><text class="meta">★ {{ result.item.rating }} · {{ result.item.service_city_name }}<text v-if="result.item.distance_km != null"> · {{ result.item.distance_km }} km</text></text></view><text class="arrow">›</text>
            </button>
            <ActivityListCard v-else :activity="result.item" show-status @open="id => openPage(`/pages/activities/detail?id=${id}`)" />
          </template>
          <NetworkState v-if="!items.length" message="暂无相关结果，试试其他关键词或城市" />
          <DiscoveryPagination :has-more="hasMore" :loading="loadingMore" :error="moreError" :count="items.length" @more="load(false)" />
        </view>
      </template>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow, onReachBottom, onUnload } from '@dcloudio/uni-app'
import DzNavBar from '@/components/DzNavBar.vue'
import NetworkState from '@/components/NetworkState.vue'
import ActivityListCard from '@/components/ActivityListCard.vue'
import DiscoveryPagination from '@/components/DiscoveryPagination.vue'
import { useDiscoveryPager } from '@/composables/useDiscoveryPager'
import { getNearbyActivities, getRecommendedProviders } from '@/services/discovery'
import { discoveryQuery, discoveryLocationLabel, getDiscoveryContext, resolveDiscoveryContext, openDiscoveryCityPicker } from '@/services/discoveryContext'
import { openPage } from '@/services/navigation'
import { getErrorMessage } from '@/utils/formatters'
import type { ActivityListItem, ProviderListItem } from '@/types/api'
type Result = { kind: 'provider'; key: string; item: ProviderListItem } | { kind: 'activity'; key: string; item: ActivityListItem }
const kind = ref<'provider' | 'activity'>('provider')
const keyword = ref('')
const submitted = ref('')
const discovery = ref(getDiscoveryContext())
const contextLoading = ref(true)
const contextError = ref('')
const history = ref<string[]>([])
const HISTORY_KEY = 'dazzy.discoverySearchHistory'
let version = 0
const { items, loading, loadingMore, error, moreError, hasMore, load, invalidate } = useDiscoveryPager<Result>(async page => {
  if (!discovery.value.cityCode) throw new Error('请先选择城市')
  const query = { keyword: submitted.value, page, page_size: 20, ...discoveryQuery(discovery.value) }
  if (kind.value === 'provider') {
    const { data } = await getRecommendedProviders(query)
    return { data: { ...data, items: data.items.map(item => ({ kind: 'provider' as const, key: item.public_id, item })) } }
  }
  const { data } = await getNearbyActivities(query)
  return { data: { ...data, items: data.items.map(item => ({ kind: 'activity' as const, key: String(item.id), item })) } }
}, item => item.key)
function search() { if (submitted.value && !contextLoading.value && !contextError.value) return load() }
function submit() {
  const value = keyword.value.trim()
  if (!value) { clear(); return }
  submitted.value = value
  keyword.value = value
  history.value = [value, ...history.value.filter(item => item !== value)].slice(0, 10)
  uni.setStorageSync(HISTORY_KEY, history.value)
  search()
}
function clear() { keyword.value = ''; submitted.value = ''; invalidate() }
function clearHistory() { history.value = []; uni.removeStorageSync(HISTORY_KEY) }
function changeKind(value: typeof kind.value) {
  if (kind.value === value) return
  kind.value = value; invalidate(); search()
}
async function refreshContext() {
  const ticket = ++version
  contextLoading.value = true; contextError.value = ''; invalidate()
  try {
    const context = await resolveDiscoveryContext()
    if (ticket !== version) return
    discovery.value = context
    contextLoading.value = false
    await search()
  } catch (reason) { if (ticket === version) contextError.value = getErrorMessage(reason) }
  finally { if (ticket === version) contextLoading.value = false }
}
onLoad(query => {
  if (query?.type === 'activity') kind.value = 'activity'
  const saved = uni.getStorageSync(HISTORY_KEY)
  history.value = Array.isArray(saved) ? saved.filter(word => typeof word === 'string').slice(0, 10) : []
})
onShow(refreshContext)
onReachBottom(() => { if (!contextLoading.value && !contextError.value && submitted.value) load(false) })
onUnload(() => { version++; invalidate() })
</script>
<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;
.search-page { padding-bottom:calc(30rpx + env(safe-area-inset-bottom)); }button { margin:0; padding:0; background:transparent; font-size:28rpx; line-height:1.5; }button::after { border:0; }
.location { display:flex; flex-wrap:wrap; align-items:center; gap:12rpx; min-height:88rpx; text-align:left; }.location strong { font-size:28rpx; color:$dz-text-primary; }.location>text { color:$dz-text-secondary; font-size:22rpx; }
.search-bar { display:flex; align-items:center; border:1rpx solid $dz-border-material; border-radius:28rpx; background:$dz-surface-raised; padding-left:24rpx; }.search-bar label { display:flex; align-items:center; flex:1; min-width:0; gap:12rpx; }.search-bar input { height:100rpx; min-width:0; flex:1; font-size:30rpx; }.search-bar button { min-width:88rpx; min-height:88rpx; }.search-bar .submit { color:$dz-brand-deep; font-weight:600; padding:0 18rpx; }
.tabs { display:flex; gap:16rpx; margin:28rpx 0; padding:8rpx; border-radius:$dz-radius-full; background:$dz-surface-raised; }.tabs button { display:flex; align-items:center; justify-content:center; flex:1; min-height:88rpx; border-radius:$dz-radius-full; color:$dz-text-secondary; }.tabs .active { background:$dz-text-primary; color:$dz-text-inverse; font-weight:600; }
.history-title { display:flex; align-items:center; justify-content:space-between; min-height:88rpx; }.history-title strong { font-size:30rpx; }.history-title button { min-width:88rpx; min-height:88rpx; color:$dz-text-secondary; }.history { display:flex; flex-wrap:wrap; gap:16rpx; }.history button { padding:20rpx 28rpx; border-radius:$dz-radius-full; background:$dz-surface-raised; color:$dz-text-primary; word-break:break-all; }
.result-label { display:block; margin-bottom:24rpx; color:$dz-text-secondary; font-size:24rpx; }.results { display:flex; flex-direction:column; gap:20rpx; }
.provider { display:flex; align-items:center; gap:20rpx; width:100%; padding:24rpx; border-radius:28rpx; background:$dz-surface-raised; text-align:left; }.provider image,.avatar { width:120rpx; height:144rpx; flex-shrink:0; border-radius:22rpx; }.avatar { display:flex; align-items:center; justify-content:center; background:$dz-brand-soft; color:$dz-brand-deep; font-size:40rpx; }.provider-copy { flex:1; min-width:0; }.provider-title { display:flex; align-items:center; gap:12rpx; }.provider-title strong { font-size:30rpx; color:$dz-text-primary; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.provider-title>text { flex-shrink:0; color:$dz-text-secondary; font-size:22rpx; }.bio { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin:12rpx 0; font-size:24rpx; color:$dz-text-secondary; }.meta { font-size:22rpx; color:$dz-text-secondary; }.arrow { color:$dz-text-secondary; }.pressed { opacity:.65; }
</style>
