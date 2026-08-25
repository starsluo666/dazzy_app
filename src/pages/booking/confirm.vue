<template>
  <view class="dz-page order-page">
    <header class="page-head">
      <button aria-label="返回" @tap="goBack">‹</button>
      <text>确认订单</text>
    </header>

    <view v-if="draft" class="order-content">
      <section class="provider-card panel">
        <view class="avatar">
          <image v-if="draft.providerAvatarUrl" :src="draft.providerAvatarUrl" mode="aspectFill" />
          <text v-else>{{ draft.providerName.slice(0, 1) }}</text>
        </view>
        <view class="provider-copy">
          <view>
            <strong>{{ draft.providerName }}</strong>
            <text v-if="draft.providerVerified">◆ 实名认证</text>
          </view>
          <text>{{ draft.serviceName }}</text>
          <strong class="unit-price">
            ¥{{ money(draft.unitPrice) }}
            <small>{{ draft.billingType === 'hourly' ? '/小时' : '/次' }}</small>
          </strong>
        </view>
        <view class="brand-card">DAZZY<br><b>搭子</b></view>
      </section>

      <view
        class="booking-address-card panel"
        :class="{ selected: selectedAddressComplete }"
        @tap="openAddressSheet"
      >
        <view class="address-pin"><i /></view>
        <view v-if="selectedAddressComplete" class="booking-address-copy">
          <view class="address-title">
            <strong>{{ draft.addressName }}</strong>
            <text v-if="selectedAddress?.is_default">默认</text>
          </view>
          <text class="address-detail">{{ draft.address }}</text>
          <small>{{ draft.contactName }}{{ contactGenderLabel(draft.contactGender) }} · {{ maskedPhone(draft.contactPhone) }}</small>
        </view>
        <view v-else class="booking-address-copy placeholder-copy">
          <strong>请选择您的地址</strong>
          <text>选择您的地址及姓名电话</text>
        </view>
        <b class="address-chevron">›</b>
      </view>

      <section class="form-card panel time-card">
        <button @tap="openTimeSheet">
          <i>◷</i>
          <strong>预约时间</strong>
          <text :class="{ placeholder: !draft.timeConfirmed }">
            {{ draft.timeConfirmed ? dateTimeLabel : '请选择' }}
          </text>
          <b>›</b>
        </button>
      </section>

      <section class="form-card panel option-card">
        <button @tap="showPending('优惠券')">
          <i class="orange">券</i>
          <strong>优惠券</strong>
          <text>暂无可用优惠券</text>
          <b>›</b>
        </button>
        <button @tap="editingNote = true">
          <i>✎</i>
          <strong>备注</strong>
          <text :class="{ placeholder: !draft.note }">{{ draft.note || '选填' }}</text>
          <b>›</b>
        </button>
        <textarea
          v-if="editingNote"
          v-model="note"
          maxlength="120"
          placeholder="请填写出行、沟通等特殊需求"
          @blur="saveNote"
        />
      </section>

      <section class="fee-card panel">
        <text class="fee-title">费用明细</text>
        <view><text>服务费</text><text>{{ quote ? `¥${money(quote.service_fee_amount)}` : '确认时间后计算' }}</text></view>
        <view><text>往返交通费</text><text>{{ quote ? `¥${money(quote.transport_fee_amount)}` : '确认地址后计算' }}</text></view>
        <text v-if="quote" class="route-tip">距达人约 {{ quote.route_distance_km }}km · 驾车约 {{ quote.route_duration_minutes }}分钟</text>
        <view><text>优惠券</text><text class="discount">−¥{{ money(quote?.discount_amount || 0) }}</text></view>
        <view class="total"><text>合计</text><strong>¥{{ money(quote?.payable_amount || estimatedServiceFee) }}</strong></view>
        <text v-if="previewError" class="quote-error">{{ previewError }}</text>
      </section>

      <label class="agreement" @tap="agreed = !agreed">
        <text :class="{ active: agreed }">{{ agreed ? '✓' : '' }}</text>
        我已阅读并同意<em>服务规则</em>
      </label>
    </view>
    <view v-else class="empty">预约信息已失效，请返回达人详情重新选择。</view>

    <footer v-if="draft" class="order-footer">
      <view>合计 <strong>¥{{ money(quote?.payable_amount || estimatedServiceFee) }}</strong></view>
      <button :disabled="!canSubmit || submitting" @tap="submit">
        {{ submitting ? '创建中…' : '确认支付' }}
      </button>
    </footer>

    <view v-if="activeSheet" class="sheet-mask" @tap="closeSheet">
      <section v-if="activeSheet === 'time'" class="bottom-sheet time-sheet" @tap.stop>
        <view class="handle" />
        <view class="sheet-head"><strong>选择预约时间</strong><button @tap="closeSheet">×</button></view>
        <scroll-view scroll-x class="date-scroll" :show-scrollbar="false">
          <view class="date-options">
            <button
              v-for="item in dates"
              :key="item.key"
              :class="{ active: tempDate === item.key }"
              @tap="chooseDate(item.key)"
            >
              <text>{{ item.label }}</text><strong>{{ item.display }}</strong>
            </button>
          </view>
        </scroll-view>
        <text class="field-title">选择开始时间</text>
        <view v-if="availabilityLoading" class="slot-state">正在查询真实档期…</view>
        <view v-else-if="!times.length" class="slot-state">当天暂无连续可预约时间</view>
        <view v-else class="time-options">
          <button v-for="time in times" :key="time" :class="{ active: tempTime === time }" @tap="tempTime = time">{{ time }}</button>
        </view>
        <text class="field-title">服务时长</text>
        <view class="duration">
          <button :disabled="tempDuration <= minimumDuration" @tap="changeDuration(-30)">−</button>
          <strong>{{ durationLabel }}</strong>
          <button @tap="changeDuration(30)">＋</button>
        </view>
        <text class="duration-tip">最低{{ minimumDuration / 60 }}小时 · 30分钟粒度</text>
        <view class="time-summary">
          <text>服务时间</text>
          <strong>{{ times.includes(tempTime) ? tempTimeLabel : '请先选择可预约时间' }}</strong>
        </view>
        <button class="sheet-confirm" :disabled="!times.includes(tempTime)" @tap="confirmTime">确认时间</button>
      </section>

      <section v-else class="bottom-sheet address-sheet" @tap.stop>
        <view class="handle" />
        <view class="sheet-head"><strong>选择地址</strong><button @tap="closeSheet">×</button></view>
        <view v-if="addressLoading" class="slot-state">正在加载常用地址…</view>
        <template v-else>
          <view v-if="!addressOptions.length" class="address-empty">
            <view class="empty-pin"><i /></view>
            <strong>还没有常用地址</strong>
            <text>添加后即可快速选择并带入联系人</text>
          </view>
          <scroll-view v-else scroll-y class="address-results">
            <view class="address-list">
              <button
                v-for="item in addressOptions"
                :key="item.id"
                :class="{ active: Number(item.id) === Number(tempLocation?.id) }"
                @tap="chooseAddress(item)"
              >
                <i>{{ Number(item.id) === Number(tempLocation?.id) ? '✓' : '' }}</i>
                <view>
                  <view class="address-option-title">
                    <strong>{{ item.name }}</strong>
                    <text v-if="item.is_default">默认</text>
                  </view>
                  <text>{{ item.city_name }} {{ item.address }}</text>
                  <small v-if="hasCompleteContact(item)">{{ item.contact_name }}{{ itemGenderLabel(item) }} · {{ maskedPhone(item.contact_phone || '') }}</small>
                  <small v-else class="incomplete">联系人信息未补全，点击编辑</small>
                </view>
                <b>›</b>
              </button>
            </view>
          </scroll-view>
        </template>
        <view class="address-sheet-actions">
          <button class="sheet-add" @tap="addAddress"><text>＋</text>添加地址</button>
          <button
            v-if="addressOptions.length"
            class="sheet-confirm"
            :disabled="!tempLocation || !hasCompleteContact(tempLocation)"
            @tap="confirmAddress"
          >
            使用该地址
          </button>
        </view>
      </section>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import {
  bookingEndTime,
  bookingServiceAmount,
  getBookingDraft,
  updateBookingDraft,
} from '@/services/bookingDraft'
import type { BookingDraft } from '@/services/bookingDraft'
import { getProviderAvailability } from '@/services/discovery'
import { getSavedAddresses } from '@/services/locations'
import { createProviderOrder, previewProviderOrder } from '@/services/orders'
import type { LocationItem, ProviderAvailability, ProviderOrderQuote } from '@/types/api'
import { formatAmount, getErrorMessage } from '@/utils/formatters'

