/** H5 may report navigateBack success even when no app page can be popped. */
export function navigateBackOr(fallback: () => void) {
  if (getCurrentPages().length <= 1) {
    fallback()
    return
  }
  uni.navigateBack({ delta: 1, fail: fallback })
}
