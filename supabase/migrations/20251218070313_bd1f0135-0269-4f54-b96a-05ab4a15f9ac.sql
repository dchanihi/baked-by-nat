-- Add category column to event_items table
ALTER TABLE public.event_items 
ADD COLUMN category text;