-- Add icon_color column to event_items table with default pink color
ALTER TABLE public.event_items 
ADD COLUMN icon_color TEXT DEFAULT '#F5B8C9';