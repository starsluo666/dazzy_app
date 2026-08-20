<template>
  <view class="dz-page dz-page--with-tabbar">
    <view class="dz-safe-top" />
    <view class="topbar dz-container">
      <button class="city">邯郸市 <text class="city-arrow">▾</text></button>
      <view class="search"><text class="search-icon">⌕</text><text>搜索达人、活动、场馆</text></view>
      <button class="message" aria-label="消息"><text>•••</text><i /></button>
    </view>

    <main class="content dz-container">
      <view class="hero">
        <image class="hero-art" src="/static/home/city-discovery-hero-v1.webp" mode="aspectFill" />
        <text class="hero-title">发现同城好搭子</text>
        <text class="hero-subtitle">一起玩， 一起聊， 一起出发</text>
      </view>

      <view class="scene-grid">
        <view class="scene provider" hover-class="scene--pressed" @tap="openProviders()"><text class="scene-title">达人陪伴</text><text>1对1陪伴·更贴心</text><text class="scene-action">找搭子</text><image v-if="homeCardAssets?.provider_companion_url" class="scene-art provider-art" :src="homeCardAssets.provider_companion_url" mode="aspectFit" /><b v-else>搭</b></view>
        <view class="scene activity" hover-class="scene--pressed" @tap="openActivities()"><text class="scene-title">同城组局</text><text>多人组局·更热闹</text><text class="scene-action">去组局</text><image v-if="homeCardAssets?.group_activity_url" class="scene-art group-art" :src="homeCardAssets.group_activity_url" mode="aspectFit" /><b v-else>局</b></view>
      </view>

      <view class="categories">
        <view v-for="item in categories" :key="item.label" class="category" hover-class="category--pressed" @tap="openProviders(item.slug)">
          <view class="category-icon" :style="{ background: item.color }">{{ item.icon }}</view><text>{{ item.label }}</text>
        </view>
      </view>

      <view class="section-head"><text>附近活动</text><text class="more" @tap="openActivities()">更多 ›</text></view>
      <view v-if="loading" class="loading-block">正在发现附近的搭子…</view>
      <view v-if="activityError" class="error-block" @tap="loadDiscovery">{{ activityError }}，点击重试</view>
      <HomeActivityCarousel v-if="activities.length" :items="activities.slice(0, 3)" @select="openActivityDetail" />
      <view v-if="!loading && !activityError && !activities.length" class="empty-block">附近暂时没有活动</view>

      <view class="section-head provider-head"><text>推荐达人</text><text class="more" @tap="openProviders()">更多 ›</text></view>
      <view v-if="providers.length" class="provider-grid">
        <HomeProviderCard
          v-for="item in providers.slice(0, 4)"
          :key="item.public_id"
          :item="item"
          @select="openProviderDetail"
        />
      </view>
      <view v-else-if="providerError" class="error-block" @tap="loadDiscovery">{{ providerError }}，点击重试</view>
      <view v-else-if="!loading" class="empty-block">附近暂时没有可预约达人</view>
    </main>

    <DazzyTabBar active="home" />
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'

import DazzyTabBar from '@/components/DazzyTabBar.vue'
import HomeActivityCarousel from '@/components/HomeActivityCarousel.vue'
import HomeProviderCard from '@/components/HomeProviderCard.vue'
import { getHomeCardAssets, getNearbyActivities, getRecommendedProviders } from '@/services/discovery'
import { openPage } from '@/services/navigation'
import type { ActivityListItem, HomeCardAssets, ProviderListItem } from '@/types/api'
import { getErrorMessage } from '@/utils/formatters'

const categories = [
  { label: '旅游', slug: 'travel', icon: '✈', color: 'linear-gradient(145deg,#52e0df,#16b9c9)' },
  { label: '台球', slug: 'billiards', icon: '8', color: 'linear-gradient(145deg,#62d88a,#159347)' },
  { label: '桌游', slug: 'board-games', icon: '⚄', color: 'linear-gradient(145deg,#b98bff,#7252e8)' },
  { label: '商务', slug: 'business', icon: '▰', color: 'linear-gradient(145deg,#48bcff,#1688ea)' },
]
const providers = ref<ProviderListItem[]>([])
const activities = ref<ActivityListItem[]>([])
const loading = ref(true)
const activityError = ref('')
const providerError = ref('')
const homeCardAssets = ref<HomeCardAssets | null>(null)

function openProviders(category?: string) {
  openPage(`/pages/providers/list${category ? `?category=${category}` : ''}`)
}

function openActivities(category?: string) {
  openPage(`/pages/activities/list${category ? `?category=${category}` : ''}`)
}

function openProviderDetail(publicId: string) {
  openPage(`/pages/providers/detail?id=${publicId}`)
}

function openActivityDetail(id: number) {
  openPage(`/pages/activities/detail?id=${id}`)
}

