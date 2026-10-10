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
  is_online: boolean
  service_city_name: string
  bio: string
  rating: string
  service_count: number
  order_count: number
  distance_km: number | null
  services: ProviderServiceSummary[]
}

export interface ProviderDetail extends ProviderListItem {
  media: { id: string; type: 'image' | 'video'; url: string }[]
  gender: 'unspecified' | 'male' | 'female'
  lifestyle_photo_url: string | null
  credit_score: number
  max_service_radius_km: number
  is_favorited: boolean
}

export interface ProviderReview {
  id: number
  customer_name: string
  rating: number
  content: string
  service_name: string
  image_urls: string[]
  created_at: string
}

export interface ProviderReviewSummary {
  rating: string
  total: number
  distribution: Record<string, number>
}

export interface ProviderReviewListResponse extends ListResponse<ProviderReview> {
  data: ListResponse<ProviderReview>['data'] & { summary: ProviderReviewSummary }
}

export type SupportCaseType = 'consultation' | 'complaint' | 'report'
export type SupportTargetType = 'general' | 'provider' | 'provider_order' | 'activity' | 'review'
export type SupportCaseReason =
  | 'platform_process'
  | 'platform_product'
  | 'service_quality'
  | 'false_information'
  | 'inappropriate_content'
  | 'private_transaction'
  | 'safety_risk'
  | 'payment_refund'
  | 'account_issue'
  | 'other'
export type SupportCaseStatus = 'pending' | 'processing' | 'reviewing' | 'resolved' | 'rejected' | 'closed'

export interface SupportCaseRecord {
  id: number
  record_type: 'created' | 'user_reply' | 'operator_reply' | 'status_changed' | 'review_requested'
  record_type_label: string
  actor_name: string
  content: string
  from_status: string
  to_status: string
  created_at: string
}

export interface SupportCase {
  public_id: string
  case_no: string
  case_type: SupportCaseType
  case_type_label: string
  target_type: SupportTargetType
  target_type_label: string
  target_id: string
  target_title: string
  target_subtitle: string
  reason: SupportCaseReason
  reason_label: string
  description: string
  attachment_urls: string[]
  city_code: string
  city_name: string
  status: SupportCaseStatus
  status_label: string
  assignee_name: string | null
  result_note: string
  resolved_at: string | null
  review_requested_at: string | null
  review_reason: string
  reward_eligible: boolean
  reward_issued: boolean
  records: SupportCaseRecord[]
  created_at: string
  updated_at: string
}

export type NotificationCategory = 'support' | 'order' | 'activity' | 'system'

export interface UserNotification {
  public_id: string
  category: NotificationCategory
  category_label: string
  event_type:
    | 'support_reply'
    | 'support_result'
    | 'support_review_result'
    | 'order_payment_success'
    | 'order_accepted'
    | 'order_pending_support'
    | 'order_departed'
    | 'order_started'
    | 'order_completion_submitted'
    | 'order_auto_confirmed'
    | 'order_after_sales_started'
    | 'order_after_sales_result'
    | 'activity_publish_submitted'
    | 'activity_review_result'
    | 'activity_signup_success'
    | 'activity_formed'
    | 'activity_refund_completed'
    | 'activity_cancelled'
    | 'activity_failed_to_form'
    | 'activity_started'
    | 'activity_completed'
    | 'activity_after_sales_result'
    | 'activity_settled'
    | 'provider_application_result'
    | 'provider_status_changed'
    | 'provider_credit_changed'
    | 'coupon_issued'
    | 'coupon_revoked'
  event_type_label: string
  title: string
  content: string
  target_type: string
  target_id: string
  target_title: string
  action_text: string
  action_url: string
  is_read: boolean
  read_at: string | null
  created_at: string
}

export interface NotificationSummary {
  total: number
  unread: number
  category_unread: Record<NotificationCategory, number>
}

export interface NotificationListResponse extends ListResponse<UserNotification> {
  data: ListResponse<UserNotification>['data'] & { summary: NotificationSummary }
}

