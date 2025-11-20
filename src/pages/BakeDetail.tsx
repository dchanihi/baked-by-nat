import { useParams, Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { bakes } from '@/lib/bakesData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Tag } from 'lucide-react';

const BakeDetail = () => {
  const { id } = useParams();
  const bake = bakes.find((b) => b.id === id);
  
  if (!bake) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-display font-bold text-primary-foreground mb-4">
              bake not found
            </h1>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/bakes">
                <ArrowLeft className="w-4 h-4 mr-2" />
                back to bakes
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-grow">
        <section className="container mx-auto px-4 py-16 md:py-24">
          <Button 
            asChild 
            variant="ghost" 
            className="mb-8 hover:bg-pink-soft hover:text-primary-foreground rounded-full"
          >
            <Link to="/bakes">
              <ArrowLeft className="w-4 h-4 mr-2" />
              back to all bakes
            </Link>
          </Button>
          
          <div className="grid md:grid-cols-2 gap-12">
            <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-pink-soft/20">
              <img
                src={bake.image}
                alt={bake.title}
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="space-y-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-display font-bold text-primary-foreground mb-4">
                  {bake.title}
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-body mb-4">
                  <Calendar className="w-4 h-4" />
                  {new Date(bake.date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
              
              <div>
                <Badge className="bg-pink-soft text-primary-foreground font-body mb-4">
                  {bake.category}
                </Badge>
              </div>
              
              <p className="text-lg font-body text-pink-accent font-medium">
                {bake.caption}
              </p>
              
              <p className="text-base font-body text-foreground leading-relaxed">
                {bake.description}
              </p>
              
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-body text-muted-foreground">tags:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {bake.tags.map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="outline" 
                      className="border-pink-soft text-foreground font-body"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default BakeDetail;