async function loadDiscovery() {
  loading.value = true
  activityError.value = ''
  providerError.value = ''

  const [providerResult, activityResult] = await Promise.allSettled([
    getRecommendedProviders(),
    getNearbyActivities(),
  ])
  if (providerResult.status === 'fulfilled') {
    providers.value = providerResult.value.data.items
  } else {
    providers.value = []
    providerError.value = getErrorMessage(providerResult.reason)
  }
  if (activityResult.status === 'fulfilled') {
    activities.value = activityResult.value.data.items
  } else {
    activities.value = []
    activityError.value = getErrorMessage(activityResult.reason)
  }
  loading.value = false

  try {
    homeCardAssets.value = (await getHomeCardAssets()).data
  } catch {
    homeCardAssets.value = null
  }
}

onLoad(loadDiscovery)
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;

.topbar { display:flex; align-items:center; gap:14rpx; height:94rpx; }
button { margin:0; padding:0; line-height:1; background:transparent; }
.city,.message { border:0; outline:0; box-shadow:none; }
.city::after,.message::after { display:none; }
.city { flex:0 0 auto; height:70rpx; color:#111; font-size:29rpx; font-weight:700; }
.city-arrow { font-size:20rpx; }
.search { display:flex; align-items:center; flex:1; gap:12rpx; height:62rpx; padding:0 24rpx; border:1rpx solid #e2e7e9; border-radius:32rpx; color:#8f999e; background:#fff; font-size:22rpx; box-sizing:border-box; }
.search-icon { color:#68747a; font-size:31rpx; }
.message { position:relative; display:flex; align-items:center; justify-content:center; width:58rpx; height:58rpx; border:3rpx solid #171d20; border-radius:45% 45% 45% 38%; color:#171d20; font-size:17rpx; }
.message i { position:absolute; right:-3rpx; top:-4rpx; width:13rpx; height:13rpx; border:3rpx solid #fff; border-radius:50%; background:#ff4141; }
.content { display:block; }
.hero { position:relative; overflow:hidden; display:flex; flex-direction:column; justify-content:center; height:232rpx; padding:0 30rpx; border-radius:24rpx; color:#075b67; box-sizing:border-box; }
.hero-art { position:absolute; width:100%; height:100%; inset:0; }
.hero-title,.hero-subtitle { position:relative; z-index:1; }
.hero-title { font-size:39rpx; line-height:54rpx; font-weight:800; letter-spacing:1rpx; }
.hero-subtitle { margin-top:8rpx; font-size:23rpx; font-weight:500; }
.scene-grid { display:grid; grid-template-columns:1fr 1fr; gap:16rpx; margin-top:22rpx; }
.scene { position:relative; overflow:hidden; display:flex; flex-direction:column; height:204rpx; padding:25rpx 22rpx; border-radius:22rpx; color:#273036; font-size:22rpx; line-height:32rpx; box-sizing:border-box; }
.scene.provider { background:linear-gradient(135deg,#fff4e8,#ffe6d3); }
.scene.activity { background:linear-gradient(135deg,#eef8ff,#dcecff); }
.scene-title { position:relative; z-index:1; font-size:34rpx; line-height:44rpx; font-weight:800; }
.provider .scene-title { color:#ff5b24; }
.activity .scene-title { color:#1683ed; }
.scene-action { position:relative; z-index:2; align-self:flex-start; height:48rpx; margin-top:22rpx; padding:0 17rpx; border-radius:24rpx; color:#fff; background:#ff541e; font-size:23rpx; font-weight:700; line-height:48rpx; box-sizing:border-box; }
.activity .scene-action { color:#fff; background:#258af3; }
.scene-art { position:absolute; z-index:0; right:-12rpx; bottom:-8rpx; pointer-events:none; }
.provider-art { width:174rpx; height:202rpx; }
.group-art { right:-20rpx; width:210rpx; height:190rpx; }
.scene b { display:none; }
.scene--pressed,.category--pressed,.card--pressed { opacity:.74; }
.categories { display:grid; grid-template-columns:repeat(4,1fr); margin-top:22rpx; padding:18rpx 0 14rpx; border-radius:22rpx; background:#fff; box-shadow:0 8rpx 28rpx rgba(31,65,72,.09); }
.category { display:flex; flex-direction:column; align-items:center; gap:10rpx; border-right:1rpx solid #edf0f1; color:#20272a; font-size:23rpx; }
.category:last-child { border-right:0; }
.category-icon { display:flex; align-items:center; justify-content:center; width:66rpx; height:66rpx; border-radius:22rpx; color:#fff; font-size:29rpx; font-weight:800; box-shadow:0 7rpx 14rpx rgba(31,65,72,.13); }
.section-head { display:flex; justify-content:space-between; align-items:center; margin:30rpx 2rpx 18rpx; font-size:31rpx; font-weight:800; }
.more { color:#7c878c; font-size:22rpx; font-weight:400; }
.provider-head { margin-top:22rpx; }
.provider-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:18rpx 16rpx; }
.loading-block,.empty-block,.error-block { display:flex; align-items:center; justify-content:center; min-height:112rpx; border-radius:16rpx; color:$dz-text-secondary; background:$dz-surface-page; font-size:23rpx; }
.error-block { min-height:72rpx; margin-bottom:14rpx; color:$dz-price-primary; }
</style>
