export interface CancellationPolicy { version?: string; clauses?: string[]; agreed_at?: string }
export interface CancellationAmounts {
  rule: string; label: string; paid_amount: number; refund_amount: number; retained_amount: number
  retained_travel_amount: number; compensation_amount: number; retained_service_amount: number
}
export interface CancellationSummary {
  policy: CancellationPolicy; transport_mode_label: string; can_preview: boolean
  arrived_at: string | null; wait_state: string; wait_deadline_at: string | null
  decision: Partial<CancellationAmounts>; finance_notice: string
}
export interface CancellationQuote extends CancellationAmounts { token: string; notice: string }
