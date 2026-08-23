export interface Pagination {
  page: number
  page_size: number
  total: number
}

export interface ListResponse<T> {
  data: {
    items: T[]
    pagination: Pagination
  }
}

export interface ProviderServiceSummary {
  id: number
  category: string
  category_slug: string
  billing_type: 'hourly' | 'per_session'
  price_amount: number
  estimated_duration_minutes: number | null
}

export interface ProviderListItem {
  public_id: string
  nickname: string
  birth_date: string | null
  avatar_url: string | null
  verified: boolean
  service_city_name: string
  bio: string
  rating: string
  service_count: number
  order_count: number
  distance_km: number | null
  services: ProviderServiceSummary[]
}

export interface ProviderDetail extends ProviderListItem {
  gender: 'unspecified' | 'male' | 'female'
  lifestyle_photo_url: string | null
  credit_score: number
  max_service_radius_km: number
  is_favorited: boolean
}

export interface ProviderApplication {
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended'
  verification_status: CurrentUser['verification_status']
  gender: CurrentUser['gender']
  bio: string
  lifestyle_photo_id: string | null
  lifestyle_photo_url: string | null
  service_city_code: string
  service_city_name: string
  max_service_radius_km: number
  invitation_code: string
  agreement_accepted_at: string | null
  submitted_at: string | null
  reviewed_at: string | null
  rejection_reason: string
  updated_at: string
}

export interface ServiceCategory {
  id: number
  name: string
  slug: string
}

