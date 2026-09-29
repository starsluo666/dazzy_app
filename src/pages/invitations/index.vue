<template>
  <view class="dz-page invitation-page">
    <DzNavBar title="邀请有奖" :back-action="goBack" />

    <main class="dz-container page-content">
      <view v-if="loading" class="loading-stack"><view class="dz-skeleton hero-skeleton" /><view class="dz-skeleton section-skeleton" /></view>
      <NetworkState v-else-if="error" :message="error" error @retry="load" />
      <template v-else-if="data">
        <section class="invite-hero">
          <view class="hero-rays" /><view class="hero-orb orb-one" /><view class="hero-orb orb-two" />
          <view class="hero-badge">邀</view>
          <text class="hero-title">邀请好友 一起玩</text>
          <text class="hero-subtitle">好友完成有效注册和首单，你可分两次获得奖励</text>
          <view class="reward-pair">
            <view class="reward-card"><text>好友注册</text><view><small>¥</small><b>{{ amount(data.campaign.registration_reward_template?.face_amount) }}</b></view><p>{{ data.campaign.registration_reward_template?.min_order_amount ? '满减奖励券' : '无门槛券' }}</p></view>
            <text class="reward-plus">+</text>
            <view class="reward-card"><text>好友首单</text><view><small>¥</small><b>{{ amount(data.campaign.first_order_reward_template?.face_amount) }}</b></view><p>首单完成大额券</p></view>
          </view>
          <!-- #ifdef MP-WEIXIN -->
          <button class="share-button" open-type="share" :disabled="!data.campaign.invitation_enabled" hover-class="share-button--pressed"><text>↗</text>{{ data.campaign.invitation_enabled ? '立即邀请好友' : '活动暂未开放' }}</button>
          <!-- #endif -->
          <!-- #ifndef MP-WEIXIN -->
          <button class="share-button" :disabled="!data.campaign.invitation_enabled" hover-class="share-button--pressed" @tap="copyInvitation"><text>↗</text>{{ data.campaign.invitation_enabled ? '复制邀请信息' : '活动暂未开放' }}</button>
          <!-- #endif -->
          <text class="hero-footnote">微信好友与群聊均可分享</text>
        </section>

        <section class="steps-section">
          <text class="section-title">如何获得奖励</text>
          <view class="steps">
            <view><i>01</i><span class="step-icon">↗</span><b>分享邀请</b><p>发送给还未注册的好友</p></view>
            <view><i>02</i><span class="step-icon">人</span><b>好友注册</b><p>你得注册奖励，好友领礼包</p></view>
            <view><i>03</i><span class="step-icon">券</span><b>好友首单</b><p>订单完成后再得大额券</p></view>
          </view>
        </section>

        <section class="newcomer-callout" role="button" hover-class="newcomer-callout--pressed" @tap="openNewcomerGift">
          <view class="gift-icon">礼</view><view><text>好友注册即领新人礼包</text><p>{{ giftDescription }}</p></view><text class="gift-arrow">›</text>
        </section>

        <section class="records-section">
          <view class="section-head"><text class="section-title">我的邀请</text><text>累计 {{ data.summary.registered_count }} 人</text></view>
          <view class="stats"><view><text>已邀请注册</text><b>{{ data.summary.registered_count }}</b><small>人</small></view><view><text>注册奖励</text><b>{{ data.summary.registration_reward_count }}</b><small>张</small></view><view><text>首单奖励</text><b>{{ data.summary.first_order_reward_count }}</b><small>张</small></view></view>
          <view v-if="data.items.length" class="record-list">
            <view v-for="item in data.items" :key="item.public_id" class="record-row">
              <view class="avatar">{{ item.invitee_name.slice(0, 1) }}</view>
              <view class="record-main"><text>{{ item.invitee_name }}</text><small>{{ dateText(item.registered_at) }} 注册</small><view class="reward-progress"><span>注册奖励 <i class="done">已到账</i></span><span>首单奖励 <i :class="{ done: item.first_order_rewarded }">{{ item.first_order_rewarded ? '已到账' : '待首单' }}</i></span></view></view>
            </view>
          </view>
          <view v-else class="empty-record"><text>还没有邀请记录</text><p>分享给好友，第一份奖励正在等你</p></view>
        </section>

        <section class="rules-note"><text>有效邀请说明</text><p>好友须通过你的邀请入口首次注册并完成手机号校验。同一新用户只能绑定一名邀请人；已有账号、重复注册和自邀不计入奖励。</p></section>
      </template>
    </main>
  </view>
</template>

<script setup lang="ts">
import { navigateBackOr } from '@/utils/navigation'
import DzNavBar from '@/components/DzNavBar.vue'
import { computed, ref } from 'vue'
import { onShareAppMessage, onShareTimeline, onShow } from '@dcloudio/uni-app'

