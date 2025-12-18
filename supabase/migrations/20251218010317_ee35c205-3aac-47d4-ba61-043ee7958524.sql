-- Create table to track daily summaries for multi-day events
CREATE TABLE public.event_day_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  open_time TIMESTAMP WITH TIME ZONE NOT NULL,
  close_time TIMESTAMP WITH TIME ZONE,
  revenue NUMERIC NOT NULL DEFAULT 0,
  items_sold INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_day_summaries ENABLE ROW LEVEL SECURITY;

-- Admins only policies
CREATE POLICY "Admins can view event day summaries"
ON public.event_day_summaries FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert event day summaries"
ON public.event_day_summaries FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update event day summaries"
ON public.event_day_summaries FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete event day summaries"
ON public.event_day_summaries FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));