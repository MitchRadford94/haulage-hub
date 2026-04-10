import { useMemo } from 'react';
import { useTMS } from '@/contexts/TMSContext';

const sampleCoords: Record<string, [number, number]> = {
  london: [51.5074, -0.1278],
  manchester: [53.4808, -2.2426],
  birmingham: [52.4862, -1.8904],
  leeds: [53.8008, -1.5491],
  liverpool: [53.4084, -2.9916],
  bristol: [51.4545, -2.5879],
  sheffield: [53.3811, -1.4701],
  edinburgh: [55.9533, -3.1883],
  glasgow: [55.8642, -4.2518],
  cardiff: [51.4816, -3.1791],
  newcastle: [54.9783, -1.6178],
  nottingham: [52.9548, -1.1581],
  default: [52.5, -1.5],
};

const mapBounds = {
  minLat: 49.8,
  maxLat: 58.8,
  minLng: -6.8,
  maxLng: 2.2,
};

function getCoords(address: string): [number, number] {
  const lower = address.toLowerCase();
  for (const [key, coords] of Object.entries(sampleCoords)) {
    if (lower.includes(key)) return coords;
  }

  const hash = address.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return [51.5 + (hash % 40 - 20) * 0.1, -1.5 + (hash % 30 - 15) * 0.1];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toPoint([lat, lng]: [number, number]) {
  const x = ((lng - mapBounds.minLng) / (mapBounds.maxLng - mapBounds.minLng)) * 100;
  const y = (1 - (lat - mapBounds.minLat) / (mapBounds.maxLat - mapBounds.minLat)) * 100;

  return {
    x: clamp(x, 6, 94),
    y: clamp(y, 8, 92),
  };
}

export default function MapView() {
  const { jobs, selectedJobId, drivers, vehicles } = useTMS();

  const selectedJob = jobs.find((job) => job.id === selectedJobId);

  const allStops = useMemo(
    () => jobs.flatMap((job) => job.stops.map((stop, index) => ({
      jobId: job.id,
      address: stop.address,
      index,
      point: toPoint(getCoords(stop.address)),
    }))),
    [jobs]
  );

  const selectedRoute = useMemo(
    () => selectedJob
      ? selectedJob.stops.map((stop, index) => ({
          address: stop.address,
          index,
          point: toPoint(getCoords(stop.address)),
        }))
      : [],
    [selectedJob]
  );

  const routePath = selectedRoute.map(({ point }) => `${point.x},${point.y}`).join(' ');

  return (
    <div className="relative h-full w-full overflow-hidden rounded bg-gradient-to-br from-card via-background to-muted">
      <div className="absolute inset-0 opacity-40">
        <div className="h-full w-full bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:3.5rem_3.5rem]" />
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.18),transparent_28%),radial-gradient(circle_at_80%_30%,hsl(var(--accent)/0.14),transparent_24%),radial-gradient(circle_at_50%_80%,hsl(var(--muted-foreground)/0.10),transparent_30%)]" />

      <div className="absolute left-3 top-3 z-10 rounded border border-border bg-card/85 px-3 py-2 backdrop-blur">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Route Overview</div>
        <div className="mt-1 text-xs text-foreground">{jobs.length} jobs · {allStops.length} mapped stops</div>
      </div>

      {selectedJob && (
        <div className="absolute right-3 top-3 z-10 rounded border border-border bg-card/85 px-3 py-2 backdrop-blur">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Selected Job</div>
          <div className="mt-1 text-xs font-medium text-foreground">
            {drivers.find((driver) => driver.id === selectedJob.driverId)?.name} — {vehicles.find((vehicle) => vehicle.id === selectedJob.vehicleId)?.registration}
          </div>
          <div className="text-[10px] text-muted-foreground">{selectedJob.stops.length} stops</div>
        </div>
      )}

      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
        {selectedRoute.length > 1 && (
          <>
            <polyline
              points={routePath}
              fill="none"
              stroke="hsl(var(--primary) / 0.25)"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points={routePath}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="1.05"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="2.5 1.8"
            />
          </>
        )}
      </svg>

      <div className="absolute inset-0">
        {allStops.map((stop) => {
          const isSelected = stop.jobId === selectedJobId;
          return (
            <div
              key={`${stop.jobId}-${stop.index}`}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${stop.point.x}%`, top: `${stop.point.y}%` }}
              title={stop.address}
            >
              <div className={`flex h-4 w-4 items-center justify-center rounded-full border ${isSelected ? 'border-primary bg-primary shadow-[0_0_18px_hsl(var(--primary)/0.45)]' : 'border-border bg-card'}`}>
                <div className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-primary-foreground' : 'bg-muted-foreground'}`} />
              </div>
              {isSelected && (
                <div className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-card/90 px-1.5 py-0.5 text-[10px] text-foreground shadow-md">
                  Stop {stop.index + 1}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {jobs.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded border border-dashed border-border bg-card/70 px-4 py-3 text-center backdrop-blur">
            <div className="text-xs font-medium text-foreground">No routes yet</div>
            <div className="mt-1 text-[11px] text-muted-foreground">Create a job to see route coverage here.</div>
          </div>
        </div>
      )}
    </div>
  );
}
