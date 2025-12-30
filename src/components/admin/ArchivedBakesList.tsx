import { format } from 'date-fns';
import { Calendar, Trash2, ArrowLeft, ArchiveRestore } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Tables } from '@/integrations/supabase/types';

type Bake = Tables<'bakes'>;

interface ArchivedBakesListProps {
  bakes: Bake[];
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

export const ArchivedBakesList = ({ bakes, onRestore, onDelete, onBack }: ArchivedBakesListProps) => {
  const archivedBakes = bakes.filter(b => b.is_archived);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h2 className="text-2xl font-semibold text-foreground">archived bakes</h2>
      </div>

      {archivedBakes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No archived bakes.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {archivedBakes.map((bake) => (
                <TableRow key={bake.id} className="opacity-75">
                  <TableCell>
                    <img
                      src={bake.image_url}
                      alt={bake.title}
                      className="w-16 h-12 object-cover rounded"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{bake.title}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(bake.date), 'MMM d, yyyy')}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {bake.category || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRestore(bake.id)}
                        className="text-green-600 hover:text-green-700"
                        title="Restore bake"
                      >
                        <ArchiveRestore className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDelete(bake.id)}
                        className="text-destructive hover:text-destructive"
                        title="Permanently delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
