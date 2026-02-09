
-- =============================================
-- GLOBAL NOTIFICATIONS & MESSAGING SYSTEM
-- =============================================

-- 1) Global notification settings (single row config)
CREATE TABLE public.global_notification_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_from_address text NOT NULL DEFAULT 'orders@toddssport.com',
  email_reply_to text DEFAULT 'support@toddssport.com',
  email_sending_domain text DEFAULT 'toddssport.com',
  sms_messaging_service_sid text,
  sms_sender_phone text,
  sms_compliance_message text DEFAULT 'Reply STOP to opt out.',
  default_email_enabled boolean NOT NULL DEFAULT true,
  default_sms_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.global_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage global notification settings"
  ON public.global_notification_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read global notification settings"
  ON public.global_notification_settings FOR SELECT
  USING (true);

-- Seed default row
INSERT INTO public.global_notification_settings (id) VALUES (gen_random_uuid());

-- 2) Global customers
CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_customers_email ON public.customers (lower(email));

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage customers"
  ON public.customers FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3) Customer channels (opt-in/out tracking)
CREATE TABLE public.customer_channels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  email text,
  phone text,
  email_enabled_transactional boolean NOT NULL DEFAULT true,
  sms_enabled_transactional boolean NOT NULL DEFAULT true,
  sms_opted_out boolean NOT NULL DEFAULT false,
  sms_opted_out_at timestamptz,
  sms_opt_out_keyword text,
  sms_opted_in_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage customer channels"
  ON public.customer_channels FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4) Notification templates (global, versioned)
CREATE TABLE public.notification_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  channel text NOT NULL DEFAULT 'email', -- 'email' | 'sms'
  name text NOT NULL,
  subject text, -- email only
  body text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  sms_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_key, version, channel)
);

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notification templates"
  ON public.notification_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read active notification templates"
  ON public.notification_templates FOR SELECT
  USING (is_active = true);

-- Seed default templates
INSERT INTO public.notification_templates (template_key, channel, name, subject, body, variables) VALUES
  ('order_placed', 'email', 'Order Placed', 'Order {{order_number}} Confirmed', 'Hi {{customer_name}}, your order {{order_number}} has been placed. Expected production time: {{production_time}}. {{fulfillment_info}}', '["customer_name","order_number","production_time","fulfillment_info","store_name"]'::jsonb),
  ('order_placed', 'sms', 'Order Placed SMS', NULL, '{{store_name}}: Order {{order_number}} confirmed! {{fulfillment_info}} Reply STOP to opt out.', '["order_number","store_name","fulfillment_info"]'::jsonb),
  ('payment_succeeded', 'email', 'Payment Succeeded', 'Payment received for {{order_number}}', 'Hi {{customer_name}}, we received your payment of ${{amount}} for order {{order_number}}.', '["customer_name","order_number","amount"]'::jsonb),
  ('payment_failed', 'email', 'Payment Failed', 'Payment issue with order {{order_number}}', 'Hi {{customer_name}}, there was an issue processing payment for order {{order_number}}. Please update your payment method.', '["customer_name","order_number"]'::jsonb),
  ('order_in_production', 'email', 'In Production', 'Order {{order_number}} is in production', 'Hi {{customer_name}}, your order {{order_number}} is now in production.', '["customer_name","order_number","store_name"]'::jsonb),
  ('order_in_production', 'sms', 'In Production SMS', NULL, '{{store_name}}: Order {{order_number}} is now in production! Reply STOP to opt out.', '["order_number","store_name"]'::jsonb),
  ('ready_for_pickup', 'email', 'Ready for Pickup', 'Order {{order_number}} ready for pickup', 'Hi {{customer_name}}, your order {{order_number}} is ready for pickup at {{pickup_location}}.', '["customer_name","order_number","pickup_location","store_name"]'::jsonb),
  ('ready_for_pickup', 'sms', 'Ready for Pickup SMS', NULL, '{{store_name}}: Order {{order_number}} is ready for pickup at {{pickup_location}}! Reply STOP to opt out.', '["order_number","pickup_location","store_name"]'::jsonb),
  ('pickup_reminder', 'sms', 'Pickup Reminder SMS', NULL, '{{store_name}}: Reminder - Order {{order_number}} is still waiting for pickup at {{pickup_location}}. Reply STOP to opt out.', '["order_number","pickup_location","store_name"]'::jsonb),
  ('order_shipped', 'email', 'Order Shipped', 'Order {{order_number}} shipped', 'Hi {{customer_name}}, your order {{order_number}} has shipped! Tracking: {{tracking_number}}', '["customer_name","order_number","tracking_number","store_name"]'::jsonb),
  ('order_shipped', 'sms', 'Order Shipped SMS', NULL, '{{store_name}}: Order {{order_number}} shipped! Track: {{tracking_url}} Reply STOP to opt out.', '["order_number","tracking_url","store_name"]'::jsonb),
  ('order_delivered', 'email', 'Order Delivered', 'Order {{order_number}} delivered', 'Hi {{customer_name}}, your order {{order_number}} has been delivered!', '["customer_name","order_number","store_name"]'::jsonb),
  ('order_cancelled', 'email', 'Order Cancelled', 'Order {{order_number}} cancelled', 'Hi {{customer_name}}, your order {{order_number}} has been cancelled. If you have questions, please contact us.', '["customer_name","order_number","store_name"]'::jsonb),
  ('order_refunded', 'email', 'Order Refunded', 'Refund for order {{order_number}}', 'Hi {{customer_name}}, a refund of ${{amount}} has been issued for order {{order_number}}.', '["customer_name","order_number","amount","store_name"]'::jsonb),
  ('backorder_update', 'email', 'Backorder Update', 'Update on order {{order_number}}', 'Hi {{customer_name}}, some items in order {{order_number}} are on backorder. {{backorder_details}}', '["customer_name","order_number","backorder_details","store_name"]'::jsonb);

