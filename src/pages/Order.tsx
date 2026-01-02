import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, X, ImageIcon } from 'lucide-react';

interface Bake {
  id: string;
  title: string;
  image_url: string;
}

interface UploadedImage {
  file: File;
  preview: string;
}

const Order = () => {
  const [searchParams] = useSearchParams();
  const preselectedBakeId = searchParams.get('bakeId');
  const [orderType, setOrderType] = useState<'existing_bake' | 'custom'>(preselectedBakeId ? 'existing_bake' : 'custom');
  const [bakes, setBakes] = useState<Bake[]>([]);
  const [selectedBakeId, setSelectedBakeId] = useState(preselectedBakeId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inspirationImages, setInspirationImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    quantity: 1,
    pickupDate: '',
    pickupTime: '',
    customDescription: '',
    additionalNotes: ''
  });

  useEffect(() => {
    fetchBakes();
  }, []);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      inspirationImages.forEach(img => URL.revokeObjectURL(img.preview));
    };
  }, [inspirationImages]);

  const fetchBakes = async () => {
    const now = new Date().toISOString();
    
    const {
      data,
      error
    } = await supabase
      .from('bakes')
      .select('id, title, image_url')
      .or(`status.eq.published,and(status.eq.scheduled,scheduled_publish_date.lte.${now})`)
      .order('date', {
        ascending: false
      });
      
    if (error) {
      console.error('Error fetching bakes:', error);
      return;
    }
    setBakes(data || []);
  };

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    
    const validFiles = Array.from(files).filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        return false;
      }
      return true;
    });

    if (inspirationImages.length + validFiles.length > 5) {
      toast.error('You can upload up to 5 images');
      return;
    }

    const newImages = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    setInspirationImages(prev => [...prev, ...newImages]);
  }, [inspirationImages.length]);

  const removeImage = (index: number) => {
    setInspirationImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const uploadImages = async (): Promise<string[]> => {
    const urls: string[] = [];
    
    for (const img of inspirationImages) {
      const fileExt = img.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `order-inspiration/${fileName}`;

      const { error } = await supabase.storage
        .from('bake-images')
        .upload(filePath, img.file);

      if (error) {
        console.error('Error uploading image:', error);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('bake-images')
        .getPublicUrl(filePath);

      urls.push(urlData.publicUrl);
    }

    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Upload inspiration images first
      let imageUrls: string[] = [];
      if (inspirationImages.length > 0) {
        imageUrls = await uploadImages();
      }

      // Combine notes with image URLs if any
      let notes = formData.additionalNotes || '';
      if (imageUrls.length > 0) {
        notes = notes ? `${notes}\n\nInspiration Images:\n${imageUrls.join('\n')}` : `Inspiration Images:\n${imageUrls.join('\n')}`;
      }

      const orderData = {
        customer_name: formData.customerName,
        customer_email: formData.customerEmail,
        customer_phone: formData.customerPhone || null,
        order_type: orderType,
        bake_id: orderType === 'existing_bake' ? selectedBakeId : null,
        bake_title: orderType === 'existing_bake' ? bakes.find(b => b.id === selectedBakeId)?.title : null,
        custom_description: orderType === 'custom' ? formData.customDescription : null,
        quantity: formData.quantity,
        requested_date: formData.pickupDate || null,
        pickup_date: formData.pickupDate || null,
        additional_notes: notes || null
      };

      const { error } = await supabase.from('orders').insert(orderData);
      if (error) throw error;

      toast.success('order submitted successfully! 🎉');

      // Reset form
      setFormData({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        quantity: 1,
        pickupDate: '',
        pickupTime: '',
        customDescription: '',
        additionalNotes: ''
      });
      setSelectedBakeId('');
      setOrderType('custom');
      inspirationImages.forEach(img => URL.revokeObjectURL(img.preview));
      setInspirationImages([]);
    } catch (error) {
      console.error('Error submitting order:', error);
      toast.error('failed to submit order. please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate time slots from 9am to 6pm
  const timeSlots = [];
  for (let hour = 9; hour <= 18; hour++) {
    const time24 = `${hour.toString().padStart(2, '0')}:00`;
    const time12 = hour <= 12 ? `${hour}:00 AM` : `${hour - 12}:00 PM`;
    timeSlots.push({ value: time24, label: hour === 12 ? '12:00 PM' : time12 });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-grow">
        <section className="container mx-auto px-4 py-16 md:py-24 max-w-2xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-primary-foreground mb-4">
              order your treats
            </h1>
            <p className="text-base md:text-lg font-body text-muted-foreground">
              pick from my bakes or describe your dream dessert ♡
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 bg-card p-8 rounded-2xl shadow-soft">
            {/* Order Type Selection */}
            <div className="space-y-3">
              <Label htmlFor="orderType" className="text-base font-display">
                what would you like?
              </Label>
              <Select value={orderType} onValueChange={(value: 'existing_bake' | 'custom') => setOrderType(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="existing_bake">choose from our bakes</SelectItem>
                  <SelectItem value="custom">custom order</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Existing Bake Selection */}
            {orderType === 'existing_bake' && (
              <div className="space-y-3">
                <Label htmlFor="bakeId" className="text-base font-display">
                  select a bake
                </Label>
                <Select value={selectedBakeId} onValueChange={setSelectedBakeId} required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="pick your favorite..." />
                  </SelectTrigger>
                  <SelectContent>
                    {bakes.map(bake => (
                      <SelectItem key={bake.id} value={bake.id}>
                        {bake.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Custom Order Description */}
            {orderType === 'custom' && (
              <div className="space-y-3">
                <Label htmlFor="customDescription" className="text-base font-display">
                  describe your dream dessert
                </Label>
                <Textarea
                  id="customDescription"
                  value={formData.customDescription}
                  onChange={e => setFormData({ ...formData, customDescription: e.target.value })}
                  required
                  rows={4}
                  className="resize-none"
                  placeholder="tell us about the good, flavors, colors, decorations, occasion..."
                />
              </div>
            )}

            {/* Inspiration Image Upload */}
            <div className="space-y-3">
              <Label className="text-base font-display">
                inspiration images (optional)
              </Label>
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                  isDragging 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={e => handleFiles(e.target.files)}
                />
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  drag & drop images here or click to browse
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  up to 5 images, max 5MB each
                </p>
              </div>

              {/* Image Previews */}
              {inspirationImages.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-3">
                  {inspirationImages.map((img, index) => (
                    <div key={index} className="relative aspect-square group">
                      <img
                        src={img.preview}
                        alt={`Inspiration ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(index);
                        }}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Information */}
            <div className="space-y-3">
              <Label htmlFor="customerName" className="text-base font-display">
                your name
              </Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                required
                placeholder="nat"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="customerEmail" className="text-base font-display">
                your email
              </Label>
              <Input
                id="customerEmail"
                type="email"
                value={formData.customerEmail}
                onChange={e => setFormData({ ...formData, customerEmail: e.target.value })}
                required
                placeholder="nat@example.com"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="customerPhone" className="text-base font-display">
                phone number (optional)
              </Label>
              <Input
                id="customerPhone"
                type="tel"
                value={formData.customerPhone}
                onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            {/* Order Details */}
            <div className="space-y-3">
              <Label htmlFor="quantity" className="text-base font-display">
                quantity
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                required
              />
            </div>

            {/* Pickup Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="pickupDate" className="text-base font-display">
                  pickup date
                </Label>
                <Input
                  id="pickupDate"
                  type="date"
                  value={formData.pickupDate}
                  onChange={e => setFormData({ ...formData, pickupDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="pickupTime" className="text-base font-display">
                  pickup time
                </Label>
                <Select 
                  value={formData.pickupTime} 
                  onValueChange={value => setFormData({ ...formData, pickupTime: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="select a time..." />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map(slot => (
                      <SelectItem key={slot.value} value={slot.value}>
                        {slot.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="additionalNotes" className="text-base font-display">
                additional notes (optional)
              </Label>
              <Textarea
                id="additionalNotes"
                value={formData.additionalNotes}
                onChange={e => setFormData({ ...formData, additionalNotes: e.target.value })}
                placeholder="any allergies, dietary restrictions, or special requests?"
                rows={3}
                className="resize-none"
              />
            </div>

            <Button type="submit" size="lg" className="w-full font-display text-lg" disabled={isSubmitting}>
              {isSubmitting ? 'submitting...' : 'submit order'}
            </Button>
          </form>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Order;