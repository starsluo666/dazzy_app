<template>
  <view class="dz-page dz-page--with-tabbar profile-page">
    <header class="profile-header">
      <view class="dz-safe-top" />
      <view class="identity dz-container" @tap="openLoginIfNeeded">
        <view class="avatar">
          <image
            v-if="profile?.avatar_url && !avatarFailed"
            :src="profile.avatar_url"
            mode="aspectFill"
            @error="avatarFailed = true"
          />
          <text v-else>{{ displayName.slice(0, 1) }}</text>
        </view>

        <view class="identity-copy">
          <text class="name">{{ displayName }}</text>
          <text class="slogan">{{ profile ? maskedPhone : '登录后查看订单、活动和收藏' }}</text>
        </view>

        <view class="header-actions">
          <view class="header-action notification-icon" role="button" :aria-label="unreadCount ? `通知中心，${unreadCount}条未读` : '通知中心'" @tap.stop="openNotifications">
            <image src="/static/notifications/system.svg" mode="aspectFit" aria-hidden="true" />
            <i v-if="unreadCount"><b>{{ unreadCount > 99 ? '99+' : unreadCount }}</b></i>
          </view>
          <view class="header-action settings-icon" role="button" aria-label="设置" @tap.stop="openSettings">
            <text>⚙</text>
          </view>
        </view>
      </view>
    </header>

    <main class="profile-content dz-container">
      <section class="account-card panel">
        <view class="provider-strip" role="button" aria-label="申请成为达人" @tap="openProviderCenter">
          <view class="provider-copy">
            <strong>{{ providerEntry.title }}</strong>
            <text>{{ providerEntry.description }}</text>
          </view>
          <view class="provider-apply">{{ providerEntry.action }} <text>›</text></view>
          <view class="provider-star">☆</view>
        </view>

        <view class="account-grid">
          <view v-for="item in accountEntries" :key="item.label" role="button" @tap="openAccount(item)">
            <strong :class="{ balance: item.label === '账户余额' }">{{ item.value }}</strong>
            <text>{{ item.label }}</text>
          </view>
        </view>
      </section>

      <section class="orders panel">
        <view class="section-head">
          <text>我的订单</text>
          <view role="button" aria-label="查看全部订单" @tap="openOrders('all')">全部订单 <text>›</text></view>
        </view>
        <view class="order-grid">
          <view
            v-for="item in orderEntries"
            :key="item.label"
            role="button"
            :aria-label="item.count ? `${item.label}，${item.count}笔` : item.label"
            hover-class="order-entry--pressed"
            @tap="openOrders(item.bucket)"
          >
            <view class="order-icon">
              <image :src="item.icon" mode="aspectFit" aria-hidden="true" />
              <i v-if="item.count">{{ item.count }}</i>
            </view>
            <text>{{ item.label }}</text>
          </view>
        </view>
      </section>

      <section class="invite-banner" role="button" aria-label="邀请好友一起玩" @tap="showPending('邀请奖励')">
        <view class="invite-art"><text>¥</text><i>✦</i></view>
        <view class="invite-copy"><strong>邀请好友一起玩</strong><text>双方可得优惠券</text></view>
        <view class="invite-action">去邀请 <text>›</text></view>
      </section>

      <section class="functions panel">
        <text class="section-title">常用功能</text>
        <view class="function-grid">
          <view
            v-for="item in functionEntries"
            :key="item.label"
            role="button"
            :aria-label="item.label"
            hover-class="function-entry--pressed"
            @tap="openFunction(item)"
          >
            <view class="function-icon"><image :src="item.icon" mode="aspectFit" aria-hidden="true" /></view>
            <text>{{ item.label }}</text>
          </view>
        </view>
      </section>
    </main>

    <DazzyTabBar active="profile" :unread-count="unreadCount" />
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import DazzyTabBar from '@/components/DazzyTabBar.vue'
import { getCurrentUser, getCurrentUserOverview } from '@/services/auth'
import { getProviderApplication } from '@/services/providers'
import { getNotificationSummary } from '@/services/notifications'
import { isAuthenticated, requireAuthentication } from '@/services/session'
import type { CurrentUser, CurrentUserOverview, ProviderApplication } from '@/types/api'

type AccountEntry = { label: string; value: string; route?: string; bucket?: string }
type FunctionEntry = { label: string; icon: string; route?: string }

