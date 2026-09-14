export interface EscalationBrief {
  id: string;
  type: 'return_window' | 'warranty_expiring' | 'recall_match';
  severity: 'warning' | 'urgent' | 'critical';
  status: 'pending' | 'approved' | 'dismissed';
  reason: string;
  created_at: string;
}

export interface Item {
  id: string;
  name: string;
  merchant: string;
  price: number;
  currency: string;
  purchase_date: string;
  category: string;
  model_number?: string;
  return_window_days: number;
  return_deadline: string;
  warranty_days: number;
  warranty_deadline: string;
  status: 'active' | 'returned' | 'claimed' | 'archived';
  created_at: string;
  days_left_return: number;
  days_left_warranty: number;
  is_return_closing_soon: boolean;
  has_active_recall: boolean;
  escalations: EscalationBrief[];
}

export interface Escalation {
  id: string;
  item_id: string;
  item_name?: string;
  merchant?: string;
  price?: number;
  type: 'return_window' | 'warranty_expiring' | 'recall_match';
  severity: 'warning' | 'urgent' | 'critical';
  reason: string;
  draft_action: string;
  draft_recipient?: string;
  status: 'pending' | 'approved' | 'dismissed';
  cpsc_recall_id?: string;
  created_at: string;
  resolved_at?: string;
}

export interface SystemStats {
  total_items_monitored: number;
  active_alerts_count: number;
  recalls_detected_count: number;
  total_protected_value: number;
  nearest_deadline_item?: string;
  nearest_deadline_date?: string;
  bedrock_status: {
    is_live_bedrock: boolean;
    model_id: string;
    provider: string;
    region: string;
  };
}

export interface LiveRecallResult {
  recall_id: string;
  title: string;
  date: string;
  description: string;
  hazard: string;
  remedy: string;
  url: string;
  consumer_contact: string;
  products: string[];
}

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'urgent' | 'info';
  timestamp: number;
}
