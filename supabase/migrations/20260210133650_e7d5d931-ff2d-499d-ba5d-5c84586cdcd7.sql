
-- Per-store notification settings with source overrides
CREATE TABLE public.store_notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES public.team_stores(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'standard_store',  -- 'standard_store' | 'champro_builder'
  event_type TEXT NOT NULL,  -- 'order_placed', 'order_shipped', 'order_ready', 'store_opened', 'store_closed', 'payout_sent'
  enabled BOOLEAN NOT NULL DEFAULT true,
  channel TEXT NOT NULL DEFAULT 'sms',  -- 'sms' | 'email'
  send_to TEXT NOT NULL DEFAULT 'customer',  -- 'customer' | 'coach' | 'internal'
  to_phone TEXT,  -- used for coach/internal alerts
  to_email TEXT,  -- used for coach/internal email alerts
  template_text TEXT NOT NULL DEFAULT '',
  template_subject TEXT,  -- email subject line
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, source, event_type, channel, send_to)
);

-- Enable RLS
ALTER TABLE public.store_notification_settings ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can manage store notification settings"
  ON public.store_notification_settings
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Global defaults (store_id = NULL)
INSERT INTO public.store_notification_settings (store_id, source, event_type, channel, send_to, template_text, template_subject) VALUES
  (NULL, 'standard_store', 'order_placed', 'sms', 'customer', 'Thanks for your order from {{store_name}}! Order {{order_number}} has been received. We''ll keep you updated.', NULL),
  (NULL, 'standard_store', 'order_placed', 'email', 'customer', '<h2>Order Confirmed</h2><p>Hi {{customer_name}}, your order {{order_number}} from {{store_name}} has been received!</p>', 'Order {{order_number}} Confirmed - {{store_name}}'),
  (NULL, 'standard_store', 'order_placed', 'sms', 'internal', 'New order {{order_number}} from {{store_name}} — ${{order_total}} ({{item_count}} items)', NULL),
  (NULL, 'standard_store', 'order_ready', 'sms', 'customer', 'Your order {{order_number}} from {{store_name}} is ready for pickup at {{pickup_location}}!', NULL),
  (NULL, 'standard_store', 'order_shipped', 'sms', 'customer', 'Your order {{order_number}} from {{store_name}} has shipped!', NULL),
  (NULL, 'standard_store', 'store_opened', 'sms', 'customer', '{{store_name}} is now open! Shop now before it closes on {{close_date}}.', NULL),
  (NULL, 'standard_store', 'store_closed', 'sms', 'internal', '{{store_name}} has closed. Time to process fulfillment and payouts.', NULL),
  (NULL, 'standard_store', 'payout_sent', 'sms', 'coach', 'A fundraising payout of ${{payout_amount}} has been sent for {{store_name}}.', NULL),
  (NULL, 'champro_builder', 'order_placed', 'sms', 'customer', 'Your Champro custom uniform order through Todd''s is received: Order {{order_number}}. We''ll send updates as production progresses.', NULL),
  (NULL, 'champro_builder', 'order_placed', 'email', 'customer', '<h2>Custom Uniform Order Received</h2><p>Hi {{customer_name}}, your Champro custom uniform order {{order_number}} has been submitted for production.</p>', 'Champro Order {{order_number}} Received'),
  (NULL, 'champro_builder', 'order_placed', 'sms', 'internal', 'New Champro order {{order_number}} — ${{order_total}}', NULL);

-- Trigger for updated_at
CREATE TRIGGER update_store_notification_settings_updated_at
  BEFORE UPDATE ON public.store_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
