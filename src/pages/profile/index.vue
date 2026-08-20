<template>
  <view class="dz-page dz-page--with-tabbar profile-page">
    <header class="profile-hero">
      <view class="dz-safe-top" />
      <view class="hero-actions dz-container">
        <view role="button" aria-label="扫一扫" @tap="showPending('扫一扫')">⌗</view>
        <view role="button" aria-label="设置" @tap="showPending('设置')">⚙</view>
      </view>
      <view class="identity dz-container">
        <view class="avatar">
          <image v-if="profile?.avatar_url && !avatarFailed" :src="profile.avatar_url" mode="aspectFill" @error="avatarFailed = true" />
          <text v-else>{{ displayName.slice(0, 1) }}</text>
        </view>
        <view class="identity-copy">
          <text class="name">{{ displayName }}</text>
          <text class="slogan">{{ profile?.bio || '阳光出发 享受生活' }}</text>
          <text class="verified">◆ 实名认证</text>
        </view>
      </view>
    </header>

    <main class="content dz-container">
      <section class="stats panel">
        <view v-for="item in stats" :key="item.label">
          <text>{{ item.label }}</text>
          <strong :class="{ balance: item.label === '奖励余额' }">{{ item.value }}</strong>
        </view>
      </section>

      <section class="orders panel">
        <view class="section-head"><text>我的订单</text><view role="button" @tap="openOrders('all')">全部订单　›</view></view>
        <view class="order-grid">
          <view v-for="item in orderEntries" :key="item.label" role="button" @tap="openOrders(item.bucket)">
            <text class="feature-icon">{{ item.icon }}</text>
            <text>{{ item.label }}</text>
          </view>
        </view>
      </section>

      <section class="promotions">
        <view v-for="item in promotions" :key="item.title" class="promotion" :class="item.className" role="button" @tap="showPending(item.title)">
          <strong>{{ item.title }}</strong>
          <text>{{ item.line1 }}<br />{{ item.line2 }}</text>
          <text class="promotion-action">{{ item.action }} ›</text>
          <text class="promotion-art">{{ item.art }}</text>
        </view>
      </section>

      <section class="functions panel">
        <text class="section-title">我的功能</text>
        <view class="function-grid">
          <view v-for="item in functions" :key="item.label" role="button" @tap="openFunction(item)">
            <text class="feature-icon">{{ item.icon }}</text>
            <text>{{ item.label }}</text>
          </view>
        </view>
      </section>
    </main>

    <DazzyTabBar active="profile" />
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import DazzyTabBar from '@/components/DazzyTabBar.vue'
import { getRecommendedProviders } from '@/services/discovery'
import type { ProviderListItem } from '@/types/api'

const profile = ref<ProviderListItem | null>(null)
const avatarFailed = ref(false)
const displayName = computed(() => profile.value?.nickname || '晓晓')
const stats = computed(() => [
  { label: '奖励余额', value: '¥128.00' },
  { label: '优惠券', value: '12' },
  { label: '关注', value: '28' },
  { label: '粉丝', value: profile.value ? String(Math.max(136, profile.value.service_count * 4)) : '136' },
])
const orderEntries = [
  { label: '待付款', icon: '▱', bucket: 'pending_payment' },
  { label: '待服务', icon: '▤', bucket: 'upcoming' },
  { label: '进行中', icon: '▣', bucket: 'active' },
  { label: '退款/售后', icon: '¥', bucket: 'finished' },
]
const promotions = [
  { title: '申请达人', line1: '成为达人', line2: '享受更多权益', action: '去申请', art: '✦', className: 'provider' },
  { title: '邀请奖励', line1: '邀请好友', line2: '得现金奖励', action: '去邀请', art: '🎁', className: 'reward' },
  { title: '会员中心', line1: '专属特权', line2: '超值享受', action: '去查看', art: '♛', className: 'member' },
]
const functions = [
  { label: '我的收藏', icon: '☆' }, { label: '我的活动', icon: '♧', route: '/pages/activities/mine' },
  { label: '我的评价', icon: '◌' }, { label: '收货地址', icon: '⌖' },
  { label: '客服中心', icon: '♧' }, { label: '帮助中心', icon: '?' },
  { label: '安全中心', icon: '◇' }, { label: '设置', icon: '⚙' },
]

function showPending(feature: string) {
  uni.showToast({ title: `${feature}功能即将接入`, icon: 'none' })
}
function openOrders(bucket: string) { uni.navigateTo({ url: `/pages/orders/list?status=${bucket}` }) }
function openFunction(item: { label: string; route?: string }) {
  if (item.route) uni.navigateTo({ url: item.route })
  else showPending(item.label)
}

async function loadDemoProfile() {
  try {
    profile.value = (await getRecommendedProviders({ page_size: 1 })).data.items[0] || null
  } catch {
    profile.value = null
  }
}

onLoad(loadDemoProfile)
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;

