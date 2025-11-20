import { Link } from 'react-router-dom';
import { Bake } from '@/lib/bakesData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface BakeCardProps {
  bake: Bake;
}

const BakeCard = ({ bake }: BakeCardProps) => {
  return (
    <Link to={`/bakes/${bake.id}`} className="group">
      <Card className="overflow-hidden border-2 hover:border-pink-soft hover:shadow-lg transition-all duration-300 h-full">
        <div className="aspect-square overflow-hidden bg-secondary">
          <img
            src={bake.image}
            alt={bake.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl font-display font-semibold text-primary-foreground group-hover:text-pink-accent transition-colors">
            {bake.title}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground font-body">
            {new Date(bake.date).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground font-body line-clamp-2">
            {bake.caption}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
};

export default BakeCard;
