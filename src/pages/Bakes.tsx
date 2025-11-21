import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import BakeCard from '@/components/BakeCard';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Bake = Tables<'bakes'>;
type Category = Tables<'categories'>;

const Bakes = () => {
  const [bakes, setBakes] = useState<Bake[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadBakes();
    loadCategories();
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
      .order('date', { ascending: false });

    if (!error && data) {
      setBakes(data);
    }
    setLoading(false);
  };

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (!error && data) {
      setCategories(data);
    }
  };

  const filteredBakes = bakes.filter(bake => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      bake.title.toLowerCase().includes(query) ||
      bake.description.toLowerCase().includes(query);
    
    const matchesCategory = !selectedCategory || bake.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

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
          
          <div className="max-w-3xl mx-auto mb-12 space-y-6">
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="search for a bake..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 font-body"
              />
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Badge
                variant={selectedCategory === null ? "default" : "outline"}
                className="cursor-pointer font-body px-4 py-2 transition-all hover:scale-105"
                onClick={() => setSelectedCategory(null)}
              >
                all bakes
              </Badge>
              {categories.map((category) => (
                <Badge
                  key={category.id}
                  variant={selectedCategory === category.name ? "default" : "outline"}
                  className="cursor-pointer font-body px-4 py-2 transition-all hover:scale-105"
                  onClick={() => setSelectedCategory(category.name)}
                >
                  {category.name}
                  {selectedCategory === category.name && (
                    <X className="ml-2 h-3 w-3" />
                  )}
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">loading bakes...</p>
              </div>
            ) : filteredBakes.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">
                  {searchQuery ? 'no bakes found matching your search ♡' : 'no bakes yet ♡'}
                </p>
              </div>
            ) : (
              filteredBakes.map((bake) => (
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
