import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import BakeCard from '@/components/BakeCard';
import { bakes } from '@/lib/bakesData';

const Bakes = () => {
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
            {bakes.map((bake) => (
              <BakeCard key={bake.id} bake={bake} />
            ))}
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Bakes;
