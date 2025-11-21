import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
interface Bake {
  id: string;
  title: string;
  image_url: string;
}
const Order = () => {
  const [searchParams] = useSearchParams();
  const preselectedBakeId = searchParams.get('bakeId');
  const [orderType, setOrderType] = useState<'existing_bake' | 'custom'>(preselectedBakeId ? 'existing_bake' : 'custom');
  const [bakes, setBakes] = useState<Bake[]>([]);
  const [selectedBakeId, setSelectedBakeId] = useState(preselectedBakeId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sameAsRequestedDate, setSameAsRequestedDate] = useState(true);
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    quantity: 1,
    requestedDate: '',
    pickupDate: '',
    customDescription: '',
    additionalNotes: ''
  });
  useEffect(() => {
    fetchBakes();
  }, []);
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
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const orderData = {
        customer_name: formData.customerName,
        customer_email: formData.customerEmail,
        customer_phone: formData.customerPhone || null,
        order_type: orderType,
        bake_id: orderType === 'existing_bake' ? selectedBakeId : null,
        bake_title: orderType === 'existing_bake' ? bakes.find(b => b.id === selectedBakeId)?.title : null,
        custom_description: orderType === 'custom' ? formData.customDescription : null,
        quantity: formData.quantity,
        requested_date: formData.requestedDate || null,
        pickup_date: sameAsRequestedDate ? formData.requestedDate || null : formData.pickupDate || null,
        additional_notes: formData.additionalNotes || null
      };
      const {
        error
      } = await supabase.from('orders').insert(orderData);
      if (error) throw error;
      toast.success('order submitted successfully! 🎉');

      // Reset form
      setFormData({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        quantity: 1,
        requestedDate: '',
        pickupDate: '',
        customDescription: '',
        additionalNotes: ''
      });
      setSelectedBakeId('');
      setOrderType('custom');
      setSameAsRequestedDate(true);
    } catch (error) {
      console.error('Error submitting order:', error);
      toast.error('failed to submit order. please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  return <div className="min-h-screen flex flex-col">
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
            {orderType === 'existing_bake' && <div className="space-y-3">
                <Label htmlFor="bakeId" className="text-base font-display">
                  select a bake
                </Label>
                <Select value={selectedBakeId} onValueChange={setSelectedBakeId} required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="pick your favorite..." />
                  </SelectTrigger>
                  <SelectContent>
                    {bakes.map(bake => <SelectItem key={bake.id} value={bake.id}>
                        {bake.title}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>}

            {/* Custom Order Description */}
            {orderType === 'custom' && <div className="space-y-3">
                <Label htmlFor="customDescription" className="text-base font-display">
                  describe your dream dessert
                </Label>
                <Textarea id="customDescription" value={formData.customDescription} onChange={e => setFormData({
              ...formData,
              customDescription: e.target.value
            })} required rows={4} className="resize-none" placeholder="tell us about the good, flavors, colors, decorations, occasion..." />
              </div>}

            {/* Customer Information */}
            <div className="space-y-3">
              <Label htmlFor="customerName" className="text-base font-display">
                your name
              </Label>
              <Input id="customerName" value={formData.customerName} onChange={e => setFormData({
              ...formData,
              customerName: e.target.value
            })} required placeholder="nat" />
            </div>

            <div className="space-y-3">
              <Label htmlFor="customerEmail" className="text-base font-display">
                your email
              </Label>
              <Input id="customerEmail" type="email" value={formData.customerEmail} onChange={e => setFormData({
              ...formData,
              customerEmail: e.target.value
            })} required placeholder="nat@example.com" />
            </div>

            <div className="space-y-3">
              <Label htmlFor="customerPhone" className="text-base font-display">
                phone number (optional)
              </Label>
              <Input id="customerPhone" type="tel" value={formData.customerPhone} onChange={e => setFormData({
              ...formData,
              customerPhone: e.target.value
            })} placeholder="+1 (555) 123-4567" />
            </div>

            {/* Order Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="quantity" className="text-base font-display">
                  quantity
                </Label>
                <Input id="quantity" type="number" min="1" value={formData.quantity} onChange={e => setFormData({
                ...formData,
                quantity: parseInt(e.target.value)
              })} required />
              </div>

              <div className="space-y-3">
                <Label htmlFor="requestedDate" className="text-base font-display">
                  when do you need it?
                </Label>
                <Input id="requestedDate" type="date" value={formData.requestedDate} onChange={e => setFormData({
                ...formData,
                requestedDate: e.target.value
              })} min={new Date().toISOString().split('T')[0]} />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="sameDate" checked={sameAsRequestedDate} onCheckedChange={checked => setSameAsRequestedDate(checked as boolean)} />
              <Label htmlFor="sameDate" className="text-sm font-display cursor-pointer">
                pick up on the same date
              </Label>
            </div>

            {!sameAsRequestedDate && <div className="space-y-3">
                <Label htmlFor="pickupDate" className="text-base font-display">
                  when will you pick up?
                </Label>
                <Input id="pickupDate" type="date" value={formData.pickupDate} onChange={e => setFormData({
              ...formData,
              pickupDate: e.target.value
            })} min={new Date().toISOString().split('T')[0]} />
              </div>}

            <div className="space-y-3">
              <Label htmlFor="additionalNotes" className="text-base font-display">
                additional notes (optional)
              </Label>
              <Textarea id="additionalNotes" value={formData.additionalNotes} onChange={e => setFormData({
              ...formData,
              additionalNotes: e.target.value
            })} placeholder="any allergies, dietary restrictions, or special requests?" rows={3} className="resize-none" />
            </div>

            <Button type="submit" size="lg" className="w-full font-display text-lg" disabled={isSubmitting}>
              {isSubmitting ? 'submitting...' : 'submit order'}
            </Button>
          </form>
        </section>
      </main>
      
      <Footer />
    </div>;
};
export default Order;