-- 5) Notification events (send log)
CREATE TABLE public.notification_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid,
  customer_id uuid REFERENCES public.customers(id),
  channel text NOT NULL, -- 'email' | 'sms'
  template_key text NOT NULL,
  recipient_address text NOT NULL, -- email or phone
  payload_snapshot jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending', -- pending, sent, failed, dead_letter
  error text,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  phone_selection_reason text, -- for SMS: why this phone was chosen
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notification events"
  ON public.notification_events FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 6) Inbound messages (SMS replies)
CREATE TABLE public.inbound_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid REFERENCES public.customers(id),
  order_id uuid,
  from_phone text NOT NULL,
  body text NOT NULL,
  is_opt_out boolean NOT NULL DEFAULT false,
  is_opt_in boolean NOT NULL DEFAULT false,
  twilio_message_sid text,
  processed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inbound_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage inbound messages"
  ON public.inbound_messages FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 7) Outbound admin messages (manual sends)
CREATE TABLE public.admin_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid REFERENCES public.customers(id),
  order_id uuid,
  channel text NOT NULL, -- 'email' | 'sms'
  recipient_address text NOT NULL,
  subject text, -- email only
  body text NOT NULL,
  sent_by uuid, -- admin user_id
  status text NOT NULL DEFAULT 'pending',
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage admin messages"
  ON public.admin_messages FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 8) Scheduled notification reminders
CREATE TABLE public.notification_reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL,
  template_key text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, sent, cancelled
  sent_notification_id uuid REFERENCES public.notification_events(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notification reminders"
  ON public.notification_reminders FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 9) Add preferred_sms_phone to orders for admin override
ALTER TABLE public.team_store_orders 
  ADD COLUMN IF NOT EXISTS preferred_sms_phone text,
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id);

-- Timestamp trigger for new tables
CREATE TRIGGER update_global_notification_settings_updated_at
  BEFORE UPDATE ON public.global_notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_channels_updated_at
  BEFORE UPDATE ON public.customer_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_events_updated_at
  BEFORE UPDATE ON public.notification_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
