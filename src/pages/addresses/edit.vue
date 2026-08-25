<template>
  <view class="dz-page edit-address-page">
    <view class="page-hero">
      <view class="dz-safe-top" />
      <header class="page-nav dz-container">
        <view class="back" @tap="goBack">‹</view>
        <text>{{ addressId ? '编辑地址' : '新增地址' }}</text>
        <view class="nav-spacer" />
      </header>
    </view>

    <main class="edit-content dz-container">
      <NetworkState v-if="loading" message="正在加载地址…" />
      <template v-else>
        <text class="section-label">地址信息</text>
        <section class="form-panel">
          <view class="form-row location-row" @tap="openSearch">
            <text>所在地点</text>
            <view :class="{ placeholder: !form.name }">
              <strong>{{ form.name || '请选择所在地点' }}</strong>
              <small v-if="form.name">{{ form.city_name }}</small>
            </view>
            <b>›</b>
          </view>
          <label class="form-row detail-row">
            <text>详细地址</text>
            <textarea
              v-model="form.address"
              maxlength="255"
              auto-height
              placeholder="楼栋、单元、门牌号等"
            />
          </label>
        </section>

        <text class="section-label contact-label">联系人信息</text>
        <section class="form-panel contact-panel">
          <view class="form-row contact-name-row">
            <text>联系人</text>
            <input v-model="form.contact_name" maxlength="30" placeholder="姓名" />
            <view class="gender-options" aria-label="联系人称谓">
              <button :class="{ active: form.contact_gender === 'mr' }" @tap="form.contact_gender = 'mr'">
                <text>先生</text>
              </button>
              <button :class="{ active: form.contact_gender === 'ms' }" @tap="form.contact_gender = 'ms'">
                <text>女士</text>
              </button>
            </view>
          </view>
          <label class="form-row input-row">
            <text>手机号</text>
            <input
              v-model="form.contact_phone"
              type="number"
              maxlength="11"
              placeholder="用于服务联系"
            />
          </label>
        </section>

        <section class="default-panel">
          <view>
            <strong>设为默认地址</strong>
            <text>{{ defaultLocked ? '默认地址不可取消，可将其他地址设为默认' : '下单时将自动选中该地址' }}</text>
          </view>
          <switch
            :checked="form.is_default"
            :disabled="defaultLocked"
            color="#18c7c6"
            @change="changeDefault"
          />
        </section>
        <button class="save-button" :disabled="!canSave || saving" @tap="save">
          {{ saving ? '保存中…' : '保存地址' }}
        </button>
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

interface AddressForm extends LocationItem {
  contact_name: string
  contact_gender: 'mr' | 'ms' | ''
  contact_phone: string
  is_default: boolean
}

const addressId = ref(0)
const saving = ref(false)
const loading = ref(true)
const defaultLocked = ref(false)
const form = reactive<AddressForm>({
  name: '',
  address: '',
  city_name: '邯郸市',
  contact_name: '',
  contact_gender: '',
  contact_phone: '',
  longitude: '',
  latitude: '',
  is_default: false,
})
const canSave = computed(() => (
  form.name.trim().length > 0
  && form.address.trim().length > 0
  && form.contact_name.trim().length > 0
  && (form.contact_gender === 'mr' || form.contact_gender === 'ms')
  && /^1\d{10}$/.test(form.contact_phone)
  && Number.isFinite(Number(form.longitude))
  && Number.isFinite(Number(form.latitude))
))

function goBack() {
  uni.navigateBack({ fail: () => uni.redirectTo({ url: '/pages/addresses/index' }) })
}

function returnToPreviousPage() {
  if (getCurrentPages().length > 1) {
    uni.navigateBack()
    return
  }
  uni.redirectTo({ url: '/pages/addresses/index' })
}

function changeDefault(event: Event) {
  if (defaultLocked.value) return
  form.is_default = Boolean((event as CustomEvent<{ value: boolean }>).detail.value)
}

function applyLocation(item: LocationItem) {
  form.name = item.name
  form.address = item.address
  form.city_name = item.city_name || '邯郸市'
  form.longitude = item.longitude
  form.latitude = item.latitude
}

function openSearch() {
  uni.navigateTo({
    url: '/pages/addresses/search',
    events: { selectLocation: applyLocation },
  })
}

