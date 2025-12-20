-- Create event_schedules table to store different times for each day
CREATE TABLE public.event_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL DEFAULT 1,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, day_number)
);

-- Enable RLS
ALTER TABLE public.event_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view event schedules" 
ON public.event_schedules 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert event schedules" 
ON public.event_schedules 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update event schedules" 
ON public.event_schedules 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete event schedules" 
ON public.event_schedules 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));