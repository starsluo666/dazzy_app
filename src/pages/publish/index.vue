<template>
  <view class="dz-page publish-page">
    <header class="page-head"><button aria-label="返回" @tap="goBack">‹</button><text>发布活动</text><text class="draft-mark">{{ copyFrom ? '修改副本' : '草稿' }}</text></header>
    <main class="form-content dz-container">
      <section class="cover-card" @tap="chooseCover">
        <image v-if="coverPath" :src="coverPath" mode="aspectFill" />
        <view v-else><text>＋</text><strong>添加活动封面</strong><small>建议上传 4:3 横图</small></view>
        <text v-if="coverPath" class="replace">更换封面</text>
      </section>
      <text class="cover-tip">{{ coverUploading ? '正在安全上传封面…' : coverAssetId ? '封面已上传至腾讯 COS' : '封面仅支持 JPG、PNG 或 WebP，最大10MB。' }}</text>

      <section class="panel">
        <text class="section-title">基本信息</text>
        <view class="categories">
          <button v-for="item in categories" :key="item.slug" :class="{ active: form.categorySlug === item.slug }" @tap="form.categorySlug = item.slug">{{ item.name }}</button>
        </view>
        <label class="field"><text>活动标题</text><input v-model="form.title" maxlength="80" placeholder="一句话介绍你的活动" /><small>{{ form.title.length }}/80</small></label>
        <label class="field textarea-field"><text>活动介绍</text><textarea v-model="form.description" maxlength="2000" placeholder="介绍活动内容、适合人群和流程" /></label>
        <label class="field textarea-field"><text>参与规则</text><textarea v-model="form.rules" maxlength="2000" placeholder="例如：准时到场、文明参与、费用范围" /></label>
      </section>

      <view class="activity-address-card panel" :class="{ selected: location }" role="button" tabindex="0" aria-label="选择集合地点" hover-class="activity-address-card--pressed" @tap="openAddressSheet" @keydown.enter="openAddressSheet">
        <view class="address-pin"><i /></view>
        <view v-if="location" class="activity-address-copy">
          <strong>{{ location.name }}</strong>
          <text>{{ location.address || location.name }}</text>
          <small>{{ location.city_name || '集合地点' }}</small>
        </view>
        <view v-else class="activity-address-copy placeholder-copy">
          <strong>请选择集合地点</strong>
          <text>选择场馆、商圈或其他公共地点</text>
        </view>
        <b class="address-chevron">›</b>
      </view>

      <section class="panel schedule-panel">
        <view class="schedule-heading">
          <view><text class="section-title">活动时间</text><small>请依次设置开始、结束和成局时间</small></view>
          <text class="rule-badge">至少提前{{ minimumAdvanceHours }}小时</text>
        </view>

        <view class="schedule-flow">
          <view class="schedule-step start-step">
            <view class="schedule-marker"><i /></view>
            <view class="schedule-step-content">
              <view class="schedule-step-title"><strong>活动开始</strong><text>{{ startRelativeLabel }}</text></view>
              <view class="schedule-pickers">
                <view class="schedule-picker date-picker" role="button" tabindex="0" hover-class="schedule-picker--pressed" aria-label="选择活动开始日期" @tap="openSchedulePicker('start-date')" @keydown.enter="openSchedulePicker('start-date')">
                  <text>日期</text><strong>{{ displayDate(form.date) }}</strong><b>⌄</b>
                </view>
                <view class="schedule-picker" role="button" tabindex="0" hover-class="schedule-picker--pressed" aria-label="选择活动开始时间" @tap="openSchedulePicker('start-time')" @keydown.enter="openSchedulePicker('start-time')">
                  <text>时间</text><strong>{{ form.startTime }}</strong><b>⌄</b>
                </view>
              </view>
            </view>
          </view>

          <view class="schedule-step end-step">
            <view class="schedule-marker"><i /></view>
            <view class="schedule-step-content">
              <view class="schedule-step-title"><strong>活动结束</strong><text>与开始日期同一天</text></view>
              <view class="schedule-picker wide-picker" role="button" tabindex="0" hover-class="schedule-picker--pressed" aria-label="选择活动结束时间" @tap="openSchedulePicker('end-time')" @keydown.enter="openSchedulePicker('end-time')">
                <text>结束时间</text><strong>{{ form.endTime }}</strong><b>⌄</b>
              </view>
            </view>
          </view>

          <view class="schedule-step deadline-step">
            <view class="schedule-marker"><i /></view>
            <view class="schedule-step-content">
              <view class="schedule-step-title"><strong>成局截止</strong><text>须晚于当前时间、早于活动开始</text></view>
              <view class="schedule-pickers">
                <view class="schedule-picker date-picker" role="button" tabindex="0" hover-class="schedule-picker--pressed" aria-label="选择成局截止日期" @tap="openSchedulePicker('deadline-date')" @keydown.enter="openSchedulePicker('deadline-date')">
                  <text>日期</text><strong>{{ displayDate(form.deadlineDate) }}</strong><b>⌄</b>
                </view>
                <view class="schedule-picker" role="button" tabindex="0" hover-class="schedule-picker--pressed" aria-label="选择成局截止时间" @tap="openSchedulePicker('deadline-time')" @keydown.enter="openSchedulePicker('deadline-time')">
                  <text>时间</text><strong>{{ form.deadlineTime }}</strong><b>⌄</b>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view class="schedule-rule"><i>i</i><text>可发布未来 {{ minimumAdvanceHours }} 小时至 {{ maximumAdvanceDays }} 天内的活动，成局截止后未达到最低人数将按规则处理。</text></view>
        <text v-if="scheduleError" class="schedule-error" role="alert">{{ scheduleError }}</text>
      </section>

      <section class="panel">
        <text class="section-title">人数与费用</text>
        <label class="number-row"><text>人数上限</text><view><button @tap.prevent="changeCapacity(-1)">−</button><strong>{{ form.capacity }}人</strong><button @tap.prevent="changeCapacity(1)">＋</button></view></label>
        <label class="number-row"><text>最少成局人数</text><view><button @tap.prevent="changeMinimum(-1)">−</button><strong>{{ form.minimum }}人</strong><button @tap.prevent="changeMinimum(1)">＋</button></view></label>
        <label class="field price-field"><text>单人AA本金</text><view><i>¥</i><input v-model="form.price" type="digit" placeholder="0.00" /></view></label>
        <view class="fee-preview"><text>平台组局服务费（10%）</text><strong>¥{{ serviceFee }}</strong></view>
        <view class="fee-preview total"><text>发起人预计支付</text><strong>¥{{ totalFee }}</strong></view>
      </section>

      <section class="panel refund"><view><text class="section-title">退款规则</text><text class="locked">发布后不可修改</text></view><strong>标准退款模板</strong><text>≥12小时全退；6–12小时退AA本金；2–6小时退70% AA本金；不足2小时不退款。</text></section>
      <label class="agreement" @tap="agreed = !agreed"><text :class="{ active: agreed }">{{ agreed ? '✓' : '' }}</text>我已阅读并同意<em>活动发布规则</em>和<em>退款规则</em></label>
    </main>
    <footer class="publish-footer"><view><text>预计支付</text><strong>¥{{ totalFee }}</strong></view><button :disabled="!canSubmit || submitting" @tap="submit">{{ submitting ? '保存中…' : '保存并进入支付' }}</button></footer>

    <view v-if="addressSheet" class="sheet-mask" @tap="closeAddressSheet">
      <section class="bottom-sheet address-sheet" role="dialog" aria-label="选择集合地点" @tap.stop>
        <view class="handle" />
        <view class="sheet-head"><strong>选择集合地点</strong><button aria-label="关闭地点选择" @tap="closeAddressSheet">×</button></view>
        <text class="sheet-guide">请选择适合参与者集合的场馆、商圈或公共地点</text>
        <label class="search"><text>⌕</text><input v-model="keyword" placeholder="搜索邯郸市场馆或地点" confirm-type="search" @confirm="searchAddress" /></label>
        <view v-if="searching" class="sheet-state">正在搜索地点…</view>
        <view v-else-if="!locations.length" class="location-empty">
          <view class="empty-pin"><i /></view><strong>搜索集合地点</strong><text>输入至少两个字，例如“美乐城”或“台球俱乐部”</text>
        </view>
        <scroll-view v-else scroll-y class="location-list">
          <button v-for="item in locations" :key="`${item.name}-${item.longitude}`" :class="{ active: sameLocation(item, pendingLocation) }" @tap="chooseLocation(item)">
            <i>{{ sameLocation(item, pendingLocation) ? '✓' : '' }}</i>
            <view><strong>{{ item.name }}</strong><text>{{ item.address || item.city_name }}</text></view>
            <b>›</b>
          </button>
        </scroll-view>
        <button class="location-confirm" :disabled="!pendingLocation" @tap="confirmLocation">使用该地点</button>
      </section>
    </view>

    <view v-if="schedulePickerTarget" class="sheet-mask" @tap="closeSchedulePicker">
      <section class="bottom-sheet schedule-selector-sheet" role="dialog" :aria-label="schedulePickerTitle" @tap.stop>
        <view class="handle" />
        <view class="sheet-head"><view><strong>{{ schedulePickerTitle }}</strong><text>{{ schedulePickerHelp }}</text></view><button aria-label="关闭时间选择" @tap="closeSchedulePicker">×</button></view>

        <view class="schedule-selection-preview">
          <text>当前选择</text>
          <strong>{{ schedulePickerPreview }}</strong>
        </view>

        <scroll-view v-if="schedulePickerIsDate" scroll-y scroll-with-animation class="date-option-list" :scroll-into-view="scheduleScrollTarget">
          <button
            v-for="option in scheduleDateOptions"
            :id="`schedule-option-${option.value}`"
            :key="option.value"
            :disabled="option.disabled"
            :class="{ active: option.value === scheduleDraftValue }"
            @tap="chooseScheduleOption(option)"
          >
            <view><strong>{{ option.label }}</strong><text>{{ option.meta }}</text></view>
            <small v-if="option.disabled">不可选</small><i v-else>{{ option.value === scheduleDraftValue ? '✓' : '' }}</i>
          </button>
        </scroll-view>

        <scroll-view v-else scroll-y scroll-with-animation class="time-option-list" :scroll-into-view="scheduleScrollTarget">
          <view class="time-option-grid">
            <button
              v-for="option in scheduleTimeOptions"
              :id="`schedule-option-${option.value.replace(':', '-')}`"
              :key="option.value"
              :disabled="option.disabled"
              :class="{ active: option.value === scheduleDraftValue }"
              @tap="chooseScheduleOption(option)"
            >{{ option.value }}</button>
          </view>
        </scroll-view>

        <view class="schedule-selector-legend"><i /><text>灰色选项不符合当前活动规则，无法选择</text></view>
        <button class="schedule-selector-confirm" :disabled="!scheduleSelectionCanConfirm" @tap="confirmSchedulePicker">确认选择</button>
      </section>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import {
  createActivityDraft,
  getActivityCategories,
  getActivityCopySource,
  getActivityPublishRules,
  uploadActivityCover,
} from '@/services/activities'
import { searchLocations } from '@/services/locations'
import type { ActivityCategoryItem, LocationItem } from '@/types/api'
import { getErrorMessage } from '@/utils/formatters'
import {
  businessDateKeyAfter,
  businessDateKeyParts,
  businessDayOffset,
  businessTimeParts,
  shiftBusinessDateKey,
  toBusinessDateTime,
} from '@/utils/businessTime'

