-- Add archive and visibility columns to bakes table
ALTER TABLE public.bakes 
ADD COLUMN is_archived boolean NOT NULL DEFAULT false,
ADD COLUMN is_visible boolean NOT NULL DEFAULT true;

-- Add show_in_filter column to categories table
ALTER TABLE public.categories 
ADD COLUMN show_in_filter boolean NOT NULL DEFAULT true;