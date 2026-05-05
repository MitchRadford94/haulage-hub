import { useMemo, useState } from 'react';
import { AlertTriangle, Camera, CheckCircle, ChevronDown, ChevronUp, ClipboardCheck, Search, Truck } from 'lucide-react';
import { useTMS } from '@/contexts/TMSContext';
import { VehicleCheck } from '@/types/tms';
import { countVehicleCheckDefects, filterVehicleChecks, vehicleCheckHasDefects } from '@/lib/vehicleChecks';

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function VehicleChecksOffice() {
  const { vehicleChecks, drivers, vehicles } = useTMS();
  const [date, setDate] = useState(todayIsoDate());
  const [driver, setDriver] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [defectsOnly, setDefectsOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredChecks = useMemo(() => filterVehicleChecks(vehicleChecks, {
    date,
    driver: driver || undefined,
    vehicle: vehicle || undefined,
    defectsOnly,
  }), [date, defectsOnly, driver, vehicle, vehicleChecks]);

  const totalDefects = filteredChecks.reduce((sum, check) => sum + countVehicleCheckDefects(check), 0);
  const checkedVehicles = new Set(filteredChecks.map(check => check.vehicle));
  const missingVehicles = vehicles.filter(v => !checkedVehicles.has(v.registration));
  const defectChecks = filteredChecks.filter(vehicleCheckHasDefects).length;

  const toggleExpanded = (check: VehicleCheck) => {
    setExpandedId(prev => prev === check.id ? null : check.id);
  };

  return (
    <div className="flex-1 overflow-hidden bg-background">
      <div className="flex h-full flex-col">
        <div className="border-b border-border bg-card/50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-primary">Vehicle Checks</h2>
          </div>

          <div className="grid gap-2 md:grid-cols-[150px_1fr_1fr_auto_auto]">
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="h-9 rounded border border-border bg-input px-2 text-xs text-foreground"
            />
            <select value={driver} onChange={e => setDriver(e.target.value)} className="h-9 rounded border border-border bg-input px-2 text-xs text-foreground">
              <option value="">All drivers</option>
              {drivers.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
            <select value={vehicle} onChange={e => setVehicle(e.target.value)} className="h-9 rounded border border-border bg-input px-2 text-xs text-foreground">
              <option value="">All vehicles</option>
              {vehicles.map(v => <option key={v.id} value={v.registration}>{v.registration}</option>)}
            </select>
            <label className="flex h-9 items-center gap-2 rounded border border-border bg-secondary px-3 text-xs text-secondary-foreground">
              <input type="checkbox" checked={defectsOnly} onChange={e => setDefectsOnly(e.target.checked)} />
              Defects only
            </label>
            <button
              type="button"
              onClick={() => { setDate(todayIsoDate()); setDriver(''); setVehicle(''); setDefectsOnly(false); }}
              className="h-9 rounded border border-border bg-secondary px-3 text-xs font-semibold text-secondary-foreground"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="grid gap-3 border-b border-border p-4 md:grid-cols-4">
          <div className="rounded border border-border bg-card p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total checks</div>
            <div className="mt-1 font-heading text-2xl font-bold text-foreground">{filteredChecks.length}</div>
          </div>
          <div className="rounded border border-border bg-card p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total defects</div>
            <div className={`mt-1 font-heading text-2xl font-bold ${totalDefects > 0 ? 'text-destructive' : 'text-accent'}`}>{totalDefects}</div>
          </div>
          <div className="rounded border border-border bg-card p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Vehicles checked</div>
            <div className="mt-1 font-heading text-2xl font-bold text-primary">{checkedVehicles.size}</div>
          </div>
          <div className="rounded border border-border bg-card p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Reports with defects</div>
            <div className={`mt-1 font-heading text-2xl font-bold ${defectChecks > 0 ? 'text-warning' : 'text-accent'}`}>{defectChecks}</div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4">
            {filteredChecks.length === 0 && (
              <div className="flex h-full items-center justify-center text-center text-muted-foreground">
                <div>
                  <Search className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  <div className="text-sm">No vehicle checks found</div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {filteredChecks.map(check => {
                const defectCount = countVehicleCheckDefects(check);
                const isExpanded = expandedId === check.id;

                return (
                  <div key={check.id} className={`rounded border bg-card ${defectCount > 0 ? 'border-destructive/50' : 'border-border'}`}>
                    <button type="button" onClick={() => toggleExpanded(check)} className="flex w-full items-center gap-3 px-3 py-2 text-left">
                      <div className={`flex h-8 w-8 items-center justify-center rounded ${defectCount > 0 ? 'bg-destructive/15 text-destructive' : 'bg-accent/15 text-accent'}`}>
                        {defectCount > 0 ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{check.vehicle}</span>
                          <span className="text-xs text-secondary-foreground">{check.driver}</span>
                          {defectCount > 0 && <span className="rounded bg-destructive/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">{defectCount} defects</span>}
                        </div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">{formatDateTime(check.submittedAt)}</div>
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border px-3 py-3">
                        <div className="mb-3 grid gap-2 text-[11px] text-muted-foreground md:grid-cols-3">
                          <div>Started: <span className="text-secondary-foreground">{formatDateTime(check.startedAt)}</span></div>
                          <div>Submitted: <span className="text-secondary-foreground">{formatDateTime(check.submittedAt)}</span></div>
                          <div>Photo checks: <span className="text-secondary-foreground">{check.requiredPhotoChecks.length}</span></div>
                        </div>

                        <div className="grid gap-1">
                          {check.results.map((result, idx) => (
                            <div key={result.item} className={`rounded border px-2 py-2 ${result.status === 'DEFECT' ? 'border-destructive/40 bg-destructive/10' : 'border-border bg-secondary/50'}`}>
                              <div className="flex items-start gap-2">
                                <span className="mt-0.5 w-5 shrink-0 text-[10px] font-mono text-muted-foreground">{idx + 1}</span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-medium text-foreground">{result.item}</span>
                                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${result.status === 'DEFECT' ? 'bg-destructive text-destructive-foreground' : 'bg-accent text-accent-foreground'}`}>{result.status}</span>
                                    {result.photoRequired && <span className="inline-flex items-center gap-1 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary"><Camera className="h-3 w-3" /> Photo</span>}
                                  </div>
                                  {result.note && <div className="mt-1 text-xs text-secondary-foreground">{result.note}</div>}
                                  {result.photo && <div className="mt-1 break-all font-mono text-[10px] text-muted-foreground">{result.photo}</div>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {check.notes && (
                          <div className="mt-3 rounded border border-border bg-secondary/50 p-2 text-xs text-secondary-foreground">{check.notes}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="hidden w-72 border-l border-border bg-card/50 p-4 lg:block">
            <div className="mb-3 flex items-center gap-2">
              <Truck className="h-4 w-4 text-warning" />
              <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-warning">Missing Checks</h3>
            </div>
            {missingVehicles.length === 0 ? (
              <div className="text-xs text-muted-foreground">No missing vehicles for selected filters.</div>
            ) : (
              <div className="space-y-1">
                {missingVehicles.map(v => (
                  <div key={v.id} className="rounded border border-warning/30 bg-warning/10 px-2 py-1.5 font-mono text-xs text-warning">
                    {v.registration}
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
