<template>
  <view class="dz-page dz-page--with-tabbar activity-channel">
    <view class="dz-safe-top" />

    <header class="topbar dz-container">
      <view class="city" role="button" @tap="showPending('城市选择')">邯郸市⌄</view>
      <view class="search" role="button" aria-label="搜索" @tap="showPending('活动搜索')">⌕</view>
    </header>

    <main class="content dz-container">
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
        <NetworkState v-if="!loading && !error && !activities.length" message="附近暂时没有活动" />
      </section>
    </main>

    <view class="publish" role="button" @tap="openPublish"><text>＋</text>发布活动</view>
    <DazzyTabBar active="activity" />
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'

import ActivityListCard from '@/components/ActivityListCard.vue'
import DazzyTabBar from '@/components/DazzyTabBar.vue'
import NetworkState from '@/components/NetworkState.vue'
import { getNearbyActivities } from '@/services/discovery'
import { openPage } from '@/services/navigation'
import type { ActivityListItem } from '@/types/api'
import { getErrorMessage } from '@/utils/formatters'

type Ordering = 'recommended' | 'latest' | 'distance' | 'time'

const categories = [
  { label: '全部', value: '', icon: '▦' },
  { label: '台球', value: 'billiards', icon: '8' },
  { label: '桌游', value: 'board-games', icon: '⚄' },
  { label: '旅行', value: 'travel', icon: '▣' },
  { label: '运动', value: 'sports', icon: '奔' },
  { label: 'K歌', value: 'karaoke', icon: '♪' },
]
const sorts: Array<{ label: string; value: Ordering }> = [
  { label: '推荐', value: 'recommended' },
  { label: '最新', value: 'latest' },
  { label: '距离最近', value: 'distance' },
  { label: '人气高', value: 'time' },
]

const activities = ref<ActivityListItem[]>([])
const ordering = ref<Ordering>('recommended')
const loading = ref(true)
const error = ref('')

async function loadActivities() {
  loading.value = true
  error.value = ''
  try {
    activities.value = (await getNearbyActivities({ ordering: ordering.value, page_size: 6 })).data.items
  } catch (reason) {
    error.value = getErrorMessage(reason)
  } finally {
    loading.value = false
  }
}

function changeOrdering(value: Ordering) {
  ordering.value = value
  loadActivities()
}

function openActivityList(category?: string) {
  openPage(`/pages/activities/list${category ? `?category=${category}` : ''}`)
}

function openDetail(id: number) {
  openPage(`/pages/activities/detail?id=${id}`)
}

function openPublish() {
  openPage('/pages/publish/index')
}

function showPending(feature: string) {
  uni.showToast({ title: `${feature}功能即将接入`, icon: 'none' })
}

onLoad(loadActivities)
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;

.activity-channel { background:#fff; }
.topbar { display:flex; align-items:center; justify-content:space-between; height:94rpx; }
.city { color:#172126; font-size:31rpx; font-weight:600; }
.search { color:#172126; font-size:47rpx; }
.hero { position:relative; overflow:hidden; height:242rpx; border-radius:24rpx; color:#fff; }
.hero image { position:absolute; width:100%; height:100%; inset:0; }
.hero-title,.hero-subtitle { position:relative; z-index:1; display:block; margin-left:36rpx; text-shadow:0 3rpx 8rpx rgba(0,94,103,.2); }
.hero-title { padding-top:62rpx; font-size:43rpx; font-weight:900; }
.hero-subtitle { margin-top:18rpx; font-size:24rpx; font-weight:600; }
.category-panel { display:grid; grid-template-columns:repeat(6,1fr); margin-top:20rpx; padding:22rpx 8rpx 18rpx; border-radius:22rpx; background:#fff; box-shadow:0 8rpx 28rpx rgba(31,65,72,.08); }
.category { display:flex; flex-direction:column; align-items:center; gap:10rpx; color:#283136; font-size:20rpx; }
.category-icon { display:flex; align-items:center; justify-content:center; width:62rpx; height:62rpx; border-radius:50%; color:#172126; background:#dff9f8; font-size:28rpx; font-weight:700; }
.category-icon.all { color:#fff; background:$dz-gradient-brand; }
.category-icon.billiards { color:#fff; background:#152127; }
.sorts { display:flex; align-items:stretch; gap:66rpx; height:82rpx; margin:12rpx 22rpx 0; }
.sorts>view { position:relative; display:flex; align-items:center; color:#354046; font-size:23rpx; }
.sorts>view.active { color:$dz-brand-deep; font-weight:800; }
.sorts>view.active::after { position:absolute; right:5rpx; bottom:8rpx; left:5rpx; height:4rpx; border-radius:2rpx; background:$dz-brand-primary; content:''; }
.activity-list { display:flex; flex-direction:column; gap:14rpx; }
.publish { position:fixed; z-index:9; bottom:calc(132rpx + env(safe-area-inset-bottom)); left:50%; display:flex; align-items:center; justify-content:center; gap:10rpx; width:244rpx; height:66rpx; transform:translateX(-50%); border-radius:34rpx; color:#fff; background:$dz-gradient-brand; box-shadow:0 8rpx 24rpx rgba(24,199,198,.28); font-size:26rpx; font-weight:700; }
.publish text { font-size:39rpx; font-weight:300; }

@media screen and (max-width:360px) {
  .sorts { gap:48rpx; }
  .category-icon { width:56rpx; height:56rpx; }
}
@media screen and (orientation:landscape) and (max-height:600px) {
  .publish { bottom:calc(112rpx + env(safe-area-inset-bottom)); }
}
</style>
