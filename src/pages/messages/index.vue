<template>
  <view class="dz-page notification-page">
    <header class="page-head">
      <button class="back" aria-label="返回" @tap="goBack"><i /></button>
      <text>通知中心</text>
      <button class="read-all" :disabled="markingAll || !currentUnread" @tap="markAll">
        {{ markingAll ? '处理中' : '全部已读' }}
      </button>
    </header>

    <nav class="category-tabs" aria-label="通知分类">
      <button
        v-for="tab in categoryTabs"
        :key="tab.value"
        :class="{ active: activeCategory === tab.value }"
        :aria-current="activeCategory === tab.value ? 'page' : undefined"
        @tap="selectCategory(tab.value)"
      >
        {{ tab.label }}<i v-if="tab.value && summary.category_unread[tab.value]" />
      </button>
    </nav>

    <nav class="status-tabs" aria-label="阅读状态">
      <button v-for="tab in statusTabs" :key="tab.value" :class="{ active: activeStatus === tab.value }" @tap="selectStatus(tab.value)">{{ tab.label }}</button>
    </nav>

    <main class="notification-content">
      <view v-if="loading" class="skeleton-list" role="status" aria-label="正在加载通知">
        <view v-for="index in 4" :key="index" class="skeleton-row"><i /><view><b /><span /><small /></view></view>
      </view>

      <view v-else-if="error" class="page-state error" role="button" @tap="load(true)">
        <image src="/static/notifications/system.svg" mode="aspectFit" />
        <strong>通知加载失败</strong><text>{{ error }}，点击重试</text>
      </view>

      <view v-else-if="!items.length" class="page-state">
        <image src="/static/notifications/system.svg" mode="aspectFit" />
        <strong>暂时没有{{ activeCategoryLabel }}通知</strong>
        <text>订单、活动和客服进度会及时告诉你</text>
      </view>

      <template v-else>
        <section v-if="todayItems.length" class="notification-group">
          <header><strong>今天</strong><text v-if="currentUnread">{{ currentUnread }} 条未读<i /></text></header>
          <view class="feed">
            <button
              v-for="item in todayItems"
              :key="item.public_id"
              class="notification-row"
              :class="{ unread: !item.is_read }"
              :aria-label="`${item.is_read ? '已读' : '未读'}，${item.title}`"
              @tap="openNotification(item)"
            >
              <i class="unread-dot" />
              <view class="category-icon" :class="item.category"><image :src="notificationIcon(item)" mode="aspectFit" /></view>
              <view class="notification-copy">
                <view class="row-title"><strong>{{ item.title }}</strong><time>{{ formatTime(item.created_at) }}</time></view>
                <small v-if="item.target_title" class="target-title">{{ item.target_title }}</small>
                <p>{{ item.content }}</p>
                <text v-if="item.action_text" class="row-action" :class="item.category">{{ item.action_text }}<i /></text>
              </view>
            </button>
          </view>
        </section>

        <section v-if="olderItems.length" class="notification-group older">
          <header>
            <strong>更早</strong>
            <text v-if="!todayItems.length && currentUnread">{{ currentUnread }} 条未读<i /></text>
          </header>
          <view class="feed">
            <button
              v-for="item in olderItems"
              :key="item.public_id"
              class="notification-row"
              :class="{ unread: !item.is_read }"
              :aria-label="`${item.is_read ? '已读' : '未读'}，${item.title}`"
              @tap="openNotification(item)"
            >
              <i class="unread-dot" />
              <view class="category-icon" :class="item.category"><image :src="notificationIcon(item)" mode="aspectFit" /></view>
              <view class="notification-copy">
                <view class="row-title"><strong>{{ item.title }}</strong><time>{{ formatTime(item.created_at) }}</time></view>
                <small v-if="item.target_title" class="target-title">{{ item.target_title }}</small>
                <p>{{ item.content }}</p>
                <text v-if="item.action_text" class="row-action" :class="item.category">{{ item.action_text }}<i /></text>
              </view>
            </button>
          </view>
        </section>

        <view v-if="loadingMore" class="load-more">正在加载更多…</view>
        <view v-else-if="items.length >= total" class="load-more">没有更多通知了</view>
      </template>
    </main>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onReachBottom, onShow } from '@dcloudio/uni-app'