export interface ProviderManagedService extends ProviderServiceSummary {
  category_id: number
  description: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProviderWorkbench {
  nickname: string
  avatar_url: string | null
  is_accepting_orders: boolean
  admin_order_restricted: boolean
  admin_restriction_reason: string
  has_service_location: boolean
  service_city_code: string
  service_city_name: string
  service_location_name: string
  service_address: string
  max_service_radius_km: number
  today_order_count: number
  month_income_amount: number
  service_count: number
  upcoming_order: null | {
    order_no: string
    starts_at: string
    ends_at: string
    service_name: string
  }
}

export interface ProviderServiceLocation {
  has_service_location: boolean
  service_city_code: string
  service_city_name: string
  service_location_name: string
  service_address: string
  longitude: string | null
  latitude: string | null
  max_service_radius_km: number
}

export interface ProviderSchedulePeriod {
  id: string | null
  source: 'weekly' | 'date' | 'order'
  starts_at: string
  ends_at: string
  status: 'available' | 'booked'
}

export interface ProviderScheduleDay {
  date: string
  is_closed: boolean
  periods: ProviderSchedulePeriod[]
}

export interface ProviderAvailabilitySlot {
  starts_at: string
  ends_at: string
}

export interface ProviderAvailability {
  service_id: number
  duration_minutes: number
  time_grain_minutes: number
  earliest: ProviderAvailabilitySlot | null
  dates: Array<{ date: string; slots: ProviderAvailabilitySlot[] }>
}

export interface ActivityListItem {
  id: number
  title: string
  category: string
  category_slug: string
  organizer_public_id: string
  organizer_nickname: string
  organizer_avatar_url: string | null
  cover_url: string | null
  starts_at: string
  ends_at: string
  meeting_place_name: string
  capacity: number
  min_participants: number
  aa_principal_amount: number
  status: string
  distance_km: number | null
  participant_count: number
}

export type HomeActivityListItem = ActivityListItem

export interface ActivityDetail extends ActivityListItem {
  meeting_address: string
  description: string
  participation_rules: string
  formation_deadline: string
  refund_template_version: string
  refund_rule_snapshot: Record<string, unknown>
  participant_count: number
  platform_service_fee_amount: number
  payable_amount: number
  organizer_verified: boolean
  organizer_rating: string | null
  is_joined: boolean
  is_organizer: boolean
  participation_status: 'active' | 'cancelled' | null
}

export interface BrowsingHistoryItem {
  id: number
  target_type: 'provider' | 'activity'
  viewed_at: string
  view_count: number
  target: ProviderListItem | ActivityListItem
}

export interface ActivityParticipationResult {
  status: 'active'
  joined_at: string
  participant_count: number
  activity_status: string
}

export interface ActivityCategoryItem {
  name: string
  slug: string
}

export interface ActivityDraftResult {
  id: number
  status: 'draft'
  next_step: 'payment'
  payment_required: true
}

export interface ActivityPublishOrder {
  order_no: string
  activity_id: number
  aa_principal_amount: number
  platform_service_fee_amount: number
  payable_amount: number
  status: 'pending_payment' | 'paid' | 'cancelled' | 'refunded'
  paid_at: string | null
}

export interface MyActivityListItem extends ActivityListItem {
  participation_status: 'active' | 'cancelled' | null
  joined_at: string | null
}

export interface LocationItem {
  id?: string | number
  name: string
  address: string
  city_name: string
  district_name?: string
  longitude: number | string
  latitude: number | string
  is_default?: boolean
}

export interface HomeCardAssets {
  provider_companion_url?: string
  group_activity_url?: string
}

export interface HomeProviderListItem extends ProviderListItem {
  availability_status: 'available' | 'unavailable'
  earliest_available_at: string | null
  is_favorited: boolean
}

export interface HomeDiscoveryData {
  card_assets: HomeCardAssets
  recommended_activities: HomeActivityListItem[]
  recommended_providers: HomeProviderListItem[]
  errors: Partial<Record<'card_assets' | 'recommended_activities' | 'recommended_providers', string>>
}

export interface DataResponse<T> {
  data: T
}

export type SmsPurpose = 'register' | 'login' | 'reset_password'

export interface CurrentUser {
  public_id: string
  phone: string
  nickname: string
  gender: 'unspecified' | 'male' | 'female'
  birth_date: string | null
  avatar_url: string | null
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected'
  account_status: 'active' | 'restricted' | 'suspended' | 'closed'
}

export interface AuthSession {
  access: string
  refresh: string
  user: CurrentUser
}

export interface CurrentUserOverview {
  balance_amount: number | null
  coupon_count: number | null
  favorite_count: number | null
  order_count: number
  pending_payment_count: number
  pending_service_count: number
  in_service_count: number
  pending_review_count: number
  after_sales_count: number
}

export interface ProviderOrderQuote {
  provider: { public_id: string; nickname: string; avatar_url: string | null; verified: boolean }
  service: { id: number; name: string; billing_type: 'hourly' | 'per_session'; unit_price_amount: number }
  starts_at: string
  ends_at: string
  duration_minutes: number
  meeting_address: string
  route_distance_km: string
  route_duration_minutes: number
  service_fee_amount: number
  transport_fee_amount: number
  other_fee_amount: number
  discount_amount: number
  payable_amount: number
  pricing_snapshot: Record<string, unknown>
}

export interface ProviderOrder {
  public_id: string
  order_no: string
  status: string
  status_label: string
  provider_public_id: string
  provider_name: string
  provider_avatar_url: string | null
  service_name: string
  billing_type_snapshot: 'hourly' | 'per_session'
  unit_price_amount: number
  starts_at: string
  ends_at: string
  duration_minutes: number
  meeting_address: string
  contact_name: string
  contact_phone_masked: string
  note: string
  service_fee_amount: number
  transport_fee_amount: number
  other_fee_amount: number
  discount_amount: number
  payable_amount: number
  pricing_snapshot: Record<string, unknown>
  payment_expires_at: string
  paid_at: string | null
  accepted_at: string | null
  departed_at: string | null
  arrival_photo_url: string | null
  arrival_photo_uploaded_at: string | null
  service_started_at: string | null
  completion_submitted_at: string | null
  customer_confirmed_at: string | null
  created_at: string
}

export interface ProviderManagedOrder extends ProviderOrder {
  customer_name: string
  acceptance_expires_at: string | null
}
