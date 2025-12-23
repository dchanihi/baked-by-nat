-- Add order_id column to event_sales to track which items were purchased together
ALTER TABLE public.event_sales 
ADD COLUMN order_id uuid DEFAULT gen_random_uuid();

-- Create an index for efficient order queries
CREATE INDEX idx_event_sales_order_id ON public.event_sales(order_id);