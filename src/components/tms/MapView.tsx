import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTMS } from '@/contexts/TMSContext';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Sample UK coordinates for demo stops
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

function getCoords(address: string): [number, number] {
  const lower = address.toLowerCase();
  for (const [key, coords] of Object.entries(sampleCoords)) {
    if (lower.includes(key)) return coords;
  }
  // Generate pseudo-random but stable coords for unknown addresses
  const hash = address.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return [51.5 + (hash % 40 - 20) * 0.1, -1.5 + (hash % 30 - 15) * 0.1];
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

const selectedIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'selected-marker',
});

export default function MapView() {
  const { jobs, selectedJobId, drivers, vehicles } = useTMS();

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  const allStopCoords: { coord: [number, number]; address: string; jobId: string }[] = [];
  jobs.forEach(job => {
    job.stops.forEach(stop => {
      allStopCoords.push({
        coord: getCoords(stop.address),
        address: stop.address,
        jobId: job.id,
      });
    });
  });

  const selectedCoords = selectedJob
    ? selectedJob.stops.map(s => getCoords(s.address))
    : [];

  const center: [number, number] = selectedCoords.length > 0
    ? selectedCoords[0]
    : [52.5, -1.5];

  return (
    <div className="h-full w-full relative">
      <MapContainer center={center} zoom={7} className="h-full w-full rounded" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater center={center} />

        {allStopCoords.map((s, i) => (
          <Marker
            key={`${s.jobId}-${i}`}
            position={s.coord}
            icon={s.jobId === selectedJobId ? selectedIcon : new L.Icon.Default()}
          >
            <Popup>
              <span className="text-xs">{s.address}</span>
            </Popup>
          </Marker>
        ))}

        {selectedCoords.length > 1 && (
          <Polyline positions={selectedCoords} color="hsl(199, 89%, 48%)" weight={3} opacity={0.8} />
        )}
      </MapContainer>

      {selectedJob && (
        <div className="absolute top-2 right-2 bg-card/90 backdrop-blur border border-border rounded px-3 py-2 z-[1000]">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Selected Job</div>
          <div className="text-xs font-medium">
            {drivers.find(d => d.id === selectedJob.driverId)?.name} — {vehicles.find(v => v.id === selectedJob.vehicleId)?.registration}
          </div>
          <div className="text-[10px] text-muted-foreground">{selectedJob.stops.length} stops</div>
        </div>
      )}
    </div>
  );
}
