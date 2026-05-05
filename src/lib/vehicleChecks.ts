import { VehicleCheck, VehicleCheckFilters } from '@/types/tms';

export const VEHICLE_CHECK_ITEMS = [
  'Front view: mirrors, cameras, glass',
  'Windscreen wipers and washers',
  'Dashboard warning lights and gauges',
  'Steering',
  'Horn',
  'Brakes and air build-up',
  'Height marker',
  'Seat belts and cab interior',
  'Security and condition of cab, doors and steps',
  'Lights and indicators',
  'Fuel and oil leaks',
  'Security of body and wings',
  'Battery security and condition',
  'Diesel exhaust fluid / AdBlue',
  'Excessive engine exhaust smoke',
  'High voltage emergency cut-off switch',
  'Alternative fuel systems and isolation',
  'Spray suppression',
  'Tyres and wheel fixings',
  'Brake lines and trailer parking brake',
  'Electrical connections',
  'Coupling security',
  'Security of load',
  'Number plate',
  'Reflectors',
  'Markings and warning plate',
];

export function selectRandomPhotoChecks(items: string[], count = 5): string[] {
  const shuffled = [...items];

  // Fisher-Yates gives each checklist item an equal chance without revealing the final set to the driver.
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

export function vehicleCheckHasDefects(check: VehicleCheck): boolean {
  return check.results.some(result => result.status === 'DEFECT');
}

export function countVehicleCheckDefects(check: VehicleCheck): number {
  return check.results.filter(result => result.status === 'DEFECT').length;
}

export function filterVehicleChecks(checks: VehicleCheck[], filters: VehicleCheckFilters = {}): VehicleCheck[] {
  return checks.filter(check => {
    if (filters.driver && check.driver !== filters.driver) return false;
    if (filters.vehicle && check.vehicle !== filters.vehicle) return false;
    if (filters.date && check.submittedAt.slice(0, 10) !== filters.date) return false;
    if (filters.defectsOnly && !vehicleCheckHasDefects(check)) return false;
    return true;
  });
}
