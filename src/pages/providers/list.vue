<template>
  <view class="dz-page dz-page--with-tabbar">
    <view class="dz-safe-top" />

    <header class="header dz-container">
      <text class="brand">DAZZY<text>搭子</text><i>◆</i></text>
      <view class="search"><text>⌕</text><text>搜索达人</text></view>
      <button class="filter-button" aria-label="筛选" @tap="showFilterPending"><i /><i /><i /></button>
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

    <view class="sort-row dz-container">
      <view class="sorts">
        <view
          v-for="item in sorts"
          :key="item.value"
          :class="{ active: ordering === item.value }"
          role="button"
          @tap="changeOrdering(item.value)"
        >{{ item.label }}</view>
      </view>
      <view class="city" role="button" @tap="showCityPending">⌖ 邯郸市⌄</view>
    </view>

    <main class="grid dz-container">
      <NetworkState v-if="loading" class="grid-state" message="正在加载达人…" />
      <NetworkState v-else-if="error" class="grid-state" :message="error" error @retry="loadProviders" />

      <view
        v-for="item in providers"
        v-else
        :key="item.public_id"
        class="card"
        hover-class="card--pressed"
        @tap="openDetail(item.public_id)"
      >
        <view class="photo">
          <image v-if="item.avatar_url" :src="item.avatar_url" mode="aspectFill" />
          <text v-else class="photo-fallback">{{ item.nickname.slice(0, 1) }}</text>
          <text class="online" :class="{ offline: !item.is_online }"><i />{{ item.is_online ? '在线' : '离线' }}</text>
        </view>

        <view class="body">
          <view class="name-row">
            <text class="name">{{ item.nickname }}</text>
            <text class="rating">★ <i>{{ item.rating }}分</i></text>
          </view>
          <view class="profile-row">
            <text>{{ age(item.birth_date) ? `${age(item.birth_date)}岁` : '年龄保密' }}</text>
            <text>{{ item.service_count }}次服务</text>
            <text>⌖ {{ formatDistance(item.distance_km) }}</text>
          </view>
          <view class="tags"><text>{{ serviceTag(item) }}</text><text>{{ personalityTag(item) }}</text></view>
          <view class="foot">
            <text class="price">¥{{ formatPrice(item) }}<small>/小时</small></text>
            <view
              class="book"
              :class="{ disabled: !item.is_online }"
              role="button"
              :aria-disabled="!item.is_online"
              @tap.stop="bookProvider(item)"
            >{{ item.is_online ? '预约' : '不可预约' }}</view>
          </view>
        </view>
      </view>

      <NetworkState
        v-if="!loading && !error && !providers.length"
        class="grid-state"
        message="暂无符合条件的达人"
      />
    </main>

    <DazzyTabBar active="provider" />
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'

import DazzyTabBar from '@/components/DazzyTabBar.vue'
import NetworkState from '@/components/NetworkState.vue'
import { getRecommendedProviders } from '@/services/discovery'
import { openPage } from '@/services/navigation'
import type { ProviderListItem } from '@/types/api'
import { formatAmount, formatDistance, getErrorMessage } from '@/utils/formatters'

type Ordering = 'recommended' | 'distance' | 'rating' | 'price'

const categories = [
  { label: '全部', value: '' },
  { label: '旅游向导', value: 'travel' },
  { label: '摄影', value: 'photography' },
  { label: '运动', value: 'sports' },
  { label: '文化', value: 'culture' },
]
const sorts: Array<{ label: string; value: Ordering }> = [
  { label: '综合', value: 'recommended' },
  { label: '距离', value: 'distance' },
  { label: '评分', value: 'rating' },
  { label: '最新', value: 'price' },
]

const providers = ref<ProviderListItem[]>([])
const ordering = ref<Ordering>('recommended')
const category = ref('')
const loading = ref(true)
const error = ref('')

function age(birthDate: string | null) {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const today = new Date()
  let result = today.getFullYear() - birth.getFullYear()
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) result--
  return result
}

function formatPrice(item: ProviderListItem) {
  return formatAmount(item.services[0]?.price_amount || 0)
}

function serviceTag(item: ProviderListItem) {
  return (item.services[0]?.category || '达人服务').replace('陪玩', '').replace('陪伴', '')
}

function personalityTag(item: ProviderListItem) {
  return item.service_count > 30 ? '健谈' : item.rating >= '4.90' ? '细心' : '活泼'
}

