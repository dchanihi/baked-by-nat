import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import BakeCard from '@/components/BakeCard';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Bake = Tables<'bakes'>;

const Bakes = () => {
  const [bakes, setBakes] = useState<Bake[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBakes();
  }, []);

  const loadBakes = async () => {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('bakes')
      .select('*')
      .or(`status.eq.published,and(status.eq.scheduled,scheduled_publish_date.lte.${now})`)
      .order('date', { ascending: false });

    if (!error && data) {
      setBakes(data);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-grow">
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-primary-foreground mb-4">
              the bake gallery
            </h1>
            <p className="text-base md:text-lg font-body text-muted-foreground max-w-2xl mx-auto">
              all my sweet treats in one cozy place. each bake is made with love and a sprinkle of magic ♡
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">loading bakes...</p>
              </div>
            ) : bakes.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">no bakes yet ♡</p>
              </div>
            ) : (
              bakes.map((bake) => (
                <BakeCard key={bake.id} bake={bake} />
              ))
            )}
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Bakes;
