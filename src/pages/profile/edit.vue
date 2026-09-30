<template>
  <view class="dz-page edit-profile-page">
    <DzNavBar title="编辑个人资料" :back-action="goBack" />

    <main class="edit-content dz-container">
      <section class="avatar-section">
        <view class="avatar" role="button" aria-label="更换头像" @tap="chooseAvatar">
          <image v-if="avatarPreview" :src="avatarPreview" mode="aspectFill" />
          <text v-else>{{ nickname.slice(0, 1) || '乐' }}</text>
          <view class="camera">相机</view>
        </view>
        <strong>更换头像</strong>
        <text>支持 JPG、PNG、WebP，大小不超过 5MB</text>
      </section>

      <section class="form-panel">
        <label class="form-row" :class="{ invalid: saveAttempted && !nickname.trim() }">
          <text>昵称</text>
          <input v-model="nickname" maxlength="30" placeholder="请输入昵称" />
          <small>{{ nickname.trim().length }}/30</small>
          <text v-if="saveAttempted && !nickname.trim()" class="field-error">昵称至少填写1个字</text>
        </label>

        <view class="form-row" role="button" @tap="genderSheetVisible = true">
          <text>性别</text>
          <view class="field-value" :class="{ placeholder: gender === 'unspecified' }">{{ genderLabel }}</view>
          <text class="chevron">›</text>
        </view>

        <picker mode="date" :value="birthDate" :end="today" @change="changeBirthDate">
          <view class="form-row">
            <text>生日</text>
            <view class="field-value" :class="{ placeholder: !birthDate }">{{ birthDate || '请选择生日' }}</view>
            <text class="chevron">›</text>
          </view>
        </picker>

        <view class="form-row phone-row dz-tappable" role="button" aria-label="修改登录手机号" hover-class="dz-pressed" @tap="openPhoneChange">
          <text>手机号</text>
          <view class="field-value">{{ maskedPhone }}</view>
          <text class="phone-action">修改</text>
          <text class="chevron">›</text>
        </view>

        <button class="form-row wechat-row dz-tappable" :class="{ 'wechat-row--bound': wechat.currentBound.value }" :disabled="saving || wechat.busy.value || wechat.loading.value || wechat.currentBound.value" aria-label="微信绑定" hover-class="dz-pressed" @tap="wechat.bind" @keydown.enter.prevent="wechat.bind" @keydown.space.prevent="wechat.bind">
          <text>微信</text>
          <view class="field-value">{{ wechat.statusLabel.value }}</view>
          <text v-if="wechat.actionLabel.value" class="phone-action">{{ wechat.actionLabel.value }}</text>
          <text v-if="!wechat.currentBound.value" class="chevron" aria-hidden="true">›</text>
        </button>
      </section>

      <button class="save-button" :class="{ blocked: saveAttempted && !canSave }" :disabled="saving || wechat.busy.value" role="button" :tabindex="saving || wechat.busy.value ? -1 : 0" @tap="save" @keydown.enter.prevent="save" @keydown.space.prevent="save">
        {{ saving ? '保存中…' : '保存修改' }}
      </button>
    </main>

    <view v-if="genderSheetVisible" class="sheet-mask" @tap="genderSheetVisible = false">
      <section class="bottom-sheet" @tap.stop>
        <view class="sheet-handle" />
        <header><strong>选择性别</strong><text @tap="genderSheetVisible = false">×</text></header>
        <view class="gender-options">
          <button v-for="item in genderOptions" :key="item.value" :class="{ active: gender === item.value }" @tap="selectGender(item.value)">
            <text>{{ item.label }}</text><i>{{ gender === item.value ? '✓' : '' }}</i>
          </button>
        </view>
      </section>
    </view>
  </view>
</template>

<script setup lang="ts">
import { navigateBackOr } from '@/utils/navigation'
import DzNavBar from '@/components/DzNavBar.vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { computed, ref, shallowRef } from 'vue'

import { getCurrentUser, updateCurrentUser, uploadAvatar } from '@/services/auth'
import { guardCurrentPage } from '@/services/session'
import type { CurrentUser } from '@/types/api'
import { businessDateKey } from '@/utils/businessTime'
import { useWechatBinding } from '@/composables/useWechatBinding'

type Gender = CurrentUser['gender']

