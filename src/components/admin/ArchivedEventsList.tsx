import { format } from 'date-fns';
import { Calendar, MapPin, Trash2, ArrowLeft, ArchiveRestore } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Event {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string | null;
  status: 'draft' | 'active' | 'completed' | 'archived';
  created_at: string;
}

interface ArchivedEventsListProps {
  events: Event[];
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

export const ArchivedEventsList = ({ events, onRestore, onDelete, onBack }: ArchivedEventsListProps) => {
  // Only show archived events
  const archivedEvents = events.filter(e => e.status === 'archived');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h2 className="text-2xl font-semibold text-foreground">archived events</h2>
      </div>

      {archivedEvents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No archived events.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {archivedEvents.map((event) => (
                <TableRow key={event.id} className="opacity-75">
                  <TableCell className="font-medium">{event.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(event.start_time), 'MMM d, yyyy h:mm a')}
                    </div>
                  </TableCell>
                  <TableCell>
                    {event.location && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span className="max-w-[200px] truncate">{event.location}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRestore(event.id)}
                        className="text-green-600 hover:text-green-700"
                        title="Restore event"
                      >
                        <ArchiveRestore className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDelete(event.id)}
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
