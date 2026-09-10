<template>
  <view class="dz-page dz-page--with-tabbar">
    <view class="dz-safe-top" />
    <view class="topbar dz-container">
      <button class="city">邯郸市 <text class="city-arrow">▾</text></button>
      <view class="search"><text class="search-icon">⌕</text><text>搜索达人、活动、场馆</text></view>
    </view>

    <main class="content dz-container">
      <view class="hero">
        <image class="hero-art" src="/static/home/city-discovery-hero-v1.webp" mode="aspectFill" />
        <text class="hero-title">发现同城好搭子</text>
        <text class="hero-subtitle">一起玩， 一起聊， 一起出发</text>
      </view>

      <view class="scene-grid">
        <view class="scene provider" hover-class="scene--pressed" @tap="openProviders()">
          <text class="scene-title">达人陪伴</text>
          <text class="scene-copy">1对1预约服务</text>
          <text class="scene-action">找搭子 <i>›</i></text>
          <image v-if="homeCardAssets?.provider_companion_url" class="scene-art provider-art" :src="homeCardAssets.provider_companion_url" mode="aspectFit" />
          <b v-else>搭</b>
        </view>
        <view class="scene activity" hover-class="scene--pressed" @tap="openActivities()">
          <text class="scene-title">同城组局</text>
          <text class="scene-copy">多人兴趣活动</text>
          <text class="scene-action">去组局 <i>›</i></text>
          <image v-if="homeCardAssets?.group_activity_url" class="scene-art group-art" :src="homeCardAssets.group_activity_url" mode="aspectFit" />
          <b v-else>局</b>
        </view>
      </view>

      <view class="categories">
        <view
          v-for="item in categories"
          :key="item.label"
          class="category"
          hover-class="category--pressed"
          role="button"
          :aria-label="item.label"
          @tap="openProviders(item.slug)"
        >
          <image class="category-icon" :src="item.icon" mode="aspectFit" aria-hidden="true" /><text>{{ item.label }}</text>
        </view>
      </view>

      <view class="section-head provider-head"><text>推荐达人</text><text class="more" @tap="openProviders()">更多 <i>›</i></text></view>
      <view v-if="loading" class="loading-block">正在发现附近的搭子…</view>
      <view v-if="providers.length" class="provider-rail">
        <HomeProviderCard
          v-for="item in providers.slice(0, 4)"
          :key="item.public_id"
          :item="item"
          @select="openProviderDetail"
        />
      </view>
      <view v-else-if="providerError" class="error-block" @tap="loadDiscovery">{{ providerError }}，点击重试</view>
      <view v-else-if="!loading" class="empty-block">附近暂时没有达人</view>

      <view class="section-head activity-head"><text>附近活动</text><text class="more" @tap="openActivities()">更多 <i>›</i></text></view>
      <view v-if="activityError" class="error-block" @tap="loadDiscovery">{{ activityError }}，点击重试</view>
      <HomeActivityCarousel v-if="activities.length" :items="activities.slice(0, 3)" @select="openActivityDetail" />
      <view v-if="!loading && !activityError && !activities.length" class="empty-block">附近暂时没有活动</view>
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
import { getHomeDiscovery } from '@/services/discovery'
import { openPage } from '@/services/navigation'
import type { HomeActivityListItem, HomeCardAssets, HomeProviderListItem } from '@/types/api'
import { getErrorMessage } from '@/utils/formatters'