export interface ProviderApplication {
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended'
  gender: CurrentUser['gender']
  application_real_name: string
  application_birth_date: string | null
  age: number | null
  lifestyle_photo_id: string | null
  lifestyle_photo_url: string | null
  bio: string
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
  icon_url?: string | null
  hourly_min_price_amount: number
  hourly_max_price_amount: number
  per_session_min_price_amount: number
  per_session_max_price_amount: number
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
  tags: ActivityTagItem[]
  organizer_public_id: string
  organizer_nickname: string
  organizer_avatar_url: string | null
  cover_url: string | null
  starts_at: string
  ends_at: string
  meeting_place_name: string
  city_code: string
  city_name: string
  capacity: number
  min_participants: number
  aa_principal_amount: number
  status: string
  distance_km: number | null
  participant_count: number
}

export type HomeActivityListItem = ActivityListItem

export interface ActivitySettlement {
  settlement_no: string
  status: 'confirming' | 'risk_frozen' | 'dispute_frozen' | 'settled'
  status_label: string
  confirmation_started_at: string
  confirmation_deadline: string
  risk_frozen_at: string | null
  freeze_until: string
  settled_at: string | null
  dispute_reason: string
  settlement_amount: number | null
  organizer_principal_amount: number | null
  participant_principal_amount: number | null
  retained_participant_principal_amount: number | null
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
  service_fee_rate: string | number
  organizer_rating: string | null
  is_joined: boolean
  is_organizer: boolean
  participation_status: 'pending_payment' | 'active' | 'cancelled' | 'expired' | null
  participation_payment_expires_at: string | null
  participation_refund: ActivityParticipationRefundOrder | null
  participation_after_sales: ActivityAfterSalesCase | null
  settlement: ActivitySettlement | null
  locked_seat_count: number
  remaining_capacity: number
  reviewed_at: string | null
  rejection_reason: string
}

export interface BrowsingHistoryItem {
  id: number
  target_type: 'provider' | 'activity'
  viewed_at: string
  view_count: number
  target: ProviderListItem | ActivityListItem
}

export interface ActivityParticipationPaymentOrder {
  order_no: string
  aa_principal_amount: number
  platform_service_fee_amount: number
  payable_amount: number
  channel: 'mock_wechat' | 'mock_alipay' | 'wechat' | 'alipay' | 'balance'
  channel_label: string
  status: 'pending_payment' | 'paid' | 'closed' | 'partially_refunded' | 'refunded'
  status_label: string
  expires_at: string
  paid_at: string | null
  closed_at: string | null
  wallet_amount: number
  external_amount: number
}

export interface ActivityParticipationRefundOrder {
  refund_no: string
  refund_type: string
  refund_type_label: string
  status: 'pending' | 'processing' | 'succeeded' | 'failed'
  status_label: string
  principal_refund_amount: number
  service_fee_refund_amount: number
  refund_amount: number
  wallet_refund_amount: number
  external_refund_amount: number
  retained_principal_amount: number
  retained_service_fee_amount: number
  retained_principal_destination: 'none' | 'organizer' | 'platform'
  retained_principal_destination_label: string
  reason: string
  failure_reason: string
  requested_at: string
  refunded_at: string | null
}

export interface ActivityAfterSalesCase {
  case_no: string
  reason: string
  reason_label: string
  description: string
  status: 'pending' | 'processing' | 'approved' | 'rejected'
  status_label: string
  requested_principal_amount: number
  requested_service_fee_amount: number
  requested_amount: number
  approved_principal_amount: number | null
  approved_service_fee_amount: number | null
  approved_amount: number | null
  result_note: string
  reviewed_at: string | null
  refund_order: ActivityParticipationRefundOrder | null
  created_at: string
  updated_at: string
}

export interface ActivityParticipationCheckout {
  participation_status: 'pending_payment' | 'active'
  rule_confirmed_at: string
  payment_order: ActivityParticipationPaymentOrder
  participant_count: number
  remaining_capacity: number
}

export interface ActivityParticipationPaymentResult {
  participation: {
    status: 'active'
    joined_at: string
  }
  payment_order: ActivityParticipationPaymentOrder
  participant_count: number
  activity_status: string
  changed: boolean
}

export interface ActivityParticipationCancellationResult {
  participation: {
    status: 'cancelled'
    cancelled_at: string
    cancellation_reason: string
  }
  refund: ActivityParticipationRefundOrder | null
  changed: boolean
}

