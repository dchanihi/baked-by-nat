import { useState } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Instagram, Youtube, Mail } from 'lucide-react';

const Contact = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic form validation
    if (!formData.name || !formData.email || !formData.message) {
      toast({
        title: 'oops!',
        description: 'please fill in all fields ♡',
        variant: 'destructive'
      });
      return;
    }
    
    // Here you would typically send the form data to a backend
    toast({
      title: 'message sent! ♡',
      description: 'thanks for reaching out! i\'ll get back to you soon.',
    });
    
    // Reset form
    setFormData({ name: '', email: '', message: '' });
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-grow">
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-display font-bold text-primary-foreground mb-4">
                let's chat!
              </h1>
              <p className="text-base md:text-lg font-body text-muted-foreground">
                have a question, custom order idea, or just want to say hi? drop me a message below! ♡
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6 mb-12">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-body">
                  name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="your name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="rounded-xl border-2 focus:border-pink-soft"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="font-body">
                  email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="rounded-xl border-2 focus:border-pink-soft"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="message" className="font-body">
                  message
                </Label>
                <Textarea
                  id="message"
                  placeholder="tell me what's on your mind..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="rounded-xl border-2 focus:border-pink-soft min-h-[150px]"
                />
              </div>
              
              <Button
                type="submit"
                className="w-full bg-pink-soft hover:bg-pink-medium text-primary-foreground font-body font-medium py-6 text-base rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300"
              >
                <Mail className="w-5 h-5 mr-2" />
                send message
              </Button>
            </form>
            
            <div className="bg-secondary rounded-3xl p-8 border-2 border-pink-soft/20">
              <h2 className="text-2xl font-display font-bold text-primary-foreground mb-6 text-center">
                find me online
              </h2>
              <div className="flex justify-center gap-6">
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full border-2 border-pink-soft hover:bg-pink-soft hover:text-primary-foreground transition-all duration-300"
                  asChild
                >
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
                    <Instagram className="w-5 h-5 mr-2" />
                    Instagram
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full border-2 border-pink-soft hover:bg-pink-soft hover:text-primary-foreground transition-all duration-300"
                  asChild
                >
                  <a href="https://youtube.com" target="_blank" rel="noopener noreferrer">
                    <Youtube className="w-5 h-5 mr-2" />
                    YouTube
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Contact;
