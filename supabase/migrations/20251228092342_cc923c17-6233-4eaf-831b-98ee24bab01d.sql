-- Create event_expenses table
CREATE TABLE public.event_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  category TEXT,
  notes TEXT,
  expense_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can view event expenses"
  ON public.event_expenses FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert event expenses"
  ON public.event_expenses FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update event expenses"
  ON public.event_expenses FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete event expenses"
  ON public.event_expenses FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_event_expenses_updated_at
  BEFORE UPDATE ON public.event_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();