const profile = ref<CurrentUser | null>(null)
const overview = ref<CurrentUserOverview | null>(null)
const providerApplication = ref<ProviderApplication | null>(null)
const avatarFailed = ref(false)
const unreadCount = ref(0)
const displayName = computed(() => profile.value?.nickname || '登录 / 注册')
const maskedPhone = computed(() => profile.value?.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') || '')
const providerEntry = computed(() => {
  switch (providerApplication.value?.status) {
    case 'approved':
      return { title: '达人申请已通过', description: '请在达人端完成实名与资料', action: '查看说明' }
    case 'pending':
      return { title: '达人申请审核中', description: '审核结果会在这里同步更新', action: '查看进度' }
    case 'rejected':
      return { title: '完善达人申请', description: '根据驳回原因修改资料后可重新提交', action: '修改资料' }
    case 'suspended':
      return { title: '达人资格已暂停', description: '请联系客服了解暂停原因', action: '查看详情' }
    default:
      return { title: '成为达人', description: '开启陪玩服务，获得更多收入', action: '申请达人' }
  }
})

const accountEntries = computed<AccountEntry[]>(() => [
  { label: '账户余额', value: overview.value?.balance_amount == null ? '--' : `¥${(overview.value.balance_amount / 100).toFixed(2)}` },
  { label: '优惠券', value: overview.value?.coupon_count == null ? '--' : `${overview.value.coupon_count}张` },
  { label: '我的订单', value: String(overview.value?.order_count ?? 0), bucket: 'all' },
  { label: '我的收藏', value: overview.value?.favorite_count == null ? '--' : String(overview.value.favorite_count), route: '/pages/favorites/index' },
])

const orderEntries = computed(() => [
  { label: '待付款', icon: '/static/orders/pending-payment.svg', count: overview.value?.pending_payment_count ?? 0, bucket: 'pending_payment' },
  { label: '待服务', icon: '/static/orders/pending-service.svg', count: overview.value?.pending_service_count ?? 0, bucket: 'upcoming' },
  { label: '进行中', icon: '/static/orders/in-progress.svg', count: overview.value?.in_service_count ?? 0, bucket: 'active' },
  { label: '待评价', icon: '/static/orders/pending-review.svg', count: overview.value?.pending_review_count ?? 0, bucket: 'pending_review' },
  { label: '退款/售后', icon: '/static/orders/after-sales.svg', count: overview.value?.after_sales_count ?? 0, bucket: 'after_sales' },
])

const functionEntries: FunctionEntry[] = [
  { label: '我的活动', icon: '/static/functions/my-activities.svg', route: '/pages/activities/mine' },
  { label: '浏览记录', icon: '/static/functions/browsing-history.svg', route: '/pages/history/index' },
  { label: '我的评价', icon: '/static/functions/my-reviews.svg', route: '/pages/reviews/index' },
  { label: '常用地址', icon: '/static/functions/addresses.svg', route: '/pages/addresses/index' },
  { label: '客服中心', icon: '/static/functions/customer-service.svg', route: '/pages/support/index' },
  { label: '帮助中心', icon: '/static/functions/help-center.svg' },
  { label: '问题反馈', icon: '/static/functions/feedback.svg', route: '/pages/support/index?mode=new&caseType=consultation' },
  { label: '举报有奖', icon: '/static/functions/report-reward.svg', route: '/pages/support/index?mode=new&caseType=report' },
]

function showPending(feature: string) {
  uni.showToast({ title: `${feature}功能即将接入`, icon: 'none' })
}

function openOrders(bucket: string) {
  if (!requireAuthentication(`/pages/orders/list?status=${bucket}`)) return
  uni.navigateTo({ url: `/pages/orders/list?status=${bucket}` })
}

function openAccount(item: AccountEntry) {
  if (item.bucket) openOrders(item.bucket)
  else if (item.route) uni.navigateTo({ url: item.route })
  else showPending(item.label)
}

function openFunction(item: FunctionEntry) {
  if (!item.route) return showPending(item.label)
  if (requireAuthentication(item.route)) uni.navigateTo({ url: item.route })
}

function openSettings() {
  if (requireAuthentication('/pages/settings/index')) uni.navigateTo({ url: '/pages/settings/index' })
}

function openNotifications() {
  const route = '/pages/messages/index'
  if (requireAuthentication(route)) uni.navigateTo({ url: route })
}

function openProviderCenter() {
  if (providerApplication.value?.status === 'approved') {
    uni.showToast({ title: '达人端小程序即将上线', icon: 'none' })
    return
  }
  const route = '/pages/providers/apply'
  if (requireAuthentication(route)) uni.navigateTo({ url: route })
}

function openLoginIfNeeded() {
  if (!profile.value) uni.navigateTo({ url: '/pages/auth/login' })
}

async function loadProfile() {
  if (!isAuthenticated()) {
    profile.value = null
    overview.value = null
    providerApplication.value = null
    unreadCount.value = 0
    return
  }
  try {
    const [profileResponse, overviewResponse, notificationResponse] = await Promise.all([
      getCurrentUser(),
      getCurrentUserOverview(),
      getNotificationSummary().catch(() => null),
    ])
    profile.value = profileResponse.data
    overview.value = overviewResponse.data
    unreadCount.value = notificationResponse?.data.unread || 0
    try {
      providerApplication.value = (await getProviderApplication()).data
    } catch {
      providerApplication.value = null
    }
  } catch {
    profile.value = null
    overview.value = null
    providerApplication.value = null
    unreadCount.value = 0
  }
}

onShow(loadProfile)
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;

.profile-page {
  min-height: 100vh;
  color: #111b20;
  background: #fff;
}

.profile-header {
  position: relative;
  height: 300rpx;
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 86%, rgba(82, 220, 218, .12), transparent 31%),
    linear-gradient(146deg, #fff 8%, #f3fdfe 56%, #e9fafc 100%);
}

.profile-header::after {
  position: absolute;
  top: -214rpx;
  right: -160rpx;
  width: 590rpx;
  height: 420rpx;
  border-radius: 50%;
  background: rgba(44, 199, 207, .05);
  content: '';
}

.identity {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  height: 250rpx;
}

.avatar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  width: 132rpx;
  height: 132rpx;
  border: 6rpx solid #fff;
  border-radius: 50%;
  color: $dz-brand-deep;
  background: $dz-brand-soft;
  font-size: 42rpx;
  box-shadow: 0 8rpx 24rpx rgba(37, 105, 113, .12);
}