type SchedulePickerTarget = 'start-date' | 'start-time' | 'end-time' | 'deadline-date' | 'deadline-time'
type ScheduleOption = { value: string; label: string; meta: string; disabled: boolean }

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const DEFAULT_MINIMUM_ADVANCE_HOURS = 48
const DEFAULT_MAXIMUM_ADVANCE_DAYS = 30

const pad = (value: number) => String(value).padStart(2, '0')
const initialDate = businessDateKeyAfter(3)
const form = reactive({
  categorySlug: '',
  title: '',
  description: '',
  rules: '',
  date: initialDate,
  startTime: '14:00',
  endTime: '17:00',
  deadlineDate: shiftBusinessDateKey(initialDate, -1),
  deadlineTime: '20:00',
  capacity: 8,
  minimum: 4,
  price: '68',
})
const categories = ref<ActivityCategoryItem[]>([])
const location = ref<LocationItem | null>(null)
const pendingLocation = ref<LocationItem | null>(null)
const coverPath = ref('')
const coverAssetId = ref('')
const coverUploading = ref(false)
const agreed = ref(false)
const submitting = ref(false)
const addressSheet = ref(false)
const keyword = ref('')
const locations = ref<LocationItem[]>([])
const searching = ref(false)
const copyFrom = ref(0)
const minimumAdvanceHours = ref(DEFAULT_MINIMUM_ADVANCE_HOURS)
const maximumAdvanceDays = ref(DEFAULT_MAXIMUM_ADVANCE_DAYS)
const nowReference = ref(Date.now())
const schedulePickerTarget = ref<SchedulePickerTarget | null>(null)
const scheduleDraftValue = ref('')
const scheduleScrollTarget = ref('')
let boundaryTimer: ReturnType<typeof setInterval> | undefined