export interface ActivityTagItem {
  name: string
  slug: string
  icon_url: string | null
  min_capacity: number
  max_capacity: number
  min_aa_principal_amount: number
  max_aa_principal_amount: number
  content_guidance: string
}

export type ActivityCategoryItem = ActivityTagItem

export interface ActivityPublishRules {
  minimum_advance_hours: number
  maximum_advance_days: number
  service_fee_rate: string | number
  min_capacity: number
  max_capacity: number
  min_aa_principal_amount: number
  max_aa_principal_amount: number
  default_cover_id: string | null
  default_cover_url: string | null
}

export interface ActivityCopySource {
  id: number
  category_slug: string
  tag_slugs: string[]
  cover_id: string | null
  cover_url: string | null
  title: string
  starts_at: string
  ends_at: string
  formation_deadline: string
  meeting_place_name: string
  meeting_address: string
  city_code: string
  city_name: string
  longitude: string
  latitude: string
  capacity: number
  min_participants: number
  description: string
  participation_rules: string
  aa_principal_amount: number
  refund_template_version: 'standard-v1'
  rejection_reason: string
}

export interface ActivityReportReceipt {
  case_no: string
  activity_id: number
  reason: string
  reason_label: string
  description: string
  status: 'pending' | 'processing' | 'resolved' | 'rejected'
  status_label: string
  created_at: string
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
  status: 'pending_payment' | 'paid' | 'cancelled' | 'partially_refunded' | 'refunded'
  expires_at: string
  paid_at: string | null
  closed_at: string | null
  wallet_amount: number
  external_amount: number
}

export interface MyActivityListItem extends ActivityListItem {
  participation_status: 'pending_payment' | 'active' | 'cancelled' | 'expired' | null
  joined_at: string | null
  participation_payment_expires_at: string | null
  participation_refund_status: 'pending' | 'processing' | 'succeeded' | 'failed' | null
  participation_after_sales_status: 'pending' | 'processing' | 'approved' | 'rejected' | null
  settlement: ActivitySettlement | null
  reviewed_at: string | null
  rejection_reason: string
  cancelled_at: string | null
  cancellation_reason: string
}

export interface LocationItem {
  id?: string | number
  name: string
  address: string
  city_name: string
  city_code?: string
  district_name?: string
  contact_name?: string
  contact_gender?: 'mr' | 'ms' | ''
  contact_gender_label?: string
  contact_phone?: string
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
  coupon_campaigns?: CouponCampaign[]
  card_assets: HomeCardAssets
  recommended_activities: HomeActivityListItem[]
  recommended_providers: HomeProviderListItem[]
  errors: Partial<Record<'card_assets' | 'recommended_activities' | 'recommended_providers', string>>
}

export interface DataResponse<T> {
  data: T
}

export interface CouponCampaign {
  public_id: string
  name: string
  banner_url: string
  coupon: { name: string; face_amount: number; min_order_amount: number; valid_days: number; description: string }
  starts_at: string
  ends_at: string
  state: 'active' | 'upcoming' | 'ended' | 'exhausted' | 'offline' | 'draft'
  claimed: boolean
  can_claim: boolean
  user_coupon: UserCoupon | null
}

export interface PaymentPathCapability {
  available: boolean
  reason: string
}

export interface PaymentCapabilities {
  provider_order: {
    mock: PaymentPathCapability
    official_account: PaymentPathCapability
    mobile_app: PaymentPathCapability
  }
  activity_publish: {
    mock: PaymentPathCapability
    real: PaymentPathCapability
  }
  activity_participation: {
    mock: PaymentPathCapability
    real: PaymentPathCapability
  }
}

export type SmsPurpose = 'register' | 'login' | 'reset_password'

export interface CurrentUser {
  public_id: string
  phone: string
  nickname: string
  gender: 'unspecified' | 'male' | 'female'
  birth_date: string | null
  avatar_url: string | null
  account_status: 'active' | 'restricted' | 'suspended' | 'closure_pending' | 'closed'
}

export interface AuthSession {
  access: string
  refresh: string
  user: CurrentUser
  closure_cancelled?: boolean
}

