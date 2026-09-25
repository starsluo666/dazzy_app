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
          <view class="header-action notification-icon" hover-class="header-action--pressed" role="button" :aria-label="unreadCount ? `通知中心，${unreadCount}条未读` : '通知中心'" @tap.stop="openNotifications">
            <image src="/static/notifications/system.svg" mode="aspectFit" aria-hidden="true" />
            <i v-if="unreadCount"><b>{{ unreadCount > 99 ? '99+' : unreadCount }}</b></i>
          </view>
          <view class="header-action settings-icon" hover-class="header-action--pressed" role="button" aria-label="设置" @tap.stop="openSettings">
            <text>⚙</text>
          </view>
        </view>
      </view>
    </header>

    <main class="profile-content dz-container">
      <section class="account-card panel">
        <view class="provider-strip" hover-class="provider-strip--pressed" role="button" aria-label="申请成为达人" @tap="openProviderCenter">
          <view class="provider-copy">
            <strong>{{ providerEntry.title }}</strong>
            <text>{{ providerEntry.description }}</text>
          </view>
          <view class="provider-apply">{{ providerEntry.action }} <text>›</text></view>
          <view class="provider-star">☆</view>
        </view>

        <view class="account-grid">
          <view v-for="item in accountEntries" :key="item.label" role="button" hover-class="account-entry--pressed" @tap="openAccount(item)">
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

      <section class="invite-banner" hover-class="invite-banner--pressed" role="button" aria-label="邀请好友一起玩" @tap="openInvitations">
        <view class="invite-art"><text>¥</text><i>✦</i></view>
        <view class="invite-copy"><strong>邀请好友一起玩</strong><text>好友注册和首单完成，奖励分两次到账</text></view>
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
type FunctionEntry = { label: string; icon: string; route?: string; action?: 'customer_service' }

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
  { label: '账户余额', value: overview.value?.balance_amount == null ? '--' : `¥${(overview.value.balance_amount / 100).toFixed(2)}`, route: '/pages/wallet/index' },
  { label: '优惠券', value: overview.value?.coupon_count == null ? '--' : `${overview.value.coupon_count}张`, route: '/pages/coupons/index' },
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
  { label: '客服中心', icon: '/static/functions/customer-service.svg', action: 'customer_service' },
  { label: '帮助中心', icon: '/static/functions/help-center.svg' },
  { label: '问题反馈', icon: '/static/functions/feedback.svg', route: '/pages/support/index?mode=new&caseType=complaint' },
  { label: '举报有奖', icon: '/static/functions/report-reward.svg', route: '/pages/report/index' },
]

function showPending(feature: string) {
  uni.showToast({ title: `${feature}功能即将接入`, icon: 'none' })
}

function openInvitations() {
  if (!requireAuthentication('/pages/invitations/index')) return
  uni.navigateTo({ url: '/pages/invitations/index' })
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
  if (item.action === 'customer_service') {
    if (!isAuthenticated()) {
      requireAuthentication('/pages/profile/index')
      return
    }
    const phone = overview.value?.customer_service_phone?.trim()
    if (!phone) {
      uni.showModal({ title: '客服中心', content: '客服电话暂未配置，请通过问题反馈联系我们。', showCancel: false })
      return
    }
    uni.showModal({
      title: '客服中心',
      content: `客服电话：${phone}`,
      cancelText: '取消',
      confirmText: '拨打',
      success: ({ confirm }) => {
        if (confirm) uni.makePhoneCall({ phoneNumber: phone.replace(/[()\s-]/g, '') })
      },
    })
    return
  }
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
  background: $dz-surface-page;
}

