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
  credit_score: number
  max_service_radius_km: number
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
}

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
}

export interface HomeCardAssets {
  provider_companion_url: string
  group_activity_url: string
}

export interface DataResponse<T> {
  data: T
}