type Sheet = 'time' | 'address' | null

const draft = ref<BookingDraft | null>(null)
const quote = ref<ProviderOrderQuote | null>(null)
const activeSheet = ref<Sheet>(null)
const agreed = ref(false)
const submitting = ref(false)
const editingNote = ref(false)
const note = ref('')
const previewError = ref('')
const tempDate = ref('')
const tempTime = ref('13:00')
const tempDuration = ref(120)
const tempLocation = ref<LocationItem | null>(null)
const availability = ref<ProviderAvailability | null>(null)
const availabilityLoading = ref(false)
const addressOptions = ref<LocationItem[]>([])
const addressLoading = ref(false)

const dates = computed(() => (availability.value?.dates || []).map((item, index) => {
  const date = new Date(`${item.date}T00:00:00`)
  return {
    key: item.date,
    label: ['今天', '明天', '后天'][index] || `周${'日一二三四五六'[date.getDay()]}`,
    display: `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`,
  }
}))
const times = computed(() => (
  availability.value?.dates.find(item => item.date === tempDate.value)?.slots || []
).map((item) => {
  const date = new Date(item.starts_at)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}))
const minimumDuration = computed(() => (
  draft.value?.billingType === 'hourly' ? 120 : (draft.value?.durationMinutes || 180)
))
const durationLabel = computed(() => (
  tempDuration.value % 60
    ? `${Math.floor(tempDuration.value / 60)}.5小时`
    : `${tempDuration.value / 60}小时`
))
const estimatedServiceFee = computed(() => draft.value ? bookingServiceAmount(draft.value) : 0)
const dateTimeLabel = computed(() => draft.value
  ? displayRange(draft.value.date, draft.value.startTime, draft.value.durationMinutes)
  : '')
