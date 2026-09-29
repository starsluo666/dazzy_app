<template>
  <view class="dz-page dz-page--with-tabbar activity-channel">
    <view class="dz-sticky-head">
      <DzNavBar mode="toolbar" :sticky="false">
        <button class="city" hover-class="control--pressed" @tap="chooseCity"><text>{{ discovery.cityName }}</text><text>⌄</text></button>
        <button class="search" aria-label="搜索活动" hover-class="control--pressed" @tap="openPage('/pages/discovery/search?type=activity')">⌕</button>
      </DzNavBar>
    </view>

    <main class="content dz-container">
      <button class="location-note" @tap="chooseCity">{{ discoveryLocationLabel(discovery) }} ›</button>
      <view class="hero">
        <image src="/static/activities/activity-channel-hero-v1.webp" mode="aspectFill" />
        <text class="hero-title">同城精彩活动</text>
        <text class="hero-subtitle">认识新朋友 发现新玩法</text>
      </view>

      <view class="category-panel">
        <view
          v-for="item in categories"
          :key="item.value"
          class="category"
          hover-class="category--pressed"
          role="button"
          @tap="openActivityList(item.value)"
        >
          <view class="category-icon" :class="item.value || 'all'">{{ item.icon }}</view>
          <text>{{ item.label }}</text>
        </view>
      </view>

      <view class="sorts">
        <view
          v-for="item in sorts"
          :key="item.value"
          :class="{ active: ordering === item.value }"
          hover-class="sort--pressed"
          role="button"
          @tap="changeOrdering(item.value)"
        >{{ item.label }}</view>
      </view>

      <section class="activity-list">
        <NetworkState v-if="loading" message="正在发现同城活动…" />
        <NetworkState v-else-if="error" :message="error" error @retry="loadActivities" />
        <ActivityListCard
          v-for="item in activities"
          v-else
          :key="item.id"
          :activity="item"
          @open="openDetail"
        />
        <NetworkState v-if="!loading && !error && !activities.length" message="当前城市暂无符合条件的活动" />
        <DiscoveryPagination v-if="!loading && !error" :has-more="hasMore" :loading="loadingMore" :error="moreError" :count="activities.length" @more="loadPage(false)" />
      </section>
    </main>

    <view class="publish" role="button" hover-class="publish--pressed" @tap="openPublish"><text>＋</text>发布活动</view>
    <DazzyTabBar active="activity" />
  </view>
</template>

<script setup lang="ts">
import DzNavBar from '@/components/DzNavBar.vue'
import { onShow, onReachBottom, onUnload } from '@dcloudio/uni-app'
import DiscoveryPagination from '@/components/DiscoveryPagination.vue'
import { useDiscoveryPager } from '@/composables/useDiscoveryPager'
import { ref } from 'vue'

import ActivityListCard from '@/components/ActivityListCard.vue'
import DazzyTabBar from '@/components/DazzyTabBar.vue'
import NetworkState from '@/components/NetworkState.vue'
import { getNearbyActivities } from '@/services/discovery'
import { getActivityTags } from '@/services/activities'
import {
  discoveryQuery,
  getDiscoveryContext,
  resolveDiscoveryContext,
  openDiscoveryCityPicker,
  discoveryLocationLabel,
} from '@/services/discoveryContext'
import { openPage } from '@/services/navigation'
import type { ActivityListItem } from '@/types/api'
import { getErrorMessage } from '@/utils/formatters'

type Ordering = 'recommended' | 'latest' | 'distance' | 'popular'

const fallbackCategories = [
  { label: '全部', value: '', icon: '▦' },
  { label: '台球', value: 'billiards', icon: '8' },
  { label: '桌游', value: 'board-games', icon: '⚄' },
  { label: '旅行', value: 'travel', icon: '▣' },
  { label: '运动', value: 'sports', icon: '奔' },
  { label: 'K歌', value: 'karaoke', icon: '♪' },
]
const categories = ref(fallbackCategories)
const sorts: Array<{ label: string; value: Ordering }> = [
  { label: '推荐', value: 'recommended' },
  { label: '最新', value: 'latest' },
  { label: '距离最近', value: 'distance' },
  { label: '人气高', value: 'popular' },
]

const ordering = ref<Ordering>('recommended')
const discovery = ref(getDiscoveryContext())
let refreshVersion = 0
const { items: activities, loading, loadingMore, error, moreError, hasMore, load: loadPage, invalidate } = useDiscoveryPager<ActivityListItem>(page => getNearbyActivities({
  ordering: ordering.value, page, page_size: 20,
  ...discoveryQuery(discovery.value),
}), item => item.id)

async function loadActivities() {
  const ticket = ++refreshVersion
  invalidate()
  loading.value = true
  try {
    const context = await resolveDiscoveryContext()
    if (ticket !== refreshVersion) return
    discovery.value = context
    if (ordering.value === 'distance' && !context.longitude) ordering.value = 'recommended'
    const items = (await getActivityTags(context.cityCode)).data.items
    if (ticket !== refreshVersion) return
    categories.value = [fallbackCategories[0]!, ...items.slice(0, 5).map(item => ({
      label: item.name, value: item.slug, icon: item.name.slice(0, 1),
    }))]
    await loadPage()
  } catch (reason) {
    if (ticket === refreshVersion) error.value = getErrorMessage(reason)
  } finally {
    if (ticket === refreshVersion) loading.value = false
  }
}