const nickname = ref('')
const phone = ref('')
const gender = ref<Gender>('unspecified')
const birthDate = ref('')
const avatarPreview = ref('')
const avatarFilePath = ref('')
const avatarFile = shallowRef<unknown>()
const genderSheetVisible = ref(false)
const saving = ref(false)
const saveAttempted = ref(false)
const profileLoaded = ref(false)
const userId = ref('')
const wechat = useWechatBinding({
  userId: () => userId.value,
  getDraft: () => ({ nickname: nickname.value, gender: gender.value, birthDate: birthDate.value }),
  restoreDraft: draft => { nickname.value = draft.nickname; gender.value = draft.gender as Gender; birthDate.value = draft.birthDate },
  hasTemporaryAvatar: () => Boolean(avatarFilePath.value),
})
const today = businessDateKey()
const genderOptions: Array<{ label: string; value: Gender }> = [
  { label: '保密', value: 'unspecified' },
  { label: '男', value: 'male' },
  { label: '女', value: 'female' },
]
const genderLabel = computed(() => genderOptions.find(item => item.value === gender.value)?.label || '请选择')
const maskedPhone = computed(() => phone.value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'))
const canSave = computed(() => nickname.value.trim().length > 0 && nickname.value.trim().length <= 30)

function goBack() { navigateBackOr(() => uni.redirectTo({ url: '/pages/settings/index' })) }
function openPhoneChange() { uni.navigateTo({ url: '/pages/security/phone' }) }
function returnToSettings() {
  if (getCurrentPages().length > 1) { uni.navigateBack(); return }
  uni.redirectTo({ url: '/pages/settings/index' })
}
function changeBirthDate(event: { detail: { value: string } }) { birthDate.value = event.detail.value }
function selectGender(value: Gender) { gender.value = value; genderSheetVisible.value = false }
function warn(title: string) { uni.showToast({ title, icon: 'none' }) }
function chooseAvatar() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: ({ tempFilePaths, tempFiles }) => {
      const file = Array.isArray(tempFiles) ? tempFiles[0] : tempFiles
      if (file?.size && file.size > 5 * 1024 * 1024) return warn('头像大小不能超过5MB')
      avatarFilePath.value = tempFilePaths[0]
      avatarFile.value = file
      avatarPreview.value = tempFilePaths[0]
    },
  })
}
async function save() {
  saveAttempted.value = true
  if (saving.value || wechat.busy.value) return
  if (!canSave.value) { warn('昵称至少填写1个字'); return }
  saving.value = true
  try {
    await updateCurrentUser({
      nickname: nickname.value.trim(), gender: gender.value, birth_date: birthDate.value || null,
    })
    if (avatarFilePath.value) {
      try { await uploadAvatar(avatarFilePath.value, avatarFile.value) }
      catch (error) {
        warn(`基本资料已保存，${(error as Error).message || '头像上传失败'}`)
        return
      }
    }
    uni.showToast({ title: '资料已更新', icon: 'success' })
    setTimeout(returnToSettings, 350)
  } catch (error) { warn((error as Error).message || '保存失败，请稍后重试') }
  finally { saving.value = false }
}

onLoad(async (query) => {
  if (!guardCurrentPage()) return
  try {
    const user = (await getCurrentUser()).data
    userId.value = user.public_id
    nickname.value = user.nickname
    phone.value = user.phone
    gender.value = user.gender
    birthDate.value = user.birth_date || ''
    avatarPreview.value = user.avatar_url || ''
    profileLoaded.value = true
    await wechat.initialize(query)
  } catch (error) { warn((error as Error).message || '资料加载失败') }
})
onShow(async () => {
  if (!profileLoaded.value) return
  try { phone.value = (await getCurrentUser()).data.phone }
  catch (error) { warn((error as Error).message || '手机号刷新失败') }
  await wechat.refresh()
})
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;