import NetworkState from '@/components/NetworkState.vue'
import { getMyInvitations } from '@/services/growth'
import { guardCurrentPage } from '@/services/session'
import type { MyInvitationSummary } from '@/types/api'
import { getErrorMessage } from '@/utils/formatters'

const data = ref<MyInvitationSummary | null>(null)
const loading = ref(true)
const error = ref('')
const giftDescription = computed(() => {
  const items = data.value?.campaign.newcomer_gift_templates || []
  return items.length ? `${items.length} 张优惠券自动到账，无需手动领取` : '注册后礼包自动放入账户'
})
const amount = (value?: number) => value == null ? '--' : String(value / 100).replace(/\.00$/, '')
const dateText = (value: string) => value.slice(0, 10)
function goBack() { navigateBackOr(() => uni.reLaunch({ url: '/pages/profile/index' })) }
function openNewcomerGift() { uni.navigateTo({ url: `/pages/invitations/newcomer?invite_code=${encodeURIComponent(data.value?.invite_code || '')}` }) }
function sharePath() { return `/pages/invitations/newcomer?invite_code=${encodeURIComponent(data.value?.invite_code || '')}` }
function copyInvitation() {
  const link = typeof location === 'undefined'
    ? sharePath()
    : `${location.origin}${location.pathname}#${sharePath()}`
  uni.setClipboardData({ data: `我给你准备了一份新人礼包：${link}` })
}
async function load() {
  loading.value = true; error.value = ''
  try { data.value = (await getMyInvitations()).data }
  catch (reason) { error.value = getErrorMessage(reason, '邀请信息加载失败') }
  finally { loading.value = false }
}
onShow(() => { if (guardCurrentPage()) void load() })
onShareAppMessage(() => ({ title: '来乐搭伴一起玩，送你新人专属礼包', path: sharePath() }))
onShareTimeline(() => ({ title: '来乐搭伴一起玩，送你新人专属礼包', query: `invite_code=${encodeURIComponent(data.value?.invite_code || '')}` }))
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;
.invitation-page {
  background: $dz-surface-page;
}

.topbar {
  position: sticky;
  z-index: 20;
  top: 0;
  background: $dz-surface-glass-strong;
}

.page-title {
  color: $dz-text-primary;
  font-size: $dz-fs-title;
  font-weight: $dz-fw-bold;
}

.head-space {
  width: 72rpx;
  height: 72rpx;
}