import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/notifications'
import type { NotificationCategory, NotificationSummary, UserNotification } from '@/types/api'
import { getErrorMessage } from '@/utils/formatters'
import { businessClock, businessDateKey, businessDateKeyAfter, businessTimeParts } from '@/utils/businessTime'

type CategoryFilter = '' | NotificationCategory
type ReadFilter = 'all' | 'unread' | 'read'

const statusTabs: Array<{ label: string; value: ReadFilter }> = [
  { label: '全部消息', value: 'all' },
  { label: '未读', value: 'unread' },
  { label: '已读', value: 'read' },
]

const categoryTabs: Array<{ label: string; value: CategoryFilter }> = [
  { label: '全部', value: '' },
  { label: '客服', value: 'support' },
  { label: '订单', value: 'order' },
  { label: '活动', value: 'activity' },
  { label: '系统', value: 'system' },
]
const emptySummary = (): NotificationSummary => ({
  total: 0,
  unread: 0,
  category_unread: { support: 0, order: 0, activity: 0, system: 0 },
})

const items = ref<UserNotification[]>([])
const summary = ref<NotificationSummary>(emptySummary())
const activeCategory = ref<CategoryFilter>('')
const activeStatus = ref<ReadFilter>('all')
const page = ref(1)
const total = ref(0)
const loading = ref(true)
const loadingMore = ref(false)
const markingAll = ref(false)
const error = ref('')
let loadVersion = 0
let openingNotification = false

const currentUnread = computed(() => activeStatus.value === 'read' ? 0 : (activeCategory.value
  ? summary.value.category_unread[activeCategory.value]
  : summary.value.unread))
const activeCategoryLabel = computed(() => categoryTabs.find((tab) => tab.value === activeCategory.value)?.label || '')
const todayItems = computed(() => items.value.filter((item) => isToday(item.created_at)))
const olderItems = computed(() => items.value.filter((item) => !isToday(item.created_at)))

function isToday(value: string) {
  return businessDateKey(value) === businessDateKey()
}
function notificationIcon(item: UserNotification) {
  if (item.event_type === 'support_result') return '/static/notifications/support-result.svg'
  if (item.event_type === 'support_review_result') return '/static/notifications/support-review.svg'
  return `/static/notifications/${item.category}.svg`
}
function formatTime(value: string) {
  const date = businessTimeParts(value)
  const pad = (part: number) => String(part).padStart(2, '0')
  if (isToday(value)) return businessClock(value)
  if (businessDateKey(value) === businessDateKeyAfter(-1)) {
    return `昨天 ${businessClock(value)}`
  }
  return `${pad(date.month)}-${pad(date.day)} ${businessClock(value)}`
}
function goBack() {
  uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/index/index' }) })
}
async function load(reset = false) {
  if (reset) {
    page.value = 1
    loading.value = true
    error.value = ''
    items.value = []
    total.value = 0
  } else if (loading.value || loadingMore.value || markingAll.value || openingNotification || items.value.length >= total.value) return
  const version = ++loadVersion
  const requestedPage = page.value
  loadingMore.value = !reset
  try {
    const response = await getNotifications({
      category: activeCategory.value || undefined,
      isRead: activeStatus.value === 'all' ? undefined : activeStatus.value === 'read',
      page: requestedPage,
      pageSize: 20,
    })
    if (version !== loadVersion) return
    items.value = reset ? response.data.items : [...items.value, ...response.data.items]
    summary.value = response.data.summary
    total.value = response.data.pagination.total
    if (items.value.length < total.value) page.value = requestedPage + 1
  } catch (reason) {
    if (version !== loadVersion) return
    if (reset) error.value = getErrorMessage(reason, '请检查网络后重试')
    else uni.showToast({ title: getErrorMessage(reason, '加载更多失败'), icon: 'none' })
  } finally {
    if (version === loadVersion) {
      loading.value = false
      loadingMore.value = false
    }
  }
}
function selectCategory(category: CategoryFilter) {
  if (activeCategory.value === category) return
  activeCategory.value = category
  items.value = []
  total.value = 0
  load(true)
}
function selectStatus(readStatus: ReadFilter) {
  if (activeStatus.value === readStatus) return
  activeStatus.value = readStatus
  items.value = []
  total.value = 0
  load(true)
}
async function markAll() {
  if (!currentUnread.value || markingAll.value || openingNotification) return
  markingAll.value = true
  try {
    const category = activeCategory.value || undefined
    await markAllNotificationsRead(category)
    await load(true)
    uni.showToast({ title: '已全部标为已读', icon: 'success' })
  } catch (reason) {
    uni.showToast({ title: getErrorMessage(reason, '操作失败'), icon: 'none' })
  } finally { markingAll.value = false }
}
async function openNotification(item: UserNotification) {
  if (openingNotification || markingAll.value) return
  openingNotification = true
  try {
    if (!item.is_read) {
      await markNotificationRead(item.public_id)
      // 阅读状态变化会改变分页偏移，重新加载可避免未读列表漏项。
      await load(true)
    }
    if (item.action_url) uni.navigateTo({ url: item.action_url })
  } catch (reason) {
    uni.showToast({ title: getErrorMessage(reason, '通知状态更新失败'), icon: 'none' })
  } finally {
    openingNotification = false
  }
}

