import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useTMS } from '@/contexts/TMSContext';
import { Job, Stop } from '@/types/tms';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';

export default function JobCreationPanel() {
  const { drivers, vehicles, addJob, setSelectedJobId } = useTMS();
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [stopInputs, setStopInputs] = useState(['']);
  const [notes, setNotes] = useState('');

  const addStop = () => setStopInputs(prev => [...prev, '']);
  const removeStop = (i: number) => setStopInputs(prev => prev.filter((_, idx) => idx !== i));
  const updateStop = (i: number, val: string) => setStopInputs(prev => prev.map((s, idx) => idx === i ? val : s));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validStops = stopInputs.filter(s => s.trim());
    if (!driverId || !vehicleId || validStops.length === 0) {
      toast.error('Please fill driver, vehicle, and at least one stop.');
      return;
    }

    const stops: Stop[] = validStops.map(addr => ({
      id: uuid(),
      address: addr.trim(),
      completed: false,
    }));

    const job: Job = {
      id: uuid(),
      driverId,
      vehicleId,
      date,
      stops,
      notes: notes.trim(),
      status: 'not_started',
      createdAt: new Date().toISOString(),
    };

    addJob(job);
    setSelectedJobId(job.id);
    toast.success('Job created');
    setDriverId('');
    setVehicleId('');
    setStopInputs(['']);
    setNotes('');
  };

  const selectClass = "w-full bg-input border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
  const inputClass = selectClass;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-3 h-full overflow-auto">
      <h2 className="font-heading text-xs font-bold tracking-wider text-primary uppercase">New Job</h2>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Driver</label>
          <select value={driverId} onChange={e => setDriverId(e.target.value)} className={selectClass}>
            <option value="">Select...</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Vehicle</label>
          <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} className={selectClass}>
            <option value="">Select...</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Stops</label>
          <button type="button" onClick={addStop} className="text-primary hover:text-primary/80 transition-colors">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex flex-col gap-1.5">
          {stopInputs.map((s, i) => (
            <div key={i} className="flex gap-1">
              <input
                value={s}
                onChange={e => updateStop(i, e.target.value)}
                placeholder={`Stop ${i + 1}`}
                className={inputClass + " flex-1"}
              />
              {stopInputs.length > 1 && (
                <button type="button" onClick={() => removeStop(i)} className="text-destructive hover:text-destructive/80 p-1">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          className={inputClass + " resize-none"}
          placeholder="Additional notes..."
        />
      </div>

      <button
        type="submit"
        className="mt-auto bg-primary text-primary-foreground text-xs font-semibold py-2 rounded hover:bg-primary/90 transition-colors"
      >
        Create Job
      </button>
    </form>
  );
}