function splitBusinessDateTime(value: string | number | Date) {
  const parts = businessTimeParts(value)
  return {
    date: `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`,
    time: `${pad(parts.hour)}:${pad(parts.minute)}`,
  }
}

function dateTimeMillis(date: string, time: string) {
  return new Date(toBusinessDateTime(date, time)).getTime()
}

function ceilToMinute(value: number) {
  return Math.ceil(value / 60000) * 60000
}

function clockToMinutes(value: string) {
  const [hour, minute] = value.split(':').map(Number)
  return hour * 60 + minute
}

function minutesToClock(value: number) {
  const minutes = Math.max(0, Math.min(1439, value))
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}

function shiftClock(value: string, minutes: number) {
  return minutesToClock(clockToMinutes(value) + minutes)
}

function clampClock(value: string, minimum: string, maximum: string) {
  if (value < minimum) return minimum
  if (value > maximum) return maximum
  return value
}

const earliestStart = computed(() => {
  const boundary = splitBusinessDateTime(ceilToMinute(nowReference.value + minimumAdvanceHours.value * HOUR_MS))
  if (boundary.time === '23:59') {
    return { date: shiftBusinessDateKey(boundary.date, 1), time: '00:00' }
  }
  return boundary
})
const latestStart = computed(() => splitBusinessDateTime(
  Math.floor((nowReference.value + maximumAdvanceDays.value * DAY_MS) / 60000) * 60000,
))
const earliestDeadline = computed(() => splitBusinessDateTime(ceilToMinute(nowReference.value + 60000)))
const minStartDate = computed(() => earliestStart.value.date)
const maxStartDate = computed(() => latestStart.value.date)
const minDeadlineDate = computed(() => earliestDeadline.value.date)
const startTimeMin = computed(() => form.date === minStartDate.value ? earliestStart.value.time : '00:00')
const startTimeMax = computed(() => {
  const latest = form.date === maxStartDate.value ? latestStart.value.time : '23:58'
  return latest < '23:58' ? latest : '23:58'
})
const endTimeMin = computed(() => shiftClock(form.startTime, 1))
const deadlineTimeMin = computed(() => form.deadlineDate === minDeadlineDate.value ? earliestDeadline.value.time : '00:00')
const deadlineTimeMax = computed(() => form.deadlineDate === form.date ? shiftClock(form.startTime, -1) : '23:59')
const schedulePickerIsDate = computed(() => schedulePickerTarget.value?.endsWith('-date') || false)
const schedulePickerTitle = computed(() => ({
  'start-date': '选择活动开始日期',
  'start-time': '选择活动开始时间',
  'end-time': '选择活动结束时间',
  'deadline-date': '选择成局截止日期',
  'deadline-time': '选择成局截止时间',
}[schedulePickerTarget.value || 'start-date']))
const schedulePickerHelp = computed(() => ({
  'start-date': `活动需至少提前${minimumAdvanceHours.value}小时，最远可选${maximumAdvanceDays.value}天`,
  'start-time': `${displayDate(form.date)}，灰色时段不可选择`,
  'end-time': `${displayDate(form.date)}，结束时间须晚于${form.startTime}`,
  'deadline-date': `截止时间须晚于当前时间、早于${displayDate(form.date)} ${form.startTime}`,
  'deadline-time': `${displayDate(form.deadlineDate)}，仅可选择有效时段`,
}[schedulePickerTarget.value || 'start-date']))
const schedulePickerPreview = computed(() => (
  schedulePickerIsDate.value ? displayDate(scheduleDraftValue.value) : scheduleDraftValue.value
))
const schedulePickerOptionId = computed(() => (
  scheduleDraftValue.value
    ? `schedule-option-${schedulePickerIsDate.value ? scheduleDraftValue.value : scheduleDraftValue.value.replace(':', '-')}`
    : ''
))
const scheduleDateOptions = computed<ScheduleOption[]>(() => {
  const target = schedulePickerTarget.value
  if (target !== 'start-date' && target !== 'deadline-date') return []
  const today = businessDateKeyAfter(0)
  const lastDate = target === 'start-date' ? maxStartDate.value : form.date
  const items: ScheduleOption[] = []
  for (let date = today; date <= lastDate; date = shiftBusinessDateKey(date, 1)) {
    const minimum = target === 'start-date'
      ? (date === minStartDate.value ? earliestStart.value.time : '00:00')
      : (date === minDeadlineDate.value ? earliestDeadline.value.time : '00:00')
    const maximum = target === 'start-date'
      ? (date === maxStartDate.value ? startTimeMax.value : '23:58')
      : (date === form.date ? shiftClock(form.startTime, -1) : '23:59')
    const disabled = (
      minimum > maximum
      || (target === 'start-date' && date < minStartDate.value)
      || (target === 'deadline-date' && date < minDeadlineDate.value)
    )
    let meta = '全天可选'
    if (disabled) meta = target === 'start-date' ? `不足提前${minimumAdvanceHours.value}小时` : '已过可选时间'
    else if (minimum !== '00:00' && maximum !== '23:59' && maximum !== '23:58') meta = `${minimum}－${maximum} 可选`
    else if (minimum !== '00:00') meta = `${minimum} 后可选`
    else if (maximum !== '23:59' && maximum !== '23:58') meta = `${maximum} 前可选`
    items.push({ value: date, label: displayDate(date), meta, disabled })
  }
  return items
})
const scheduleTimeOptions = computed<ScheduleOption[]>(() => {
  const target = schedulePickerTarget.value
  if (!target || target.endsWith('-date')) return []
  let minimum = '00:00'
  let maximum = '23:59'
  if (target === 'start-time') {
    minimum = startTimeMin.value
    maximum = startTimeMax.value
  } else if (target === 'end-time') {
    minimum = endTimeMin.value
  } else {
    minimum = deadlineTimeMin.value
    maximum = deadlineTimeMax.value
  }
  const visibleMinimum = Math.max(0, clockToMinutes(minimum) - 60)
  const visibleMaximum = Math.min(1439, clockToMinutes(maximum) + 60)
  const values = new Set<string>([minimum, maximum, scheduleDraftValue.value, '00:00', '23:59'])
  for (let minutes = 0; minutes < 24 * 60; minutes += 30) values.add(minutesToClock(minutes))
  return [...values]
    .filter(Boolean)
    .sort()
    .filter(value => {
      const minutes = clockToMinutes(value)
      return minutes >= visibleMinimum && minutes <= visibleMaximum
    })
    .map(value => ({ value, label: value, meta: '', disabled: value < minimum || value > maximum }))
})
const scheduleSelectionCanConfirm = computed(() => {
  const options = schedulePickerIsDate.value ? scheduleDateOptions.value : scheduleTimeOptions.value
  return options.some(option => option.value === scheduleDraftValue.value && !option.disabled)
})
const principalCents = computed(() => Math.round((Number(form.price) || 0) * 100))
const serviceFeeCents = computed(() => Math.floor((principalCents.value + 5) / 10))
const serviceFee = computed(() => (serviceFeeCents.value / 100).toFixed(2))
const totalFee = computed(() => ((principalCents.value + serviceFeeCents.value) / 100).toFixed(2))
const startRelativeLabel = computed(() => {
  const offset = businessDayOffset(form.date)
  if (offset === 0) return '今天'
  if (offset === 1) return '明天'
  if (offset === 2) return '后天'
  return `距今${offset}天`
})
const scheduleError = computed(() => currentScheduleError())
const canSubmit = computed(() => (
  Boolean(coverAssetId.value)
  && !coverUploading.value
  && Boolean(form.categorySlug)
  && form.title.trim().length >= 4
  && Boolean(form.description.trim())
  && Boolean(form.rules.trim())
  && Boolean(location.value?.city_code)
  && principalCents.value > 0
  && !scheduleError.value
  && agreed.value
))

