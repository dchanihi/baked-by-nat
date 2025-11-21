-- Add pickup_date column to orders table
ALTER TABLE public.orders 
ADD COLUMN pickup_date date;