const categories = [
  { label: '棋牌', slug: 'mahjong', icon: '/static/home/categories/chess-cards.svg' },
  { label: '桌球', slug: 'billiards', icon: '/static/home/categories/billiards.svg' },
  { label: '电竞', slug: 'esports', icon: '/static/home/categories/esports.svg' },
  { label: '密室', slug: 'escape-room', icon: '/static/home/categories/escape-room.svg' },
  { label: '桌游', slug: 'board-games', icon: '/static/home/categories/board-games.svg' },
  { label: '爬山', slug: 'travel', icon: '/static/home/categories/hiking.svg' },
  { label: '商务', slug: 'business', icon: '/static/home/categories/business.svg' },
  { label: '全部', slug: '', icon: '/static/home/categories/all.svg' },
]
const providers = ref<HomeProviderListItem[]>([])
const activities = ref<HomeActivityListItem[]>([])
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

  try {
    const response = await getHomeDiscovery()
    providers.value = response.data.recommended_providers
    activities.value = response.data.recommended_activities
    homeCardAssets.value = response.data.card_assets
    providerError.value = response.data.errors.recommended_providers || ''
    activityError.value = response.data.errors.recommended_activities || ''
  } catch (error) {
    providers.value = []
    activities.value = []
    homeCardAssets.value = null
    providerError.value = getErrorMessage(error)
    activityError.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

onLoad(loadDiscovery)
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;

.topbar { display:flex; align-items:center; gap:32rpx; height:94rpx; }
button { margin:0; padding:0; line-height:1; background:transparent; }
.city { border:0; outline:0; box-shadow:none; }
.city::after { display:none; }
.city { flex:0 0 auto; height:70rpx; color:#111; font-size:28rpx; font-weight:800; }
.city-arrow { font-size:20rpx; }
.search { display:flex; align-items:center; flex:1; min-width:0; gap:12rpx; height:62rpx; padding:0 23rpx; border:1rpx solid #dfe4e6; border-radius:34rpx; color:#737c81; background:#fff; font-size:22rpx; box-sizing:border-box; white-space:nowrap; }
.search-icon { color:#68747a; font-size:31rpx; }
.content { display:block; padding-right:22rpx; padding-left:22rpx; }
.hero { position:relative; overflow:hidden; display:flex; flex-direction:column; justify-content:center; height:232rpx; padding:0 30rpx; border-radius:24rpx; color:#075b67; box-sizing:border-box; }
.hero-art { position:absolute; width:100%; height:100%; inset:0; }
.hero-title,.hero-subtitle { position:relative; z-index:1; }
.hero-title { font-size:51rpx; line-height:62rpx; font-weight:900; letter-spacing:-1rpx; }
.hero-subtitle { margin-top:8rpx; font-size:28rpx; font-weight:500; letter-spacing:1rpx; }
.scene-grid { display:grid; grid-template-columns:1fr 1fr; gap:16rpx; margin-top:22rpx; }
.scene { position:relative; overflow:hidden; display:flex; flex-direction:column; height:204rpx; padding:25rpx 22rpx; border:1rpx solid transparent; border-radius:22rpx; color:#394147; font-size:23rpx; line-height:32rpx; box-sizing:border-box; }
.scene.provider { border-color:#ffd9b9; background:linear-gradient(135deg,#fff6ed,#ffe9d7); }
.scene.activity { border-color:#cce4ff; background:linear-gradient(135deg,#f0f8ff,#e2efff); }
.scene-title { position:relative; z-index:1; font-size:34rpx; line-height:44rpx; font-weight:800; }
.provider .scene-title { color:#ff5b24; }
.activity .scene-title { color:#1683ed; }
.scene-copy { position:relative; z-index:1; margin-top:3rpx; }
.scene-action { position:relative; z-index:2; align-self:flex-start; height:48rpx; margin-top:19rpx; padding:0 16rpx; border-radius:24rpx; color:#fff; background:#ff541e; font-size:22rpx; font-weight:700; line-height:48rpx; box-sizing:border-box; }
.scene-action i,.more i { font-style:normal; }
.activity .scene-action { color:#fff; background:#258af3; }
.scene-art { position:absolute; z-index:0; right:-12rpx; bottom:-8rpx; pointer-events:none; }
.provider-art { width:174rpx; height:202rpx; }
.group-art { right:-20rpx; width:210rpx; height:190rpx; }
.scene b { display:none; }
.scene--pressed,.category--pressed,.card--pressed { opacity:.74; }
.categories { display:grid; grid-template-columns:repeat(4,1fr); grid-template-rows:repeat(2,1fr); height:232rpx; margin-top:22rpx; padding:10rpx 0; border:1rpx solid rgba(23,33,38,.045); border-radius:22rpx; background:#fff; box-shadow:0 8rpx 28rpx rgba(31,65,72,.09); box-sizing:border-box; }
.category { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3rpx; border-right:1rpx solid #edf0f1; color:#20272a; font-size:21rpx; }
.category:nth-child(4n) { border-right:0; }
.category:nth-child(-n+4) { border-bottom:1rpx solid #edf0f1; }
.category-icon { display:block; width:58rpx; height:58rpx; }
.section-head { display:flex; justify-content:space-between; align-items:center; margin:31rpx 2rpx 14rpx; font-size:31rpx; line-height:44rpx; font-weight:800; }
.more { color:#7c878c; font-size:22rpx; font-weight:400; }
.provider-head { margin-top:31rpx; }
.provider-rail { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14rpx; }
.activity-head { margin-top:30rpx; }
.loading-block,.empty-block,.error-block { display:flex; align-items:center; justify-content:center; min-height:112rpx; border-radius:16rpx; color:$dz-text-secondary; background:$dz-surface-page; font-size:23rpx; }
.error-block { min-height:72rpx; margin-bottom:14rpx; color:$dz-price-primary; }
</style>