function currentScheduleError() {
  const now = nowReference.value
  const startsAt = dateTimeMillis(form.date, form.startTime)
  const endsAt = dateTimeMillis(form.date, form.endTime)
  const deadline = dateTimeMillis(form.deadlineDate, form.deadlineTime)
  if (startsAt < now + minimumAdvanceHours.value * HOUR_MS) {
    return `活动开始时间至少为发布后${minimumAdvanceHours.value}小时`
  }
  if (startsAt > now + maximumAdvanceDays.value * DAY_MS) {
    return `活动开始时间不得晚于发布后${maximumAdvanceDays.value}天`
  }
  if (endsAt <= startsAt) return '活动结束时间必须晚于开始时间'
  if (deadline <= now) return '成局截止时间必须晚于当前时间'
  if (deadline >= startsAt) return '成局截止时间必须早于活动开始时间'
  return ''
}

function displayDate(value: string) {
  const parts = businessDateKeyParts(value)
  return `${parts.month}月${parts.day}日 周${'日一二三四五六'[parts.weekday]}`
}

function normalizeDeadline() {
  const startMillis = dateTimeMillis(form.date, form.startTime)
  const earliestMillis = dateTimeMillis(earliestDeadline.value.date, earliestDeadline.value.time)
  let deadlineMillis = dateTimeMillis(form.deadlineDate, form.deadlineTime)
  if (deadlineMillis < earliestMillis || deadlineMillis >= startMillis) {
    deadlineMillis = Math.max(earliestMillis, startMillis - 12 * HOUR_MS)
  }
  if (deadlineMillis >= startMillis) deadlineMillis = startMillis - 60000
  const normalized = splitBusinessDateTime(deadlineMillis)
  form.deadlineDate = normalized.date
  form.deadlineTime = normalized.time
}

function normalizeSchedule() {
  if (form.date < minStartDate.value) form.date = minStartDate.value
  if (form.date > maxStartDate.value) form.date = maxStartDate.value
  form.startTime = clampClock(form.startTime, startTimeMin.value, startTimeMax.value)
  if (form.endTime <= form.startTime) {
    form.endTime = shiftClock(form.startTime, Math.min(180, 1439 - clockToMinutes(form.startTime)))
  }
  normalizeDeadline()
}

function goBack() { uni.navigateBack() }

function refreshTimeBoundary() {
  nowReference.value = Date.now()
}

async function openSchedulePicker(target: SchedulePickerTarget) {
  refreshTimeBoundary()
  normalizeSchedule()
  scheduleScrollTarget.value = ''
  schedulePickerTarget.value = target
  scheduleDraftValue.value = ({
    'start-date': form.date,
    'start-time': form.startTime,
    'end-time': form.endTime,
    'deadline-date': form.deadlineDate,
    'deadline-time': form.deadlineTime,
  })[target]
  await nextTick()
  scheduleScrollTarget.value = schedulePickerOptionId.value
}

function closeSchedulePicker() {
  schedulePickerTarget.value = null
  scheduleDraftValue.value = ''
  scheduleScrollTarget.value = ''
}

function chooseScheduleOption(option: ScheduleOption) {
  if (option.disabled) return
  scheduleDraftValue.value = option.value
}

function confirmSchedulePicker() {
  if (!schedulePickerTarget.value || !scheduleSelectionCanConfirm.value) return
  const target = schedulePickerTarget.value
  if (target === 'start-date') form.date = scheduleDraftValue.value
  else if (target === 'start-time') form.startTime = scheduleDraftValue.value
  else if (target === 'end-time') form.endTime = scheduleDraftValue.value
  else if (target === 'deadline-date') form.deadlineDate = scheduleDraftValue.value
  else form.deadlineTime = scheduleDraftValue.value
  if (target === 'start-date' || target === 'start-time') normalizeSchedule()
  if (target === 'deadline-date' || target === 'deadline-time') normalizeDeadline()
  closeSchedulePicker()
}

function changeCapacity(step: number) {
  form.capacity = Math.max(2, Math.min(100, form.capacity + step))
  form.minimum = Math.min(form.minimum, form.capacity)
}

function changeMinimum(step: number) {
  form.minimum = Math.max(2, Math.min(form.capacity, form.minimum + step))
}