async function save() {
  if (!canSave.value || saving.value) return
  saving.value = true
  try {
    const payload: AddressForm = {
      ...form,
      name: form.name.trim(),
      address: form.address.trim(),
      contact_name: form.contact_name.trim(),
      contact_phone: form.contact_phone.trim(),
    }
    const response = addressId.value
      ? await updateAddress(addressId.value, payload)
      : await createAddress(payload)
    const pages = getCurrentPages()
    const page = pages[pages.length - 1] as unknown as {
      getOpenerEventChannel?: () => { emit: (name: string, data: LocationItem) => void }
    }
    page.getOpenerEventChannel?.().emit('addressSaved', response.data)
    uni.showToast({ title: '地址已保存', icon: 'success' })
    setTimeout(returnToPreviousPage, 350)
  } catch (reason) {
    uni.showToast({ title: getErrorMessage(reason, '保存失败'), icon: 'none' })
  } finally {
    saving.value = false
  }
}

onLoad(async (query) => {
  if (!guardCurrentPage()) return
  addressId.value = Number(query?.id) || 0
  if (!addressId.value) {
    loading.value = false
    return
  }
  try {
    Object.assign(form, (await getAddress(addressId.value)).data)
    defaultLocked.value = Boolean(form.is_default)
  } catch (reason) {
    uni.showToast({ title: getErrorMessage(reason, '地址加载失败'), icon: 'none' })
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;
.edit-address-page{background:$dz-surface-page}.page-hero{background:linear-gradient(150deg,#ecfcfc,#fff)}.page-nav{display:flex;align-items:center;justify-content:space-between;height:94rpx;font-size:34rpx;font-weight:800}.back,.nav-spacer{width:64rpx}.back{font-size:58rpx;font-weight:300}.edit-content{padding-top:22rpx;padding-bottom:40rpx}.section-label{display:block;margin:0 8rpx 13rpx;color:$dz-text-secondary;font-size:21rpx}.contact-label{margin-top:25rpx}.form-panel,.default-panel{overflow:hidden;padding:0 26rpx;border-radius:25rpx;background:#fff;box-shadow:$dz-shadow-card}.form-row{display:flex;align-items:center;min-height:104rpx;border-bottom:1rpx solid $dz-border-subtle}.form-row:last-child{border-bottom:0}.form-row>text{width:126rpx;flex:none;font-size:26rpx;font-weight:650}.location-row>view{display:flex;min-width:0;flex:1;flex-direction:column;align-items:flex-end;gap:5rpx}.location-row strong{max-width:100%;overflow:hidden;font-size:25rpx;text-overflow:ellipsis;white-space:nowrap}.location-row small{color:$dz-text-tertiary;font-size:18rpx}.location-row .placeholder{color:$dz-text-tertiary}.location-row b{margin-left:12rpx;color:$dz-text-tertiary;font-size:36rpx;font-weight:300}.detail-row{align-items:flex-start;padding:28rpx 0}.detail-row textarea{width:auto;min-height:82rpx;flex:1;font-size:24rpx;line-height:1.55;text-align:right}.input-row input{height:76rpx;flex:1;font-size:24rpx;text-align:right}.contact-name-row input{min-width:0;height:76rpx;flex:1;font-size:24rpx;text-align:right}.gender-options{display:flex;flex:none;gap:8rpx;margin-left:14rpx}.gender-options button{width:90rpx;height:84rpx;margin:0;padding:0;border:1rpx solid $dz-border-subtle;border-radius:42rpx;color:$dz-text-secondary;background:#fff;font-size:21rpx;line-height:84rpx}.gender-options button::after,.save-button::after{display:none}.gender-options button.active{border-color:$dz-brand-primary;color:$dz-brand-deep;background:$dz-brand-soft;font-weight:700}.default-panel{display:flex;align-items:center;justify-content:space-between;min-height:116rpx;margin-top:24rpx}.default-panel>view{display:flex;flex-direction:column;gap:8rpx}.default-panel strong{font-size:26rpx}.default-panel text{color:$dz-text-tertiary;font-size:19rpx}.save-button{height:92rpx;margin-top:34rpx;border-radius:46rpx;color:#fff;background:$dz-gradient-brand;font-size:29rpx;font-weight:750;box-shadow:0 12rpx 28rpx rgba(8,181,194,.18)}.save-button[disabled]{opacity:.5}
.detail-row textarea,.input-row input,.contact-name-row input{padding:0;text-align:left}.gender-options button{position:relative;width:88rpx;height:88rpx;border:0;border-radius:0;background:transparent}.gender-options button>text{position:relative;z-index:1}.gender-options button::before{position:absolute;inset:21rpx 9rpx;border:1rpx solid $dz-border-subtle;border-radius:10rpx;background:#fff;content:''}.gender-options button.active{border:0;background:transparent}.gender-options button.active::before{border-color:$dz-brand-primary;background:$dz-brand-soft}.save-button{display:flex;align-items:center;justify-content:center;padding:0;line-height:1}
</style>
