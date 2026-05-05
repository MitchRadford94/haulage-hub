import { useState } from 'react';
import { Brain, Loader2, Plus, Truck, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useTMS } from '@/contexts/TMSContext';
import { Job, Stop } from '@/types/tms';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Assignment {
  driverId: string;
  driverIndex?: number;
  stops: string[];
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return 'Optimization failed';
}

export default function RoutePlanner() {
  const { drivers, vehicles, addJob } = useTMS();
  const [addresses, setAddresses] = useState('');
  const [depot, setDepot] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ addresses?: string; drivers?: string; vehicles?: string }>({});

  const toggleDriver = (id: string) => {
    setSelectedDriverIds(prev =>
      prev.includes(id) ? prev.filter(driverId => driverId !== id) : [...prev, id]
    );
  };

  const handleOptimize = async () => {
    const lines = addresses.split('\n').map(l => l.trim()).filter(Boolean);
    const newErrors: { addresses?: string; drivers?: string; vehicles?: string } = {};
    console.log('[RoutePlanner] Optimize clicked - addresses:', lines.length, 'drivers:', selectedDriverIds.length);

    if (lines.length < 2) {
      newErrors.addresses = 'Enter at least 2 addresses (one per line)';
    }
    if (selectedDriverIds.length === 0) {
      newErrors.drivers = 'Select at least 1 driver';
    }
    if (vehicles.length === 0) {
      newErrors.vehicles = 'Add at least 1 vehicle before creating optimized jobs';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error(Object.values(newErrors).join('. '));
      return;
    }
    setErrors({});

    setLoading(true);
    setAssignments(null);

    try {
      const driverList = selectedDriverIds.flatMap(id => {
        const driverIndex = drivers.findIndex(driver => driver.id === id);
        const driver = drivers[driverIndex];
        if (!driver) return [];
        return [{
          id: driver.id,
          name: driver.name,
          vehicle: vehicles[driverIndex % vehicles.length]?.registration ?? 'Unassigned',
        }];
      });

      const { data, error } = await supabase.functions.invoke('optimize-routes', {
        body: { addresses: lines, drivers: driverList, depot: depot || undefined },
      });

      if (error) throw error;
      if (data?.assignments) {
        // Filter out empty stops from assignments
        const cleaned = data.assignments
          .map((a: Assignment) => ({
            ...a,
            driverId: a.driverId ?? selectedDriverIds[a.driverIndex ?? -1],
            stops: a.stops.filter((s: string) => s && s.trim().length > 0),
          }))
          .filter((a: Assignment) => a.driverId && a.stops.length > 0);
        setAssignments(cleaned);
        // Store depot info from response for job creation
        if (data.depot) setDepot(data.depot);
        toast.success('Routes optimized!');
      } else {
        throw new Error(data?.error || 'No assignments returned');
      }
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJobs = () => {
    if (!assignments) return;

    if (vehicles.length === 0) {
      toast.error('Add at least 1 vehicle before creating jobs');
      return;
    }

    let createdCount = 0;

    assignments.forEach(a => {
      const driver = drivers.find(d => d.id === a.driverId);
      const driverIdx = drivers.findIndex(d => d.id === a.driverId);
      const vehicle = vehicles[driverIdx % vehicles.length];
      if (!driver || !vehicle) return;

      const stops: Stop[] = a.stops
        .filter((addr: string) => addr && addr.trim().length > 0)
        .map((addr: string) => ({
          id: crypto.randomUUID(),
          address: addr.trim(),
          completed: false,
        }));

      if (stops.length === 0) return;

      const job: Job = {
        id: crypto.randomUUID(),
        driverId: driver.id,
        vehicleId: vehicle.id,
        date,
        stops,
        notes: 'AI-optimized route',
        status: 'not_started',
        createdAt: new Date().toISOString(),
        depotAddress: depot || undefined,
      };

      addJob(job);
      createdCount += 1;
    });

    if (createdCount === 0) {
      toast.error('No jobs were created. Check drivers, vehicles, and stops.');
      return;
    }

    toast.success(`Created ${createdCount} ${createdCount === 1 ? 'job' : 'jobs'}`);
    setAssignments(null);
    setAddresses('');
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Inputs */}
      <div className="w-80 border-r border-border bg-card flex flex-col p-4 gap-4 shrink-0 overflow-y-auto">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h2 className="font-heading text-xs font-bold tracking-wider text-primary uppercase">AI Route Planner</h2>
        </div>

        <div>
          <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1 block">Delivery Addresses (one per line)</label>
          <Textarea
            value={addresses}
            onChange={e => setAddresses(e.target.value)}
            placeholder={"SW1A 1AA\nM1 1AA\nB1 1BB\n..."}
            className={`min-h-[160px] text-xs bg-secondary font-mono ${errors.addresses ? 'border-red-500' : 'border-border'}`}
          />
          {errors.addresses && <p className="text-[10px] text-red-500 mt-1">{errors.addresses}</p>}
        </div>

        <div>
          <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1 block">Depot / Start Address (optional)</label>
          <Input
            value={depot}
            onChange={e => setDepot(e.target.value)}
            placeholder="e.g. LS1 1AA"
            className="text-xs bg-secondary border-border"
          />
        </div>

        <div>
          <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1 block">Date</label>
          <Input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="text-xs bg-secondary border-border"
          />
        </div>

        <div>
          <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1 block">Select Drivers</label>
          <div className="space-y-1">
            {drivers.length === 0 && (
              <p className="text-[10px] text-muted-foreground">No drivers added yet. Add drivers in Fleet & Drivers tab.</p>
            )}
            {drivers.map((d, i) => (
              <button
                key={d.id}
                onClick={() => toggleDriver(d.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                  selectedDriverIds.includes(d.id)
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'bg-secondary text-muted-foreground border border-transparent hover:border-border'
                }`}
              >
                <User className="h-3 w-3" />
                {d.name}
                {vehicles[i] && (
                  <span className="ml-auto text-[10px] font-mono flex items-center gap-1">
                    <Truck className="h-2.5 w-2.5" />
                    {vehicles[i].registration}
                  </span>
                )}
              </button>
            ))}
          </div>
          {errors.drivers && <p className="text-[10px] text-red-500 mt-1">{errors.drivers}</p>}
          {errors.vehicles && <p className="text-[10px] text-red-500 mt-1">{errors.vehicles}</p>}
        </div>

        <Button
          onClick={handleOptimize}
          disabled={loading}
          className="w-full gap-2"
          size="sm"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
          {loading ? 'Optimizing...' : 'Optimize Routes'}
        </Button>
      </div>

      {/* Right: Results */}
      <div className="flex-1 overflow-y-auto p-4">
        {!assignments && !loading && (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Brain className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Enter addresses and select drivers, then click Optimize.</p>
              <p className="text-[10px] font-mono mt-1">AI will assign and order stops for each driver.</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-primary" />
              <p className="text-sm">AI is optimizing routes...</p>
            </div>
          </div>
        )}

        {assignments && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-xs font-bold tracking-wider text-primary uppercase">
                Optimized Plan — {assignments.length} Routes
              </h3>
              <Button onClick={handleCreateJobs} size="sm" className="gap-2">
                <Plus className="h-3.5 w-3.5" />
                Create All Jobs
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {assignments.map((a, idx) => {
                const driver = drivers.find(d => d.id === a.driverId);
                const driverIdx = drivers.findIndex(d => d.id === a.driverId);
                const vehicle = vehicles[driverIdx % vehicles.length];
                return (
                  <div key={idx} className="bg-card border border-border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border">
                      <User className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-medium text-foreground">{driver?.name ?? 'Driver unavailable'}</span>
                      {vehicle && (
                        <span className="ml-auto text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                          <Truck className="h-2.5 w-2.5" />
                          {vehicle.registration}
                        </span>
                      )}
                    </div>
                    <ol className="space-y-1">
                      {a.stops.map((stop, si) => (
                        <li key={si} className="flex items-start gap-2 text-xs">
                          <span className="shrink-0 w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold mt-0.5">
                            {si + 1}
                          </span>
                          <span className="text-muted-foreground">{stop}</span>
                        </li>
                      ))}
                    </ol>
                    <div className="mt-2 pt-1 border-t border-border">
                      <span className="text-[10px] font-mono text-muted-foreground">{a.stops.length} stops</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