.avatar image { width: 100%; height: 100%; }

.identity-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  margin-left: 24rpx;
}

.name { font-size: 37rpx; font-weight: 800; line-height: 1.15; }

.verified {
  display: flex;
  align-items: center;
  height: 38rpx;
  margin-top: 12rpx;
  padding: 0 14rpx 0 8rpx;
  border-radius: 20rpx;
  color: $dz-brand-deep;
  background: #fff;
  font-size: 20rpx;
  box-shadow: 0 4rpx 14rpx rgba(31, 65, 72, .05);
}

.verified-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 25rpx;
  height: 25rpx;
  margin-right: 6rpx;
  border-radius: 7rpx;
  color: #fff;
  background: $dz-brand-primary;
  font-size: 15rpx;
  font-weight: 800;
}

.slogan {
  overflow: hidden;
  max-width: 380rpx;
  margin-top: 14rpx;
  color: #536064;
  font-size: 21rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-actions {
  display: flex;
  align-self: flex-start;
  gap: 17rpx;
  margin: 25rpx 0 0 auto;
}

.header-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  color: #111;
}

.settings-icon text { font-size: 43rpx; line-height: 1; }
.notification-icon { position:relative; }
.notification-icon image { width:42rpx; height:42rpx; }
.notification-icon i { position:absolute; right:-10rpx; top:-7rpx; display:flex; align-items:center; justify-content:center; min-width:25rpx; height:25rpx; padding:0 5rpx; border:3rpx solid #f3fdfe; border-radius:15rpx; color:#fff; background:#ff4141; box-sizing:border-box; font-style:normal; }
.notification-icon i b { font-size:15rpx; line-height:1; }
.profile-content {
  padding-bottom: 60rpx;
}

.panel {
  border-radius: 26rpx;
  background: #fff;
  box-shadow: 0 10rpx 34rpx rgba(31, 65, 72, .075);
}

.account-card { overflow: hidden; }

.provider-strip {
  position: relative;
  display: flex;
  align-items: center;
  height: 78rpx;
  overflow: hidden;
  padding: 0 22rpx;
  color: #fff;
  background: linear-gradient(95deg, #3dd5d0 0%, #21c7d2 54%, #25b7e8 100%);
  box-sizing: border-box;
}

.provider-copy {
  position: relative;
  z-index: 1;
  display: flex;
  min-width: 0;
  align-items: center;
}

.provider-copy strong { flex: 0 0 auto; font-size: 28rpx; }
.provider-copy text { overflow: hidden; margin-left: 13rpx; font-size: 17rpx; text-overflow: ellipsis; white-space: nowrap; }

.provider-apply {
  position: relative;
  z-index: 2;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  min-width: 128rpx;
  height: 46rpx;
  margin-left: auto;
  padding: 0 13rpx;
  border-radius: 24rpx;
  color: #0baab5;
  background: #fff;
  box-shadow: 0 5rpx 14rpx rgba(5, 110, 130, .12);
  font-size: 20rpx;
  box-sizing: border-box;
}

.provider-apply text { margin-left: 5rpx; font-size: 29rpx; line-height: 1; }
.provider-star { position: relative; z-index: 1; margin-left: 10rpx; color: rgba(255, 255, 255, .9); font-size: 28rpx; }

.account-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  height: 178rpx;
  padding: 27rpx 10rpx 23rpx;
  box-sizing: border-box;
}

.account-grid > view {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-right: 1rpx solid $dz-border-subtle;
}

.account-grid > view:last-child { border-right: 0; }
.account-grid strong { font-size: 34rpx; font-weight: 600; line-height: 1; }
.account-grid strong.balance { color: #f65720; font-size: 31rpx; }
.account-grid text { margin-top: 21rpx; color: #273136; font-size: 20rpx; white-space: nowrap; }

.orders { margin-top: 24rpx; padding: 28rpx 24rpx 35rpx; }

.section-head { display: flex; align-items: center; justify-content: space-between; }
.section-head > text,
.section-title { font-size: 29rpx; font-weight: 800; }
.section-head > view { display: flex; align-items: center; color: #707b80; font-size: 21rpx; }
.section-head > view text { margin-left: 8rpx; font-size: 30rpx; line-height: 1; }

.order-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  margin-top: 34rpx;
}

.order-grid > view {
  display: flex;
  min-width: 0;
  min-height: 96rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-right: 1rpx solid $dz-border-subtle;
  color: #303a3f;
  font-size: 20rpx;
}

.order-grid > view:last-child { border-right: 0; }
.order-grid > view > text { margin-top: 14rpx; white-space: nowrap; }
.order-entry--pressed { opacity: .64; }

.order-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60rpx;
  height: 60rpx;
}

.order-icon image { display: block; width: 56rpx; height: 56rpx; }

.order-icon i {
  position: absolute;
  z-index: 2;
  top: -9rpx;
  right: -8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 29rpx;
  height: 29rpx;
  border: 3rpx solid #fff;
  border-radius: 50%;
  color: #fff;
  background: #ff4f13;
  font-size: 17rpx;
  font-style: normal;
  box-sizing: border-box;
}

.invite-banner {
  display: flex;
  align-items: center;
  height: 104rpx;
  margin-top: 24rpx;
  padding: 0 24rpx;
  border-radius: 24rpx;
  background: linear-gradient(90deg, #fff7ef 0%, #fffaf6 56%, #fff4e9 100%);
  box-shadow: 0 8rpx 26rpx rgba(180, 91, 30, .055);
  box-sizing: border-box;
}

.invite-art {
  position: relative;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 56rpx;
  border-radius: 12rpx 12rpx 17rpx 17rpx;
  color: #ff5b20;
  background: linear-gradient(150deg, #ffd2b0, #ff7b35);
  box-shadow: 0 6rpx 14rpx rgba(255, 91, 32, .18);
}

.invite-art::before { position: absolute; top: -12rpx; width: 36rpx; height: 15rpx; border: 5rpx solid #ff7a34; border-bottom: 0; border-radius: 50% 50% 0 0; content: ''; }
.invite-art text { display: flex; align-items: center; justify-content: center; width: 33rpx; height: 33rpx; border-radius: 50%; background: #fff5e9; font-size: 20rpx; font-weight: 800; }
.invite-art i { position: absolute; top: -9rpx; right: -14rpx; color: #ffc64f; font-size: 17rpx; font-style: normal; }

.invite-copy { display: flex; min-width: 0; flex-direction: column; margin-left: 23rpx; }
.invite-copy strong { color: #f04e18; font-size: 25rpx; }
.invite-copy text { margin-top: 6rpx; color: #687177; font-size: 17rpx; }
.invite-action { display: flex; align-items: center; margin-left: auto; color: #f04e18; font-size: 23rpx; white-space: nowrap; }
.invite-action text { margin-left: 8rpx; font-size: 31rpx; }

.functions { margin-top: 24rpx; padding: 29rpx 20rpx 23rpx; }
.section-title { display: block; margin-left: 4rpx; }

.function-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  margin-top: 22rpx;
}

.function-grid > view {
  display: flex;
  min-height: 124rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-right: 1rpx solid $dz-border-subtle;
  border-bottom: 1rpx solid $dz-border-subtle;
  color: #30393e;
  font-size: 19rpx;
}

.function-grid > view:nth-child(4n) { border-right: 0; }
.function-grid > view:nth-last-child(-n + 4) { border-bottom: 0; }
.function-entry--pressed { opacity: .64; }

.function-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52rpx;
  height: 52rpx;
}

.function-icon image { display: block; width: 50rpx; height: 50rpx; }
.function-grid > view > text { margin-top: 8rpx; white-space: nowrap; }

@media screen and (max-width: 360px) {
  .provider-copy text { max-width: 220rpx; }
  .provider-apply { min-width: 116rpx; padding: 0 10rpx; }
  .provider-star { display: none; }
  .account-grid text { font-size: 18rpx; }
  .invite-copy { margin-left: 16rpx; }
}
</style>
