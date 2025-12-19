import { format } from 'date-fns';
import { Calendar, MapPin, Play, Edit, Archive, Plus } from 'lucide-react';
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

interface EventsListProps {
  events: Event[];
  onEdit: (event: Event) => void;
  onArchive: (id: string) => void;
  onRun: (event: Event) => void;
  onCreate: () => void;
  onViewArchive: () => void;
}

export const EventsList = ({ events, onEdit, onArchive, onRun, onCreate, onViewArchive }: EventsListProps) => {
  // Filter out archived events
  const activeEvents = events.filter(e => e.status !== 'archived');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
      case 'completed':
        return <Badge variant="outline">Completed</Badge>;
      case 'archived':
        return <Badge variant="secondary" className="bg-muted text-muted-foreground">Archived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-foreground">events</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onViewArchive}>
            <Archive className="w-4 h-4 mr-2" />
            View Archive
          </Button>
          <Button onClick={onCreate} className="bg-pink-soft hover:bg-pink-medium">
            <Plus className="w-4 h-4 mr-2" />
            New Event
          </Button>
        </div>
      </div>

      {activeEvents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No events yet. Create your first pop-up event!</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeEvents.map((event) => (
                <TableRow key={event.id}>
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
                  <TableCell>{getStatusBadge(event.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {event.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onRun(event)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEdit(event)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onArchive(event.id)}
                        className="text-muted-foreground hover:text-foreground"
                        title="Archive event"
                      >
                        <Archive className="w-4 h-4" />
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
