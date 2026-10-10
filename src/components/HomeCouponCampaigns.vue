<template>
  <view class="campaign-home">
    <template v-if="items.length">
      <swiper class="campaign-swiper" :current="current" :autoplay="false" :circular="items.length > 1" :duration="250" @change="onChange">
        <swiper-item v-for="item in items" :key="item.public_id">
          <view class="campaign-banner" role="button" :aria-label="`${item.name}，查看领券活动`" @tap="open(item.public_id)">
            <image class="campaign-image" :src="item.banner_url" mode="aspectFill" />
            <button class="campaign-cta" hover-class="campaign-pressed" @tap.stop="open(item.public_id)">{{ item.claimed ? '查看好礼' : '领取好礼' }}<text class="campaign-arrow">›</text></button>
          </view>
        </swiper-item>
      </swiper>
      <view v-if="items.length > 1" class="campaign-dots" :aria-label="`第 ${current + 1} 个活动，共 ${items.length} 个`"><view v-for="(item, index) in items" :key="item.public_id" class="campaign-dot" :class="{ 'campaign-dot--active': index === current }" /></view>
    </template>
    <slot v-else />

    <DzBottomSheet :visible="visible" title="活动好礼" @close="close">
      <view class="campaign-sheet">
        <view v-if="loading" class="campaign-loading">正在获取活动…</view>
        <template v-else-if="selected">
          <image class="campaign-sheet-image" :src="selected.banner_url" mode="aspectFill" />
          <text class="campaign-title">{{ selected.name }}</text>
          <view class="campaign-coupon"><view class="campaign-amount"><text class="campaign-currency">¥</text>{{ money(selected.coupon.face_amount) }}</view><view class="campaign-coupon-info"><text class="campaign-coupon-name">{{ selected.coupon.name }}</text><text class="campaign-threshold">订单原价超过 ¥{{ money(selected.coupon.min_order_amount) }} 可用</text></view></view>
          <view class="campaign-rules"><text class="campaign-rule">{{ selected.user_coupon ? `有效期至 ${date(selected.user_coupon.expires_at)}` : `领取后 ${selected.coupon.valid_days} 天内有效` }}</text><text class="campaign-rule">领取时间：{{ date(selected.starts_at) }} — {{ date(selected.ends_at) }}</text><text class="campaign-rule">每人限领 1 张，仅限达人服务订单，每笔订单限用 1 张。</text><text v-if="selected.coupon.description" class="campaign-rule">{{ selected.coupon.description }}</text></view>
          <view v-if="selected.claimed" class="campaign-success">{{ claimedMessage }}</view>
          <button class="campaign-submit" :class="{ 'campaign-submit--disabled': claiming || (!selected.can_claim && !selected.claimed) }" hover-class="campaign-pressed" :disabled="claiming || (!selected.can_claim && !selected.claimed)" @tap="submit">{{ buttonText }}</button>
          <button class="campaign-wallet" hover-class="campaign-pressed" @tap="openWallet">查看我的优惠券 ›</button>
        </template>
        <view v-if="error" class="campaign-error" role="alert"><text>{{ error }}</text><button v-if="!selected" class="campaign-retry" @tap="open(selectedId)">重新加载</button></view>
      </view>
    </DzBottomSheet>
  </view>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import DzBottomSheet from '@/components/DzBottomSheet.vue'
import { claimCouponCampaign, getCouponCampaign } from '@/services/couponCampaigns'
import { requireAuthentication } from '@/services/session'
import { openPage } from '@/services/navigation'
import { getErrorMessage } from '@/utils/formatters'
import type { CouponCampaign } from '@/types/api'

