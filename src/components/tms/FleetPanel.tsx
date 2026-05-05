import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useTMS } from '@/contexts/TMSContext';
import { Plus, Trash2, UserPlus, Truck } from 'lucide-react';
import { toast } from 'sonner';

export default function FleetPanel() {
  const { drivers, vehicles, addDriver, removeDriver, addVehicle, removeVehicle } = useTMS();
  const [driverName, setDriverName] = useState('');
  const [vehicleReg, setVehicleReg] = useState('');

  const handleAddDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName.trim()) return;
    const ok = addDriver({ id: uuid(), name: driverName.trim() });
    if (ok) { setDriverName(''); toast.success('Driver added'); }
    else toast.error('Driver already exists');
  };

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleReg.trim()) return;
    const ok = addVehicle({ id: uuid(), registration: vehicleReg.trim().toUpperCase() });
    if (ok) { setVehicleReg(''); toast.success('Vehicle added'); }
    else toast.error('Vehicle already exists');
  };

  const handleRemoveDriver = (id: string) => {
    const ok = removeDriver(id);
    if (ok) toast.success('Driver removed');
    else toast.error('Driver is assigned to existing jobs');
  };

  const handleRemoveVehicle = (id: string) => {
    const ok = removeVehicle(id);
    if (ok) toast.success('Vehicle removed');
    else toast.error('Vehicle is assigned to existing jobs');
  };

  const inputClass = "bg-input border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary flex-1";

  return (
    <div className="grid grid-cols-2 gap-6 p-6 h-full overflow-auto">
      {/* Drivers */}
      <div>
        <h2 className="font-heading text-xs font-bold tracking-wider text-primary uppercase mb-3 flex items-center gap-2">
          <UserPlus className="h-3.5 w-3.5" /> Drivers
        </h2>
        <form onSubmit={handleAddDriver} className="flex gap-2 mb-3">
          <input value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="Driver name" className={inputClass} maxLength={100} />
          <button type="submit" className="bg-primary text-primary-foreground px-3 py-1.5 rounded text-xs hover:bg-primary/90">
            <Plus className="h-3 w-3" />
          </button>
        </form>
        <div className="flex flex-col gap-1">
          {drivers.map(d => (
            <div key={d.id} className="flex items-center justify-between bg-muted rounded px-3 py-1.5">
              <span className="text-xs">{d.name}</span>
              <button onClick={() => handleRemoveDriver(d.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {drivers.length === 0 && <p className="text-xs text-muted-foreground">No drivers added yet.</p>}
        </div>
      </div>

      {/* Vehicles */}
      <div>
        <h2 className="font-heading text-xs font-bold tracking-wider text-primary uppercase mb-3 flex items-center gap-2">
          <Truck className="h-3.5 w-3.5" /> Vehicles
        </h2>
        <form onSubmit={handleAddVehicle} className="flex gap-2 mb-3">
          <input value={vehicleReg} onChange={e => setVehicleReg(e.target.value)} placeholder="Registration (e.g. AB12 CDE)" className={inputClass} maxLength={20} />
          <button type="submit" className="bg-primary text-primary-foreground px-3 py-1.5 rounded text-xs hover:bg-primary/90">
            <Plus className="h-3 w-3" />
          </button>
        </form>
        <div className="flex flex-col gap-1">
          {vehicles.map(v => (
            <div key={v.id} className="flex items-center justify-between bg-muted rounded px-3 py-1.5">
              <span className="text-xs font-mono">{v.registration}</span>
              <button onClick={() => handleRemoveVehicle(v.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {vehicles.length === 0 && <p className="text-xs text-muted-foreground">No vehicles added yet.</p>}
        </div>
      </div>
    </div>
  );
}
