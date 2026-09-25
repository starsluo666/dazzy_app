<template>
  <view class="dz-page newcomer-page">
    <view class="topbar"><view class="dz-safe-top" /><view class="dz-page-head dz-container"><button aria-label="返回" hover-class="dz-pressed" @tap="goBack">‹</button><text class="page-title">新人礼包</text><view class="head-space" /></view></view>
    <main class="dz-container page-content">
      <view v-if="loading" class="dz-skeleton page-skeleton" />
      <NetworkState v-else-if="error" :message="error" error @retry="load" />
      <template v-else-if="campaign">
        <section class="gift-hero">
          <view class="hero-rays" /><view class="hero-orb orb-one" /><view class="hero-orb orb-two" /><view class="hero-badge">礼</view>
          <text class="hero-title">新人专属礼包</text><text class="hero-subtitle">注册成功后自动放入你的账户</text>
          <view class="hero-coupons" :class="`coupon-count-${Math.min(campaign.newcomer_gift_templates.length, 3)}`">
            <view v-for="item in campaign.newcomer_gift_templates.slice(0, 3)" :key="item.public_id"><text>{{ item.min_order_amount ? '满减' : '无门槛' }}</text><view><small>{{ item.min_order_amount ? '减' : '¥' }}</small><b>{{ amount(item.face_amount) }}</b></view><p>{{ heroThreshold(item) }}</p></view>
          </view>
          <button class="hero-action" :disabled="actionDisabled" hover-class="hero-action--pressed" @tap="primaryAction">{{ actionLabel }}</button>
          <text class="hero-footnote">每位有效新用户限领一次</text>
        </section>

        <section class="detail-card">
          <view class="section-head"><text>礼包明细</text><small>共 {{ campaign.newcomer_gift_templates.length }} 张 · 注册自动到账</small></view>
          <view v-if="campaign.newcomer_gift_templates.length" class="gift-list">
            <view v-for="item in campaign.newcomer_gift_templates" :key="item.public_id"><i :class="{ threshold: item.min_order_amount }">{{ item.min_order_amount ? '满减' : '无门槛' }}</i><view><text>{{ item.name }} · ¥{{ amount(item.face_amount) }}</text><p>{{ threshold(item) }} · 领取后 {{ item.valid_days }} 天有效</p></view></view>
          </view>
          <view v-else class="empty-gift">礼包内容正在准备中</view>
        </section>

        <section class="usage-note"><view>i</view><text>优惠券可在“我的优惠券”中查看；每笔达人服务订单限用一张，不与其他优惠券叠加。邀请关系以首次成功注册时绑定的记录为准。</text></section>
      </template>
    </main>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'

import NetworkState from '@/components/NetworkState.vue'
import { getGrowthCampaign, savePendingInviteCode } from '@/services/growth'
import { isAuthenticated } from '@/services/session'
import type { GrowthCampaign, GrowthCouponTemplate } from '@/types/api'
import { getErrorMessage } from '@/utils/formatters'

