<template>
  <view class="dz-page location-page">
    <view class="dz-safe-top" />
    <header class="nav dz-container">
      <button aria-label="返回达人工作台" @tap="goBack">‹</button>
      <strong>常驻服务地点</strong>
      <view aria-hidden="true" />
    </header>

    <main class="dz-container content">
      <NetworkState v-if="loading" message="正在加载服务地点…" />
      <NetworkState v-else-if="error" :message="error" action-text="重新加载" @action="load" />

      <template v-else>
        <section class="privacy-note">
          <view class="shield" aria-hidden="true"><i /></view>
          <view>
            <strong>你的详细地址不会公开</strong>
            <text>用户端仅展示服务城市、区域和距离，详细地点只用于距离计算与平台管理。</text>
          </view>
        </section>

        <section class="form-card">
          <view class="field city-field">
            <view><strong>服务城市</strong><text>请选择实际开展服务的城市</text></view>
            <picker :range="cities" range-key="name" :value="cityIndex" @change="chooseCity">
              <button>{{ form.service_city_name || '请选择' }} <b>›</b></button>
            </picker>
          </view>

          <view class="divider" />

          <view class="field location-field">
            <view class="field-heading">
              <view><strong>地图选点</strong><text>选择常驻区域附近的地标或公共场所</text></view>
              <small>必填</small>
            </view>

            <view v-if="hasSelection" class="selected-location">
              <view class="pin" aria-hidden="true"><i /></view>
              <view>
                <strong>{{ form.service_location_name }}</strong>
                <text>{{ form.service_address }}</text>
              </view>
            </view>
            <view v-else class="empty-location">
              <view class="pin muted" aria-hidden="true"><i /></view>
              <view><strong>尚未选择地点</strong><text>选择后将用于附近达人展示和距离计算</text></view>
            </view>

            <button class="choose-button" @tap="chooseMapLocation">
              {{ hasSelection ? '重新选择地点' : '打开地图选择地点' }}
            </button>
          </view>

          <view class="divider" />

          <view class="field radius-field">
            <view class="field-heading">
              <view><strong>最大服务半径</strong><text>用户可在该范围内向你发起预约</text></view>
              <b>{{ form.max_service_radius_km }}km</b>
            </view>
            <slider
              :value="form.max_service_radius_km"
              min="10"
              max="70"
              step="1"
              activeColor="#18c7c6"
              backgroundColor="#dfe9ea"
              block-size="22"
              @change="changeRadius"
            />
            <view class="radius-scale"><text>10km</text><text>70km</text></view>
          </view>
        </section>

        <section class="usage-note">
          <strong>地点建议</strong>
          <text>建议选择商圈、地铁站或常去的公共场所，无需选择家庭门牌地址。</text>
        </section>

        <button class="save-button" :disabled="!canSave || saving" @tap="save">
          {{ saving ? '保存中…' : '保存服务地点' }}
        </button>
      </template>
    </main>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, reactive, ref } from 'vue'

import NetworkState from '@/components/NetworkState.vue'
import { getProviderServiceLocation, updateProviderServiceLocation } from '@/services/providers'
import { guardCurrentPage } from '@/services/session'
import { getErrorMessage } from '@/utils/formatters'

const cities = [
  { code: '130400', name: '邯郸市' },
  { code: '110100', name: '北京市' },
  { code: '310100', name: '上海市' },
]

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const form = reactive({
  service_city_code: '130400',
  service_city_name: '邯郸市',
  service_location_name: '',
  service_address: '',
  longitude: null as number | null,
  latitude: null as number | null,
  max_service_radius_km: 10,
})

const cityIndex = computed(() => Math.max(
  0,
  cities.findIndex(city => city.code === form.service_city_code),
))
const hasSelection = computed(() =>
  form.longitude !== null
  && form.latitude !== null
  && Boolean(form.service_location_name)
  && Boolean(form.service_address),
)
const canSave = computed(() => Boolean(form.service_city_code) && hasSelection.value)

function goBack() {
  uni.navigateBack({ fail: () => uni.redirectTo({ url: '/pages/providers/workbench' }) })
}
function chooseCity(event: { detail: { value: string } }) {
  const city = cities[Number(event.detail.value)]
  if (city) {
    const cityChanged = city.code !== form.service_city_code
    form.service_city_code = city.code
    form.service_city_name = city.name
    if (cityChanged && hasSelection.value) {
      form.service_location_name = ''
      form.service_address = ''
      form.longitude = null
      form.latitude = null
      uni.showToast({ title: '服务城市已变更，请重新选择地点', icon: 'none' })
    }
  }
}
function changeRadius(event: { detail: { value: number } }) {
  form.max_service_radius_km = Number(event.detail.value)
}
function chooseMapLocation() {
  uni.chooseLocation({
    latitude: form.latitude || undefined,
    longitude: form.longitude || undefined,
    success: result => {
      const name = result.name?.trim() || `${form.service_city_name}服务点`
      const address = result.address?.trim() || name
      form.service_location_name = name
      form.service_address = address
      form.longitude = Number(result.longitude)
      form.latitude = Number(result.latitude)
    },
    fail: result => {
      if (!result.errMsg?.includes('cancel')) {
        uni.showToast({ title: '暂时无法打开地图，请检查定位权限', icon: 'none' })
      }
    },
  })
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = (await getProviderServiceLocation()).data
    Object.assign(form, {
      service_city_code: data.service_city_code || '130400',
      service_city_name: data.service_city_name || '邯郸市',
      service_location_name: data.service_location_name,
      service_address: data.service_address,
      longitude: data.longitude === null ? null : Number(data.longitude),
      latitude: data.latitude === null ? null : Number(data.latitude),
      max_service_radius_km: data.max_service_radius_km,
    })
  } catch (reason) {
    error.value = getErrorMessage(reason)
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!canSave.value || saving.value || form.longitude === null || form.latitude === null) return
  saving.value = true
  try {
    await updateProviderServiceLocation({
      ...form,
      longitude: form.longitude,
      latitude: form.latitude,
    })
    uni.showToast({ title: '服务地点已保存', icon: 'success' })
    setTimeout(goBack, 500)
  } catch (reason) {
    uni.showToast({ title: getErrorMessage(reason, '保存失败'), icon: 'none' })
  } finally {
    saving.value = false
  }
}

