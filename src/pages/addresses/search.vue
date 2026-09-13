<template>
  <view class="dz-page search-page">
    <view class="dz-safe-top" />
    <header class="search-head dz-container"><view class="back" @tap="goBack">‹</view><label><text>⌕</text><input v-model="keyword" autofocus confirm-type="search" placeholder="搜索地点名称" @input="queueSearch" @confirm="search" /></label><button @tap="search">搜索</button></header>
    <main class="result-content dz-container">
      <NetworkState v-if="loading" message="正在搜索地点…" />
      <view v-else-if="keyword.trim().length<2" class="hint">输入至少两个字，搜索腾讯地图地点</view>
      <view v-else-if="!results.length" class="hint">没有找到相关地点，换个关键词试试</view>
      <section v-else class="results"><view v-for="item in results" :key="`${item.id}-${item.longitude}`" class="result-row" @tap="select(item)"><view class="pin"><i /></view><view><strong>{{item.name}}</strong><text>{{[item.district_name,item.address].filter(Boolean).join(' · ')}}</text></view><b>›</b></view></section>
    </main>
  </view>
</template>
<script setup lang="ts">
import { onUnload } from '@dcloudio/uni-app'
import { ref } from 'vue'
import NetworkState from '@/components/NetworkState.vue'
import { searchLocations } from '@/services/locations'
import type { LocationItem } from '@/types/api'
import { getErrorMessage } from '@/utils/formatters'
const keyword=ref(''),results=ref<LocationItem[]>([]),loading=ref(false);let timer:ReturnType<typeof setTimeout>|null=null,searchSequence=0
function goBack(){uni.navigateBack()}
function queueSearch(){if(timer)clearTimeout(timer);timer=setTimeout(search,350)}
async function search(){const value=keyword.value.trim(),sequence=++searchSequence;if(value.length<2){results.value=[];loading.value=false;return}loading.value=true;try{const items=(await searchLocations(value)).data.items;if(sequence===searchSequence)results.value=items}catch(reason){if(sequence!==searchSequence)return;results.value=[];uni.showToast({title:getErrorMessage(reason,'搜索失败'),icon:'none'})}finally{if(sequence===searchSequence)loading.value=false}}
function select(item:LocationItem){const pages=getCurrentPages();const page=pages[pages.length-1] as unknown as {getOpenerEventChannel?:()=>{emit:(name:string,data:LocationItem)=>void}};page.getOpenerEventChannel?.().emit('selectLocation',item);uni.navigateBack()}
onUnload(()=>{searchSequence+=1;if(timer)clearTimeout(timer)})
</script>
<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;.search-page{background:$dz-surface-card}.search-head{display:grid;grid-template-columns:52rpx 1fr 72rpx;align-items:center;gap:12rpx;height:94rpx;border-bottom:1rpx solid $dz-border-subtle}.back{font-size:58rpx;font-weight:300}.search-head label{display:flex;align-items:center;height:64rpx;padding:0 18rpx;border-radius:$dz-radius-lg;background:#f2f5f6}.search-head label text{font-size:$dz-fs-body-strong}.search-head input{flex:1;margin-left:10rpx;font-size:$dz-fs-caption}.search-head button{height:58rpx;margin:0;padding:0;border:0;color:$dz-brand-deep;background:transparent;font-size:$dz-fs-caption;line-height:58rpx}.search-head button::after{display:none}.result-content{padding-top:12rpx}.hint{display:flex;min-height:440rpx;align-items:center;justify-content:center;color:$dz-text-tertiary;font-size:$dz-fs-caption}.result-row{display:grid;grid-template-columns:54rpx 1fr 30rpx;align-items:center;gap:14rpx;min-height:104rpx;border-bottom:1rpx solid $dz-border-subtle}.pin{display:flex;width:48rpx;height:48rpx;align-items:center;justify-content:center;border-radius:50%;background:$dz-brand-soft}.pin i{width:14rpx;height:18rpx;border:3rpx solid $dz-brand-deep;border-radius:50% 50% 50% 0;transform:rotate(-45deg)}.result-row>view:nth-child(2){display:flex;min-width:0;flex-direction:column;gap:8rpx}.result-row strong{font-size:$dz-fs-caption}.result-row text{overflow:hidden;color:$dz-text-secondary;font-size:$dz-fs-caption;text-overflow:ellipsis;white-space:nowrap}.result-row b{color:$dz-text-tertiary;font-size:$dz-fs-heading;font-weight:300}
</style>
