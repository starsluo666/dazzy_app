<template>
  <view class="dz-page address-page">
    <DzNavBar title="常用地址" :back-action="goBack" />
    <main class="address-content dz-container">
      <NetworkState v-if="loading" message="正在加载常用地址…" />
      <NetworkState v-else-if="error" :message="error" action-text="重新加载" @action="loadAddresses" />
      <view v-else-if="!addresses.length" class="empty-state">
        <view class="empty-pin"><i /></view><strong>还没有常用地址</strong><text>添加常去地点，下单时可以快速选择</text>
      </view>
      <section v-else class="address-list">
        <article v-for="item in addresses" :key="item.id" class="address-card">
          <view class="pin"><i /></view>
          <view class="address-copy" @tap="editAddress(item)">
            <view><strong>{{ item.name }}</strong><text v-if="item.is_default">默认</text></view>
            <p>{{ item.city_name }} {{ item.address }}</p>
            <small v-if="hasCompleteContact(item)">{{ item.contact_name }}{{ genderLabel(item) }} · {{ item.contact_phone }}</small>
            <small v-else class="incomplete">联系人信息未补全，请编辑</small>
          </view>
          <button class="edit" aria-label="编辑地址" @tap="editAddress(item)">编辑</button>
          <view class="card-actions">
            <button v-if="!item.is_default" @tap="makeDefault(item)"><i class="radio" />设为默认</button>
            <text v-else><i class="radio active">✓</i>默认地址</text>
            <button class="delete" @tap="confirmDelete(item)">删除</button>
          </view>
        </article>
      </section>
    </main>
    <footer class="page-footer"><button @tap="addAddress"><text>＋</text>添加新地址</button></footer>
  </view>
</template>

<script setup lang="ts">
import { navigateBackOr } from '@/utils/navigation'
import DzNavBar from '@/components/DzNavBar.vue'
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import NetworkState from '@/components/NetworkState.vue'
import { deleteAddress, getSavedAddresses, setDefaultAddress } from '@/services/locations'
import { isAuthenticated } from '@/services/session'
import type { LocationItem } from '@/types/api'
import { getErrorMessage } from '@/utils/formatters'

