-- Add columns for multi-day event tracking
ALTER TABLE public.events 
ADD COLUMN current_day integer DEFAULT 0,
ADD COLUMN day_open_time timestamp with time zone,
ADD COLUMN day_close_time timestamp with time zone;