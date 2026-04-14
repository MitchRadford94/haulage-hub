import { useState } from 'react';
import { useTMS } from '@/contexts/TMSContext';
import { Job, JobStatus } from '@/types/tms';
import { ChevronDown, ChevronUp, Trash2, Play, CheckCircle, Clock, MapPin, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

const statusConfig: Record<JobStatus, { label: string; color: string; icon: typeof Clock }> = {
  not_started: { label: 'Not Started', color: 'text-muted-foreground', icon: Clock },
  in_progress: { label: 'In Progress', color: 'text-warning', icon: Play },
  completed: { label: 'Completed', color: 'text-accent', icon: CheckCircle },
};

function getDuration(start?: string, end?: string): string {
  if (!start) return '-';
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const mins = Math.floor((e - s) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function JobList() {
  const { jobs, drivers, vehicles, updateJob, removeJob, selectedJobId, setSelectedJobId } = useTMS();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getDriver = (id: string) => drivers.find(d => d.id === id)?.name || 'Unknown';
  const getVehicle = (id: string) => vehicles.find(v => v.id === id)?.registration || 'Unknown';

  const toggleExpand = (id: string) => setExpandedId(prev => prev === id ? null : id);

  const cycleStatus = (job: Job) => {
    const next: Record<JobStatus, JobStatus> = {
      not_started: 'in_progress',
      in_progress: 'completed',
      completed: 'not_started',
    };
    const newStatus = next[job.status];
    const updated = { ...job, status: newStatus };
    if (newStatus === 'in_progress' && !job.startTime) updated.startTime = new Date().toISOString();
    if (newStatus === 'completed') updated.completionTime = new Date().toISOString();
    if (newStatus === 'not_started') { updated.startTime = undefined; updated.completionTime = undefined; }
    updateJob(updated);
    toast.success(`Job status: ${statusConfig[newStatus].label}`);
  };

  const toggleStop = (job: Job, stopId: string) => {
    const stops = job.stops.map(s => s.id === stopId ? { ...s, completed: !s.completed } : s);
    updateJob({ ...job, stops });
  };

  const sorted = [...jobs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
        No jobs yet. Create one from the panel.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 p-2 overflow-auto h-full">
      {sorted.map(job => {
        const cfg = statusConfig[job.status];
        const StatusIcon = cfg.icon;
        const completedStops = job.stops.filter(s => s.completed).length;
        const isExpanded = expandedId === job.id;
        const isSelected = selectedJobId === job.id;

        return (
          <div
            key={job.id}
            className={`border rounded transition-colors cursor-pointer ${
              isSelected ? 'border-primary/50 bg-primary/5' : 'border-border bg-card hover:border-border/80'
            }`}
            onClick={() => setSelectedJobId(job.id)}
          >
            <div className="flex items-center gap-2 px-3 py-2">
              <button onClick={e => { e.stopPropagation(); cycleStatus(job); }} className={`${cfg.color} hover:opacity-80`}>
                <StatusIcon className="h-3.5 w-3.5" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium truncate">{getDriver(job.driverId)}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{getVehicle(job.vehicleId)}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">{job.date}</span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <MapPin className="h-2.5 w-2.5" />
                    {completedStops}/{job.stops.length}
                  </span>
                  {job.startTime && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {getDuration(job.startTime, job.completionTime)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={e => { e.stopPropagation(); removeJob(job.id); toast.success('Job deleted'); }}
                  className="text-muted-foreground hover:text-destructive p-1"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
                <button onClick={e => { e.stopPropagation(); toggleExpand(job.id); }} className="text-muted-foreground hover:text-foreground p-1">
                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="px-3 pb-2 border-t border-border pt-2">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Stops</div>
                <div className="flex flex-col gap-1">
                  {job.stops.map((stop, i) => (
                    <label key={stop.id} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={stop.completed}
                        onChange={() => toggleStop(job, stop.id)}
                        onClick={e => e.stopPropagation()}
                        className="rounded border-border"
                      />
                      <span className={stop.completed ? 'line-through text-muted-foreground' : ''}>
                        {i + 1}. {stop.address}
                      </span>
                    </label>
                  ))}
                </div>
                {job.depotAddress && (
                  <div className="mt-2">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Depot</div>
                    <p className="text-xs text-secondary-foreground flex items-center gap-1">
                      <MapPin className="h-2.5 w-2.5" />
                      {job.depotAddress}
                    </p>
                  </div>
                )}
                {job.notes && (
                  <div className="mt-2">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Notes</div>
                    <p className="text-xs text-secondary-foreground">{job.notes}</p>
                  </div>
                )}
                <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
                  {job.startTime && <span>Started: {new Date(job.startTime).toLocaleTimeString()}</span>}
                  {job.completionTime && <span>Completed: {new Date(job.completionTime).toLocaleTimeString()}</span>}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