const tempTimeLabel = computed(() => displayRange(tempDate.value, tempTime.value, tempDuration.value))
const selectedAddress = computed(() => addressOptions.value.find(
  item => Number(item.id) === Number(draft.value?.addressId),
) || null)
const selectedAddressComplete = computed(() => (
  Boolean(draft.value?.addressId)
  && Boolean(draft.value?.addressName)
  && Boolean(draft.value?.address)
  && Boolean(draft.value?.contactName)
  && (draft.value?.contactGender === 'mr' || draft.value?.contactGender === 'ms')
  && /^1\d{10}$/.test(draft.value?.contactPhone || '')
))
const canPreview = computed(() => Boolean(draft.value?.timeConfirmed) && selectedAddressComplete.value)
const canSubmit = computed(() => Boolean(quote.value) && agreed.value)
const money = formatAmount

function displayRange(date: string, time: string, duration: number) {
  if (!date) return ''
  const value = new Date(`${date}T00:00:00`)
  return `${String(value.getMonth() + 1).padStart(2, '0')}月${String(value.getDate()).padStart(2, '0')}日 ${time}—${bookingEndTime(time, duration)}`
}

function contactGenderLabel(gender: BookingDraft['contactGender']) {
  return gender === 'mr' ? '先生' : gender === 'ms' ? '女士' : ''
}

