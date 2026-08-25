import type { ProviderDetail, ProviderServiceSummary } from '@/types/api'

const STORAGE_KEY = 'dazzy-provider-booking-draft-v1'

export interface BookingDraft {
  providerPublicId: string
  providerName: string
  providerAvatarUrl: string | null
  providerRating: string
  providerVerified: boolean
  services: ProviderServiceSummary[]
  serviceId: number
  serviceName: string
  billingType: ProviderServiceSummary['billing_type']
  unitPrice: number
  durationMinutes: number
  date: string
  startTime: string
  timeConfirmed: boolean
  addressId: number | null
  address: string
  addressName: string
  contactName: string
  contactGender: 'mr' | 'ms' | ''
  contactPhone: string
  note: string
}

function dateKey(offset = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function createBookingDraft(provider: ProviderDetail, service: ProviderServiceSummary, dateOffset: number, startTime: string) {
  const draft: BookingDraft = {
    providerPublicId: provider.public_id,
    providerName: provider.nickname,
    providerAvatarUrl: provider.avatar_url,
    providerRating: provider.rating,
    providerVerified: provider.verified,
    services: provider.services,
    serviceId: service.id,
    serviceName: service.category,
    billingType: service.billing_type,
    unitPrice: Number(service.price_amount),
    durationMinutes: service.billing_type === 'hourly' ? Math.max(120, service.estimated_duration_minutes || 120) : (service.estimated_duration_minutes || 180),
    date: dateKey(dateOffset),
    startTime,
    timeConfirmed: false,
    addressId: null,
    address: '',
    addressName: '',
    contactName: '',
    contactGender: '',
    contactPhone: '',
    note: '',
  }
  saveBookingDraft(draft)
  return draft
}

export function getBookingDraft(): BookingDraft | null {
  try {
    const stored = uni.getStorageSync(STORAGE_KEY) as Partial<BookingDraft> | null
    if (!stored?.providerPublicId) return null
    return {
      ...stored,
      addressId: Number(stored.addressId) || null,
      contactGender: stored.contactGender === 'mr' || stored.contactGender === 'ms'
        ? stored.contactGender
        : '',
    } as BookingDraft
  } catch {
    return null
  }
}

export function saveBookingDraft(draft: BookingDraft) {
  uni.setStorageSync(STORAGE_KEY, draft)
}

export function updateBookingDraft(patch: Partial<BookingDraft>) {
  const current = getBookingDraft()
  if (!current) return null
  const next = { ...current, ...patch }
  saveBookingDraft(next)
  return next
}

export function bookingServiceAmount(draft: BookingDraft) {
  return draft.billingType === 'hourly'
    ? draft.unitPrice * (draft.durationMinutes / 60)
    : draft.unitPrice
}

export function bookingEndTime(startTime: string, durationMinutes: number) {
  const [hour, minute] = startTime.split(':').map(Number)
  const total = hour * 60 + minute + durationMinutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