const campaign = ref<GrowthCampaign | null>(null)
const loading = ref(true), error = ref(''), inviteCode = ref('')
const amount = (value: number) => String(value / 100).replace(/\.00$/, '')
const threshold = (item: GrowthCouponTemplate) => item.min_order_amount ? `订单原价大于 ¥${amount(item.min_order_amount)} 可用` : '订单原价任意金额可用'
const heroThreshold = (item: GrowthCouponTemplate) => item.min_order_amount ? `满 ¥${amount(item.min_order_amount)} 可用` : '下单直接抵扣'
const actionLabel = computed(() => {
  if (!campaign.value?.newcomer_gift_enabled) return '礼包暂未开放'
  if (campaign.value.viewer.status === 'received') return '礼包已到账，去逛达人服务'
  if (campaign.value.viewer.status === 'not_eligible') return '去逛逛达人服务'
  if (!campaign.value.invitation_valid) return '邀请链接无效'
  return '登录 / 注册领取礼包'
})
const actionDisabled = computed(() => !campaign.value?.newcomer_gift_enabled || (
  !isAuthenticated() && !campaign.value.invitation_valid
))
function goBack() { uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/index/index' }) }) }
function primaryAction() {
  if (!campaign.value?.newcomer_gift_enabled || actionDisabled.value) return
  if (isAuthenticated()) { uni.navigateTo({ url: '/pages/providers/list' }); return }
  const current = `/pages/invitations/newcomer${inviteCode.value ? `?invite_code=${encodeURIComponent(inviteCode.value)}` : ''}`
  uni.navigateTo({ url: `/pages/auth/login?redirect=${encodeURIComponent(current)}${inviteCode.value ? `&invite_code=${encodeURIComponent(inviteCode.value)}` : ''}` })
}
async function load() {
  loading.value = true; error.value = ''
  try { campaign.value = (await getGrowthCampaign(inviteCode.value)).data }
  catch (reason) { error.value = getErrorMessage(reason, '新人礼包加载失败') }
  finally { loading.value = false }
}
onLoad((query) => { if (typeof query?.invite_code === 'string') { inviteCode.value = query.invite_code; if (!isAuthenticated()) savePendingInviteCode(query.invite_code) } })
onShow(load)
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;
.newcomer-page {
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

.gift-hero {
  position: relative;
  overflow: hidden;
  padding: $dz-space-5 $dz-space-4 $dz-space-4;
  border-radius: $dz-radius-lg;
  color: $dz-text-inverse;
  background: linear-gradient(145deg, $dz-newcomer-primary, $dz-newcomer-deep);
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
  top: -150rpx;
  left: -100rpx;
  width: 400rpx;
  height: 400rpx;
}

.orb-two {
  right: -120rpx;
  bottom: -170rpx;
  width: 430rpx;
  height: 430rpx;
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
  color: $dz-newcomer-soft;
  font-size: $dz-fs-caption;
  line-height: $dz-lh-body;
}

.hero-coupons {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $dz-space-2;
  margin-top: $dz-space-4;
}

.hero-coupons.coupon-count-2 {
  grid-template-columns: repeat(2, 1fr);
}

.hero-coupons.coupon-count-1 {
  grid-template-columns: 1fr;
}

.hero-coupons > view {
  min-width: 0;
  padding: $dz-space-3 $dz-space-2;
  border: 1rpx solid $dz-border-hero;
  border-radius: $dz-radius-md;
  background: $dz-surface-hero-glass;
  box-shadow: inset 0 1rpx 0 $dz-border-hero;
}

.hero-coupons text,
.hero-coupons p {
  display: block;
  color: $dz-text-inverse;
  font-size: $dz-fs-micro;
  font-weight: $dz-fw-medium;
}

.hero-coupons view view {
  display: flex;
  align-items: baseline;
  justify-content: center;
  margin: $dz-space-1 0;
  color: $dz-text-inverse;
}

.hero-coupons small {
  margin-right: 4rpx;
  font-size: $dz-fs-caption;
  font-weight: $dz-fw-semibold;
}

.hero-coupons b {
  font-size: $dz-fs-price-lg;
  font-weight: $dz-fw-bold;
  line-height: 1;
  letter-spacing: -1rpx;
}

.hero-coupons p {
  overflow: hidden;
  margin: 0;
  color: $dz-newcomer-soft;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hero-action {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 96rpx;
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

.hero-action::after {
  display: none;
}

.hero-action[disabled] {
  opacity: .58;
}

.hero-action--pressed {
  transform: scale(.98);
  opacity: .9;
}

.hero-footnote {
  position: relative;
  z-index: 1;
  display: block;
  margin-top: $dz-space-2;
  color: $dz-newcomer-soft;
  font-size: $dz-fs-micro;
}

.detail-card {
  margin-top: $dz-space-4;
  padding: $dz-space-4;
  border-radius: $dz-radius-lg;
  background: $dz-surface-card;
  box-shadow: $dz-shadow-card;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $dz-space-3;
}

.section-head text {
  color: $dz-text-primary;
  font-size: $dz-fs-heading;
  font-weight: $dz-fw-bold;
}

.section-head small {
  color: $dz-text-secondary;
  font-size: $dz-fs-micro;
}

.gift-list {
  margin-top: $dz-space-3;
}

.gift-list > view {
  display: grid;
  grid-template-columns: 72rpx 1fr;
  align-items: center;
  gap: $dz-space-3;
  padding: $dz-space-3 0;
  border-top: 1rpx solid $dz-border-subtle;
}

.gift-list i {
  display: flex;
  width: 72rpx;
  height: 72rpx;
  align-items: center;
  justify-content: center;
  border-radius: $dz-radius-sm;
  color: $dz-text-inverse;
  background: $dz-invite-primary;
  font-size: $dz-fs-micro;
  font-style: normal;
  font-weight: $dz-fw-bold;
}

.gift-list i.threshold {
  background: $dz-brand-deep;
}

.gift-list text {
  color: $dz-text-primary;
  font-size: $dz-fs-body;
  font-weight: $dz-fw-semibold;
}

.gift-list p {
  margin: $dz-space-1 0 0;
  color: $dz-text-secondary;
  font-size: $dz-fs-micro;
  line-height: $dz-lh-micro;
}

.empty-gift {
  padding: $dz-space-6;
  color: $dz-text-secondary;
  text-align: center;
}

.usage-note {
  display: grid;
  grid-template-columns: 40rpx 1fr;
  align-items: start;
  gap: $dz-space-3;
  margin-top: $dz-space-4;
  padding: $dz-space-4;
  border-radius: $dz-radius-md;
  color: $dz-text-secondary;
  background: $dz-brand-soft;
}

.usage-note view {
  display: flex;
  width: 36rpx;
  height: 36rpx;
  align-items: center;
  justify-content: center;
  border: 2rpx solid $dz-brand-deep;
  border-radius: 50%;
  color: $dz-brand-deep;
  font-size: $dz-fs-micro;
  font-weight: $dz-fw-bold;
}

.usage-note text {
  font-size: $dz-fs-micro;
  line-height: $dz-lh-caption;
}

.page-skeleton {
  height: 960rpx;
  border-radius: $dz-radius-lg;
}

@media (prefers-reduced-motion: reduce) {
  .hero-action {
    transition: opacity $dz-duration-fast $dz-ease-standard;
  }

  .hero-action--pressed {
    transform: none;
  }
}
</style>