.profile-header {
  position: relative;
  overflow: hidden;
  padding-bottom: 64rpx;
  background:
    radial-gradient(circle at 18% 86%, rgba(82, 220, 218, .12), transparent 31%),
    linear-gradient(146deg, #fff 8%,$dz-brand-soft 56%, #e9fafc 100%);
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
  font-size:$dz-fs-title;
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

.name { font-size: 37rpx; font-weight:$dz-fw-bold; line-height: 1.15; }

.slogan {
  overflow: hidden;
  max-width: 380rpx;
  margin-top: 14rpx;
  color: #536064;
  font-size:$dz-fs-caption;
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
  border: 1rpx solid $dz-border-material;
  border-radius: 50%;
  color: #111;
  background: $dz-surface-glass;
  box-shadow: $dz-shadow-raised, inset 0 1rpx 0 $dz-surface-highlight;
  transition: transform $dz-duration-fast $dz-ease-out, opacity $dz-duration-fast $dz-ease-standard;
}

.header-action--pressed { transform: scale(.92); opacity: .8; }

/* #ifdef H5 */
.header-action { -webkit-backdrop-filter:saturate(180%) blur(16px); backdrop-filter:saturate(180%) blur(16px); }
/* #endif */

.settings-icon text { font-size: 43rpx; line-height: 1; }
.notification-icon { position:relative; }
.notification-icon image { width:42rpx; height:42rpx; }
.notification-icon i { position:absolute; right:-10rpx; top:-7rpx; display:flex; align-items:center; justify-content:center; min-width:25rpx; height:25rpx; padding:0 5rpx; border:3rpx solid #f3fdfe; border-radius:$dz-radius-sm; color:$dz-text-inverse; background:$dz-status-danger; box-sizing:border-box; font-style:normal; }
.notification-icon i b { font-size:$dz-fs-micro; line-height:1; }
.profile-content {
  position: relative;
  margin-top: -64rpx;
  padding-bottom: 60rpx;
}

.panel {
  border: 1rpx solid $dz-border-material;
  border-radius:$dz-radius-lg;
  background: #fff;
  box-shadow: $dz-shadow-card, inset 0 1rpx 0 $dz-surface-highlight;
}

.account-card { overflow: hidden; }

.provider-strip {
  position: relative;
  display: flex;
  align-items: center;
  height: 88rpx;
  overflow: hidden;
  padding: 0 24rpx;
  color: $dz-brand-deep;
  background: linear-gradient(120deg, #ecfcfb 4%, #ddf7f4 58%, #d2f2ef 100%);
  border-bottom: 1rpx solid rgba(11, 116, 125, .07);
  box-sizing: border-box;
  transition: transform $dz-duration-fast $dz-ease-out, opacity $dz-duration-fast $dz-ease-standard;
}

.provider-strip--pressed { transform: scale(.99); opacity: .9; }

.provider-copy {
  position: relative;
  z-index: 1;
  display: flex;
  min-width: 0;
  align-items: center;
}

.provider-copy strong { flex: 0 0 auto; font-size:$dz-fs-body; }
.provider-copy text { overflow: hidden; margin-left: 13rpx; color: #58777c; font-size:$dz-fs-micro; text-overflow: ellipsis; white-space: nowrap; }

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
  border-radius:$dz-radius-md;
  color: #fff;
  background: $dz-brand-primary;
  box-shadow: 0 6rpx 14rpx rgba(11, 170, 181, .28);
  font-size:$dz-fs-caption;
  box-sizing: border-box;
}

.provider-apply text { margin-left: 5rpx; font-size:$dz-fs-body-strong; line-height: 1; }
.provider-star { position: relative; z-index: 1; margin-left: 10rpx; color: rgba(11, 116, 125, .4); font-size:$dz-fs-body; }

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
.account-grid strong { font-size:$dz-fs-heading; font-weight:$dz-fw-semibold; line-height: 1; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
.account-grid strong.balance { color: #f65720; font-size:$dz-fs-body-strong; }
.account-grid text { margin-top: 21rpx; color: #273136; font-size:$dz-fs-caption; white-space: nowrap; }
.account-entry--pressed { opacity: .64; }

.orders { margin-top: 24rpx; padding: 28rpx 24rpx 35rpx; }

.section-head { display: flex; align-items: center; justify-content: space-between; }
.section-head > text,
.section-title { font-size:$dz-fs-body-strong; font-weight:$dz-fw-bold; }
.section-head > view { display: flex; align-items: center; color: #707b80; font-size:$dz-fs-caption; }
.section-head > view text { margin-left: 8rpx; font-size:$dz-fs-body-strong; line-height: 1; }

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
  color: #303a3f;
  font-size:$dz-fs-caption;
}
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
  font-size:$dz-fs-micro;
  font-style: normal;
  box-sizing: border-box;
}

.invite-banner {
  display: flex;
  align-items: center;
  height: 104rpx;
  margin-top: 24rpx;
  padding: 0 24rpx;
  border: 1rpx solid rgba(255, 122, 52, .16);
  border-radius:$dz-radius-lg;
  background: linear-gradient(90deg, #fff7ef 0%, #fffaf6 56%, #fff4e9 100%);
  box-shadow: $dz-shadow-card, inset 0 1rpx 0 rgba(255,255,255,.8);
  box-sizing: border-box;
  transition: transform $dz-duration-fast $dz-ease-out, opacity $dz-duration-fast $dz-ease-standard;
}

.invite-banner--pressed { transform: scale(.985); opacity: .92; }

.invite-art {
  position: relative;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 56rpx;
  border-radius:$dz-radius-sm 12rpx 17rpx 17rpx;
  color: #ff5b20;
  background: linear-gradient(150deg, #ffd2b0, #ff7b35);
  box-shadow: 0 6rpx 14rpx rgba(255, 91, 32, .18);
}

.invite-art::before { position: absolute; top: -12rpx; width: 36rpx; height: 15rpx; border: 5rpx solid #ff7a34; border-bottom: 0; border-radius: 50% 50% 0 0; content: ''; }
.invite-art text { display: flex; align-items: center; justify-content: center; width: 33rpx; height: 33rpx; border-radius: 50%; background: #fff5e9; font-size:$dz-fs-caption; font-weight:$dz-fw-bold; }
.invite-art i { position: absolute; top: -9rpx; right: -14rpx; color: #ffc64f; font-size:$dz-fs-micro; font-style: normal; }

.invite-copy { display: flex; min-width: 0; flex-direction: column; margin-left: 23rpx; }
.invite-copy strong { color:$dz-price-primary; font-size:$dz-fs-caption; }
.invite-copy text { margin-top: 6rpx; color: #687177; font-size:$dz-fs-micro; }
.invite-action { display: flex; align-items: center; margin-left: auto; color:$dz-price-primary; font-size:$dz-fs-caption; white-space: nowrap; }
.invite-action text { margin-left: 8rpx; font-size:$dz-fs-body-strong; }

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
  color: #30393e;
  font-size:$dz-fs-caption;
}
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
  .account-grid text { font-size:$dz-fs-micro; }
  .invite-copy { margin-left: 16rpx; }
}

@media (prefers-reduced-motion: reduce) {
  .header-action,.provider-strip,.invite-banner { transition:none; }
  .header-action--pressed,.provider-strip--pressed,.invite-banner--pressed { transform:none; opacity:.85; }
}

@media (prefers-reduced-transparency: reduce) {
  .header-action { background:$dz-surface-raised; -webkit-backdrop-filter:none; backdrop-filter:none; }
}
</style>
