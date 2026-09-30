import type { ServiceCategory } from '@/types/api'

export interface ProviderCategoryOption {
  label: string
  slug: string
  icon: string
}

export const allProviderCategory: ProviderCategoryOption = {
  label: '全部',
  slug: '',
  icon: '/static/home/categories/all.svg',
}

const categoryIcons: Record<string, string> = {
  mahjong: '/static/home/categories/chess-cards.svg',
  billiards: '/static/home/categories/billiards.svg',
  esports: '/static/home/categories/esports.svg',
  'escape-room': '/static/home/categories/escape-room.svg',
  'board-games': '/static/home/categories/board-games.svg',
  travel: '/static/home/categories/hiking.svg',
  business: '/static/home/categories/business.svg',
}

export function configuredProviderCategories(items: ServiceCategory[]): ProviderCategoryOption[] {
  const seen = new Set<string>()
  return items.flatMap(item => {
    const slug = item.slug.trim()
    const label = item.name.trim()
    if (!slug || !label || seen.has(slug)) return []
    seen.add(slug)
    return [{ label, slug, icon: item.icon_url || categoryIcons[slug] || '' }]
  })
}
