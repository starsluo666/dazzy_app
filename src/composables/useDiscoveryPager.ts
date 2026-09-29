import { computed, ref } from 'vue'
import type { ListResponse } from '@/types/api'
import { getErrorMessage } from '@/utils/formatters'

/** Ignore stale responses after changing the city, keyword or filters. */
export function useDiscoveryPager<T>(fetchPage: (page: number) => Promise<ListResponse<T>>, key: (item: T) => string | number) {
  const items = ref<T[]>([])
  const loading = ref(false)
  const loadingMore = ref(false)
  const error = ref('')
  const moreError = ref('')
  const total = ref(0)
  const page = ref(0)
  let generation = 0
  const hasMore = computed(() => items.value.length < total.value)
  function invalidate() {
    generation++
    items.value = []
    total.value = 0
    page.value = 0
    loading.value = false
    loadingMore.value = false
    error.value = ''
    moreError.value = ''
  }
  async function load(reset = true) {
    if (!reset && (loading.value || loadingMore.value || !hasMore.value)) return
    if (reset) invalidate()
    const ticket = generation
    const nextPage = reset ? 1 : page.value + 1
    if (reset) loading.value = true
    else loadingMore.value = true
    moreError.value = ''
    try {
      const { data } = await fetchPage(nextPage)
      if (ticket !== generation) return
      const previous = reset ? [] : items.value as T[]
      const unique = new Map(previous.map(item => [key(item), item]))
      data.items.forEach(item => unique.set(key(item), item))
      items.value = [...unique.values()] as typeof items.value
      total.value = data.pagination.total
      page.value = data.pagination.page
      if (!data.items.length || page.value * data.pagination.page_size >= total.value) total.value = items.value.length
    } catch (reason) {
      if (ticket !== generation) return
      if (reset) error.value = getErrorMessage(reason)
      else moreError.value = getErrorMessage(reason)
    } finally {
      if (ticket === generation) { loading.value = false; loadingMore.value = false }
    }
  }
  return { items, loading, loadingMore, error, moreError, total, hasMore, load, invalidate }
}