function chooseCover() {
  if (coverUploading.value) return
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: async (result) => {
      const path = result.tempFilePaths[0] || ''
      if (!path) return
      coverPath.value = path
      coverAssetId.value = ''
      coverUploading.value = true
      try {
        const uploaded = (await uploadActivityCover(path)).data
        coverAssetId.value = uploaded.id
        coverPath.value = uploaded.url || path
      } catch (reason) {
        coverPath.value = ''
        uni.showToast({ title: getErrorMessage(reason, '封面上传失败'), icon: 'none' })
      } finally {
        coverUploading.value = false
      }
    },
  })
}

function openAddressSheet() {
  pendingLocation.value = location.value
  addressSheet.value = true
}

function closeAddressSheet() {
  addressSheet.value = false
}

async function searchAddress() {
  if (keyword.value.trim().length < 2) {
    uni.showToast({ title: '请输入至少2个字的地点名称', icon: 'none' })
    return
  }
  searching.value = true
  try {
    locations.value = (await searchLocations(keyword.value.trim())).data.items
  } catch (reason) {
    uni.showToast({ title: getErrorMessage(reason, '地点搜索失败'), icon: 'none' })
  } finally {
    searching.value = false
  }
}

function chooseLocation(item: LocationItem) {
  if (!item.city_code) {
    uni.showToast({ title: '未识别到地点所属城市，请重新选择', icon: 'none' })
    return
  }
  pendingLocation.value = item
}

function sameLocation(left: LocationItem, right: LocationItem | null) {
  return Boolean(
    right
    && left.name === right.name
    && Number(left.longitude) === Number(right.longitude)
    && Number(left.latitude) === Number(right.latitude),
  )
}

async function confirmLocation() {
  if (!pendingLocation.value?.city_code) return
  try {
    await loadCategories(pendingLocation.value.city_code)
    location.value = pendingLocation.value
    closeAddressSheet()
  } catch (reason) {
    uni.showToast({ title: getErrorMessage(reason, '活动分类加载失败'), icon: 'none' })
  }
}

async function loadCategories(cityCode = '130400') {
  const items = (await getActivityCategories(cityCode)).data.items
  categories.value = items
  if (!items.some(item => item.slug === form.categorySlug)) form.categorySlug = items[0]?.slug || ''
}

async function loadPublishRules() {
  try {
    const rules = (await getActivityPublishRules()).data
    minimumAdvanceHours.value = rules.minimum_advance_hours
    maximumAdvanceDays.value = rules.maximum_advance_days
  } catch (reason) {
    uni.showToast({ title: getErrorMessage(reason, '时间规则加载失败，已使用默认规则'), icon: 'none' })
  }
  normalizeSchedule()
}

async function submit() {
  refreshTimeBoundary()
  const timeError = currentScheduleError()
  if (timeError) {
    uni.showToast({ title: timeError, icon: 'none' })
    return
  }
  if (!canSubmit.value || !location.value?.city_code || submitting.value) return
  submitting.value = true
  try {
    const draft = (await createActivityDraft({
      cover_id: coverAssetId.value,
      category_slug: form.categorySlug,
      title: form.title.trim(),
      starts_at: toBusinessDateTime(form.date, form.startTime),
      ends_at: toBusinessDateTime(form.date, form.endTime),
      formation_deadline: toBusinessDateTime(form.deadlineDate, form.deadlineTime),
      meeting_place_name: location.value.name,
      meeting_address: location.value.address || location.value.name,
      city_code: location.value.city_code,
      city_name: location.value.city_name || '',
      longitude: Number(location.value.longitude),
      latitude: Number(location.value.latitude),
      capacity: form.capacity,
      min_participants: form.minimum,
      description: form.description.trim(),
      participation_rules: form.rules.trim(),
      aa_principal_amount: principalCents.value,
      refund_template_version: 'standard-v1',
    })).data
    uni.navigateTo({ url: `/pages/activities/publish-payment?id=${draft.id}` })
  } catch (reason) {
    uni.showToast({ title: getErrorMessage(reason, '保存活动失败'), icon: 'none' })
  } finally {
    submitting.value = false
  }
}

async function applyCopySource(id: number) {
  const source = (await getActivityCopySource(id)).data
  form.categorySlug = source.category_slug
  form.title = source.title
  form.description = source.description
  form.rules = source.participation_rules
  form.capacity = source.capacity
  form.minimum = source.min_participants
  form.price = (source.aa_principal_amount / 100).toFixed(2)
  const starts = splitBusinessDateTime(source.starts_at)
  const ends = splitBusinessDateTime(source.ends_at)
  const deadlineValue = splitBusinessDateTime(source.formation_deadline)
  const sourceStart = new Date(source.starts_at).getTime()
  const sourceEnd = new Date(source.ends_at).getTime()
  const sourceDeadline = new Date(source.formation_deadline).getTime()
  const inPublishWindow = (
    sourceStart >= Date.now() + minimumAdvanceHours.value * HOUR_MS
    && sourceStart <= Date.now() + maximumAdvanceDays.value * DAY_MS
  )
  if (
    inPublishWindow
    && starts.date === ends.date
    && sourceEnd > sourceStart
    && sourceDeadline > Date.now()
    && sourceDeadline < sourceStart
  ) {
    form.date = starts.date
    form.startTime = starts.time
    form.endTime = ends.time
    form.deadlineDate = deadlineValue.date
    form.deadlineTime = deadlineValue.time
  }
  coverAssetId.value = source.cover_id
  coverPath.value = source.cover_url || ''
  await loadCategories(source.city_code)
  location.value = {
    name: source.meeting_place_name,
    address: source.meeting_address,
    city_code: source.city_code,
    city_name: source.city_name,
    longitude: source.longitude,
    latitude: source.latitude,
  }
  normalizeSchedule()
  uni.showToast({ title: '已复制活动资料', icon: 'success' })
}

onLoad(async (query) => {
  refreshTimeBoundary()
  boundaryTimer = setInterval(refreshTimeBoundary, 60000)
  copyFrom.value = Number(query?.copyFrom) || 0
  try {
    await loadPublishRules()
    await loadCategories()
    if (copyFrom.value) await applyCopySource(copyFrom.value)
  } catch (reason) {
    uni.showToast({ title: getErrorMessage(reason, copyFrom.value ? '复制活动失败' : '分类加载失败'), icon: 'none' })
  }
})

