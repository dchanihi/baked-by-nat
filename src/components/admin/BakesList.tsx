import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Edit, Trash2, Calendar, Archive, Eye, EyeOff } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { format } from 'date-fns';

type Bake = Tables<'bakes'>;

interface BakesListProps {
  bakes: Bake[];
  onEdit: (bake: Bake) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onToggleVisibility: (id: string, isVisible: boolean) => void;
  onViewArchive: () => void;
}

export const BakesList = ({ bakes, onEdit, onDelete, onArchive, onToggleVisibility, onViewArchive }: BakesListProps) => {
  // Filter out archived bakes for the main view
  const activeBakes = bakes.filter(bake => !bake.is_archived);
  const archivedCount = bakes.filter(bake => bake.is_archived).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" onClick={onViewArchive}>
          <Archive className="w-4 h-4 mr-2" />
          View Archive {archivedCount > 0 && `(${archivedCount})`}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeBakes.map((bake) => (
          <Card key={bake.id} className={`overflow-hidden ${!bake.is_visible ? 'opacity-60' : ''}`}>
            <CardHeader className="p-0">
              <div className="aspect-video overflow-hidden relative">
                <img
                  src={bake.image_url}
                  alt={bake.title}
                  className="w-full h-full object-cover"
                />
                {!bake.is_visible && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="bg-background/80">
                      <EyeOff className="w-3 h-3 mr-1" />
                      Hidden
                    </Badge>
                  </div>
                )}
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
              
              <div className="mt-3 flex items-center justify-between border-t pt-3">
                <div className="flex items-center gap-2 text-sm">
                  {bake.is_visible ? (
                    <Eye className="w-4 h-4 text-green-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-muted-foreground">Visible</span>
                </div>
                <Switch
                  checked={bake.is_visible}
                  onCheckedChange={(checked) => onToggleVisibility(bake.id, checked)}
                />
              </div>
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
                variant="outline"
                size="sm"
                onClick={() => onArchive(bake.id)}
                title="Archive"
              >
                <Archive className="w-3 h-3" />
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(bake.id)}
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {activeBakes.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No bakes yet. Create your first bake!</p>
        </div>
      )}
    </div>
  );
};
