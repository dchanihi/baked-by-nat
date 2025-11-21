import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Calendar } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { format } from 'date-fns';

type Bake = Tables<'bakes'>;

interface BakesListProps {
  bakes: Bake[];
  onEdit: (bake: Bake) => void;
  onDelete: (id: string) => void;
}

export const BakesList = ({ bakes, onEdit, onDelete }: BakesListProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {bakes.map((bake) => (
        <Card key={bake.id} className="overflow-hidden">
          <CardHeader className="p-0">
            <div className="aspect-video overflow-hidden">
              <img
                src={bake.image_url}
                alt={bake.title}
                className="w-full h-full object-cover"
              />
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-display font-semibold text-lg">{bake.title}</h3>
              <Badge variant={bake.status === 'published' ? 'default' : 'secondary'}>
                {bake.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {bake.description}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {format(new Date(bake.date), 'MMM d, yyyy')}
            </div>
            {bake.scheduled_publish_date && (
              <div className="mt-2 text-xs text-pink-accent">
                Scheduled: {format(new Date(bake.scheduled_publish_date), 'MMM d, yyyy h:mm a')}
              </div>
            )}
          </CardContent>
          <CardFooter className="p-4 pt-0 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(bake)}
              className="flex-1"
            >
              <Edit className="w-3 h-3 mr-1" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(bake.id)}
              className="flex-1"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Delete
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};