const addresses = ref<LocationItem[]>([]), loading = ref(true), error = ref('')
function goBack(){navigateBackOr(()=>uni.reLaunch({url:'/pages/profile/index'}))}
function addAddress(){uni.navigateTo({url:'/pages/addresses/edit'})}
function editAddress(item:LocationItem){uni.navigateTo({url:`/pages/addresses/edit?id=${item.id}`})}
function genderLabel(item:LocationItem){return item.contact_gender_label||(item.contact_gender==='mr'?'先生':item.contact_gender==='ms'?'女士':'')}
function hasCompleteContact(item:LocationItem){return Boolean(item.contact_name&&genderLabel(item)&&/^1\d{10}$/.test(item.contact_phone||''))}
async function loadAddresses(){if(!isAuthenticated())return;loading.value=true;error.value='';try{addresses.value=(await getSavedAddresses()).data.items}catch(reason){error.value=getErrorMessage(reason,'地址加载失败')}finally{loading.value=false}}
async function makeDefault(item:LocationItem){try{await setDefaultAddress(Number(item.id));await loadAddresses();uni.showToast({title:'已设为默认地址',icon:'success'})}catch(reason){uni.showToast({title:getErrorMessage(reason,'设置失败'),icon:'none'})}}
function confirmDelete(item:LocationItem){uni.showModal({title:'删除地址',content:`确定删除“${item.name}”吗？`,confirmText:'删除',confirmColor:'#ef5a4f',success:async({confirm})=>{if(!confirm)return;try{await deleteAddress(Number(item.id));await loadAddresses();uni.showToast({title:'地址已删除',icon:'success'})}catch(reason){uni.showToast({title:getErrorMessage(reason,'删除失败'),icon:'none'})}}})}
onShow(loadAddresses)
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;
.address-page{padding-bottom:calc(126rpx + env(safe-area-inset-bottom));background:$dz-surface-page}.page-hero{background:linear-gradient(150deg,$dz-brand-soft,#fff)}.page-nav{display:flex;align-items:center;justify-content:space-between;height:94rpx;font-size:$dz-fs-heading;font-weight:$dz-fw-bold}.back,.nav-spacer{width:64rpx}.back{font-size:58rpx;font-weight:300}.address-content{padding-top:24rpx}.address-list{display:flex;flex-direction:column;gap:20rpx}.address-card{position:relative;display:grid;grid-template-columns:60rpx 1fr 64rpx;gap:14rpx;padding:25rpx 24rpx 0;border-radius:$dz-radius-md;background:$dz-surface-card;box-shadow:$dz-shadow-card}.pin{display:flex;width:54rpx;height:54rpx;align-items:center;justify-content:center;border-radius:50%;background:$dz-brand-soft}.pin i,.empty-pin i{position:relative;width:18rpx;height:23rpx;border:4rpx solid $dz-brand-deep;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-sizing:border-box}.pin i::after,.empty-pin i::after{position:absolute;top:4rpx;left:4rpx;width:4rpx;height:4rpx;border-radius:50%;background:$dz-brand-deep;content:''}.address-copy{min-width:0}.address-copy>view{display:flex;align-items:center;gap:12rpx}.address-copy strong{overflow:hidden;font-size:$dz-fs-body;text-overflow:ellipsis;white-space:nowrap}.address-copy>view text{flex:none;padding:4rpx 10rpx;border-radius:$dz-radius-sm;color:$dz-brand-deep;background:$dz-brand-soft;font-size:$dz-fs-micro}.address-copy p{margin:10rpx 0 7rpx;color:$dz-text-secondary;font-size:$dz-fs-caption;line-height:1.5}.address-copy small{display:block;margin-bottom:22rpx;color:$dz-text-tertiary;font-size:$dz-fs-caption}.address-copy small.incomplete{color:$dz-status-warning}.address-card button{margin:0;padding:0;border:0;background:transparent}.address-card button::after{display:none}.edit{height:54rpx!important;color:$dz-brand-deep;font-size:$dz-fs-caption!important;line-height:54rpx!important}.card-actions{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;height:76rpx;border-top:1rpx solid $dz-border-subtle;color:$dz-text-secondary;font-size:$dz-fs-caption}.card-actions button,.card-actions>text{display:flex;align-items:center;color:$dz-text-secondary;font-size:$dz-fs-caption}.card-actions .delete{color:#ef6259}.radio{display:flex;width:28rpx;height:28rpx;align-items:center;justify-content:center;margin-right:10rpx;border:2rpx solid #bec9cc;border-radius:50%;font-size:$dz-fs-micro;font-style:normal;box-sizing:border-box}.radio.active{border-color:$dz-brand-primary;color:$dz-text-inverse;background:$dz-brand-primary}.empty-state{display:flex;min-height:600rpx;flex-direction:column;align-items:center;justify-content:center;color:$dz-text-secondary}.empty-pin{display:flex;width:116rpx;height:116rpx;align-items:center;justify-content:center;border-radius:50%;background:$dz-brand-soft}.empty-pin i{width:34rpx;height:44rpx;border-width:6rpx}.empty-pin i::after{top:9rpx;left:9rpx;width:7rpx;height:7rpx}.empty-state strong{margin-top:28rpx;color:$dz-text-primary;font-size:$dz-fs-body-strong}.empty-state>text{margin-top:12rpx;font-size:$dz-fs-caption}.page-footer{position:fixed;z-index:20;right:0;bottom:0;left:0;height:calc(112rpx + env(safe-area-inset-bottom));padding:13rpx 28rpx env(safe-area-inset-bottom);background:$dz-surface-card;box-shadow:$dz-shadow-floating;box-sizing:border-box}.page-footer button{height:82rpx;margin:0;border-radius:$dz-radius-full;color:$dz-text-inverse;background:$dz-gradient-brand;font-size:$dz-fs-body;font-weight:750;line-height:82rpx}.page-footer button text{margin-right:10rpx;font-size:$dz-fs-heading}
</style>
