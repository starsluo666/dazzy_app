import { onUnmounted, ref } from 'vue'

import { sendSmsCode } from '@/services/auth'
import type { SmsPurpose } from '@/types/api'

export function useSmsCode(purpose: SmsPurpose) {
  const seconds = ref(0)
  const sending = ref(false)
  let timer: ReturnType<typeof setInterval> | undefined

  async function send(phone: string) {
    if (sending.value || seconds.value > 0) return
    sending.value = true
    try {
      const response = await sendSmsCode(phone, purpose)
      seconds.value = response.data.retry_after
      const debugCode = response.data.debug_code
      if (debugCode) uni.showToast({ title: `测试验证码：${debugCode}`, icon: 'none', duration: 3000 })
      timer = setInterval(() => {
        seconds.value -= 1
        if (seconds.value <= 0 && timer) {
          clearInterval(timer)
          timer = undefined
        }
      }, 1000)
    } finally {
      sending.value = false
    }
  }

  onUnmounted(() => { if (timer) clearInterval(timer) })
  return { seconds, sending, send }
}
