import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import natPortrait from '@/assets/nat-portrait.jpg';
import { Heart, Sparkles, Star } from 'lucide-react';
const About = () => {
  return <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-pink-soft/20">
                <img alt="Nat in her cozy kitchen" className="w-full h-full object-cover aspect-square" src="/lovable-uploads/a430686c-5b74-4fde-b886-d353475614e3.jpg" />
              </div>
            </div>
            
            <div className="space-y-6 order-1 md:order-2">
              <h1 className="text-4xl md:text-5xl font-display font-bold text-primary-foreground">
                meet nat ♡
              </h1>
              <p className="text-base md:text-lg font-body text-foreground leading-relaxed">
                hi! i'm nat, the baker behind all these sweet treats. baking started as a cozy weekend hobby 
                and has blossomed into my favorite way to share joy with others. there's something magical 
                about transforming simple ingredients into something that makes people smile.
              </p>
            </div>
          </div>
        </section>
        
        {/* About Section */}
        <section className="bg-secondary py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto space-y-12">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Heart className="w-6 h-6 text-pink-accent fill-pink-soft" />
                  <h2 className="text-3xl font-display font-bold text-primary-foreground">
                    about baked by nat
                  </h2>
                </div>
                <p className="text-base font-body text-foreground leading-relaxed">
                  baked by nat is the physical manifestation of my baking passions, born from experimentation and fun and sharing the results with friends. what began as a simple chocolate chip cookie has grown into a colorful collection of pastries, cakes, and sweet creations. i believe that baking should be fun, a little messy, and always delicious.   
                </p>
              </div>
              
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Sparkles className="w-6 h-6 text-pink-accent" />
                  <h2 className="text-3xl font-display font-bold text-primary-foreground">
                    my baking style
                  </h2>
                </div>
                <div className="space-y-4">
                  <div className="bg-background rounded-2xl p-6 border-2 border-pink-soft/20">
                    <h3 className="text-lg font-display font-semibold text-primary-foreground mb-2">
                      cozy & homemade
                    </h3>
                    <p className="text-sm font-body text-foreground">
                      everything is baked from scratch in my home kitchen, using quality ingredients and lots of love.
                    </p>
                  </div>
                  
                  <div className="bg-background rounded-2xl p-6 border-2 border-pink-soft/20">
                    <h3 className="text-lg font-display font-semibold text-primary-foreground mb-2">
                      cute decorations
                    </h3>
                    <p className="text-sm font-body text-foreground">
                      i love making desserts that are almost too pretty to eat (but definitely should be eaten!).
                    </p>
                  </div>
                  
                  <div className="bg-background rounded-2xl p-6 border-2 border-pink-soft/20">
                    <h3 className="text-lg font-display font-semibold text-primary-foreground mb-2">
                      pastel colors & fun flavors
                    </h3>
                    <p className="text-sm font-body text-foreground">
                      from strawberry milk to matcha green, i love experimenting with colors and unique flavor combinations.
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Star className="w-6 h-6 text-pink-accent fill-pink-soft" />
                  <h2 className="text-3xl font-display font-bold text-primary-foreground">
                    fun facts
                  </h2>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="text-pink-accent text-xl">♡</span>
                    <span className="text-base font-body text-foreground">
                      favorite dessert: anything with cream cheese frosting
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-pink-accent text-xl">♡</span>
                    <span className="text-base font-body text-foreground">
                      favorite flavor combo: strawberry + vanilla
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-pink-accent text-xl">♡</span>
                    <span className="text-base font-body text-foreground">
                      baking frequency: at least once a week (usually more!)
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-pink-accent text-xl">♡</span>
                    <span className="text-base font-body text-foreground">
                      signature move: adding edible glitter to everything
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-pink-accent text-xl">♡</span>
                    <span className="text-base font-body text-foreground">
                      dream project: opening a cozy pink bakery someday
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>;
};
export default About;