function itemGenderLabel(item: LocationItem) {
  return item.contact_gender_label || contactGenderLabel(item.contact_gender || '')
}

function maskedPhone(phone: string) {
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
}

function hasCompleteContact(item: LocationItem | null) {
  return Boolean(
    item?.id
    && item.contact_name?.trim()
    && (item.contact_gender === 'mr' || item.contact_gender === 'ms')
    && /^1\d{10}$/.test(item.contact_phone || ''),
  )
}

function goBack() {
  uni.navigateBack()
}

function closeSheet() {
  activeSheet.value = null
}

function showPending(name: string) {
  uni.showToast({ title: `${name}功能即将接入`, icon: 'none' })
}

async function loadSlots() {
  if (!draft.value) return
  availabilityLoading.value = true
  try {
    availability.value = (
      await getProviderAvailability(
        draft.value.providerPublicId,
        draft.value.serviceId,
        tempDuration.value,
      )
    ).data
    if (!availability.value.dates.some(item => item.date === tempDate.value)) {
      tempDate.value = availability.value.dates[0]?.date || ''
    }
    if (!times.value.includes(tempTime.value)) tempTime.value = times.value[0] || ''
  } catch (reason) {
    availability.value = null
    uni.showToast({ title: getErrorMessage(reason, '档期获取失败'), icon: 'none' })
  } finally {
    availabilityLoading.value = false
  }
}

function openTimeSheet() {
  if (!draft.value) return
  tempDate.value = draft.value.date
  tempTime.value = draft.value.startTime
  tempDuration.value = draft.value.durationMinutes
  activeSheet.value = 'time'
  loadSlots()
}

function chooseDate(value: string) {
  tempDate.value = value
  if (!times.value.includes(tempTime.value)) tempTime.value = times.value[0] || ''
}

function changeDuration(step: number) {
  tempDuration.value = Math.max(minimumDuration.value, Math.min(480, tempDuration.value + step))
  loadSlots()
}

function confirmTime() {
  if (!draft.value || !times.value.includes(tempTime.value)) return
  draft.value = {
    ...draft.value,
    date: tempDate.value,
    startTime: tempTime.value,
    durationMinutes: tempDuration.value,
    timeConfirmed: true,
  }
  updateBookingDraft(draft.value)
  closeSheet()
  refreshQuote()
}

async function loadAddressOptions(showError = true) {
  addressLoading.value = true
  try {
    addressOptions.value = (await getSavedAddresses()).data.items
  } catch (reason) {
    addressOptions.value = []
    if (showError) {
      uni.showToast({ title: getErrorMessage(reason, '常用地址获取失败'), icon: 'none' })
    }
  } finally {
    addressLoading.value = false
  }
}

function clearDraftAddress() {
  if (!draft.value) return
  draft.value = {
    ...draft.value,
    addressId: null,
    addressName: '',
    address: '',
    contactName: '',
    contactGender: '',
    contactPhone: '',
  }
  updateBookingDraft(draft.value)
}

function applyAddress(item: LocationItem, shouldRefresh = true) {
  if (!draft.value || !hasCompleteContact(item)) return
  draft.value = {
    ...draft.value,
    addressId: Number(item.id),
    addressName: item.name,
    address: item.address,
    contactName: item.contact_name || '',
    contactGender: item.contact_gender || '',
    contactPhone: item.contact_phone || '',
  }
  updateBookingDraft(draft.value)
  tempLocation.value = item
  if (shouldRefresh) refreshQuote()
}

async function syncDefaultAddress() {
  if (!draft.value) return
  await loadAddressOptions(false)
  const current = addressOptions.value.find(
    item => Number(item.id) === Number(draft.value?.addressId),
  )
  if (current && hasCompleteContact(current)) {
    applyAddress(current, false)
    return
  }
  const fallback = addressOptions.value.find(item => item.is_default && hasCompleteContact(item))
  if (fallback) {
    applyAddress(fallback, false)
    return
  }
  clearDraftAddress()
}

