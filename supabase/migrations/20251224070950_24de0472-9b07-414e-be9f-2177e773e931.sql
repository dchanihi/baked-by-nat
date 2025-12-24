-- Create event_deals table for storing deal configurations
CREATE TABLE public.event_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  quantity_required INTEGER NOT NULL DEFAULT 2,
  category TEXT,
  deal_price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_deals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (admin only, matching other event tables)
CREATE POLICY "Admins can view event deals"
  ON public.event_deals FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert event deals"
  ON public.event_deals FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update event deals"
  ON public.event_deals FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete event deals"
  ON public.event_deals FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_event_deals_updated_at
  BEFORE UPDATE ON public.event_deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();