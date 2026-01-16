-- Add recipe_id column to bakes table to link recipes for COGS calculation
ALTER TABLE public.bakes ADD COLUMN recipe_id uuid REFERENCES public.recipes(id) ON DELETE SET NULL;

-- Create an index for better query performance
CREATE INDEX idx_bakes_recipe_id ON public.bakes(recipe_id);