onLoad(() => { if (guardCurrentPage()) load() })
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;

.location-page{min-height:100vh;background:$dz-surface-page}.nav{display:flex;align-items:center;justify-content:space-between;height:92rpx;background:$dz-surface-page}.nav button,.nav>view{width:70rpx;margin:0;padding:0;border:0;background:transparent}.nav button{text-align:left;font-size:55rpx}.nav button::after,.city-field button::after,.choose-button::after,.save-button::after{display:none}.nav strong{font-size:31rpx}.content{padding-top:16rpx;padding-bottom:48rpx}.privacy-note{display:flex;gap:18rpx;padding:22rpx;border:1rpx solid #cce9e8;border-radius:22rpx;background:#f1fbfb}.privacy-note>view:last-child{display:flex;flex-direction:column;gap:8rpx}.privacy-note strong{font-size:24rpx}.privacy-note text{color:$dz-text-secondary;font-size:19rpx;line-height:1.6}.shield{position:relative;display:flex;align-items:center;justify-content:center;flex:0 0 50rpx;width:50rpx;height:50rpx;border-radius:15rpx;background:$dz-brand-soft}.shield::before{content:'';width:22rpx;height:26rpx;border:3rpx solid $dz-brand-deep;border-radius:13rpx 13rpx 16rpx 16rpx}.shield i{position:absolute;width:7rpx;height:7rpx;border-radius:50%;background:$dz-brand-deep}.form-card{margin-top:20rpx;padding:0 24rpx;border:1rpx solid $dz-border-subtle;border-radius:24rpx;background:#fff;box-shadow:$dz-shadow-card}.field{padding:26rpx 0}.field strong{font-size:25rpx}.field text{color:$dz-text-secondary;font-size:19rpx;line-height:1.5}.field-heading,.city-field{display:flex;align-items:center;justify-content:space-between;gap:20rpx}.field-heading>view,.city-field>view{display:flex;flex-direction:column;gap:7rpx}.field-heading>small{padding:4rpx 9rpx;border-radius:10rpx;color:#c96324;background:#fff0e3;font-size:16rpx}.city-field button{min-width:150rpx;min-height:88rpx;margin:0;padding:0 4rpx;border:0;color:$dz-text-primary;background:transparent;text-align:right;font-size:23rpx}.city-field b{margin-left:8rpx;color:$dz-text-tertiary}.divider{height:1rpx;background:$dz-border-subtle}.selected-location,.empty-location{display:flex;align-items:center;gap:17rpx;margin-top:22rpx;padding:20rpx;border-radius:18rpx;background:#f5fafb}.selected-location>view:last-child,.empty-location>view:last-child{display:flex;flex-direction:column;gap:7rpx;min-width:0}.selected-location strong,.empty-location strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.selected-location text,.empty-location text{display:-webkit-box;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:2}.pin{position:relative;display:flex;align-items:center;justify-content:center;flex:0 0 58rpx;width:58rpx;height:58rpx;border-radius:17rpx;background:$dz-brand-soft}.pin::before{content:'';width:21rpx;height:27rpx;border:4rpx solid $dz-brand-deep;border-radius:50% 50% 50% 0;transform:rotate(-45deg)}.pin i{position:absolute;top:20rpx;width:7rpx;height:7rpx;border-radius:50%;background:$dz-brand-deep}.pin.muted{background:#e9eef0}.pin.muted::before{border-color:#89959b}.pin.muted i{background:#89959b}.choose-button{width:100%;min-height:88rpx;margin:18rpx 0 0;border:1rpx solid $dz-brand-primary;border-radius:18rpx;color:$dz-brand-deep;background:#fff;font-size:23rpx;font-weight:700}.radius-field .field-heading b{color:$dz-brand-deep;font-size:27rpx}.radius-field slider{margin:20rpx -6rpx 0}.radius-scale{display:flex;justify-content:space-between}.radius-scale text{color:$dz-text-tertiary;font-size:17rpx}.usage-note{display:flex;flex-direction:column;gap:8rpx;margin-top:20rpx;padding:22rpx;border-radius:20rpx;background:#fff8f2}.usage-note strong{font-size:22rpx}.usage-note text{color:#7e5d48;font-size:19rpx;line-height:1.6}.save-button{width:100%;min-height:92rpx;margin:28rpx 0 0;border:0;border-radius:46rpx;color:#fff;background:$dz-gradient-brand;font-size:26rpx;font-weight:700;box-shadow:0 12rpx 28rpx rgba(18,190,195,.22)}.save-button[disabled]{color:#9ba6aa;background:#dfe5e7;box-shadow:none}
</style>
