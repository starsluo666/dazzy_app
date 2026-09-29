<template>
  <view class="dz-page dz-page--with-tabbar">
    <view class="dz-safe-top" />

    <header class="header dz-container">
      <text class="brand"><strong>DAZZY</strong><text>搭子</text></text>
      <label class="search"><text>⌕</text><input v-model="keyword" maxlength="80" placeholder="搜索活动、地点或标签" confirm-type="search" @confirm="loadActivities" /></label>
      <view class="filter" role="button" @tap="clearFilters"><text>▽</text><text>{{ selectedTags.length ? `已选${selectedTags.length}` : '标签' }}</text></view>
    </header>

    <scroll-view scroll-x class="category-rail" :show-scrollbar="false">
      <view class="categories dz-container">
        <view class="category" :class="{ active: !selectedTags.length }" role="button" @tap="clearTags">全部</view>
        <view
          v-for="item in tags"
          :key="item.value"
          class="category"
          :class="{ active: selectedTags.includes(item.value) }"
          role="button"
          @tap="toggleTag(item.value)"
        >{{ item.label }}</view>
      </view>
    </scroll-view>

    <view class="sorts dz-container">
      <view
        v-for="item in sorts"
        :key="item.value"
        :class="{ active: ordering === item.value }"
        role="button"
        @tap="changeOrdering(item.value)"
      >{{ item.label }}</view>
    </view>

    <main class="list dz-container">
      <NetworkState v-if="loading" message="正在加载活动…" />
      <NetworkState v-else-if="error" :message="error" error @retry="loadActivities" />

      <ActivityListCard
        v-for="item in activities"
        v-else
        :key="item.id"
        :activity="item"
        show-status
        @open="openDetail"
      />

      <NetworkState
        v-if="!loading && !error && !activities.length"
        message="暂无符合条件的活动"
      />
    </main>
    <view class="dz-container"><DiscoveryPagination v-if="!loading && !error" :has-more="hasMore" :loading="loadingMore" :error="moreError" :count="activities.length" @more="loadPage(false)" /></view>

    <DazzyTabBar active="activity" />
  </view>
</template>

<script setup lang="ts">
import { onLoad, onShow, onReachBottom, onUnload } from '@dcloudio/uni-app'
import DiscoveryPagination from '@/components/DiscoveryPagination.vue'
import { useDiscoveryPager } from '@/composables/useDiscoveryPager'
import { ref } from 'vue'

import DazzyTabBar from '@/components/DazzyTabBar.vue'
import ActivityListCard from '@/components/ActivityListCard.vue'
import NetworkState from '@/components/NetworkState.vue'
import { getNearbyActivities } from '@/services/discovery'
import { getActivityTags } from '@/services/activities'
import {
  discoveryQuery,
  getDiscoveryContext,
  resolveDiscoveryContext,
  openDiscoveryCityPicker,
} from '@/services/discoveryContext'
import { openPage } from '@/services/navigation'
import type { ActivityListItem, ActivityTagItem } from '@/types/api'
import { getErrorMessage } from '@/utils/formatters'

type Ordering = 'recommended' | 'distance' | 'time' | 'latest' | 'popular'
const sorts: Array<{ label: string; value: Ordering }> = [
  { label: '推荐', value: 'recommended' },
  { label: '最新', value: 'latest' },
  { label: '距离', value: 'distance' },
  { label: '时间', value: 'time' },
  { label: '人气', value: 'popular' },
]

const tags = ref<Array<{ label: string; value: string }>>([])
const selectedTags = ref<string[]>([])
const keyword = ref('')
const committedKeyword = ref('')
const ordering = ref<Ordering>('recommended')
const discovery = ref(getDiscoveryContext())
let refreshVersion = 0
const { items: activities, loading, loadingMore, error, moreError, hasMore, load: loadPage, invalidate } = useDiscoveryPager<ActivityListItem>(page => getNearbyActivities({
  tags: selectedTags.value.join(',') || undefined,
  keyword: committedKeyword.value || undefined,
  ordering: ordering.value, page, page_size: 20,
  ...discoveryQuery(discovery.value),
}), item => item.id)

