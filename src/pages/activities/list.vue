<template>
  <view class="dz-page dz-page--with-tabbar">
    <view class="dz-safe-top" />

    <header class="header dz-container">
      <text class="brand"><strong>DAZZY</strong><text>搭子</text></text>
      <view class="search"><text>⌕</text><text>搜索活动、地点</text></view>
      <view class="filter" role="button" @tap="showPending('高级筛选')"><text>▽</text><text>筛选</text></view>
    </header>

    <scroll-view scroll-x class="category-rail" :show-scrollbar="false">
      <view class="categories dz-container">
        <view
          v-for="item in categories"
          :key="item.value"
          class="category"
          :class="{ active: category === item.value }"
          role="button"
          @tap="changeCategory(item.value)"
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

    <DazzyTabBar active="activity" />
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'

import DazzyTabBar from '@/components/DazzyTabBar.vue'
import ActivityListCard from '@/components/ActivityListCard.vue'
import NetworkState from '@/components/NetworkState.vue'
import { getNearbyActivities } from '@/services/discovery'
import { openPage } from '@/services/navigation'
import type { ActivityListItem } from '@/types/api'
import { getErrorMessage } from '@/utils/formatters'

type Ordering = 'recommended' | 'distance' | 'time' | 'latest'

const categories = [
  { label: '全部', value: '' },
  { label: '台球', value: 'billiards' },
  { label: '桌游', value: 'board-games' },
  { label: '旅行', value: 'travel' },
  { label: '运动', value: 'sports' },
  { label: 'K歌', value: 'karaoke' },
]
const sorts: Array<{ label: string; value: Ordering }> = [
  { label: '推荐', value: 'recommended' },
  { label: '最新', value: 'latest' },
  { label: '距离', value: 'distance' },
  { label: '时间', value: 'time' },
]

const activities = ref<ActivityListItem[]>([])
const category = ref('')
const ordering = ref<Ordering>('recommended')
const loading = ref(true)
const error = ref('')

async function loadActivities() {
  loading.value = true
  error.value = ''
  try {
    activities.value = (await getNearbyActivities({
      category: category.value || undefined,
      ordering: ordering.value,
      page_size: 20,
    })).data.items
  } catch (reason) {
    error.value = getErrorMessage(reason)
  } finally {
    loading.value = false
  }
}

function changeCategory(value: string) {
  category.value = value
  loadActivities()
}

function changeOrdering(value: Ordering) {
  ordering.value = value
  loadActivities()
}

function openDetail(id: number) {
  openPage(`/pages/activities/detail?id=${id}`)
}

function showPending(feature: string) {
  uni.showToast({ title: `${feature}功能即将接入`, icon: 'none' })
}

onLoad((query) => {
  category.value = typeof query?.category === 'string' ? query.category : ''
  loadActivities()
})
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;

.header { display:flex; align-items:center; gap:17rpx; min-height:104rpx; }
.brand { flex:0 0 auto; color:#151c20; font-size:$dz-fs-body-strong; font-weight:$dz-fw-bold; }
.brand strong { color:$dz-brand-deep; font-size:$dz-fs-heading; font-weight:$dz-fw-bold; letter-spacing:-2rpx; }
.brand>text { margin-left:5rpx; }
.search { display:flex; align-items:center; flex:1; gap:12rpx; height:62rpx; padding:0 21rpx; border:1rpx solid #e1e6e8; border-radius:$dz-radius-lg; color:#929ca1; font-size:$dz-fs-caption; box-sizing:border-box; }
.search>text:first-child { color:#3e494f; font-size:$dz-fs-heading; }
.filter { display:flex; align-items:center; flex:0 0 auto; gap:5rpx; color:#20272b; font-size:$dz-fs-caption; }
.filter>text:first-child { transform:rotate(45deg); color:#11191d; font-size:$dz-fs-heading; }
.category-rail { white-space:nowrap; }
.categories { display:flex; gap:16rpx; padding-top:12rpx; padding-bottom:18rpx; }
.category { display:flex; align-items:center; justify-content:center; flex:0 0 auto; min-width:104rpx; height:58rpx; padding:0 22rpx; border-radius:$dz-radius-lg; color:#20282c; background:$dz-surface-page; font-size:$dz-fs-caption; box-sizing:border-box; }
.category.active { color:$dz-text-inverse; background:$dz-gradient-brand; font-weight:$dz-fw-bold; }
.sorts { display:flex; align-items:stretch; gap:76rpx; height:76rpx; }
.sorts>view { position:relative; display:flex; align-items:center; color:#5e696f; font-size:$dz-fs-caption; }
.sorts>view.active { color:$dz-brand-deep; font-weight:$dz-fw-bold; }
.sorts>view.active::after { position:absolute; right:6rpx; bottom:8rpx; left:6rpx; height:4rpx; border-radius:2rpx; background:$dz-brand-primary; content:''; }
.list { display:flex; flex-direction:column; gap:14rpx; padding-top:4rpx; }
@media screen and (max-width:360px) { .sorts { gap:54rpx; } }
</style>
