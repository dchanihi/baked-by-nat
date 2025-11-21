-- Add status field to bakes table for draft/published functionality
ALTER TABLE public.bakes 
ADD COLUMN status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published'));

-- Add scheduled_publish_date for scheduling posts
ALTER TABLE public.bakes
ADD COLUMN scheduled_publish_date timestamp with time zone;