.page-content {
  padding-top: $dz-space-3;
  padding-bottom: calc(#{$dz-space-6} + env(safe-area-inset-bottom));
}

.invite-hero {
  position: relative;
  overflow: hidden;
  padding: $dz-space-5 $dz-space-4 $dz-space-4;
  border-radius: $dz-radius-lg;
  color: $dz-text-inverse;
  background: linear-gradient(145deg, $dz-invite-primary, $dz-invite-deep);
  box-shadow: $dz-shadow-raised;
  text-align: center;
}

.hero-rays {
  position: absolute;
  inset: 0;
  background: repeating-conic-gradient(from 250deg at 50% 115%, transparent 0deg, transparent 12deg, $dz-hero-ray 13deg, transparent 25deg);
}

.hero-orb {
  position: absolute;
  border-radius: 50%;
  background: $dz-surface-highlight;
  opacity: .1;
}

.orb-one {
  top: -130rpx;
  left: -90rpx;
  width: 350rpx;
  height: 350rpx;
}

.orb-two {
  right: -110rpx;
  bottom: -160rpx;
  width: 400rpx;
  height: 400rpx;
}

.hero-badge {
  position: absolute;
  z-index: 2;
  top: $dz-space-4;
  right: $dz-space-4;
  display: flex;
  width: 72rpx;
  height: 72rpx;
  align-items: center;
  justify-content: center;
  border: 4rpx solid $dz-surface-highlight;
  border-radius: 50%;
  color: $dz-reward-gold-deep;
  background: $dz-reward-gold;
  box-shadow: $dz-shadow-card;
  font-weight: $dz-fw-bold;
}

.hero-title,
.hero-subtitle {
  position: relative;
  z-index: 1;
  display: block;
}

.hero-title {
  font-size: 48rpx;
  font-weight: $dz-fw-bold;
  line-height: 64rpx;
  letter-spacing: -1rpx;
}

.hero-subtitle {
  margin-top: $dz-space-1;
  color: $dz-invite-soft;
  font-size: $dz-fs-caption;
  line-height: $dz-lh-body;
}

.reward-pair {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 40rpx 1fr;
  align-items: center;
  gap: $dz-space-2;
  margin-top: $dz-space-4;
}

.reward-card {
  min-width: 0;
  padding: $dz-space-3;
  border: 1rpx solid $dz-border-hero;
  border-radius: $dz-radius-md;
  background: $dz-surface-hero-glass;
  box-shadow: inset 0 1rpx 0 $dz-border-hero;
}

.reward-card > text,
.reward-card p {
  display: block;
  color: $dz-text-inverse;
  font-size: $dz-fs-micro;
  font-weight: $dz-fw-medium;
}

.reward-card view {
  display: flex;
  align-items: baseline;
  justify-content: center;
  margin: $dz-space-1 0;
  color: $dz-text-inverse;
}

.reward-card small {
  margin-right: $dz-space-1;
  font-size: $dz-fs-caption;
  font-weight: $dz-fw-semibold;
}

.reward-card b {
  font-size: 52rpx;
  font-weight: $dz-fw-bold;
  line-height: 1;
  letter-spacing: -1rpx;
}

.reward-card p {
  overflow: hidden;
  margin: 0;
  color: $dz-invite-soft;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reward-plus {
  color: $dz-text-inverse;
  font-size: $dz-fs-price-md;
  font-weight: $dz-fw-bold;
}

.share-button {
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  height: 96rpx;
  align-items: center;
  justify-content: center;
  gap: $dz-space-2;
  margin-top: $dz-space-4;
  border: 0;
  border-radius: $dz-radius-full;
  color: $dz-reward-gold-deep;
  background: linear-gradient(180deg, $dz-text-inverse, $dz-reward-gold);
  box-shadow: $dz-shadow-card;
  font-size: $dz-fs-body-strong;
  font-weight: $dz-fw-bold;
  transition: transform $dz-duration-fast $dz-ease-out, opacity $dz-duration-fast $dz-ease-standard;
}

.share-button::after {
  display: none;
}

.share-button[disabled] {
  opacity: .58;
}

.share-button--pressed {
  transform: scale(.98);
  opacity: .9;
}

.hero-footnote {
  position: relative;
  z-index: 1;
  display: block;
  margin-top: $dz-space-2;
  color: $dz-invite-soft;
  font-size: $dz-fs-micro;
}

.steps-section {
  margin-top: $dz-space-4;
}

.records-section {
  margin-top: $dz-space-4;
  padding: $dz-space-4;
  border-radius: $dz-radius-lg;
  background: $dz-surface-card;
  box-shadow: $dz-shadow-card;
}

.section-title {
  color: $dz-text-primary;
  font-size: $dz-fs-heading;
  font-weight: $dz-fw-bold;
}

.steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $dz-space-2;
  margin-top: $dz-space-3;
}

.steps > view {
  position: relative;
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  padding: $dz-space-4 $dz-space-2 $dz-space-3;
  border: 1rpx solid $dz-border-subtle;
  border-radius: $dz-radius-md;
  background: $dz-surface-card;
  box-shadow: $dz-shadow-card;
  text-align: center;
}

.steps > view:not(:last-child)::after {
  position: absolute;
  z-index: 2;
  top: 50%;
  right: -13rpx;
  width: 10rpx;
  height: 10rpx;
  border: 4rpx solid $dz-surface-page;
  border-radius: 50%;
  background: $dz-border-subtle;
  content: '';
  transform: translateY(-50%);
}

.steps i {
  position: absolute;
  top: $dz-space-1;
  left: $dz-space-2;
  color: $dz-text-secondary;
  font-size: $dz-fs-micro;
  font-style: normal;
  font-weight: $dz-fw-semibold;
}

.step-icon {
  display: flex;
  width: 64rpx;
  height: 64rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: $dz-brand-deep;
  background: $dz-brand-soft;
  font-size: $dz-fs-caption;
  font-weight: $dz-fw-bold;
}

.steps > view:nth-child(2) .step-icon {
  color: $dz-newcomer-deep;
  background: $dz-newcomer-soft;
}

.steps > view:nth-child(3) .step-icon {
  color: $dz-invite-deep;
  background: $dz-invite-soft;
}

.steps b {
  margin-top: $dz-space-2;
  color: $dz-text-primary;
  font-size: $dz-fs-caption;
}

.steps p {
  margin: $dz-space-1 0 0;
  color: $dz-text-secondary;
  font-size: $dz-fs-micro;
  line-height: $dz-lh-micro;
}

.newcomer-callout {
  display: grid;
  grid-template-columns: 72rpx 1fr 32rpx;
  align-items: center;
  gap: $dz-space-3;
  margin-top: $dz-space-4;
  padding: $dz-space-4;
  border: 1rpx solid $dz-border-material;
  border-radius: $dz-radius-md;
  background: $dz-newcomer-soft;
  transition: transform $dz-duration-fast $dz-ease-out, opacity $dz-duration-fast $dz-ease-standard;
}

.newcomer-callout--pressed {
  transform: scale(.985);
  opacity: .88;
}

.gift-icon {
  display: flex;
  width: 72rpx;
  height: 72rpx;
  align-items: center;
  justify-content: center;
  border-radius: $dz-radius-md;
  color: $dz-newcomer-deep;
  background: $dz-surface-card;
  font-weight: $dz-fw-bold;
}

.newcomer-callout view text {
  color: $dz-text-primary;
  font-size: $dz-fs-body-strong;
  font-weight: $dz-fw-semibold;
}

.newcomer-callout p {
  margin: $dz-space-1 0 0;
  color: $dz-text-secondary;
  font-size: $dz-fs-micro;
}

.gift-arrow {
  color: $dz-newcomer-primary;
  font-size: $dz-fs-title;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-head > text:last-child {
  color: $dz-text-secondary;
  font-size: $dz-fs-caption;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $dz-space-2;
  margin-top: $dz-space-3;
}

.stats view {
  padding: $dz-space-3 $dz-space-2;
  border-radius: $dz-radius-sm;
  background: $dz-surface-subtle;
  text-align: center;
}

.stats text {
  display: block;
  color: $dz-text-secondary;
  font-size: $dz-fs-micro;
  font-weight: $dz-fw-medium;
}

.stats b {
  display: inline-block;
  margin-top: $dz-space-1;
  color: $dz-text-primary;
  font-size: $dz-fs-title;
  font-weight: $dz-fw-bold;
  line-height: $dz-lh-title;
}

.stats view:not(:first-child) b {
  color: $dz-invite-deep;
}

.stats small {
  margin-left: 4rpx;
  color: $dz-text-secondary;
  font-size: $dz-fs-micro;
  font-weight: $dz-fw-medium;
}

.record-list {
  margin-top: $dz-space-3;
}

.record-row {
  display: grid;
  grid-template-columns: 72rpx 1fr;
  gap: $dz-space-3;
  padding: $dz-space-3 0;
  border-top: 1rpx solid $dz-border-subtle;
}

.avatar {
  display: flex;
  width: 72rpx;
  height: 72rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: $dz-brand-deep;
  background: $dz-brand-soft;
  font-weight: $dz-fw-bold;
}

.record-row:nth-child(even) .avatar {
  color: $dz-newcomer-deep;
  background: $dz-newcomer-soft;
}

.record-main > text {
  color: $dz-text-primary;
  font-size: $dz-fs-body;
  font-weight: $dz-fw-semibold;
}

.record-main > small {
  display: block;
  margin-top: 4rpx;
  color: $dz-text-secondary;
  font-size: $dz-fs-micro;
}

.reward-progress {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $dz-space-2;
  margin-top: $dz-space-2;
}

.reward-progress span {
  display: flex;
  justify-content: space-between;
  padding: $dz-space-2;
  border-radius: $dz-radius-sm;
  color: $dz-text-secondary;
  background: $dz-surface-subtle;
  font-size: $dz-fs-micro;
}

.reward-progress i {
  color: $dz-status-warning-deep;
  font-style: normal;
  font-weight: $dz-fw-semibold;
}

.reward-progress i.done {
  color: $dz-status-success;
}

.empty-record {
  padding: $dz-space-5;
  text-align: center;
}

.empty-record text {
  font-size: $dz-fs-body-strong;
  font-weight: $dz-fw-semibold;
}

.empty-record p {
  margin: $dz-space-2 0 0;
  color: $dz-text-secondary;
  font-size: $dz-fs-caption;
}

.rules-note {
  margin-top: $dz-space-4;
  padding: $dz-space-4;
  border-radius: $dz-radius-md;
  color: $dz-text-secondary;
  background: $dz-brand-soft;
}

.rules-note text {
  color: $dz-text-primary;
  font-size: $dz-fs-caption;
  font-weight: $dz-fw-semibold;
}

.rules-note p {
  margin: $dz-space-1 0 0;
  font-size: $dz-fs-micro;
  line-height: $dz-lh-caption;
}

.loading-stack {
  display: flex;
  flex-direction: column;
  gap: $dz-space-4;
}

.hero-skeleton {
  height: 660rpx;
  border-radius: $dz-radius-lg;
}

.section-skeleton {
  height: 300rpx;
  border-radius: $dz-radius-lg;
}

@media (prefers-reduced-motion: reduce) {
  .share-button,
  .newcomer-callout {
    transition: opacity $dz-duration-fast $dz-ease-standard;
  }

  .share-button--pressed,
  .newcomer-callout--pressed {
    transform: none;
  }
}
</style>