async function loadActivities() {
  committedKeyword.value = keyword.value.trim().slice(0, 80)
  const ticket = ++refreshVersion
  invalidate()
  loading.value = true
  try {
    const context = await resolveDiscoveryContext()
    if (ticket !== refreshVersion) return
    const cityChanged = discovery.value.cityCode !== context.cityCode
    discovery.value = context
    if (ordering.value === 'distance' && !context.longitude) ordering.value = 'recommended'
    const configured = (await getActivityTags(context.cityCode)).data.items
    if (ticket !== refreshVersion) return
    tags.value = configured.map((item: ActivityTagItem) => ({ label: item.name, value: item.slug }))
    if (cityChanged) selectedTags.value = selectedTags.value.filter(tag => configured.some(item => item.slug === tag))
    await loadPage()
  } catch (reason) {
    if (ticket === refreshVersion) error.value = getErrorMessage(reason)
  } finally {
    if (ticket === refreshVersion) loading.value = false
  }
}

function toggleTag(value: string) {
  const index = selectedTags.value.indexOf(value)
  if (index >= 0) selectedTags.value.splice(index, 1)
  else if (selectedTags.value.length < 5) selectedTags.value.push(value)
  else { uni.showToast({ title: '最多选择 5 个标签', icon: 'none' }); return }
  loadActivities()
}

function clearTags() { selectedTags.value = []; loadActivities() }
function clearFilters() {
  if (!selectedTags.value.length && !keyword.value) return
  selectedTags.value = []
  keyword.value = ''
  loadActivities()
}

function changeOrdering(value: Ordering) {
  if (value === 'distance' && !discovery.value.longitude) {
    uni.showToast({ title: '请先定位，再按距离排序', icon: 'none' })
    openDiscoveryCityPicker()
    return
  }
  ordering.value = value
  loadActivities()
}

function openDetail(id: number) {
  openPage(`/pages/activities/detail?id=${id}`)
}

onLoad((query) => {
  const initialTags = typeof query?.tags === 'string' ? query.tags : typeof query?.category === 'string' ? query.category : ''
  selectedTags.value = initialTags.split(',').filter(Boolean).slice(0, 5)
  keyword.value = typeof query?.keyword === 'string' ? query.keyword : ''
})
onShow(loadActivities)
onReachBottom(() => loadPage(false))
onUnload(() => { refreshVersion++; invalidate() })
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;

.header { display:flex; align-items:center; gap:17rpx; min-height:104rpx; }
.brand { flex:0 0 auto; color:#151c20; font-size:$dz-fs-body-strong; font-weight:$dz-fw-bold; }
.brand strong { color:$dz-brand-deep; font-size:$dz-fs-heading; font-weight:$dz-fw-bold; letter-spacing:-2rpx; }
.brand>text { margin-left:5rpx; }
.search { display:flex; align-items:center; flex:1; gap:12rpx; height:62rpx; padding:0 21rpx; border:1rpx solid #e1e6e8; border-radius:$dz-radius-lg; color:#929ca1; font-size:$dz-fs-caption; box-sizing:border-box; }
.search>text:first-child { color:#3e494f; font-size:$dz-fs-heading; }
.search input { min-width:0; flex:1; font-size:$dz-fs-caption; }
.filter { display:flex; align-items:center; flex:0 0 auto; gap:5rpx; color:#20272b; font-size:$dz-fs-caption; }
.filter>text:first-child { transform:rotate(45deg); color:#11191d; font-size:$dz-fs-heading; }
.category-rail { white-space:nowrap; }
.categories { display:flex; gap:16rpx; padding-top:12rpx; padding-bottom:18rpx; }
.category { display:flex; align-items:center; justify-content:center; flex:0 0 auto; min-width:104rpx; height:58rpx; padding:0 22rpx; border-radius:$dz-radius-lg; color:#20282c; background:$dz-surface-page; font-size:$dz-fs-caption; box-sizing:border-box; }
.category.active { color:$dz-text-inverse; background:$dz-gradient-brand; font-weight:$dz-fw-bold; }
.sorts { display:flex; align-items:stretch; justify-content:space-between; gap:22rpx; height:76rpx; }
.sorts>view { position:relative; display:flex; align-items:center; color:#5e696f; font-size:$dz-fs-caption; }
.sorts>view.active { color:$dz-brand-deep; font-weight:$dz-fw-bold; }
.sorts>view.active::after { position:absolute; right:6rpx; bottom:8rpx; left:6rpx; height:4rpx; border-radius:2rpx; background:$dz-brand-primary; content:''; }
.list { display:flex; flex-direction:column; gap:14rpx; padding-top:4rpx; }
@media screen and (max-width:360px) { .sorts { gap:54rpx; } }
</style>
