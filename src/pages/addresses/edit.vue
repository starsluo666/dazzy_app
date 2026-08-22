<template>
  <view class="dz-page edit-address-page">
    <view class="page-hero"><view class="dz-safe-top" /><header class="page-nav dz-container"><view class="back" @tap="goBack">‹</view><text>{{ addressId?'编辑地址':'新增地址' }}</text><view class="nav-spacer" /></header></view>
    <main class="edit-content dz-container">
      <NetworkState v-if="loading" message="正在加载地址…" />
      <template v-else>
      <section class="form-panel">
        <view class="form-row location-row" @tap="openSearch"><text>所在地点</text><view :class="{placeholder:!form.name}"><strong>{{form.name||'搜索地图地点'}}</strong><small v-if="form.name">{{form.city_name}}</small></view><b>›</b></view>
        <label class="form-row detail-row"><text>详细地址</text><textarea v-model="form.address" maxlength="255" auto-height placeholder="楼栋、门牌号等详细信息" /></label>
        <view class="form-row coordinate-row"><text>坐标</text><view>{{coordinateLabel}}</view></view>
      </section>
      <section class="default-panel"><view><strong>设为默认地址</strong><text>{{ defaultLocked ? '默认地址不可取消，可将其他地址设为默认' : '下单选择地址时优先展示' }}</text></view><switch :checked="form.is_default" :disabled="defaultLocked" color="#18c7c6" @change="changeDefault" /></section>
      <button class="save-button" :disabled="!canSave||saving" @tap="save">{{saving?'保存中…':'保存地址'}}</button>
      </template>
    </main>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, reactive, ref } from 'vue'
import NetworkState from '@/components/NetworkState.vue'
import { createAddress, getAddress, updateAddress } from '@/services/locations'
import { guardCurrentPage } from '@/services/session'
import type { LocationItem } from '@/types/api'
import { getErrorMessage } from '@/utils/formatters'
const addressId=ref(0),saving=ref(false),loading=ref(true),defaultLocked=ref(false)
const form=reactive<LocationItem>({name:'',address:'',city_name:'邯郸市',longitude:'',latitude:'',is_default:false})
const canSave=computed(()=>form.name.trim().length>0&&form.address.trim().length>0&&Number.isFinite(Number(form.longitude))&&Number.isFinite(Number(form.latitude)))
const coordinateLabel=computed(()=>canSave.value?`${Number(form.longitude).toFixed(5)}, ${Number(form.latitude).toFixed(5)}`:'选择地点后自动获取')
function goBack(){uni.navigateBack({fail:()=>uni.redirectTo({url:'/pages/addresses/index'})})}
function returnToAddressList(){
  if(getCurrentPages().length>1){uni.navigateBack();return}
  uni.redirectTo({url:'/pages/addresses/index'})
}
function changeDefault(event:Event){if(defaultLocked.value)return;form.is_default=Boolean((event as CustomEvent<{value:boolean}>).detail.value)}
function applyLocation(item:LocationItem){form.name=item.name;form.address=item.address;form.city_name=item.city_name||'邯郸市';form.longitude=item.longitude;form.latitude=item.latitude}
function openSearch(){uni.navigateTo({url:'/pages/addresses/search',events:{selectLocation:applyLocation}})}
async function save(){if(!canSave.value||saving.value)return;saving.value=true;try{const payload={...form,address:form.address.trim()};if(addressId.value)await updateAddress(addressId.value,payload);else await createAddress(payload);uni.showToast({title:'地址已保存',icon:'success'});setTimeout(returnToAddressList,350)}catch(reason){uni.showToast({title:getErrorMessage(reason,'保存失败'),icon:'none'})}finally{saving.value=false}}
onLoad(async query=>{if(!guardCurrentPage())return;addressId.value=Number(query?.id)||0;if(!addressId.value){loading.value=false;return}try{Object.assign(form,(await getAddress(addressId.value)).data);defaultLocked.value=Boolean(form.is_default)}catch(reason){uni.showToast({title:getErrorMessage(reason,'地址加载失败'),icon:'none'})}finally{loading.value=false}})
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;.edit-address-page{background:$dz-surface-page}.page-hero{background:linear-gradient(150deg,#ecfcfc,#fff)}.page-nav{display:flex;align-items:center;justify-content:space-between;height:94rpx;font-size:34rpx;font-weight:800}.back,.nav-spacer{width:64rpx}.back{font-size:58rpx;font-weight:300}.edit-content{padding-top:26rpx;padding-bottom:40rpx}.form-panel,.default-panel{overflow:hidden;padding:0 26rpx;border-radius:25rpx;background:#fff;box-shadow:$dz-shadow-card}.form-row{display:flex;align-items:center;min-height:104rpx;border-bottom:1rpx solid $dz-border-subtle}.form-row:last-child{border-bottom:0}.form-row>text{width:126rpx;flex:none;font-size:26rpx;font-weight:650}.location-row>view{display:flex;min-width:0;flex:1;flex-direction:column;align-items:flex-end;gap:5rpx}.location-row strong{max-width:100%;overflow:hidden;font-size:25rpx;text-overflow:ellipsis;white-space:nowrap}.location-row small{color:$dz-text-tertiary;font-size:18rpx}.location-row .placeholder{color:$dz-text-tertiary}.location-row b{margin-left:12rpx;color:$dz-text-tertiary;font-size:36rpx;font-weight:300}.detail-row{align-items:flex-start;padding:28rpx 0}.detail-row textarea{width:auto;min-height:82rpx;flex:1;font-size:24rpx;line-height:1.55;text-align:right}.coordinate-row>view{flex:1;color:$dz-text-tertiary;font-size:20rpx;text-align:right}.default-panel{display:flex;align-items:center;justify-content:space-between;min-height:116rpx;margin-top:22rpx}.default-panel>view{display:flex;flex-direction:column;gap:8rpx}.default-panel strong{font-size:26rpx}.default-panel text{color:$dz-text-tertiary;font-size:19rpx}.save-button{height:92rpx;margin-top:34rpx;border-radius:46rpx;color:#fff;background:$dz-gradient-brand;font-size:29rpx;font-weight:750;box-shadow:0 12rpx 28rpx rgba(8,181,194,.18)}.save-button[disabled]{opacity:.5}
</style>
