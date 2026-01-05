-- Create yearly_archives table to store historical financial data
CREATE TABLE public.yearly_archives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL UNIQUE,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  total_expenses NUMERIC NOT NULL DEFAULT 0,
  net_profit NUMERIC NOT NULL DEFAULT 0,
  orders_revenue NUMERIC NOT NULL DEFAULT 0,
  events_revenue NUMERIC NOT NULL DEFAULT 0,
  total_orders_completed INTEGER NOT NULL DEFAULT 0,
  total_events_completed INTEGER NOT NULL DEFAULT 0,
  total_items_sold INTEGER NOT NULL DEFAULT 0,
  archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.yearly_archives ENABLE ROW LEVEL SECURITY;

-- Create admin-only policies
CREATE POLICY "Admins can view yearly archives" 
ON public.yearly_archives 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert yearly archives" 
ON public.yearly_archives 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update yearly archives" 
ON public.yearly_archives 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete yearly archives" 
ON public.yearly_archives 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));