const props = withDefaults(defineProps<{ items?: CouponCampaign[]; initialCampaignId?: string }>(), { items: () => [], initialCampaignId: '' })
const emit = defineEmits<{ claimed: [item: CouponCampaign] }>()
const current = ref(0)
const visible = ref(false)
const selected = ref<CouponCampaign | null>(null)
const selectedId = ref('')
const loading = ref(false)
const claiming = ref(false)
const error = ref('')
let requestVersion = 0
const money = (value: number) => (value / 100).toFixed(2).replace(/\.00$/, '')
const date = (value: string) => {
  const d = new Date(value)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const usable = computed(() => selected.value?.user_coupon?.status === 'available')
const claimedMessage = computed(() => {
  const status = selected.value?.user_coupon?.status
  return status === 'available' ? '已领取，好礼已放入你的优惠券' : status === 'used' ? '你已领取并使用过本次好礼' : status === 'expired' ? '你领取的优惠券已过期' : status === 'revoked' ? '你领取的优惠券已撤销' : '已领取，优惠券正在订单中使用'
})
const buttonText = computed(() => {
  if (claiming.value) return '正在领取…'
  if (selected.value?.claimed) return usable.value ? '去使用' : '查看优惠券'
  return ({ active: '立即领取', upcoming: '活动未开始', ended: '活动已结束', exhausted: '优惠券已领完', offline: '活动已下架', draft: '活动未开放' } as const)[selected.value?.state || 'draft']
})
function onChange(event: { detail: { current: number } }) { current.value = event.detail.current }
function close() { visible.value = false; requestVersion++; loading.value = false }
async function open(id: string) {
  if (!id) return
  const version = ++requestVersion
  selectedId.value = id; selected.value = null; visible.value = true; loading.value = true; error.value = ''
  try { const result = await getCouponCampaign(id); if (version === requestVersion) selected.value = result.data }
  catch (e) { if (version === requestVersion) error.value = getErrorMessage(e) }
  finally { if (version === requestVersion) loading.value = false }
}
async function submit() {
  if (claiming.value || !selected.value) return
  if (selected.value.claimed) {
    if (usable.value) { close(); openPage('/pages/providers/list') } else openWallet()
    return
  }
  if (!selected.value.can_claim || !requireAuthentication(`/pages/index/index?coupon_campaign=${encodeURIComponent(selected.value.public_id)}`)) return
  const version = requestVersion
  const id = selected.value.public_id
  claiming.value = true; error.value = ''
  try {
    const result = await claimCouponCampaign(id)
    emit('claimed', result.data)
    if (version === requestVersion) selected.value = result.data
  } catch (e) {
    if (version !== requestVersion) return
    error.value = getErrorMessage(e)
    try { const result = await getCouponCampaign(id); if (version === requestVersion) selected.value = result.data } catch { /* Retain error; retry is safe and idempotent. */ }
  } finally { claiming.value = false }
}
function openWallet() { if (requireAuthentication('/pages/coupons/index')) { close(); openPage('/pages/coupons/index') } }
watch(() => props.items, () => { if (current.value >= props.items.length) current.value = 0 })
watch(() => props.initialCampaignId, id => { if (id) void open(id) }, { immediate: true })
onBeforeUnmount(() => { requestVersion++ })
</script>

<style scoped lang="scss">
.campaign-home{position:relative}.campaign-swiper{height:402rpx;border-radius:32rpx;overflow:hidden}.campaign-banner{position:relative;height:100%;overflow:hidden;border-radius:32rpx;background:#e6f3f2}.campaign-image{width:100%;height:100%;display:block}.campaign-cta{position:absolute;left:32rpx;bottom:30rpx;display:flex;gap:22rpx;align-items:center;justify-content:center;min-height:44px;margin:0;padding:0 32rpx;border:0;border-radius:99rpx;background:#fff;color:#086b70;font-size:28rpx;font-weight:600;line-height:1.2;box-shadow:0 6rpx 20rpx rgba(7,72,78,.1)}.campaign-cta::after,.campaign-submit::after,.campaign-wallet::after,.campaign-retry::after{border:0}.campaign-arrow{font-size:36rpx}.campaign-pressed{opacity:.72}.campaign-dots{display:flex;align-items:center;justify-content:center;gap:10rpx;padding-top:16rpx;height:12rpx}.campaign-dot{width:10rpx;height:10rpx;border-radius:99rpx;background:#c4d9d8}.campaign-dot--active{width:28rpx;background:#08aeb4}.campaign-sheet{padding-top:12rpx;padding-bottom:12rpx}.campaign-sheet-image{display:block;width:100%;height:246rpx;border-radius:24rpx;background:#e6f3f2}.campaign-title{display:block;font-size:38rpx;line-height:1.4;font-weight:700;color:#172126;margin:28rpx 0 24rpx}.campaign-coupon{display:flex;align-items:center;gap:28rpx;padding:26rpx;border-radius:24rpx;background:#f3faf9;border:1rpx solid #e1efed}.campaign-amount{flex:none;font-size:62rpx;line-height:1.2;font-weight:700;color:#e8501f}.campaign-currency{font-size:30rpx;margin-right:6rpx}.campaign-coupon-info{min-width:0}.campaign-coupon-name{display:block;font-size:30rpx;font-weight:600;color:#172126;line-height:1.4}.campaign-threshold{display:block;margin-top:8rpx;color:#66737a;font-size:24rpx;line-height:1.5}.campaign-rules{padding:24rpx 4rpx}.campaign-rule{display:block;margin:8rpx 0;color:#66737a;font-size:24rpx;line-height:1.6;white-space:pre-wrap}.campaign-success{margin-bottom:20rpx;border-radius:18rpx;background:#e5f5ed;padding:20rpx;color:#25714f;font-size:26rpx;line-height:1.5}.campaign-submit{display:flex;align-items:center;justify-content:center;min-height:48px;margin:0;padding:24rpx;border-radius:24rpx;background:#087b80;color:white;font-size:30rpx;line-height:1.3;font-weight:600}.campaign-submit--disabled{background:#e2e9e9;color:#839395}.campaign-wallet,.campaign-retry{display:flex;align-items:center;justify-content:center;min-height:44px;background:transparent;color:#08787e;font-size:26rpx;line-height:1.4;margin:8rpx 0 0;padding:12rpx}.campaign-error{color:#b84028;background:#fff3ee;border-radius:16rpx;padding:20rpx;font-size:26rpx;line-height:1.6}.campaign-loading{padding:70rpx 24rpx;text-align:center;font-size:28rpx;color:#66737a}
</style>
