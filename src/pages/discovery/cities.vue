<template>
  <view class="dz-page cities-page">
    <DzNavBar title="选择城市" :fixed="false" />
    <view class="dz-container">
      <text class="intro">选择想探索的城市</text>
      <label class="city-search"><text aria-hidden="true">⌕</text><input v-model="keyword" maxlength="50" placeholder="搜索城市名称或编码" confirm-type="search" /><button v-if="keyword" aria-label="清空城市搜索" @tap="keyword = ''">×</button></label>
      <button class="locate" :disabled="locating || loading || Boolean(error)" hover-class="pressed" @tap="locate"><text>{{ locating ? '正在定位…' : '◎ 使用当前位置' }}</text><text class="locate-note">用于同城推荐与达人服务范围判断</text></button>
      <view v-if="locationError" class="location-error" role="alert">{{ locationError }}</view>
      <text class="section-title">已开通城市 <text>{{ filtered.length }}</text></text>
      <NetworkState v-if="loading" message="正在加载开通城市…" />
      <NetworkState v-else-if="error" :message="error" error @retry="load" />
      <view v-else class="city-grid">
        <button v-for="city in filtered" :key="city.city_code" :class="{ selected: city.city_code === selected }" :disabled="locating" hover-class="pressed" @tap="choose(city)">{{ city.city_name }}<text v-if="city.city_code === selected"> ✓</text></button>
      </view>
      <NetworkState v-if="!loading && !error && !filtered.length" message="没有找到已开通的城市" />
      <text class="footnote">手动选城只用于浏览同城内容，不会把城市中心当成你的位置。定位仅在点击后获取，拒绝授权也可继续浏览。</text>
    </view>
  </view>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import DzNavBar from '@/components/DzNavBar.vue'
import NetworkState from '@/components/NetworkState.vue'
import { getDiscoveryCities, getDiscoveryContext, locateDiscoveryCity, selectDiscoveryCity } from '@/services/discoveryContext'
import type { DiscoveryCity } from '@/services/discoveryContext'
import { getErrorMessage } from '@/utils/formatters'
const cities = ref<DiscoveryCity[]>([])
const keyword = ref('')
const loading = ref(true)
const error = ref('')
const locating = ref(false)
const locationError = ref('')
const selected = ref(getDiscoveryContext().cityCode)
let active = true
const filtered = computed(() => cities.value.filter(city => city.city_name.includes(keyword.value.trim()) || city.city_code.includes(keyword.value.trim())))
async function load() {
  loading.value = true; error.value = ''
  try { cities.value = await getDiscoveryCities(); selected.value = getDiscoveryContext().cityCode }
  catch (reason) { error.value = getErrorMessage(reason) }
  finally { loading.value = false }
}
function back() { uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/index/index' }) }) }
function choose(city: DiscoveryCity) { selectDiscoveryCity(city); back() }
async function locate() {
  if (locating.value) return
  locating.value = true; locationError.value = ''
  try { await locateDiscoveryCity(() => active); if (active) back() }
  catch (reason) { locationError.value = getErrorMessage(reason) }
  finally { locating.value = false }
}
onLoad(load)
onUnload(() => { active = false })
</script>
<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;
.cities-page { padding-bottom:calc(40rpx + env(safe-area-inset-bottom)); }
.intro { display:block; margin:28rpx 0; color:$dz-text-primary; font-size:40rpx; font-weight:700; }
.city-search { display:flex; align-items:center; gap:18rpx; padding:0 24rpx; min-height:96rpx; border:1rpx solid $dz-border-material; border-radius:28rpx; background:$dz-surface-raised; }
.city-search input { flex:1; min-width:0; height:96rpx; font-size:30rpx; color:$dz-text-primary; }
button::after { border:0; }button { margin:0; font-size:30rpx; line-height:1.5; }.city-search button { background:transparent; min-width:88rpx; min-height:88rpx; }
.locate { display:flex; flex-direction:column; align-items:flex-start; gap:12rpx; width:100%; margin:28rpx 0 40rpx; padding:28rpx; border-radius:28rpx; background:$dz-brand-soft; color:$dz-brand-deep; font-weight:600; }
.locate-note { color:$dz-text-secondary; font-size:24rpx; font-weight:400; }
.section-title { display:block; margin-bottom:24rpx; font-size:30rpx; font-weight:600; }.section-title text { margin-left:14rpx; color:$dz-text-secondary; font-size:24rpx; }
.city-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:18rpx; }
.city-grid button { display:flex; align-items:center; justify-content:center; min-height:96rpx; padding:16rpx 8rpx; border:2rpx solid transparent; border-radius:24rpx; background:$dz-surface-raised; color:$dz-text-primary; word-break:break-all; }
.city-grid .selected { color:$dz-brand-deep; border-color:$dz-brand-primary; background:$dz-brand-soft; }
.footnote { display:block; margin-top:36rpx; color:$dz-text-secondary; font-size:24rpx; line-height:1.8; }.location-error { margin:-16rpx 0 32rpx; color:$dz-price-primary; font-size:26rpx; line-height:1.6; }.pressed { opacity:.65; }
</style>