function changeOrdering(value: Ordering) {
  if (value === 'distance' && !discovery.value.longitude) {
    uni.showToast({ title: '请先定位，再按距离排序', icon: 'none' })
    chooseCity()
    return
  }
  ordering.value = value
  loadActivities()
}

function openActivityList(tag?: string) {
  openPage(`/pages/activities/list${tag ? `?tags=${tag}` : ''}`)
}

function openDetail(id: number) {
  openPage(`/pages/activities/detail?id=${id}`)
}

function openPublish() {
  openPage('/pages/publish/index')
}

function chooseCity() { openDiscoveryCityPicker() }
onShow(loadActivities)
onReachBottom(() => loadPage(false))
onUnload(() => { refreshVersion++; invalidate() })
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;

.activity-channel { background:$dz-surface-page; }
.location-note { min-height:88rpx; padding:0; text-align:left; color:$dz-text-secondary; background:transparent; font-size:24rpx; line-height:1.5; }.location-note::after { border:0; }
.topbar { display:flex; align-items:center; justify-content:space-between; height:94rpx; }
.city { display:flex; align-items:center; gap:8rpx; height:88rpx; min-height:44px; margin:0 auto 0 0; padding:0; color:$dz-text-primary; background:transparent; font-size:$dz-fs-body-strong; font-weight:$dz-fw-semibold; line-height:1; }
.search { display:flex; align-items:center; justify-content:center; width:88rpx; min-width:44px; height:88rpx; min-height:44px; margin:0; padding:0; color:$dz-text-primary; background:transparent; font-size:$dz-fs-price-lg; line-height:1; }
.control--pressed { opacity:.65; }
.hero { position:relative; overflow:hidden; height:242rpx; border:1rpx solid $dz-border-material; border-radius:$dz-radius-lg; color:$dz-text-inverse; box-shadow:$dz-shadow-card; }
.hero image { position:absolute; width:100%; height:100%; inset:0; }
.hero-title,.hero-subtitle { position:relative; z-index:1; display:block; margin-left:36rpx; text-shadow:0 3rpx 8rpx rgba(0,94,103,.2); }
.hero-title { padding-top:62rpx; font-size:43rpx; font-weight:$dz-fw-bold; }
.hero-subtitle { margin-top:18rpx; font-size:$dz-fs-caption; font-weight:$dz-fw-semibold; }
.category-panel { display:grid; grid-template-columns:repeat(6,1fr); margin-top:20rpx; padding:22rpx 8rpx 18rpx; border:1rpx solid $dz-border-material; border-radius:$dz-radius-lg; background:$dz-surface-card; box-shadow:$dz-shadow-card,inset 0 1rpx 0 $dz-surface-highlight; }
.category { display:flex; flex-direction:column; align-items:center; gap:10rpx; color:$dz-text-primary; font-size:$dz-fs-caption; transition:transform $dz-duration-fast $dz-ease-out, opacity $dz-duration-fast $dz-ease-standard; }
.category--pressed { transform:scale(.94); opacity:.82; }
.category-icon { display:flex; align-items:center; justify-content:center; width:62rpx; height:62rpx; border:1rpx solid $dz-border-material; border-radius:22rpx; color:$dz-text-primary; background:#dff9f8; box-shadow:inset 0 1rpx 0 $dz-surface-highlight; font-size:$dz-fs-body; font-weight:$dz-fw-bold; }
.category-icon.all { color:$dz-text-inverse; background:$dz-gradient-brand; }
.category-icon.billiards { color:$dz-text-inverse; background:#152127; }
.sorts { display:flex; align-items:stretch; gap:66rpx; height:82rpx; margin:12rpx 22rpx 0; }
.sorts>view { position:relative; display:flex; align-items:center; color:#354046; font-size:$dz-fs-caption; transition:opacity $dz-duration-fast $dz-ease-standard; }
.sort--pressed { opacity:.6; }
.sorts>view.active { color:$dz-brand-deep; font-weight:$dz-fw-bold; }
.sorts>view.active::after { position:absolute; right:5rpx; bottom:8rpx; left:5rpx; height:4rpx; border-radius:2rpx; background:$dz-brand-primary; content:''; }
.activity-list { display:flex; flex-direction:column; gap:14rpx; }
.publish { position:fixed; z-index:95; bottom:calc(160rpx + env(safe-area-inset-bottom)); left:50%; display:flex; align-items:center; justify-content:center; gap:10rpx; width:244rpx; height:70rpx; transform:translateX(-50%); border:1rpx solid rgba(255,255,255,.36); border-radius:$dz-radius-full; color:$dz-text-inverse; background:$dz-gradient-brand; box-shadow:$dz-shadow-brand; font-size:$dz-fs-body; font-weight:$dz-fw-bold; transition:transform $dz-duration-fast $dz-ease-out, opacity $dz-duration-fast $dz-ease-standard; }
.publish--pressed { transform:translateX(-50%) scale(.96); opacity:.9; }
.publish text { font-size:$dz-fs-title; font-weight:300; }

@media screen and (max-width:360px) {
  .sorts { gap:48rpx; }
  .category-icon { width:56rpx; height:56rpx; }
}
@media screen and (orientation:landscape) and (max-height:600px) {
  .publish { bottom:calc(112rpx + env(safe-area-inset-bottom)); }
}
</style>
