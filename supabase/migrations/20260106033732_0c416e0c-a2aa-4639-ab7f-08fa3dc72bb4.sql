-- Create inventory_categories table
CREATE TABLE public.inventory_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin access only
CREATE POLICY "Admins can view inventory categories"
ON public.inventory_categories
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert inventory categories"
ON public.inventory_categories
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update inventory categories"
ON public.inventory_categories
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete inventory categories"
ON public.inventory_categories
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_inventory_categories_updated_at
BEFORE UPDATE ON public.inventory_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default categories
INSERT INTO public.inventory_categories (name, display_order) VALUES
('Ingredients', 1),
('Packaging', 2),
('Supplies', 3);