<template>
  <view class="dz-page order-page">
    <DzNavBar title="确认订单" :back-action="goBack" />

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
        <button @tap="openCouponSheet">
          <i class="orange">券</i>
          <strong>优惠券</strong>
          <text>{{ selectedCoupon ? (quote ? `已减 ¥${money(quote.discount_amount)}` : '已选择，待计价') : availableCouponCount ? `${availableCouponCount}张可用` : '暂无可用优惠券' }}</text>
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

      <view v-if="quote?.cancellation_policy?.version" class="cancel-transport panel">
        <text class="cancel-transport__title">达人出行方式</text>
        <text class="cancel-transport__tip">用于确定取消规则；往返交通费以本单费用明细为准</text>
        <view class="cancel-transport__options">
          <button v-for="mode in transportModes" :key="mode.value" class="cancel-transport__option" :class="{ 'cancel-transport__option--active': transportMode === mode.value }" @tap="transportMode = mode.value; agreed = false">{{ mode.label }}</button>
        </view>
      </view>
      <label class="agreement" @tap="toggleAgreement">
        <text :class="{ active: agreed }">{{ agreed ? '✓' : '' }}</text>
        我已阅读并同意<text class="cancel-rule-link" @tap.stop="rulesVisible = true">服务与取消规则 ›</text>
      </label>
    </view>
    <view v-else class="empty">预约信息已失效，请返回达人详情重新选择。</view>

    <footer v-if="draft" class="order-footer">
      <view>合计 <strong>¥{{ money(quote?.payable_amount || estimatedServiceFee) }}</strong></view>
      <button :disabled="!canSubmit || submitting" @tap="submit">
        {{ submitting ? '创建中…' : '确认支付' }}
      </button>
    </footer>

    <DzBottomSheet :visible="rulesVisible" title="服务与取消规则" @close="rulesVisible = false">
      <OrderCancellationRules :policy="quote?.cancellation_policy || {}" />
      <button class="sheet-confirm" :disabled="!quote" @tap="acceptRules">我已阅读并同意</button>
    </DzBottomSheet>
    <DzBottomSheet :visible="activeSheet === 'time'" title="选择预约时间" @close="closeSheet">
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
    </DzBottomSheet>

    <DzBottomSheet :visible="activeSheet === 'address'" title="选择地址" @close="closeSheet">
      <view v-if="addressLoading" class="slot-state">正在加载常用地址…</view>
      <template v-else>
        <view v-if="!addressOptions.length" class="address-empty">
          <view class="empty-pin"><i /></view>
          <strong>还没有常用地址</strong>
          <text>添加后即可快速选择并带入联系人</text>
        </view>
        <view v-else class="address-results">
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
        </view>
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
    </DzBottomSheet>
    <DzBottomSheet :visible="activeSheet === 'coupon'" title="选择优惠券" @close="closeSheet">
      <view class="coupon-options">
        <button class="coupon-option" :class="{ active: !selectedCouponId }" @tap="selectCoupon(null)">不使用优惠券</button>
        <button v-for="item in coupons" :key="item.public_id" class="coupon-option" :class="{ active: selectedCouponId === item.public_id, disabled: !couponCanUse(item) }" @tap="selectCoupon(item)">
          <strong>¥{{ money(item.face_amount) }}</strong>
          <text>订单原价需大于 ¥{{ money(item.min_order_amount) }} · {{ item.expires_at.slice(0, 10) }} 到期</text>
          <small v-if="!couponCanUse(item)">{{ item.status !== 'available' ? '已使用或已过期' : '订单未达到门槛' }}</small>
        </button>
      </view>
    </DzBottomSheet>
  </view>
</template>