export interface AccountClosureSubmission {
  closed: false
  status: 'pending'
  requested_at: string
  execute_after: string
  working_days: 5
}

export interface AccountSecurity {
  phone_masked: string
  password_set: boolean
  account_status: CurrentUser['account_status']
  account_status_label: string
}

export interface CurrentUserOverview {
  customer_service_phone: string
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
  pricing_token?: string
  wallet_amount?: number
  external_amount?: number
  cancellation_policy?: import('./cancellation').CancellationPolicy
  provider: { public_id: string; nickname: string; avatar_url: string | null; verified: boolean }
  service: { id: number; name: string; billing_type: 'hourly' | 'per_session'; unit_price_amount: number }
  starts_at: string
  ends_at: string
  duration_minutes: number
  meeting_location_name: string
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

export interface UserCoupon {
  public_id: string
  template_public_id: string | null
  template_name: string
  face_amount: number
  min_order_amount: number
  expires_at: string
  status: 'available' | 'reserved' | 'used' | 'expired' | 'revoked'
  source: string
  revoked_at: string | null
  revoke_reason: string
  created_at: string
}

export interface GrowthCouponTemplate {
  public_id: string
  name: string
  description: string
  face_amount: number
  min_order_amount: number
  valid_days: number
  is_active: boolean
}

export interface GrowthCampaign {
  newcomer_gift_enabled: boolean
  invitation_enabled: boolean
  newcomer_gift_templates: GrowthCouponTemplate[]
  registration_reward_template: GrowthCouponTemplate | null
  first_order_reward_template: GrowthCouponTemplate | null
  updated_at: string | null
  invitation_valid: boolean
  inviter_name: string
  viewer: {
    status: 'login_required' | 'pending' | 'received' | 'not_eligible'
    received_coupon_count: number
    granted_at?: string
  }
}

export interface InvitationRecord {
  public_id: string
  invitee_name: string
  registered_at: string
  status: 'registered' | 'first_order_rewarded'
  registration_rewarded: boolean
  first_order_rewarded: boolean
  first_order_completed_at: string | null
}

export interface MyInvitationSummary {
  invite_code: string
  campaign: Omit<GrowthCampaign, 'viewer' | 'invitation_valid' | 'inviter_name'>
  summary: {
    registered_count: number
    registration_reward_count: number
    first_order_reward_count: number
  }
  items: InvitationRecord[]
}

export interface ProviderOrder {
  cancellation?: import('./cancellation').CancellationSummary
  timeout?: {
    departure_deadline_at: string | null
    timed_out_at: string | null
    reason: string
    refund_label: string
    credit_points: number
    credit_reversed_at: string | null
    configured_credit_penalty: number | null
  }
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
  meeting_location_name: string
  meeting_address: string
  contact_name: string
  contact_gender: 'mr' | 'ms' | ''
  contact_gender_label: string
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
  fulfillment_review_required?: boolean
  confirmation_expires_at: string | null
  customer_confirmed_at: string | null
  auto_confirmed_at: string | null
  review_expires_at: string | null
  review: ProviderOrderReview | null
  payment_order: ProviderOrderPaymentSummary | null
  refund_orders: ProviderOrderRefundSummary[]
  settlement: ProviderOrderSettlementSummary | null
  after_sales: ProviderOrderAfterSalesSummary | null
  created_at: string
}

export interface ProviderOrderPaymentSummary {
  payment_no: string
  channel: string
  channel_label: string
  status: 'pending_payment' | 'paid' | 'closed' | 'partially_refunded' | 'refunded'
  status_label: string
  payable_amount: number
  wallet_amount: number
  external_amount: number
  paid_at: string | null
  closed_at: string | null
}

export interface ProviderOrderPaymentSession {
  invoke_type: 'WECHAT_JSAPI' | 'WECHAT_APP' | 'BALANCE'
  pay_info: Record<string, string | number>
  wallet_amount: number
  external_amount: number
}

export interface ProviderOrderPaymentAuthorization {
  authorized: boolean
  authorize_url: string
  payment_method: 'balance' | 'mixed' | 'external'
  wallet_amount: number
  external_amount: number
}

export interface WalletLedgerEntry {
  public_id: string
  entry_type: 'recharge' | 'payment_hold' | 'payment_consume' | 'payment_release' | 'refund' | 'admin_adjustment'
  entry_type_label: string
  available_delta: number
  frozen_delta: number
  available_balance_after: number
  description: string
  reference_type: string
  reference_no: string
  created_at: string
}

export interface UserWallet {
  discount_balances?: { discount_rate_bps: number; available_amount: number }[]
  ordinary_balance?: number
  best_discount_rate_bps?: number
  available_balance: number
  frozen_balance: number
  total_balance: number
  ledger_entries: WalletLedgerEntry[]
}

export interface RechargeDiscountTier {
  min_quantity: number
  discount_rate_bps: number
}

export interface RechargeCampaign {
  discount_usage?: 'consumption' | 'recharge'
  is_enabled: boolean
  unit_face_amount: number
  max_quantity_per_order: number
  rules_text: string
  tiers: RechargeDiscountTier[]
}

export interface WalletRechargeOrder {
  discount_usage?: 'consumption' | 'recharge'
  order_no: string
  unit_face_amount: number
  quantity: number
  credited_amount: number
  discount_rate_bps: number
  discount_amount: number
  payable_amount: number
  status: 'pending_payment' | 'paid' | 'closed'
  status_label: string
  expires_at: string
  paid_at: string | null
  closed_at: string | null
  created_at: string
}

export interface RechargePaymentSession {
  invoke_type: 'WECHAT_JSAPI' | 'WECHAT_APP'
  pay_info: Record<string, string | number>
  order: WalletRechargeOrder
}

export interface ProviderOrderRefundSummary {
  refund_no: string
  status: 'pending' | 'processing' | 'succeeded' | 'failed'
  status_label: string
  refund_amount: number
  reason: string
  requested_at: string
  refunded_at: string | null
}

export interface ProviderOrderSettlementSummary {
  settlement_no: string
  status: 'risk_frozen' | 'dispute_frozen' | 'settled' | 'cancelled'
  status_label: string
  platform_commission_amount: number
  provider_settlement_amount: number
  freeze_until: string
  settled_at: string | null
}

export interface OrderTerminationSummary {
  reported_ended_at: string
  finance_state: string
  finance_label: string
  decision?: {
    ended_at: string
    responsibility_label: string
    component_refunds: { service: number; transport: number; other: number }
  }
}

export interface ProviderOrderAfterSalesSummary {
  termination?: OrderTerminationSummary | null
  case_no: string
  case_type: string
  case_type_label: string
  status: 'pending' | 'processing' | 'approved' | 'refunded' | 'rejected' | 'resolved'
  status_label: string
  requested_amount: number
  approved_amount: number | null
  result_note: string
  created_at: string
  updated_at: string
  refund_no: string | null
  refund_status: 'pending' | 'processing' | 'succeeded' | 'failed' | null
  refund_status_label: string | null
  refund_amount: number | null
  refunded_at: string | null
}

export interface ProviderOrderAfterSalesCase {
  termination?: OrderTerminationSummary | null
  case_no: string
  case_type: 'refund' | 'service_dispute' | 'provider_cancel' | 'other' | 'early_termination'
  case_type_label: string
  status: 'pending' | 'processing' | 'approved' | 'refunded' | 'rejected' | 'resolved'
  status_label: string
  requested_amount: number
  approved_amount: number | null
  reason: string
  evidence_urls: string[]
  result_note: string
  reviewed_at: string | null
  refund_order: ProviderOrderRefundSummary | null
  created_at: string
  updated_at: string
}

export type ProviderOrderAfterSalesCreateType = 'refund' | 'service_dispute' | 'other'

export interface ProviderOrderReview {
  rating: number
  content: string
  customer_name: string
  image_urls: string[]
  is_anonymous: boolean
  audit_status: 'pending' | 'approved' | 'rejected'
  audit_rejection_reason: string
  created_at: string
}

export interface MyProviderOrderReview extends ProviderOrderReview {
  order_no: string
  provider_public_id: string
  provider_name: string
  service_name: string
  is_visible: boolean
}