.edit-profile-page { background:$dz-surface-page; }
.edit-hero { background: linear-gradient(150deg,$dz-brand-soft, #fff); }
.page-nav { display: flex; align-items: center; justify-content: space-between; height: 94rpx; font-size:$dz-fs-heading; font-weight:$dz-fw-bold; }
.back, .nav-spacer { width: 64rpx; }
.back { font-size: 58rpx; font-weight: 300; line-height: 1; }
.edit-content { padding-top: 30rpx; padding-bottom: calc(40rpx + env(safe-area-inset-bottom)); }
.avatar-section { display: flex; flex-direction: column; align-items: center; padding: 22rpx 0 34rpx; }
.avatar { position: relative; display: flex; width: 154rpx; height: 154rpx; align-items: center; justify-content: center; border: 6rpx solid #fff; border-radius: 50%; color: $dz-brand-deep; background: $dz-brand-soft; font-size:$dz-fs-price-lg; font-weight:$dz-fw-bold; box-shadow: 0 12rpx 32rpx rgba(31, 65, 72, .13); }
.avatar image { width: 100%; height: 100%; border-radius: 50%; }
.camera { position: absolute; right: -4rpx; bottom: 2rpx; display: flex; width: 48rpx; height: 48rpx; align-items: center; justify-content: center; border: 4rpx solid #fff; border-radius: 50%; color: #fff; background: $dz-brand-primary; font-size:$dz-fs-micro; }
.avatar-section strong { margin-top: 19rpx; font-size:$dz-fs-body; }
.avatar-section > text { margin-top: 8rpx; color: $dz-text-tertiary; font-size:$dz-fs-caption; }
.form-panel { overflow: hidden; padding: 0 26rpx; border-radius:$dz-radius-md; background: #fff; box-shadow: $dz-shadow-card; }
.form-row { display: flex; align-items: center; min-height: 102rpx; border-bottom: 1rpx solid $dz-border-subtle; box-sizing: border-box; }
.form-row:last-child { border-bottom: 0; }
.form-row > text:first-child { width: 112rpx; font-size:$dz-fs-body; font-weight:$dz-fw-semibold; }
.form-row input, .field-value { min-width: 0; flex: 1; color: $dz-text-primary; font-size:$dz-fs-body; text-align: right; }
.form-row input { height: 98rpx; }
.field-value.placeholder { color: $dz-text-tertiary; }
.form-row small { margin-left: 14rpx; color: $dz-text-tertiary; font-size:$dz-fs-caption; }
.chevron { margin-left: 12rpx; color:$dz-text-tertiary; font-size:$dz-fs-title; font-weight: 300; }
.phone-row .field-value { color: $dz-text-secondary; }
.phone-action { width: auto!important; margin-left: 14rpx; color: $dz-brand-deep; font-size: $dz-fs-caption!important; font-weight: $dz-fw-semibold!important; }
.wechat-row { width:100%; min-height:max(44px, 102rpx); margin:0; padding:0; border:0; border-radius:0; background:transparent; line-height:1.4; text-align:left; }
.wechat-row::after { border:0; }
.wechat-row .field-value { color:$dz-text-secondary; }
.wechat-row--bound .field-value { color:#147d58; }
.wechat-row--bound[disabled] { opacity:1; color:$dz-text-primary; background:transparent; }
.wechat-row:focus-visible { outline:2px solid $dz-list-accent; outline-offset:-2px; }
.save-button { display: flex; align-items: center; justify-content: center; width: 100%; min-height: max(44px, 92rpx); margin-top: 34rpx; padding: $dz-space-2 $dz-space-4; border: 0; border-radius:$dz-radius-full; color: $dz-text-inverse; background: $dz-gradient-brand; font-size: max(14px, #{$dz-fs-body-strong}); font-weight: $dz-fw-bold; line-height: 1.4; box-sizing: border-box; box-shadow: $dz-shadow-brand; }
.save-button::after { border: 0; }
.save-button:focus-visible { outline: 2px solid $dz-list-accent; outline-offset: 2px; }
.save-button[disabled] { opacity: .5; }
.sheet-mask { position: fixed; z-index: 80; inset: 0; background: rgba(18, 31, 35, .5); }
.bottom-sheet { position: absolute; right: 0; bottom: 0; left: 0; max-width: 750px; margin: auto; padding: 16rpx 28rpx calc(30rpx + env(safe-area-inset-bottom)); border-radius:$dz-radius-lg 34rpx 0 0; background: #fff; }
.sheet-handle { width: 72rpx; height: 7rpx; margin: 0 auto 22rpx; border-radius: 4rpx; background:$dz-border-subtle; }
.bottom-sheet header { display: flex; align-items: center; justify-content: space-between; height: 70rpx; }
.bottom-sheet header strong { font-size:$dz-fs-body-strong; }
.bottom-sheet header text { padding: 12rpx; color: $dz-text-secondary; font-size:$dz-fs-title; }
.gender-options { margin-top: 8rpx; }
.gender-options button { display: flex; align-items: center; justify-content: space-between; width: 100%; height: 88rpx; margin: 0; padding: 0 8rpx; border: 0; border-bottom: 1rpx solid $dz-border-subtle; background: #fff; font-size:$dz-fs-body; text-align: left; }
.gender-options button::after { display: none; }
.gender-options button.active { color: $dz-brand-deep; font-weight:$dz-fw-bold; }
.gender-options i { color: $dz-brand-primary; font-style: normal; }
.form-row.invalid{border-color:$dz-status-danger;background:$dz-status-danger-soft}.field-error{width:100%;padding-bottom:12rpx;color:$dz-status-danger!important;font-size:$dz-fs-micro!important;text-align:right}.form-row{flex-wrap:wrap}.save-button.blocked{background:#d94a4a;opacity:1}
</style>