async function openAddressSheet() {
  if (!draft.value) return
  activeSheet.value = 'address'
  await loadAddressOptions()
  tempLocation.value = addressOptions.value.find(
    item => Number(item.id) === Number(draft.value?.addressId),
  ) || null
}

function navigateToAddressEdit(item?: LocationItem) {
  closeSheet()
  const query = item?.id ? `?id=${item.id}` : ''
  uni.navigateTo({
    url: `/pages/addresses/edit${query}`,
    events: {
      addressSaved: (saved: LocationItem) => {
        const existing = addressOptions.value.findIndex(
          address => Number(address.id) === Number(saved.id),
        )
        if (existing >= 0) addressOptions.value.splice(existing, 1, saved)
        else addressOptions.value.unshift(saved)
        applyAddress(saved)
      },
    },
  })
}

function addAddress() {
  navigateToAddressEdit()
}

function chooseAddress(item: LocationItem) {
  if (hasCompleteContact(item)) {
    tempLocation.value = item
    return
  }
  uni.showModal({
    title: '补全联系人信息',
    content: '该地址缺少联系人、称谓或手机号，补全后才能用于下单。',
    confirmText: '去编辑',
    success: ({ confirm }) => {
      if (confirm) navigateToAddressEdit(item)
    },
  })
}

function confirmAddress() {
  if (!tempLocation.value || !hasCompleteContact(tempLocation.value)) return
  applyAddress(tempLocation.value, false)
  closeSheet()
  refreshQuote()
}

function saveNote() {
  if (!draft.value) return
  draft.value = { ...draft.value, note: note.value.trim() }
  updateBookingDraft(draft.value)
  editingNote.value = false
  refreshQuote()
}

async function refreshQuote() {
  quote.value = null
  previewError.value = ''
  if (!draft.value || !canPreview.value) return
  try {
    quote.value = (await previewProviderOrder(draft.value)).data
  } catch (reason) {
    previewError.value = getErrorMessage(reason, '订单金额获取失败')
  }
}

