import { computed, onBeforeUnmount, ref } from 'vue'
import { bindWechatMobile, completeWechatH5Binding, getWechatBindingStatus, startWechatH5Binding, type WechatBindingChannel, type WechatBindingStatus } from '@/services/wechatBinding'
import { isWechatBrowser } from '@/services/wechatPay'

const PENDING_KEY = 'dazzy.wechatBinding.pending'
export interface ProfileBindingDraft { nickname: string; gender: string; birthDate: string }
interface DraftOptions {
  userId: () => string
  getDraft: () => ProfileBindingDraft
  restoreDraft: (draft: ProfileBindingDraft) => void
  hasTemporaryAvatar: () => boolean
}

export function useWechatBinding(options: DraftOptions) {
  const status = ref<WechatBindingStatus | null>(null), busy = ref(false), loading = ref(false), error = ref('')
  const channel = ref<WechatBindingChannel | ''>(''), available = ref(false)
  let disposed = false, version = 0
  const currentBound = computed(() => Boolean(status.value && (channel.value ? status.value.channels.includes(channel.value) : status.value.bound)))
  const statusLabel = computed(() => busy.value ? '绑定中…' : loading.value ? '加载中…' : error.value ? '状态加载失败' : !status.value ? '待确认' : currentBound.value ? '已绑定' : status.value.bound ? '当前端未绑定' : '未绑定')
  const actionLabel = computed(() => error.value ? '重试' : currentBound.value || busy.value || loading.value || !status.value ? '' : '去绑定')
  function warn(title: string) { if (!disposed) uni.showToast({ title, icon: 'none' }) }
  function accept(result: WechatBindingStatus) {
    if (!result || typeof result.bound !== 'boolean' || !Array.isArray(result.channels) || result.channels.some(item => item !== 'official_account' && item !== 'mobile_app') || result.bound !== Boolean(result.channels.length)) throw new Error('微信绑定状态异常，请重试')
    status.value = result
    error.value = ''
  }
  async function refresh() {
    if (disposed || busy.value) return
    const requestVersion = ++version
    loading.value = true
    try {
      const result = (await getWechatBindingStatus()).data
      if (!disposed && version === requestVersion) accept(result)
    } catch (reason) { if (!disposed && version === requestVersion) { status.value = null; error.value = reason instanceof Error ? reason.message : '微信绑定状态加载失败' } }
    finally { if (!disposed && version === requestVersion) loading.value = false }
  }
  function cleanCallbackUrl() {
    // #ifdef H5
    const url = new URL(window.location.href)
    const [route, query = ''] = url.hash.replace(/^#/, '').split('?')
    const params = new URLSearchParams(query)
    for (const key of ['wechatBindTicket', 'wechatBindState', 'wechatBindError']) { params.delete(key); url.searchParams.delete(key) }
    const cleanQuery = params.toString()
    url.hash = route ? `#${route}${cleanQuery ? '?' + cleanQuery : ''}` : ''
    const pages = getCurrentPages()
    const page = pages[pages.length - 1] as { options?: Record<string, unknown> } | undefined
    for (const key of ['wechatBindTicket', 'wechatBindState', 'wechatBindError']) { if (page?.options) delete page.options[key] }
    window.history.replaceState(window.history.state, '', url.toString())
    // #endif
  }
  async function initialize(query?: Record<string, unknown>) {
    // #ifdef H5
    channel.value = 'official_account'
    available.value = isWechatBrowser()
    // #endif
    // #ifdef APP-PLUS
    channel.value = 'mobile_app'
    await new Promise<void>(resolve => uni.getProvider({ service: 'oauth', success: result => { available.value = Boolean((result.provider as string[])?.includes('weixin')); resolve() }, fail: () => resolve() }))
    // #endif
    // #ifdef H5
    if (query?.wechatBindTicket || query?.wechatBindError) {
      // UniApp may share this object with page.options; take a snapshot before
      // removing the sensitive callback parameters from the page and URL.
      const callback = { ticket: query.wechatBindTicket, state: query.wechatBindState, error: query.wechatBindError }
      cleanCallbackUrl()
      let raw: string | null = null
      try { raw = window.sessionStorage.getItem(PENDING_KEY); window.sessionStorage.removeItem(PENDING_KEY) }
      catch { /* Blocked storage is missing authorization state, never consent. */ }
      let pending: { state: string; userId: string; createdAt: number; draft: ProfileBindingDraft } | undefined
      try { pending = raw ? JSON.parse(raw) : undefined } catch { /* Corrupt/expired state must fail closed. */ }
      if (!pending || pending.state !== callback.state || pending.userId !== options.userId() || typeof pending.createdAt !== 'number' || Date.now() - pending.createdAt > 10 * 60 * 1000 || pending.createdAt > Date.now()) {
        warn('微信授权状态或登录账号已变更，请重新绑定')
      } else {
        if (pending.draft && typeof pending.draft.nickname === 'string' && pending.draft.nickname.length <= 30 && ['unspecified', 'male', 'female'].includes(pending.draft.gender) && typeof pending.draft.birthDate === 'string' && /^(\d{4}-\d{2}-\d{2})?$/.test(pending.draft.birthDate)) options.restoreDraft(pending.draft)
        if (callback.error) warn('已取消微信授权，尚未绑定')
        else if (typeof callback.ticket === 'string') {
          busy.value = true
          try { accept((await completeWechatH5Binding(callback.ticket)).data); if (!disposed) uni.showToast({ title: '微信绑定成功', icon: 'success' }) }
          catch (reason) { warn(reason instanceof Error ? reason.message : '微信绑定失败，请重试') }
          finally { busy.value = false }
        }
      }
    }
    // #endif
    await refresh()
  }
  async function bind() {
    if (disposed || busy.value || loading.value) return
    if (error.value) { await refresh(); return }
    if (!status.value || currentBound.value) return
    if (!available.value) return warn('请在微信内打开本页，或使用已接入微信登录的 App 绑定')
    busy.value = true
    try {
      const confirmed = await new Promise<boolean>(resolve => uni.showModal({
        title: '绑定微信', content: '将当前微信绑定到此平台账号，用于微信登录。不会切换账号，也不会修改登录手机号。' + (options.hasTemporaryAvatar() ? '网页授权会跳转，未保存的临时头像需重新选择。' : ''),
        confirmText: '继续授权', success: result => resolve(result.confirm), fail: () => resolve(false),
      }))
      if (!confirmed || disposed) return
      // #ifdef H5
      const authorization = (await startWechatH5Binding()).data
      const url = new URL(authorization.authorize_url)
      if (!authorization.state || url.origin !== 'https://open.weixin.qq.com' || url.pathname !== '/connect/oauth2/authorize' || url.searchParams.get('state') !== authorization.state) throw new Error('微信授权地址异常，请重试')
      window.sessionStorage.setItem(PENDING_KEY, JSON.stringify({ state: authorization.state, userId: options.userId(), createdAt: Date.now(), draft: options.getDraft() }))
      window.location.assign(authorization.authorize_url)
      return
      // #endif
      // #ifdef APP-PLUS
      const code = await new Promise<string>((resolve, reject) => uni.login({ provider: 'weixin', onlyAuthorize: true, success: result => result.code ? resolve(result.code) : reject(new Error('微信授权未返回凭证')), fail: () => reject(new Error('微信授权已取消或失败，请重试')) } as UniApp.LoginOptions & { onlyAuthorize: boolean }))
      accept((await bindWechatMobile(code)).data)
      if (!disposed) uni.showToast({ title: '微信绑定成功', icon: 'success' })
      // #endif
    } catch (reason) { warn(reason instanceof Error ? reason.message : '微信绑定失败，请重试') }
    finally { busy.value = false }
  }
  onBeforeUnmount(() => { disposed = true; version += 1 })
  return { statusLabel, actionLabel, currentBound, busy, loading, error, refresh, initialize, bind }
}