<script setup lang="ts">
import { navigateBackOr } from '@/utils/navigation'
import DzNavBar from '@/components/DzNavBar.vue'
import { onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import DzBottomSheet from '@/components/DzBottomSheet.vue'
import OrderCancellationRules from '@/components/OrderCancellationRules.vue'
import {
  bookingEndTime,
  bookingServiceAmount,
  getBookingDraft,
  updateBookingDraft,
} from '@/services/bookingDraft'
import type { BookingDraft } from '@/services/bookingDraft'
import { getProviderAvailability } from '@/services/discovery'
import { getSavedAddresses } from '@/services/locations'
import { createProviderOrder, previewProviderOrder, getMyCoupons } from '@/services/orders'
import { requireProviderOrderPaymentCapability } from '@/services/payments'
import type { LocationItem, ProviderAvailability, ProviderOrderQuote, UserCoupon } from '@/types/api'
import { formatAmount, getErrorMessage } from '@/utils/formatters'
import { businessClock, businessTimeParts, toBusinessDateTime } from '@/utils/businessTime'

type Sheet = 'time' | 'address' | 'coupon' | null

const draft = ref<BookingDraft | null>(null)
const quote = ref<ProviderOrderQuote | null>(null)
const coupons = ref<UserCoupon[]>([])
const selectedCouponId = ref<string | null>(null)
const selectedCoupon = computed(() => coupons.value.find((item) => item.public_id === selectedCouponId.value) || null)
const availableCouponCount = computed(() => coupons.value.filter(couponCanUse).length)
const activeSheet = ref<Sheet>(null)
const agreed = ref(false)
const rulesVisible = ref(false)
const agreedVersion = ref('')
const transportMode = ref<BookingDraft['transportMode']>()
const transportModes = [
  { value: 'taxi' as const, label: '出租车' }, { value: 'ride_hailing' as const, label: '网约车' },
  { value: 'bus' as const, label: '公交' }, { value: 'subway' as const, label: '地铁' },
]
function toggleAgreement() { if (agreed.value) agreed.value = false; else rulesVisible.value = true }
function acceptRules() {
  if (!quote.value) return
  agreedVersion.value = quote.value.cancellation_policy?.version || ''
  agreed.value = true
  rulesVisible.value = false
}
const submitting = ref(false)
const editingNote = ref(false)
const note = ref('')
const previewError = ref('')
let quoteRequest = 0
const tempDate = ref('')
const tempTime = ref('13:00')
const tempDuration = ref(120)
const tempLocation = ref<LocationItem | null>(null)
const availability = ref<ProviderAvailability | null>(null)
const availabilityLoading = ref(false)
const addressOptions = ref<LocationItem[]>([])
const addressLoading = ref(false)

const dates = computed(() => (availability.value?.dates || []).map((item, index) => {
  const date = businessTimeParts(toBusinessDateTime(item.date, '00:00'))
  return {
    key: item.date,
    label: ['今天', '明天', '后天'][index] || `周${'日一二三四五六'[date.weekday]}`,
    display: `${String(date.month).padStart(2, '0')}/${String(date.day).padStart(2, '0')}`,
  }
}))
const times = computed(() => (
  availability.value?.dates.find(item => item.date === tempDate.value)?.slots || []
).map((item) => {
  return businessClock(item.starts_at)
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
const canSubmit = computed(() => Boolean(quote.value) && agreed.value && (!quote.value?.cancellation_policy?.version || Boolean(transportMode.value)) && agreedVersion.value === (quote.value?.cancellation_policy?.version || ''))
const money = formatAmount

function displayRange(date: string, time: string, duration: number) {
  if (!date) return ''
  const [, month, day] = date.split('-')
  return `${month}月${day}日 ${time}—${bookingEndTime(time, duration)}`
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
  navigateBackOr(() => uni.reLaunch({ url: '/pages/orders/list' }))
}

function closeSheet() {
  activeSheet.value = null
}

function couponCanUse(item: UserCoupon) {
  const total = (quote.value?.service_fee_amount || 0) + (quote.value?.transport_fee_amount || 0) + (quote.value?.other_fee_amount || 0)
  return item.status === 'available' && Date.parse(item.expires_at) > Date.now() && total > item.min_order_amount
}

async function openCouponSheet() {
  try { coupons.value = (await getMyCoupons()).data.items }
  catch (reason) { uni.showToast({ title: getErrorMessage(reason, '优惠券加载失败'), icon: 'none' }); return }
  activeSheet.value = 'coupon'
}

function selectCoupon(item: UserCoupon | null) {
  if (item && !couponCanUse(item)) { uni.showToast({ title: '该优惠券当前不可使用', icon: 'none' }); return }
  selectedCouponId.value = item?.public_id || null
  closeSheet()
  refreshQuote()
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
  const requestId = ++quoteRequest
  quote.value = null
  previewError.value = ''
  if (!draft.value || !canPreview.value) return
  try {
    const response = await previewProviderOrder({ ...draft.value }, selectedCouponId.value)
    if (requestId === quoteRequest) quote.value = response.data
  } catch (reason) {
    if (requestId === quoteRequest) previewError.value = getErrorMessage(reason, '订单金额获取失败')
  }
}

async function submit() {
  if (!draft.value || !canSubmit.value || submitting.value) return
  const submittedDraft = { ...draft.value, transportMode: transportMode.value, cancellationPolicyVersion: agreedVersion.value }
  const submittedCouponId = selectedCouponId.value
  submitting.value = true
  try {
    await requireProviderOrderPaymentCapability()
    const order = (await createProviderOrder(submittedDraft, submittedCouponId)).data
    uni.navigateTo({ url: `/pages/booking/payment?orderNo=${order.order_no}` })
  } catch (reason) {
    uni.showToast({ title: getErrorMessage(reason, '订单创建失败'), icon: 'none' })
    agreed.value = false
    await refreshQuote()
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
  try { coupons.value = (await getMyCoupons()).data.items }
  catch { coupons.value = [] }
})
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;
.cancel-transport { margin-top: 20rpx; padding: 28rpx; }
.cancel-transport__title { display: block; font-size: 30rpx; font-weight: 600; }
.cancel-transport__tip { display: block; color: #667085; font-size: 24rpx; line-height: 1.6; margin: 12rpx 0 20rpx; }
.cancel-transport__options { display: flex; flex-wrap: wrap; gap: 12rpx; }
.cancel-transport__option { flex: 1 0 40%; margin: 0; padding: 20rpx 8rpx; line-height: 1.4; font-size: 27rpx; color: #475467; background: #f4f7f8; border-radius: 18rpx; }
.cancel-transport__option--active { color: #007e86; background: #ddf7f7; }
.cancel-transport__option::after { border: none; }
.agreement .cancel-rule-link { width: auto; height: auto; border: 0; color: #007e86; margin: 0; font-size: 24rpx; }
.coupon-options { padding: 12rpx 20rpx 30rpx; }
.coupon-option { display: flex; align-items: center; gap: 12rpx; width: 100%; min-height: 90rpx; margin: 10rpx 0; padding: 14rpx; border: 1rpx solid #e0e5ea; border-radius: 12rpx; background: #fff; text-align: left; }
.coupon-option.active { border-color: #08b5ba; background: #f0fcfc; }
.coupon-option.disabled { opacity: .55; }
.coupon-option strong { color: #ee6c43; font-size: 32rpx; white-space: nowrap; }
.coupon-option text { flex: 1; color: #52606f; font-size: 22rpx; }
.coupon-option small { color: #a0a7b0; font-size: 20rpx; }
.order-page{min-height:100vh;padding-bottom:calc(124rpx + env(safe-area-inset-bottom));background:linear-gradient(180deg,#defbfc 0,$dz-surface-page 390rpx)}.page-head{position:relative;display:flex;align-items:flex-end;justify-content:center;height:calc(100rpx + env(safe-area-inset-top));padding-bottom:17rpx;box-sizing:border-box}.page-head button{position:absolute;left:20rpx;bottom:6rpx;width:70rpx;height:70rpx;margin:0;padding:0;border:0;background:transparent;font-size:$dz-fs-price-lg;line-height:70rpx}.page-head button::after,.form-card button::after,.date-options button::after,.time-options button::after,.duration button::after,.sheet-confirm::after,.sheet-add::after,.address-list>button::after,.order-footer button::after{display:none}.page-head text{font-size:$dz-fs-body-strong;font-weight:$dz-fw-bold}.order-content{padding:18rpx 24rpx}.panel{border-radius:$dz-radius-md;background:$dz-surface-card;box-shadow:$dz-shadow-card}.provider-card{position:relative;display:flex;align-items:center;min-height:174rpx;padding:22rpx;overflow:hidden;box-sizing:border-box}.avatar{display:flex;align-items:center;justify-content:center;overflow:hidden;width:112rpx;height:128rpx;border-radius:$dz-radius-sm;color:$dz-brand-deep;background:$dz-brand-soft;font-size:$dz-fs-title}.avatar image{width:100%;height:100%}.provider-copy{display:flex;flex-direction:column;gap:10rpx;margin-left:20rpx}.provider-copy>view{display:flex;align-items:center;gap:10rpx}.provider-copy>view strong{font-size:$dz-fs-body-strong}.provider-copy>view text{padding:4rpx 8rpx;border-radius:$dz-radius-sm;color:$dz-brand-deep;background:$dz-brand-soft;font-size:$dz-fs-micro}.provider-copy>text{color:$dz-text-secondary;font-size:$dz-fs-caption}.unit-price{color:$dz-price-primary;font-size:$dz-fs-heading}.unit-price small{color:$dz-text-primary;font-size:$dz-fs-micro;font-weight:$dz-fw-medium}.brand-card{position:absolute;right:24rpx;top:25rpx;padding:12rpx 16rpx;border-radius:$dz-radius-sm;color:$dz-text-inverse;background:$dz-gradient-brand;text-align:center;font-size:$dz-fs-micro;transform:rotate(5deg)}.brand-card b{font-size:$dz-fs-caption}.form-card{margin-top:18rpx;padding:0 20rpx}.form-card button{display:flex;align-items:center;width:100%;min-height:88rpx;margin:0;padding:12rpx 0;border:0;border-bottom:1rpx solid $dz-border-subtle;background:$dz-surface-card;text-align:left}.form-card button:last-of-type{border:0}.form-card i{display:flex;align-items:center;justify-content:center;width:48rpx;height:48rpx;border-radius:50%;color:$dz-brand-deep;background:$dz-brand-soft;font-size:$dz-fs-caption;font-style:normal}.form-card i.orange{color:$dz-price-primary;background:$dz-price-soft}.form-card strong{margin-left:15rpx;font-size:$dz-fs-caption}.form-card button>text{flex:1;overflow:hidden;margin-left:15rpx;color:$dz-text-secondary;text-align:right;font-size:$dz-fs-caption;text-overflow:ellipsis;white-space:nowrap}.form-card button>text.placeholder{color:$dz-text-tertiary}.form-card button>b{margin-left:9rpx;color:$dz-text-tertiary;font-size:$dz-fs-body-strong}.form-card textarea{width:100%;height:110rpx;padding:14rpx;border:1rpx solid $dz-border-subtle;border-radius:$dz-radius-sm;box-sizing:border-box;font-size:$dz-fs-caption}.booking-address-card{display:flex;align-items:center;min-height:142rpx;margin-top:18rpx;padding:22rpx 24rpx;box-sizing:border-box}.address-pin{display:flex;flex:0 0 66rpx;width:66rpx;height:66rpx;align-items:center;justify-content:center;border-radius:50%;background:linear-gradient(145deg,$dz-brand-primary,$dz-brand-primary);box-shadow:0 8rpx 18rpx rgba(58,173,221,.24)}.address-pin i,.empty-pin i{position:relative;width:23rpx;height:30rpx;border:5rpx solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-sizing:border-box}.address-pin i::after,.empty-pin i::after{position:absolute;top:6rpx;left:6rpx;width:4rpx;height:4rpx;border-radius:50%;background:$dz-surface-card;content:''}.booking-address-copy{display:flex;min-width:0;flex:1;flex-direction:column;gap:7rpx;margin-left:20rpx}.booking-address-copy strong{overflow:hidden;font-size:$dz-fs-body;text-overflow:ellipsis;white-space:nowrap}.booking-address-copy>text{overflow:hidden;color:$dz-text-secondary;font-size:$dz-fs-caption;text-overflow:ellipsis;white-space:nowrap}.booking-address-copy small{color:$dz-text-tertiary;font-size:$dz-fs-micro}.placeholder-copy{gap:12rpx}.placeholder-copy strong{font-size:$dz-fs-body-strong}.placeholder-copy>text{color:$dz-text-tertiary;font-size:$dz-fs-caption}.address-title{display:flex;align-items:center;gap:10rpx}.address-title text{padding:3rpx 9rpx;border-radius:$dz-radius-sm;color:$dz-brand-deep;background:$dz-brand-soft;font-size:$dz-fs-micro}.address-chevron{margin-left:12rpx;color: $dz-text-secondary;font-size:$dz-fs-title;font-weight:300}.fee-card{margin-top:18rpx;padding:22rpx 24rpx}.fee-title{display:block;margin-bottom:14rpx;font-size:$dz-fs-body;font-weight:$dz-fw-bold}.fee-card>view{display:flex;justify-content:space-between;padding:9rpx 0;font-size:$dz-fs-caption}.fee-card .discount{color:$dz-price-primary}.fee-card .total{margin-top:8rpx;padding-top:17rpx;border-top:1rpx dashed $dz-border-subtle;font-size:$dz-fs-caption}.total strong{color:$dz-price-primary;font-size:$dz-fs-heading;letter-spacing:-1rpx}.quote-error{display:block;margin-top:12rpx;color:$dz-price-primary;font-size:$dz-fs-micro}.route-tip{display:block;margin:-2rpx 0 8rpx;color:$dz-text-tertiary;font-size:$dz-fs-micro}.agreement{display:flex;align-items:center;margin:24rpx 6rpx;color:$dz-text-secondary;font-size:$dz-fs-micro}.agreement>text{display:flex;align-items:center;justify-content:center;width:30rpx;height:30rpx;margin-right:9rpx;border:2rpx solid #bbc4c7;border-radius:50%;color:$dz-text-inverse}.agreement>text.active{border-color:$dz-brand-primary;background:$dz-brand-primary}.agreement em{color:$dz-brand-deep;font-style:normal}.order-footer{position:fixed;z-index:30;right:0;bottom:0;left:0;display:flex;align-items:center;gap:20rpx;max-width:750px;height:calc(112rpx + env(safe-area-inset-bottom));margin:auto;padding:12rpx 24rpx env(safe-area-inset-bottom);background:$dz-surface-card;box-shadow:$dz-shadow-floating;box-sizing:border-box}.order-footer>view{min-width:220rpx;font-size:$dz-fs-caption}.order-footer strong{color:$dz-price-primary;font-size:$dz-fs-heading;letter-spacing:-1rpx}.order-footer button{flex:1;height:76rpx;margin:0;border:0;border-radius:$dz-radius-lg;color:$dz-text-inverse;background:$dz-gradient-brand;font-size:$dz-fs-body;font-weight:$dz-fw-bold;line-height:76rpx}.order-footer button[disabled]{opacity:.45}.empty{padding:170rpx 30rpx;color:$dz-text-secondary;text-align:center}.date-scroll{margin-top:18rpx;white-space:nowrap}.date-options{display:flex;gap:12rpx}.date-options button{display:flex;flex:0 0 112rpx;flex-direction:column;align-items:center;justify-content:center;height:92rpx;margin:0;padding:0;border:1rpx solid $dz-border-subtle;border-radius:$dz-radius-sm;background:$dz-surface-card;font-size:$dz-fs-caption}.date-options button strong{margin-top:5rpx;font-size:$dz-fs-caption}.date-options button.active,.time-options button.active{border-color:$dz-brand-primary;color:$dz-text-inverse;background:$dz-gradient-brand}.field-title{display:block;margin-top:23rpx;font-size:$dz-fs-caption;font-weight:$dz-fw-bold}.time-options{display:grid;grid-template-columns:repeat(6,1fr);gap:9rpx;margin-top:14rpx}.time-options button{height:58rpx;margin:0;padding:0;border:1rpx solid $dz-border-subtle;border-radius:$dz-radius-sm;background:$dz-surface-card;font-size:$dz-fs-micro;line-height:58rpx}.duration{display:grid;grid-template-columns:80rpx 1fr 80rpx;align-items:center;width:380rpx;height:70rpx;margin:14rpx auto 0;border:1rpx solid $dz-border-subtle;border-radius:$dz-radius-sm}.duration button{height:50rpx;margin:0 10rpx;padding:0;border:0;border-radius:$dz-radius-sm;color:$dz-brand-deep;background:$dz-brand-soft;font-size:$dz-fs-body-strong;line-height:50rpx}.duration strong{text-align:center;font-size:$dz-fs-caption}.duration-tip{display:block;margin-top:8rpx;color:$dz-text-secondary;text-align:center;font-size:$dz-fs-micro}.time-summary{display:flex;flex-direction:column;gap:8rpx;margin-top:18rpx;padding:15rpx;border:1rpx solid $dz-border-subtle;border-radius:$dz-radius-sm;font-size:$dz-fs-caption}.time-summary strong{font-size:$dz-fs-caption}.sheet-confirm{height:76rpx;margin:20rpx 0 0;border:0;border-radius:$dz-radius-lg;color:$dz-text-inverse;background:$dz-gradient-brand;font-size:$dz-fs-body;font-weight:$dz-fw-bold;line-height:76rpx}.sheet-confirm[disabled]{opacity:.45}.slot-state{margin-top:14rpx;padding:20rpx;border-radius:$dz-radius-sm;color:$dz-text-secondary;background:$dz-surface-page;text-align:center;font-size:$dz-fs-caption}.address-list{margin-top:12rpx}.address-list>button{display:flex;align-items:center;width:100%;min-height:122rpx;margin:0;padding:16rpx 0;border:0;border-bottom:1rpx solid $dz-border-subtle;background:$dz-surface-card;text-align:left}.address-list>button>i{display:flex;flex:0 0 30rpx;width:30rpx;height:30rpx;align-items:center;justify-content:center;border:2rpx solid $dz-border-subtle;border-radius:50%;color:$dz-text-inverse;font-size:$dz-fs-micro;font-style:normal}.address-list>button.active>i{border-color:$dz-brand-primary;background:$dz-brand-primary}.address-list>button>view{display:flex;min-width:0;flex:1;flex-direction:column;gap:7rpx;margin-left:15rpx}.address-list>button>view>text,.address-list small{overflow:hidden;color:$dz-text-tertiary;font-size:$dz-fs-micro;text-overflow:ellipsis;white-space:nowrap}.address-list small.incomplete{color:$dz-status-warning}.address-list>button>b{color:$dz-text-tertiary;font-size:$dz-fs-body-strong;font-weight:300}.address-option-title{display:flex;align-items:center;gap:9rpx}.address-option-title strong{overflow:hidden;font-size:$dz-fs-caption;text-overflow:ellipsis;white-space:nowrap}.address-option-title text{padding:3rpx 8rpx;border-radius:$dz-radius-sm;color:$dz-brand-deep;background:$dz-brand-soft;font-size:$dz-fs-micro}.address-empty{display:flex;min-height:340rpx;flex-direction:column;align-items:center;justify-content:center}.empty-pin{display:flex;width:96rpx;height:96rpx;align-items:center;justify-content:center;border-radius:50%;background:linear-gradient(145deg,$dz-brand-primary,$dz-brand-primary)}.empty-pin i{width:28rpx;height:36rpx}.address-empty strong{margin-top:22rpx;font-size:$dz-fs-body}.address-empty>text{margin-top:9rpx;color:$dz-text-tertiary;font-size:$dz-fs-caption}.address-sheet-actions{display:flex;gap:14rpx}.address-sheet-actions button{flex:1}.sheet-add{height:76rpx;margin:20rpx 0 0;border:0;border-radius:$dz-radius-lg;color:$dz-brand-deep;background:$dz-brand-soft;font-size:$dz-fs-caption;font-weight:$dz-fw-bold;line-height:76rpx}.sheet-add text{margin-right:7rpx;font-size:$dz-fs-body-strong}
</style>
