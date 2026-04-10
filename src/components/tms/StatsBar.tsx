import { useTMS } from '@/contexts/TMSContext';
import { Truck, Users, ClipboardList, CheckCircle, Play, Clock } from 'lucide-react';

export default function StatsBar() {
  const { jobs, drivers, vehicles } = useTMS();
  const active = jobs.filter(j => j.status === 'in_progress').length;
  const completed = jobs.filter(j => j.status === 'completed').length;
  const pending = jobs.filter(j => j.status === 'not_started').length;

  const stats = [
    { label: 'Total Jobs', value: jobs.length, icon: ClipboardList, color: 'text-foreground' },
    { label: 'Active', value: active, icon: Play, color: 'text-warning' },
    { label: 'Completed', value: completed, icon: CheckCircle, color: 'text-accent' },
    { label: 'Pending', value: pending, icon: Clock, color: 'text-muted-foreground' },
    { label: 'Drivers', value: drivers.length, icon: Users, color: 'text-primary' },
    { label: 'Vehicles', value: vehicles.length, icon: Truck, color: 'text-primary' },
  ];

  return (
    <div className="flex gap-4 px-4 py-2 border-b border-border bg-card/50">
      {stats.map(s => (
        <div key={s.label} className="flex items-center gap-2">
          <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</span>
          <span className={`text-sm font-heading font-bold ${s.color}`}>{s.value}</span>
        </div>
      ))}
    </div>
  );
}
