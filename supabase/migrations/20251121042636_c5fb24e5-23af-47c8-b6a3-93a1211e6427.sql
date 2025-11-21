-- Add image_position column to bakes table
ALTER TABLE public.bakes 
ADD COLUMN image_position text DEFAULT 'center' CHECK (image_position IN ('center', 'top', 'bottom', 'left', 'right'));

-- Add comment explaining the column
COMMENT ON COLUMN public.bakes.image_position IS 'Controls the focal point of the image in thumbnails (object-position CSS property)';