onShow(() => load(true))
onReachBottom(() => load(false))
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;

.notification-page{min-height:100vh;background:$dz-surface-page}.page-head{position:sticky;z-index:20;top:0;display:grid;grid-template-columns:112rpx 1fr 112rpx;align-items:end;height:calc(98rpx + env(safe-area-inset-top));padding:0 18rpx 8rpx;border-bottom:1rpx solid $dz-border-subtle;background:$dz-surface-glass;box-sizing:border-box}.page-head>text{text-align:center;font-size:$dz-fs-body-strong;font-weight:$dz-fw-bold}.page-head button{height:82rpx;margin:0;padding:0;border:0;background:transparent;font-size:$dz-fs-caption;line-height:82rpx}.page-head button::after,.category-tabs button::after,.notification-row::after{display:none}.back{display:flex;align-items:center;width:82rpx}.back i{width:20rpx;height:20rpx;margin-left:13rpx;border-bottom:4rpx solid $dz-text-primary;border-left:4rpx solid $dz-text-primary;transform:rotate(45deg)}.read-all{justify-self:end;width:112rpx;color:$dz-text-primary;text-align:right}.read-all[disabled]{color:$dz-text-tertiary}.category-tabs{position:sticky;z-index:18;top:calc(98rpx + env(safe-area-inset-top));display:grid;grid-template-columns:repeat(5,1fr);height:86rpx;border-bottom:1rpx solid $dz-border-subtle;background:$dz-surface-card}.category-tabs button{position:relative;height:86rpx;margin:0;padding:0;border:0;color:$dz-text-primary;background:transparent;font-size:$dz-fs-caption;line-height:86rpx}.category-tabs button.active{color:$dz-brand-deep;font-weight:$dz-fw-bold}.category-tabs button.active::before{position:absolute;right:31%;bottom:0;left:31%;height:5rpx;border-radius:4rpx;background:$dz-brand-primary;content:''}.category-tabs button>i{position:absolute;top:21rpx;right:21rpx;width:9rpx;height:9rpx;border:2rpx solid #fff;border-radius:50%;background:$dz-price-primary}.notification-content{padding-bottom:calc(30rpx + env(safe-area-inset-bottom))}.notification-group>header{display:flex;align-items:center;justify-content:space-between;height:88rpx;padding:0 36rpx;background:$dz-surface-page;box-sizing:border-box}.notification-group>header strong{font-size:$dz-fs-body-strong}.notification-group>header text{display:flex;align-items:center;gap:9rpx;color:$dz-brand-deep;font-size:$dz-fs-caption}.notification-group>header text i{width:12rpx;height:12rpx;border-radius:50%;background:$dz-brand-primary}.feed{padding:0 36rpx;background:$dz-surface-card}.notification-row{position:relative;display:grid;grid-template-columns:88rpx 1fr;width:100%;min-height:226rpx;margin:0;padding:30rpx 0 26rpx 20rpx;border:0;border-bottom:1rpx solid $dz-border-subtle;background:$dz-surface-card;text-align:left;box-sizing:border-box}.notification-row:last-child{border-bottom:0}.notification-row:active{background:$dz-surface-page}.unread-dot{position:absolute;left:0;top:48rpx;width:13rpx;height:13rpx;border-radius:50%;background:$dz-text-tertiary}.notification-row.unread .unread-dot{background:$dz-brand-primary}.category-icon{display:flex;align-items:center;justify-content:center;width:72rpx;height:72rpx;border-radius:50%;background:$dz-brand-soft}.category-icon.order{background:$dz-price-soft}.category-icon.activity{background:$dz-brand-soft}.category-icon.system{background:$dz-surface-page}.category-icon image{width:44rpx;height:44rpx}.notification-copy{min-width:0}.row-title{display:flex;align-items:flex-start;gap:16rpx}.row-title strong{flex:1;color:$dz-text-primary;font-size:$dz-fs-caption;font-weight:$dz-fw-semibold;line-height:34rpx}.unread .row-title strong{color:$dz-text-primary;font-weight:$dz-fw-bold}.row-title time{flex:0 0 auto;color:$dz-text-tertiary;font-size:$dz-fs-caption;line-height:34rpx}.target-title{display:block;overflow:hidden;margin-top:7rpx;color:$dz-text-tertiary;font-size:$dz-fs-caption;line-height:30rpx;text-overflow:ellipsis;white-space:nowrap}.notification-copy p{display:-webkit-box;overflow:hidden;margin:5rpx 0 0;color:$dz-text-secondary;font-size:$dz-fs-caption;line-height:34rpx;-webkit-box-orient:vertical;-webkit-line-clamp:2}.row-action{display:inline-flex;align-items:center;gap:7rpx;margin-top:14rpx;color:$dz-text-secondary;font-size:$dz-fs-caption;font-weight:$dz-fw-semibold}.unread .row-action{color:$dz-brand-deep}.row-action.order{color:$dz-price-primary}.row-action.activity{color:$dz-brand-deep}.row-action i{width:10rpx;height:10rpx;border-top:3rpx solid currentColor;border-right:3rpx solid currentColor;transform:rotate(45deg)}.load-more{display:flex;align-items:center;justify-content:center;height:80rpx;color:$dz-text-tertiary;font-size:$dz-fs-micro}.page-state{display:flex;min-height:610rpx;flex-direction:column;align-items:center;justify-content:center;padding:40rpx;color:$dz-text-secondary;text-align:center;box-sizing:border-box}.page-state image{width:90rpx;height:90rpx;padding:20rpx;border-radius:50%;background:$dz-surface-card;box-shadow:$dz-shadow-card}.page-state strong{margin-top:24rpx;color:$dz-text-primary;font-size:$dz-fs-body}.page-state text{margin-top:11rpx;font-size:$dz-fs-caption;line-height:1.6}.page-state.error strong{color:$dz-status-danger}.skeleton-list{padding:30rpx 36rpx;background:$dz-surface-card}.skeleton-row{display:grid;grid-template-columns:88rpx 1fr;min-height:180rpx;padding:25rpx 0;border-bottom:1rpx solid $dz-border-subtle}.skeleton-row>i{width:72rpx;height:72rpx;border-radius:50%;background:$dz-border-subtle}.skeleton-row>view{display:flex;flex-direction:column;gap:15rpx}.skeleton-row b,.skeleton-row span,.skeleton-row small{display:block;height:22rpx;border-radius:$dz-radius-sm;background:$dz-border-subtle;animation:pulse 1.2s ease-in-out infinite}.skeleton-row b{width:54%}.skeleton-row span{width:92%}.skeleton-row small{width:35%}@keyframes pulse{50%{opacity:.45}}@media(prefers-reduced-motion:reduce){.skeleton-row b,.skeleton-row span,.skeleton-row small{animation:none}}@media screen and (min-width:480px){.page-head,.category-tabs,.notification-content{max-width:750px;margin:auto}}
.status-tabs{display:flex;gap:12rpx;padding:18rpx 36rpx;background:$dz-surface-page}.status-tabs button{height:52rpx;margin:0;padding:0 24rpx;border:1rpx solid $dz-border-subtle;border-radius:26rpx;color:$dz-text-secondary;background:$dz-surface-card;font-size:$dz-fs-micro;line-height:50rpx}.status-tabs button::after{display:none}.status-tabs button.active{border-color:$dz-brand-primary;color:$dz-brand-deep;background:$dz-brand-soft;font-weight:$dz-fw-semibold}
</style>