async function submit() {
  if (!draft.value || !canSubmit.value || submitting.value) return
  submitting.value = true
  try {
    const order = (await createProviderOrder(draft.value)).data
    uni.navigateTo({ url: `/pages/booking/payment?orderNo=${order.order_no}` })
  } catch (reason) {
    uni.showToast({ title: getErrorMessage(reason, '订单创建失败'), icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onShow(async () => {
  draft.value = getBookingDraft()
  note.value = draft.value?.note || ''
  if (!draft.value) return
  await syncDefaultAddress()
  await refreshQuote()
})
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;
.order-page{min-height:100vh;padding-bottom:calc(124rpx + env(safe-area-inset-bottom));background:linear-gradient(180deg,#defbfc 0,#f5f7f8 390rpx)}.page-head{position:relative;display:flex;align-items:flex-end;justify-content:center;height:calc(100rpx + env(safe-area-inset-top));padding-bottom:17rpx;box-sizing:border-box}.page-head button{position:absolute;left:20rpx;bottom:6rpx;width:70rpx;height:70rpx;margin:0;padding:0;border:0;background:transparent;font-size:50rpx;line-height:70rpx}.page-head button::after,.form-card button::after,.sheet-head button::after,.bottom-sheet button::after,.order-footer button::after{display:none}.page-head text{font-size:31rpx;font-weight:700}.order-content{padding:18rpx 24rpx}.panel{border-radius:23rpx;background:#fff;box-shadow:$dz-shadow-card}.provider-card{position:relative;display:flex;align-items:center;min-height:174rpx;padding:22rpx;overflow:hidden;box-sizing:border-box}.avatar{display:flex;align-items:center;justify-content:center;overflow:hidden;width:112rpx;height:128rpx;border-radius:18rpx;color:$dz-brand-deep;background:$dz-brand-soft;font-size:38rpx}.avatar image{width:100%;height:100%}.provider-copy{display:flex;flex-direction:column;gap:10rpx;margin-left:20rpx}.provider-copy>view{display:flex;align-items:center;gap:10rpx}.provider-copy>view strong{font-size:30rpx}.provider-copy>view text{padding:4rpx 8rpx;border-radius:8rpx;color:$dz-brand-deep;background:$dz-brand-soft;font-size:16rpx}.provider-copy>text{color:$dz-text-secondary;font-size:20rpx}.unit-price{color:$dz-price-primary;font-size:33rpx}.unit-price small{color:$dz-text-primary;font-size:18rpx;font-weight:500}.brand-card{position:absolute;right:24rpx;top:25rpx;padding:12rpx 16rpx;border-radius:13rpx;color:#fff;background:$dz-gradient-brand;text-align:center;font-size:16rpx;transform:rotate(5deg)}.brand-card b{font-size:25rpx}.form-card{margin-top:18rpx;padding:0 20rpx}.form-card button{display:flex;align-items:center;width:100%;min-height:88rpx;margin:0;padding:12rpx 0;border:0;border-bottom:1rpx solid $dz-border-subtle;background:#fff;text-align:left}.form-card button:last-of-type{border:0}.form-card i{display:flex;align-items:center;justify-content:center;width:48rpx;height:48rpx;border-radius:50%;color:$dz-brand-deep;background:$dz-brand-soft;font-size:21rpx;font-style:normal}.form-card i.orange{color:$dz-price-primary;background:$dz-price-soft}.form-card strong{margin-left:15rpx;font-size:22rpx}.form-card button>text{flex:1;overflow:hidden;margin-left:15rpx;color:$dz-text-secondary;text-align:right;font-size:19rpx;text-overflow:ellipsis;white-space:nowrap}.form-card button>text.placeholder{color:$dz-text-tertiary}.form-card button>b{margin-left:9rpx;color:$dz-text-tertiary;font-size:30rpx}.form-card textarea{width:100%;height:110rpx;padding:14rpx;border:1rpx solid $dz-border-subtle;border-radius:14rpx;box-sizing:border-box;font-size:20rpx}.booking-address-card{display:flex;align-items:center;min-height:142rpx;margin-top:18rpx;padding:22rpx 24rpx;box-sizing:border-box}.address-pin{display:flex;flex:0 0 66rpx;width:66rpx;height:66rpx;align-items:center;justify-content:center;border-radius:50%;background:linear-gradient(145deg,#62d5ef,#42b8e8);box-shadow:0 8rpx 18rpx rgba(58,173,221,.24)}.address-pin i,.empty-pin i{position:relative;width:23rpx;height:30rpx;border:5rpx solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-sizing:border-box}.address-pin i::after,.empty-pin i::after{position:absolute;top:6rpx;left:6rpx;width:4rpx;height:4rpx;border-radius:50%;background:#fff;content:''}.booking-address-copy{display:flex;min-width:0;flex:1;flex-direction:column;gap:7rpx;margin-left:20rpx}.booking-address-copy strong{overflow:hidden;font-size:27rpx;text-overflow:ellipsis;white-space:nowrap}.booking-address-copy>text{overflow:hidden;color:$dz-text-secondary;font-size:20rpx;text-overflow:ellipsis;white-space:nowrap}.booking-address-copy small{color:$dz-text-tertiary;font-size:18rpx}.placeholder-copy{gap:12rpx}.placeholder-copy strong{font-size:29rpx}.placeholder-copy>text{color:#aeb5ba;font-size:21rpx}.address-title{display:flex;align-items:center;gap:10rpx}.address-title text{padding:3rpx 9rpx;border-radius:8rpx;color:$dz-brand-deep;background:$dz-brand-soft;font-size:17rpx}.address-chevron{margin-left:12rpx;color:#596369;font-size:42rpx;font-weight:300}.fee-card{margin-top:18rpx;padding:22rpx 24rpx}.fee-title{display:block;margin-bottom:14rpx;font-size:26rpx;font-weight:700}.fee-card>view{display:flex;justify-content:space-between;padding:9rpx 0;font-size:21rpx}.fee-card .discount{color:$dz-price-primary}.fee-card .total{margin-top:8rpx;padding-top:17rpx;border-top:1rpx dashed $dz-border-subtle;font-size:24rpx}.total strong{color:$dz-price-primary;font-size:34rpx}.quote-error{display:block;margin-top:12rpx;color:$dz-price-primary;font-size:18rpx}.route-tip{display:block;margin:-2rpx 0 8rpx;color:$dz-text-tertiary;font-size:17rpx}.agreement{display:flex;align-items:center;margin:24rpx 6rpx;color:$dz-text-secondary;font-size:18rpx}.agreement>text{display:flex;align-items:center;justify-content:center;width:30rpx;height:30rpx;margin-right:9rpx;border:2rpx solid #bbc4c7;border-radius:50%;color:#fff}.agreement>text.active{border-color:$dz-brand-primary;background:$dz-brand-primary}.agreement em{color:$dz-brand-deep;font-style:normal}.order-footer{position:fixed;z-index:30;right:0;bottom:0;left:0;display:flex;align-items:center;gap:20rpx;max-width:750px;height:calc(112rpx + env(safe-area-inset-bottom));margin:auto;padding:12rpx 24rpx env(safe-area-inset-bottom);background:#fff;box-shadow:0 -6rpx 24rpx rgba(31,65,72,.08);box-sizing:border-box}.order-footer>view{min-width:220rpx;font-size:23rpx}.order-footer strong{color:$dz-price-primary;font-size:35rpx}.order-footer button{flex:1;height:76rpx;margin:0;border:0;border-radius:38rpx;color:#fff;background:$dz-gradient-brand;font-size:27rpx;font-weight:700;line-height:76rpx}.order-footer button[disabled]{opacity:.45}.empty{padding:170rpx 30rpx;color:$dz-text-secondary;text-align:center}.sheet-mask{position:fixed;z-index:70;inset:0;background:rgba(18,31,35,.56)}.bottom-sheet{position:absolute;right:0;bottom:0;left:0;max-width:750px;margin:auto;padding:16rpx 26rpx calc(24rpx + env(safe-area-inset-bottom));border-radius:32rpx 32rpx 0 0;background:#fff;box-sizing:border-box}.handle{width:72rpx;height:7rpx;margin:0 auto 17rpx;border-radius:4rpx;background:#cbd1d3}.sheet-head{display:flex;align-items:center;justify-content:space-between}.sheet-head strong{font-size:29rpx}.sheet-head button{width:54rpx;height:54rpx;margin:0;padding:0;border:0;background:transparent;color:$dz-text-secondary;font-size:36rpx;line-height:54rpx}.date-scroll{margin-top:18rpx;white-space:nowrap}.date-options{display:flex;gap:12rpx}.date-options button{display:flex;flex:0 0 112rpx;flex-direction:column;align-items:center;justify-content:center;height:92rpx;margin:0;padding:0;border:1rpx solid $dz-border-subtle;border-radius:14rpx;background:#fff;font-size:19rpx}.date-options button strong{margin-top:5rpx;font-size:22rpx}.date-options button.active,.time-options button.active{border-color:$dz-brand-primary;color:#fff;background:$dz-gradient-brand}.field-title{display:block;margin-top:23rpx;font-size:22rpx;font-weight:700}.time-options{display:grid;grid-template-columns:repeat(6,1fr);gap:9rpx;margin-top:14rpx}.time-options button{height:58rpx;margin:0;padding:0;border:1rpx solid $dz-border-subtle;border-radius:12rpx;background:#fff;font-size:18rpx;line-height:58rpx}.duration{display:grid;grid-template-columns:80rpx 1fr 80rpx;align-items:center;width:380rpx;height:70rpx;margin:14rpx auto 0;border:1rpx solid $dz-border-subtle;border-radius:14rpx}.duration button{height:50rpx;margin:0 10rpx;padding:0;border:0;border-radius:12rpx;color:$dz-brand-deep;background:$dz-brand-soft;font-size:31rpx;line-height:50rpx}.duration strong{text-align:center;font-size:24rpx}.duration-tip{display:block;margin-top:8rpx;color:$dz-text-secondary;text-align:center;font-size:17rpx}.time-summary{display:flex;flex-direction:column;gap:8rpx;margin-top:18rpx;padding:15rpx;border:1rpx solid $dz-border-subtle;border-radius:14rpx;font-size:19rpx}.time-summary strong{font-size:23rpx}.sheet-confirm{height:76rpx;margin:20rpx 0 0;border:0;border-radius:38rpx;color:#fff;background:$dz-gradient-brand;font-size:27rpx;font-weight:700;line-height:76rpx}.sheet-confirm[disabled]{opacity:.45}.slot-state{margin-top:14rpx;padding:20rpx;border-radius:12rpx;color:$dz-text-secondary;background:$dz-surface-page;text-align:center;font-size:19rpx}.address-sheet{max-height:82vh}.address-results{max-height:480rpx}.address-list{margin-top:12rpx}.address-list>button{display:flex;align-items:center;width:100%;min-height:122rpx;margin:0;padding:16rpx 0;border:0;border-bottom:1rpx solid $dz-border-subtle;background:#fff;text-align:left}.address-list>button>i{display:flex;flex:0 0 30rpx;width:30rpx;height:30rpx;align-items:center;justify-content:center;border:2rpx solid #cbd3d6;border-radius:50%;color:#fff;font-size:16rpx;font-style:normal}.address-list>button.active>i{border-color:$dz-brand-primary;background:$dz-brand-primary}.address-list>button>view{display:flex;min-width:0;flex:1;flex-direction:column;gap:7rpx;margin-left:15rpx}.address-list>button>view>text,.address-list small{overflow:hidden;color:$dz-text-tertiary;font-size:17rpx;text-overflow:ellipsis;white-space:nowrap}.address-list small.incomplete{color:#dc7b42}.address-list>button>b{color:$dz-text-tertiary;font-size:30rpx;font-weight:300}.address-option-title{display:flex;align-items:center;gap:9rpx}.address-option-title strong{overflow:hidden;font-size:22rpx;text-overflow:ellipsis;white-space:nowrap}.address-option-title text{padding:3rpx 8rpx;border-radius:8rpx;color:$dz-brand-deep;background:$dz-brand-soft;font-size:16rpx}.address-empty{display:flex;min-height:340rpx;flex-direction:column;align-items:center;justify-content:center}.empty-pin{display:flex;width:96rpx;height:96rpx;align-items:center;justify-content:center;border-radius:50%;background:linear-gradient(145deg,#62d5ef,#42b8e8)}.empty-pin i{width:28rpx;height:36rpx}.address-empty strong{margin-top:22rpx;font-size:27rpx}.address-empty>text{margin-top:9rpx;color:$dz-text-tertiary;font-size:19rpx}.address-sheet-actions{display:flex;gap:14rpx}.address-sheet-actions button{flex:1}.sheet-add{height:76rpx;margin:20rpx 0 0;border:1rpx solid $dz-brand-primary;border-radius:38rpx;color:$dz-brand-deep;background:#fff;font-size:25rpx;font-weight:700;line-height:76rpx}.sheet-add text{margin-right:7rpx;font-size:30rpx}
</style>