.profile-page { background:$dz-surface-page; }
.profile-hero { position:relative; height:452rpx; overflow:hidden; color:#12363c; background:linear-gradient(145deg,#58ddd9,#1fc8d0 58%,#15bcca); }
.profile-hero::before,.profile-hero::after { position:absolute; border-radius:50%; background:rgba(255,255,255,.08); content:''; }
.profile-hero::before { right:-100rpx; top:-120rpx; width:360rpx; height:360rpx; }
.profile-hero::after { right:-40rpx; bottom:-220rpx; width:420rpx; height:420rpx; }
.hero-actions { position:relative; z-index:1; display:flex; justify-content:flex-end; gap:30rpx; padding-top:20rpx; color:#fff; font-size:38rpx; }
.hero-actions>view { display:flex; align-items:center; justify-content:center; width:52rpx; height:52rpx; }
.identity { position:relative; z-index:1; display:flex; align-items:center; gap:28rpx; margin-top:36rpx; }
.avatar { display:flex; align-items:center; justify-content:center; overflow:hidden; width:154rpx; height:154rpx; border:6rpx solid #fff; border-radius:50%; color:$dz-brand-deep; background:$dz-brand-soft; font-size:50rpx; box-shadow:0 8rpx 24rpx rgba(11,107,115,.14); }
.avatar image { width:100%; height:100%; }
.identity-copy { display:flex; flex-direction:column; align-items:flex-start; }
.name { font-size:38rpx; font-weight:800; }
.slogan { overflow:hidden; max-width:420rpx; margin-top:20rpx; font-size:24rpx; text-overflow:ellipsis; white-space:nowrap; }
.verified { margin-top:19rpx; padding:6rpx 14rpx; border-radius:18rpx; color:$dz-brand-deep; background:#fff; font-size:20rpx; }
.content { position:relative; z-index:2; margin-top:-76rpx; padding-bottom:24rpx; }
.panel { border-radius:22rpx; background:#fff; box-shadow:0 8rpx 28rpx rgba(31,65,72,.08); }
.stats { display:grid; grid-template-columns:repeat(4,1fr); min-height:154rpx; padding:25rpx 10rpx; box-sizing:border-box; }
.stats>view { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:19rpx; border-right:1rpx solid $dz-border-subtle; color:#20282c; font-size:21rpx; }
.stats>view:last-child { border-right:0; }
.stats strong { font-size:35rpx; font-weight:600; }
.stats strong.balance { color:#ff501e; font-size:31rpx; }
.orders { margin-top:22rpx; padding:24rpx 24rpx 28rpx; }
.section-head { display:flex; align-items:center; justify-content:space-between; }
.section-head>text,.section-title { font-size:29rpx; font-weight:800; }
.section-head>view { color:#6d787e; font-size:21rpx; }
.order-grid,.function-grid { display:grid; grid-template-columns:repeat(4,1fr); }
.order-grid { margin-top:30rpx; }
.order-grid>view,.function-grid>view { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12rpx; border-right:1rpx solid $dz-border-subtle; color:#313b40; font-size:21rpx; }
.order-grid>view:last-child { border-right:0; }
.feature-icon { display:flex; align-items:center; justify-content:center; width:58rpx; height:58rpx; color:#122128; font-size:42rpx; line-height:1; }
.order-grid>view:last-child .feature-icon { color:$dz-brand-deep; }
.promotions { display:grid; grid-template-columns:repeat(3,1fr); gap:14rpx; margin-top:22rpx; }
.promotion { position:relative; overflow:hidden; display:flex; flex-direction:column; align-items:flex-start; height:240rpx; padding:25rpx 20rpx; border-radius:22rpx; box-sizing:border-box; }
.promotion.provider { color:#095664; background:linear-gradient(145deg,#d6fbf9,#aeece9); }
.promotion.reward { color:#a62718; background:linear-gradient(145deg,#fff0ea,#ffd9cd); }
.promotion.member { color:#a85b05; background:linear-gradient(145deg,#fff4dc,#ffe1aa); }
.promotion strong { font-size:27rpx; }
.promotion>text:not(.promotion-action):not(.promotion-art) { margin-top:19rpx; font-size:20rpx; line-height:31rpx; }
.promotion-action { position:absolute; z-index:1; left:18rpx; bottom:23rpx; padding:8rpx 14rpx; border-radius:19rpx; color:#fff; background:$dz-brand-deep; font-size:18rpx; }
.reward .promotion-action { background:#ff542d; }
.member .promotion-action { background:#ff9519; }
.promotion-art { position:absolute; right:8rpx; bottom:4rpx; color:rgba(0,171,178,.55); font-size:72rpx; }
.functions { margin-top:22rpx; padding:25rpx 20rpx 18rpx; }
.section-title { display:block; margin-left:4rpx; }
.function-grid { margin-top:22rpx; }
.function-grid>view { min-height:112rpx; border-bottom:1rpx solid $dz-border-subtle; }
.function-grid>view:nth-child(4n) { border-right:0; }
.function-grid>view:nth-last-child(-n+4) { border-bottom:0; }

@media screen and (max-width:360px) {
  .promotion { padding-right:12rpx; padding-left:14rpx; }
  .promotion strong { font-size:24rpx; }
}
</style>
