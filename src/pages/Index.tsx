import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import BakeCard from '@/components/BakeCard';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import heroImage from '@/assets/hero-baking.jpg';
import { Sparkles } from 'lucide-react';

type Bake = Tables<'bakes'>;

const Index = () => {
  const [latestBakes, setLatestBakes] = useState<Bake[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBakes();
  }, []);

  const loadBakes = async () => {
    const now = new Date().toISOString();
    
    // First, update any scheduled posts whose date has passed
    await supabase
      .from('bakes')
      .update({ status: 'published' })
      .eq('status', 'scheduled')
      .lte('scheduled_publish_date', now);
    
    // Then fetch published bakes (excluding archived)
    const { data, error } = await supabase
      .from('bakes')
      .select('*')
      .eq('status', 'published')
      .order('date', { ascending: false })
      .limit(6);

    if (!error && data) {
      setLatestBakes(data);
    }
    setLoading(false);
  };

  const scrollToBakes = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const bakesSection = document.getElementById('latest-bakes');
    bakesSection?.scrollIntoView({
      behavior: 'smooth'
    });
  };
  return <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 order-2 md:order-1">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-primary-foreground">
                hi, i'm nat 🍰
              </h1>
              <h2 className="text-xl md:text-2xl font-body text-pink-accent">
                a baker proud to call edmonton her home              
              </h2>
              <p className="text-base md:text-lg font-body text-foreground leading-relaxed">
                i'm a home baker who loves creating cute, cozy desserts that make people smile! let me share with you my latest bakes and sweet inspiration. whether it's fluffy cupcakes, buttery cookies, or dreamy cakes, everything is baked with love ♡
              </p>
              <Button onClick={scrollToBakes} className="bg-pink-soft hover:bg-pink-medium text-primary-foreground font-body font-medium px-8 py-6 text-base rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300">
                <Sparkles className="w-5 h-5 mr-2" />
                see my latest bakes
              </Button>
            </div>
            
            <div className="order-1 md:order-2">
              <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-pink-soft/20">
                <img src={heroImage} alt="Cozy baking scene with cute pastries" className="w-full h-full object-cover aspect-video" />
              </div>
            </div>
          </div>
        </section>
        
        {/* Latest Bakes Section */}
        <section id="latest-bakes" className="bg-secondary py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
                fresh from the oven
              </h2>
              <p className="text-base md:text-lg font-body text-muted-foreground">
                check out my most recent bakes ♡
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {loading ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground">loading bakes...</p>
                </div>
              ) : latestBakes.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground">no bakes yet ♡</p>
                </div>
              ) : (
                latestBakes.map(bake => <BakeCard key={bake.id} bake={bake} />)
              )}
            </div>
            
            <div className="text-center">
              <Button asChild variant="outline" className="border-2 border-pink-soft hover:bg-pink-soft hover:text-primary-foreground font-body font-medium px-8 py-6 text-base rounded-full shadow-md hover:shadow-lg transition-all duration-300">
                <Link to="/bakes">
                  see all bakes →
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>;
};
export default Index;