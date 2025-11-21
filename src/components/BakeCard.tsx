import { Link } from 'react-router-dom';
import type { Tables } from '@/integrations/supabase/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

type Bake = Tables<'bakes'>;

interface BakeCardProps {
  bake: Bake;
}

const BakeCard = ({ bake }: BakeCardProps) => {
  return (
    <Card className="overflow-hidden border-2 hover:border-pink-soft hover:shadow-lg transition-all duration-300 h-full">
      <Link to={`/bakes/${bake.id}`} className="group block">
        <div className="aspect-square overflow-hidden bg-secondary">
          <img
            src={bake.image_url}
            alt={bake.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            style={{ objectPosition: bake.image_position || 'center' }}
          />
        </div>
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl font-display font-semibold text-primary-foreground group-hover:text-pink-accent transition-colors">
            {bake.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground font-body line-clamp-2">
            {bake.caption}
          </p>
        </CardContent>
      </Link>
    </Card>
  );
};

export default BakeCard;