async function loadProviders() {
  loading.value = true
  error.value = ''
  try {
    providers.value = (await getRecommendedProviders({
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
  loadProviders()
}

function changeOrdering(value: Ordering) {
  ordering.value = value
  loadProviders()
}

function openDetail(publicId: string) {
  openPage(`/pages/providers/detail?id=${publicId}`)
}

function bookProvider(item: ProviderListItem) {
  if (!item.is_online) {
    uni.showToast({ title: '达人当前离线，暂时无法预约', icon: 'none' })
    return
  }
  openDetail(item.public_id)
}

function showPending(feature: string) {
  uni.showToast({ title: `${feature}功能即将接入`, icon: 'none' })
}

function showFilterPending() {
  showPending('高级筛选')
}

function showCityPending() {
  showPending('城市选择')
}

onLoad((query) => {
  category.value = typeof query?.category === 'string' ? query.category : ''
  loadProviders()
})
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;

button { margin:0; padding:0; border:0; background:transparent; line-height:1; }
button::after { display:none; }
.header { display:flex; align-items:center; gap:18rpx; min-height:104rpx; }
.brand { position:relative; flex:0 0 auto; color:#171d20; font-size:37rpx; font-style:italic; font-weight:900; letter-spacing:-2rpx; }
.brand>text { margin-left:6rpx; font-size:29rpx; font-style:normal; letter-spacing:0; }
.brand i { position:absolute; right:42rpx; bottom:-8rpx; color:$dz-brand-primary; font-size:16rpx; font-style:normal; }
.search { display:flex; align-items:center; flex:1; gap:12rpx; height:62rpx; padding:0 22rpx; border:1rpx solid #e2e7e9; border-radius:32rpx; color:$dz-text-tertiary; background:#fff; font-size:22rpx; box-sizing:border-box; }
.search>text:first-child { color:#748086; font-size:31rpx; }
.filter-button { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:5rpx; width:54rpx; height:54rpx; }
.filter-button i { display:block; width:34rpx; height:3rpx; border-radius:2rpx; background:$dz-brand-deep; }
.filter-button i:nth-child(2) { width:24rpx; }
.filter-button i:nth-child(3) { width:12rpx; }
.category-rail { white-space:nowrap; }
.categories { display:flex; gap:16rpx; padding-top:12rpx; padding-bottom:18rpx; }
.category { flex:0 0 auto; min-width:116rpx; height:58rpx; padding:0 24rpx; border-radius:30rpx; color:#283136; background:#f7f8f9; font-size:23rpx; }
.category.active { color:#fff; background:linear-gradient(135deg,#18c7c6,#08b7c3); font-weight:700; }
.sort-row { display:flex; align-items:center; justify-content:space-between; min-height:78rpx; }
.sorts { display:flex; align-items:stretch; gap:38rpx; height:78rpx; }
.sorts>view { position:relative; display:flex; align-items:center; color:#30383c; font-size:23rpx; }
.sorts>view.active { color:$dz-brand-deep; font-weight:700; }
.sorts>view.active::before { position:absolute; right:4rpx; bottom:8rpx; left:4rpx; height:4rpx; border-radius:2rpx; background:$dz-brand-primary; content:''; }
.city { flex:0 0 auto; color:#4f5a60; font-size:22rpx; }
.grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16rpx; padding-top:4rpx; }
.grid-state { grid-column:1/-1; }
.card { overflow:hidden; border:1rpx solid $dz-border-subtle; border-radius:18rpx; background:#fff; box-shadow:0 8rpx 24rpx rgba(31,65,72,.07); }
.card--pressed { opacity:.74; }
.photo { position:relative; display:flex; align-items:center; justify-content:center; height:254rpx; color:#fff; background:linear-gradient(145deg,#b7e3e4,#63b8bd); font-size:64rpx; font-weight:700; }
.photo image { width:100%; height:100%; }
.photo-fallback { font-size:64rpx; }
.online { position:absolute; left:12rpx; bottom:10rpx; padding:5rpx 12rpx; border-radius:18rpx; color:#1f292d; background:rgba(255,255,255,.88); font-size:18rpx; font-weight:500; }
.online i { display:inline-block; width:13rpx; height:13rpx; margin-right:7rpx; border-radius:50%; background:#16bd62; }
.online.offline { color:#667177; }
.online.offline i { background:#9aa4aa; }
.favorite { position:absolute; right:10rpx; top:8rpx; color:#fff; font-size:50rpx; line-height:50rpx; text-shadow:0 2rpx 5rpx rgba(0,0,0,.35); }
.body { padding:13rpx 14rpx 15rpx; }
.name-row,.profile-row,.foot { display:flex; align-items:center; justify-content:space-between; }
.name { color:$dz-text-primary; font-size:27rpx; font-weight:800; }
.rating { color:#ffad1f; font-size:24rpx; }
.rating i { color:#4d585d; font-size:21rpx; font-style:normal; font-weight:400; }
.profile-row { margin-top:8rpx; color:#657177; font-size:18rpx; }
.profile-row text:nth-child(2) { display:none; }
.tags { display:flex; gap:8rpx; margin-top:12rpx; }
.tags text { padding:4rpx 10rpx; border:1rpx solid #46d1d0; border-radius:10rpx; color:$dz-brand-deep; font-size:18rpx; }
.foot { margin-top:14rpx; }
.price { color:#ff501e; font-size:30rpx; font-weight:500; }
.price small { font-size:17rpx; font-weight:400; }
.book { display:flex; align-items:center; justify-content:center; min-width:86rpx; height:48rpx; border-radius:25rpx; color:#fff; background:$dz-gradient-brand; font-size:22rpx; font-weight:700; }
.book.disabled { min-width:110rpx; color:#7b858a; background:#edf0f1; font-size:19rpx; }

@media screen and (min-width:480px) {
  .photo { height:276rpx; }
}
</style>
