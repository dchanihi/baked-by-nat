import { useState, useEffect } from 'react';
import { format, isSameDay } from 'date-fns';
import { Calendar, MapPin, Play, Edit, Archive, Plus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

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

interface ScheduleDay {
  id: string;
  event_id: string;
  day_number: number;
  date: string;
  start_time: string;
  end_time: string | null;
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
  const [schedules, setSchedules] = useState<Record<string, ScheduleDay[]>>({});
  
  // Filter out archived events
  const activeEvents = events.filter(e => e.status !== 'archived');

  useEffect(() => {
    loadSchedules();
  }, [events]);

  const loadSchedules = async () => {
    const eventIds = events.map(e => e.id);
    if (eventIds.length === 0) return;
    
    const { data } = await supabase
      .from('event_schedules')
      .select('*')
      .in('event_id', eventIds)
      .order('day_number');
    
    if (data) {
      const grouped: Record<string, ScheduleDay[]> = {};
      data.forEach(schedule => {
        if (!grouped[schedule.event_id]) {
          grouped[schedule.event_id] = [];
        }
        grouped[schedule.event_id].push(schedule);
      });
      setSchedules(grouped);
    }
  };

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

  const formatEventSchedule = (event: Event) => {
    const eventSchedule = schedules[event.id];
    
    if (!eventSchedule || eventSchedule.length === 0) {
      // Fallback to legacy start_time/end_time
      return {
        primary: format(new Date(event.start_time), 'MMM d, yyyy'),
        secondary: format(new Date(event.start_time), 'h:mm a'),
        hasMultipleDays: false,
        days: null,
      };
    }

    if (eventSchedule.length === 1) {
      const day = eventSchedule[0];
      return {
        primary: format(new Date(day.date), 'MMM d, yyyy'),
        secondary: `${day.start_time}${day.end_time ? ` - ${day.end_time}` : ''}`,
        hasMultipleDays: false,
        days: eventSchedule,
      };
    }

    // Multiple days
    const sortedDays = [...eventSchedule].sort((a, b) => a.date.localeCompare(b.date));
    const firstDay = sortedDays[0];
    const lastDay = sortedDays[sortedDays.length - 1];
    
    return {
      primary: `${format(new Date(firstDay.date), 'MMM d')} - ${format(new Date(lastDay.date), 'MMM d, yyyy')}`,
      secondary: `${eventSchedule.length} days`,
      hasMultipleDays: true,
      days: sortedDays,
    };
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
                <TableHead>Schedule</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeEvents.map((event) => {
                const schedule = formatEventSchedule(event);
                return (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.name}</TableCell>
                    <TableCell>
                      {schedule.hasMultipleDays && schedule.days ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="text-left hover:bg-accent rounded-md p-1 -m-1 transition-colors">
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span>{schedule.primary}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <Clock className="w-3 h-3" />
                                <span>{schedule.secondary}</span>
                              </div>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-3" align="start">
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-muted-foreground mb-2">Schedule Details</p>
                              {schedule.days.map((day) => (
                                <div key={day.id} className="flex items-center gap-3 text-sm">
                                  <span className="text-muted-foreground w-12">Day {day.day_number}</span>
                                  <span className="font-medium">{format(new Date(day.date), 'EEE, MMM d')}</span>
                                  <span className="text-muted-foreground">
                                    {day.start_time}{day.end_time ? ` - ${day.end_time}` : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>{schedule.primary}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>{schedule.secondary}</span>
                          </div>
                        </div>
                      )}
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
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
