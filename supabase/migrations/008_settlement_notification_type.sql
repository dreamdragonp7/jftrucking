-- Add settlement_created to notification_type enum
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'settlement_created';