onUnload(() => {
  if (boundaryTimer) clearInterval(boundaryTimer)
})
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;
.publish-page{min-height:100vh;padding-bottom:calc(126rpx + env(safe-area-inset-bottom));background:$dz-surface-page}.page-head{display:flex;align-items:flex-end;justify-content:center;height:calc(98rpx + env(safe-area-inset-top));padding-bottom:18rpx;background:#fff;box-sizing:border-box;position:relative}.page-head>button{position:absolute;left:20rpx;bottom:7rpx;width:70rpx;height:70rpx;margin:0;padding:0;border:0;background:transparent;font-size:50rpx;line-height:70rpx}.page-head>text:not(.draft-mark){font-size:31rpx;font-weight:800}.draft-mark{position:absolute;right:25rpx;bottom:25rpx;color:$dz-text-tertiary;font-size:20rpx}.page-head button::after,.categories button::after,.number-row button::after,.publish-footer button::after,.sheet-head button::after,.location-list button::after,.location-confirm::after{display:none}.form-content{padding-top:20rpx;padding-bottom:30rpx}.cover-card{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;height:310rpx;border-radius:25rpx;color:#fff;background:linear-gradient(135deg,#69dfda,#0db4c1)}.cover-card image{width:100%;height:100%}.cover-card>view{display:flex;flex-direction:column;align-items:center}.cover-card>view>text{font-size:64rpx;font-weight:200}.cover-card strong{font-size:27rpx}.cover-card small{margin-top:10rpx;opacity:.78;font-size:19rpx}.replace{position:absolute;right:18rpx;bottom:18rpx;padding:8rpx 16rpx;border-radius:20rpx;background:rgba(20,30,34,.65);font-size:19rpx}.cover-tip{display:block;margin:10rpx 4rpx 0;color:$dz-text-tertiary;font-size:17rpx}.panel{margin-top:20rpx;padding:24rpx;border-radius:24rpx;background:#fff;box-shadow:$dz-shadow-card}.section-title{display:block;margin-bottom:20rpx;font-size:27rpx;font-weight:800}.categories{display:flex;flex-wrap:wrap;gap:12rpx;margin-bottom:8rpx}.categories button{height:54rpx;margin:0;padding:0 23rpx;border:0;border-radius:27rpx;color:$dz-text-secondary;background:#f0f3f4;font-size:20rpx;line-height:54rpx}.categories button.active{color:$dz-brand-deep;background:$dz-brand-soft;font-weight:700}.field,.field-row,.number-row{position:relative;display:flex;align-items:center;min-height:88rpx;border-bottom:1rpx solid $dz-border-subtle;font-size:22rpx}.field>text,.field-row>text:first-child,.number-row>text{flex:0 0 160rpx;font-weight:650}.field input{flex:1;font-size:22rpx}.field>small{color:$dz-text-tertiary;font-size:17rpx}.textarea-field{display:block;padding:20rpx 0}.textarea-field>text{display:block}.textarea-field textarea{width:100%;height:130rpx;margin-top:16rpx;padding:16rpx;border-radius:14rpx;background:$dz-surface-page;box-sizing:border-box;font-size:21rpx}.field-row>picker,.field-row>text:nth-child(2){flex:1;color:$dz-text-secondary;text-align:right}.field-row .placeholder{color:$dz-text-tertiary}.field-row>b{margin-left:12rpx;color:$dz-text-tertiary;font-size:30rpx}.rule-tip{display:block;margin-top:18rpx;color:$dz-brand-deep;font-size:18rpx}.number-row{justify-content:space-between}.number-row>view{display:flex;align-items:center;gap:20rpx}.number-row button{width:50rpx;height:50rpx;margin:0;padding:0;border:0;border-radius:50%;color:$dz-brand-deep;background:$dz-brand-soft;font-size:28rpx;line-height:50rpx}.number-row strong{min-width:70rpx;text-align:center}.price-field>view{display:flex;align-items:center;flex:1}.price-field i{color:$dz-price-primary;font-size:28rpx;font-style:normal}.price-field input{text-align:right;color:$dz-price-primary;font-size:30rpx}.fee-preview{display:flex;justify-content:space-between;padding-top:18rpx;color:$dz-text-secondary;font-size:20rpx}.fee-preview strong{color:$dz-text-primary}.fee-preview.total{margin-top:17rpx;border-top:1rpx dashed $dz-border-subtle;color:$dz-text-primary;font-size:23rpx}.fee-preview.total strong{color:$dz-price-primary;font-size:31rpx}.refund>view{display:flex;align-items:center;justify-content:space-between}.refund .section-title{margin:0}.locked{color:$dz-text-tertiary;font-size:18rpx}.refund>strong{display:block;margin-top:22rpx;color:$dz-brand-deep;font-size:23rpx}.refund>text{display:block;margin-top:12rpx;color:$dz-text-secondary;font-size:19rpx;line-height:1.65}.agreement{display:flex;align-items:center;margin:24rpx 4rpx;color:$dz-text-secondary;font-size:18rpx}.agreement>text{display:flex;align-items:center;justify-content:center;width:30rpx;height:30rpx;margin-right:10rpx;border:2rpx solid #bbc4c7;border-radius:50%;color:#fff}.agreement>text.active{border-color:$dz-brand-primary;background:$dz-brand-primary}.agreement em{color:$dz-brand-deep;font-style:normal}.publish-footer{position:fixed;z-index:30;right:0;bottom:0;left:0;display:flex;align-items:center;gap:20rpx;max-width:750px;height:calc(112rpx + env(safe-area-inset-bottom));margin:auto;padding:12rpx 24rpx env(safe-area-inset-bottom);background:#fff;box-shadow:0 -6rpx 24rpx rgba(31,65,72,.1);box-sizing:border-box}.publish-footer>view{display:flex;flex-direction:column;min-width:210rpx;color:$dz-text-secondary;font-size:18rpx}.publish-footer strong{color:$dz-price-primary;font-size:34rpx}.publish-footer button{flex:1;height:76rpx;margin:0;border:0;border-radius:38rpx;color:#fff;background:$dz-gradient-brand;font-size:24rpx;font-weight:700;line-height:76rpx}.publish-footer button[disabled]{opacity:.42}.sheet-mask{position:fixed;z-index:50;inset:0;background:rgba(16,28,32,.46)}.bottom-sheet{position:absolute;right:0;bottom:0;left:0;max-width:750px;min-height:620rpx;margin:auto;padding:14rpx 26rpx calc(28rpx + env(safe-area-inset-bottom));border-radius:32rpx 32rpx 0 0;background:#fff;box-sizing:border-box}.handle{width:70rpx;height:7rpx;margin:0 auto 12rpx;border-radius:4rpx;background:#dce2e4}.sheet-head{display:flex;align-items:center;justify-content:space-between;height:72rpx}.sheet-head strong{font-size:27rpx}.sheet-head button{width:58rpx;height:58rpx;margin:0;padding:0;border:0;background:transparent;font-size:36rpx;line-height:58rpx}.search{display:flex;align-items:center;gap:12rpx;height:66rpx;padding:0 20rpx;border-radius:33rpx;background:$dz-surface-page}.search input{flex:1;font-size:21rpx}.sheet-state{display:flex;align-items:center;justify-content:center;min-height:300rpx;color:$dz-text-tertiary;font-size:21rpx}.location-list{max-height:430rpx;margin-top:16rpx}.location-list button{display:flex;flex-direction:column;width:100%;min-height:94rpx;margin:0;padding:18rpx 6rpx;border:0;border-bottom:1rpx solid $dz-border-subtle;background:#fff;text-align:left}.location-list strong{font-size:22rpx}.location-list text{margin-top:8rpx;color:$dz-text-secondary;font-size:18rpx}

.activity-address-card{display:flex;align-items:center;min-height:142rpx;padding:22rpx 24rpx;box-sizing:border-box}.activity-address-card--pressed{background:#f7fbfb}.address-pin{display:flex;flex:0 0 66rpx;width:66rpx;height:66rpx;align-items:center;justify-content:center;border-radius:50%;background:linear-gradient(145deg,#62d5ef,#42b8e8);box-shadow:0 8rpx 18rpx rgba(58,173,221,.24)}.address-pin i{position:relative;width:23rpx;height:30rpx;border:5rpx solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-sizing:border-box}.address-pin i::after{position:absolute;top:6rpx;left:6rpx;width:4rpx;height:4rpx;border-radius:50%;background:#fff;content:''}.activity-address-copy{display:flex;min-width:0;flex:1;flex-direction:column;gap:7rpx;margin-left:20rpx}.activity-address-copy strong{overflow:hidden;font-size:27rpx;text-overflow:ellipsis;white-space:nowrap}.activity-address-copy>text{overflow:hidden;color:$dz-text-secondary;font-size:20rpx;text-overflow:ellipsis;white-space:nowrap}.activity-address-copy small{color:$dz-text-tertiary;font-size:18rpx}.placeholder-copy{gap:11rpx}.placeholder-copy strong{font-size:28rpx}.placeholder-copy>text{color:#aeb5ba}.address-chevron{margin-left:12rpx;color:#596369;font-size:42rpx;font-weight:300}

.schedule-panel{padding:25rpx 24rpx 23rpx}.schedule-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18rpx}.schedule-heading>view{display:flex;min-width:0;flex-direction:column;gap:7rpx}.schedule-heading .section-title{margin:0}.schedule-heading small{color:$dz-text-tertiary;font-size:17rpx}.rule-badge{flex:0 0 auto;padding:7rpx 12rpx;border-radius:10rpx;color:$dz-brand-deep;background:$dz-brand-soft;font-size:16rpx;font-weight:700}.schedule-flow{margin-top:23rpx}.schedule-step{position:relative;display:grid;grid-template-columns:36rpx 1fr;gap:15rpx;padding-bottom:25rpx}.schedule-step:not(:last-child)::before{position:absolute;left:17rpx;top:29rpx;bottom:-2rpx;width:2rpx;background:linear-gradient(#90dfdf,#e4eeee);content:''}.schedule-step:last-child{padding-bottom:0}.schedule-marker{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;width:36rpx;height:36rpx;border-radius:50%;background:#d9f7f6}.schedule-marker i{width:14rpx;height:14rpx;border:4rpx solid #fff;border-radius:50%;background:$dz-brand-primary;box-shadow:0 0 0 2rpx $dz-brand-primary;box-sizing:border-box}.deadline-step .schedule-marker{background:#fff0e4}.deadline-step .schedule-marker i{background:#ed8b4b;box-shadow:0 0 0 2rpx #ed8b4b}.schedule-step-content{min-width:0}.schedule-step-title{display:flex;align-items:center;justify-content:space-between;gap:12rpx;min-height:36rpx}.schedule-step-title strong{font-size:22rpx}.schedule-step-title text{color:$dz-text-tertiary;font-size:16rpx;text-align:right}.schedule-pickers{display:grid;grid-template-columns:1.35fr 1fr;gap:11rpx;margin-top:12rpx}.schedule-picker{display:grid;grid-template-columns:auto 1fr auto;align-items:center;min-width:0;height:88rpx;padding:0 14rpx;border:1rpx solid #e3eaeb;border-radius:14rpx;background:#f8fafb;box-sizing:border-box}.schedule-picker--pressed{border-color:#9ddede;background:#eefafa}.schedule-picker>text{color:$dz-text-tertiary;font-size:16rpx}.schedule-picker>strong{overflow:hidden;margin-left:10rpx;font-size:20rpx;text-align:right;text-overflow:ellipsis;white-space:nowrap}.schedule-picker>b{margin-left:8rpx;color:$dz-text-tertiary;font-size:19rpx;font-weight:400}.wide-picker{grid-template-columns:auto 1fr auto;width:100%;margin-top:12rpx}.schedule-rule{display:flex;align-items:flex-start;gap:10rpx;margin-top:20rpx;padding:15rpx 16rpx;border-radius:14rpx;color:$dz-text-secondary;background:#eef8f8;font-size:17rpx;line-height:1.55}.schedule-rule i{display:flex;align-items:center;justify-content:center;flex:0 0 28rpx;width:28rpx;height:28rpx;border-radius:50%;color:#fff;background:$dz-brand-primary;font-size:16rpx;font-style:normal;font-weight:700}.schedule-error{display:block;margin-top:12rpx;padding:12rpx 14rpx;border-radius:12rpx;color:#a34f25;background:#fff3eb;font-size:17rpx;line-height:1.5}

.address-sheet{overflow-y:auto;max-height:88vh;min-height:0}.sheet-guide{display:block;margin:-3rpx 0 14rpx;color:$dz-text-secondary;font-size:18rpx}.address-sheet .sheet-head button{width:88rpx;height:88rpx;margin-right:-15rpx;line-height:88rpx}.address-sheet .search{height:88rpx}.location-empty{display:flex;min-height:270rpx;flex-direction:column;align-items:center;justify-content:center;color:$dz-text-tertiary;font-size:20rpx;text-align:center}.empty-pin{display:flex;width:86rpx;height:86rpx;align-items:center;justify-content:center;border-radius:50%;background:linear-gradient(145deg,#62d5ef,#42b8e8)}.empty-pin i{position:relative;width:25rpx;height:32rpx;border:5rpx solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-sizing:border-box}.empty-pin i::after{position:absolute;top:6rpx;left:7rpx;width:4rpx;height:4rpx;border-radius:50%;background:#fff;content:''}.location-empty strong{margin-top:18rpx;color:$dz-text-primary;font-size:24rpx}.location-empty>text{margin-top:8rpx;color:$dz-text-tertiary;font-size:17rpx}.location-list{max-height:410rpx;margin-top:12rpx}.location-list button{display:grid;grid-template-columns:32rpx 1fr 28rpx;align-items:center;width:100%;min-height:108rpx;padding:16rpx 2rpx;border-bottom:1rpx solid $dz-border-subtle;background:#fff;text-align:left}.location-list button>i{display:flex;align-items:center;justify-content:center;width:30rpx;height:30rpx;border:2rpx solid #cbd3d6;border-radius:50%;color:#fff;font-size:16rpx;font-style:normal}.location-list button.active>i{border-color:$dz-brand-primary;background:$dz-brand-primary}.location-list button>view{display:flex;min-width:0;flex-direction:column;gap:7rpx;margin-left:14rpx}.location-list button strong{overflow:hidden;font-size:22rpx;text-overflow:ellipsis;white-space:nowrap}.location-list button text{overflow:hidden;margin:0;color:$dz-text-secondary;font-size:17rpx;text-overflow:ellipsis;white-space:nowrap}.location-list button>b{color:$dz-text-tertiary;font-size:30rpx;font-weight:300}.location-confirm{display:flex;align-items:center;justify-content:center;width:100%;height:88rpx;margin:19rpx 0 0;border:0;border-radius:44rpx;color:#fff;background:$dz-gradient-brand;font-size:25rpx;font-weight:700;line-height:1.2}.location-confirm[disabled]{opacity:.42}

.schedule-selector-sheet{overflow:hidden;max-height:88vh;min-height:0;padding-bottom:calc(24rpx + env(safe-area-inset-bottom))}.schedule-selector-sheet .sheet-head{height:auto;min-height:88rpx}.schedule-selector-sheet .sheet-head>view{display:flex;min-width:0;flex:1;flex-direction:column;gap:7rpx}.schedule-selector-sheet .sheet-head>view strong{font-size:27rpx}.schedule-selector-sheet .sheet-head>view text{color:$dz-text-secondary;font-size:17rpx;line-height:1.45}.schedule-selector-sheet .sheet-head>button{flex:0 0 88rpx;width:88rpx;height:88rpx;margin-right:-15rpx;line-height:88rpx}.schedule-selection-preview{display:flex;align-items:center;justify-content:space-between;margin:11rpx 0 14rpx;padding:16rpx 18rpx;border-radius:15rpx;background:linear-gradient(135deg,#eefbfa,#f4fbff)}.schedule-selection-preview text{color:$dz-text-secondary;font-size:18rpx}.schedule-selection-preview strong{color:$dz-brand-deep;font-size:25rpx}.date-option-list,.time-option-list{height:480rpx;border-top:1rpx solid $dz-border-subtle;border-bottom:1rpx solid $dz-border-subtle}.date-option-list button{display:flex;align-items:center;justify-content:space-between;width:100%;min-height:108rpx;margin:0;padding:14rpx 17rpx;border:0;border-bottom:1rpx solid $dz-border-subtle;border-radius:0;background:#fff;text-align:left}.date-option-list button>view{display:flex;flex-direction:column;gap:5rpx}.date-option-list button strong{font-size:22rpx}.date-option-list button text{color:$dz-text-secondary;font-size:17rpx}.date-option-list button small{padding:5rpx 10rpx;border-radius:8rpx;color:#9da6aa;background:#f0f2f3;font-size:15rpx}.date-option-list button>i{display:flex;align-items:center;justify-content:center;width:31rpx;height:31rpx;border:2rpx solid #cbd5d7;border-radius:50%;color:#fff;font-size:16rpx;font-style:normal}.date-option-list button.active{background:#f1fbfa}.date-option-list button.active>i{border-color:$dz-brand-primary;background:$dz-brand-primary}.date-option-list button[disabled]{opacity:.55;background:#f7f8f8}.date-option-list button[disabled] strong,.date-option-list button[disabled] text{color:#9fa7aa}.time-option-list{height:430rpx;padding:16rpx 0;box-sizing:border-box}.time-option-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:11rpx}.time-option-grid button{display:flex;align-items:center;justify-content:center;height:82rpx;margin:0;padding:0;border:1rpx solid #dde6e7;border-radius:13rpx;color:$dz-text-primary;background:#f7f9fa;font-size:21rpx;font-variant-numeric:tabular-nums;line-height:1}.time-option-grid button.active{border-color:$dz-brand-primary;color:$dz-brand-deep;background:$dz-brand-soft;font-weight:750}.time-option-grid button[disabled]{border-color:#edf0f1;color:#b8bec1;background:#f5f6f6;opacity:.62}.schedule-selector-legend{display:flex;align-items:center;gap:9rpx;margin-top:14rpx;color:$dz-text-tertiary;font-size:16rpx}.schedule-selector-legend i{width:18rpx;height:18rpx;border-radius:5rpx;background:#e4e7e8}.schedule-selector-confirm{display:flex;align-items:center;justify-content:center;width:100%;height:88rpx;margin:17rpx 0 0;border:0;border-radius:44rpx;color:#fff;background:$dz-gradient-brand;font-size:25rpx;font-weight:700;line-height:1.2}.schedule-selector-confirm[disabled]{opacity:.42}.date-option-list button::after,.time-option-grid button::after,.schedule-selector-confirm::after{display:none}

@media screen and (max-width:360px){.schedule-heading{align-items:flex-start;flex-direction:column}.schedule-pickers{grid-template-columns:1fr}.schedule-picker{height:68rpx}.schedule-step-title{align-items:flex-start;flex-direction:column;gap:4rpx}.schedule-step-title text{text-align:left}}
@media screen and (orientation:landscape){.address-sheet,.schedule-selector-sheet{max-height:92vh}.location-list{max-height:210rpx}.date-option-list,.time-option-list{height:190rpx}}
</style>
