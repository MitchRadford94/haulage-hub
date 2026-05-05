import { Job, Driver, Vehicle, VehicleCheck, VehicleCheckFilters } from '@/types/tms';
import { filterVehicleChecks } from '@/lib/vehicleChecks';

const JOBS_KEY = 'tms_jobs';
const DRIVERS_KEY = 'tms_drivers';
const VEHICLES_KEY = 'tms_vehicles';
const VEHICLE_CHECKS_KEY = 'tms_vehicle_checks';

function load<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Jobs
export function getJobs(): Job[] {
  return load<Job>(JOBS_KEY);
}
export function saveJob(job: Job) {
  const jobs = getJobs();
  const idx = jobs.findIndex(j => j.id === job.id);
  if (idx >= 0) jobs[idx] = job;
  else jobs.push(job);
  save(JOBS_KEY, jobs);
}
export function deleteJob(id: string) {
  save(JOBS_KEY, getJobs().filter(j => j.id !== id));
}

// Drivers
export function getDrivers(): Driver[] {
  return load<Driver>(DRIVERS_KEY);
}
export function addDriver(driver: Driver): boolean {
  const drivers = getDrivers();
  if (drivers.some(d => d.name.toLowerCase() === driver.name.toLowerCase())) return false;
  drivers.push(driver);
  save(DRIVERS_KEY, drivers);
  return true;
}
export function deleteDriver(id: string): boolean {
  if (getJobs().some(j => j.driverId === id)) return false;
  save(DRIVERS_KEY, getDrivers().filter(d => d.id !== id));
  return true;
}

// Vehicles
export function getVehicles(): Vehicle[] {
  return load<Vehicle>(VEHICLES_KEY);
}
export function addVehicle(vehicle: Vehicle): boolean {
  const vehicles = getVehicles();
  if (vehicles.some(v => v.registration.toLowerCase() === vehicle.registration.toLowerCase())) return false;
  vehicles.push(vehicle);
  save(VEHICLES_KEY, vehicles);
  return true;
}
export function deleteVehicle(id: string): boolean {
  if (getJobs().some(j => j.vehicleId === id)) return false;
  save(VEHICLES_KEY, getVehicles().filter(v => v.id !== id));
  return true;
}

// Vehicle Checks
export function getVehicleChecks(filters?: VehicleCheckFilters): VehicleCheck[] {
  const checks = load<VehicleCheck>(VEHICLE_CHECKS_KEY)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  return filters ? filterVehicleChecks(checks, filters) : checks;
}

export function getVehicleCheck(id: string): VehicleCheck | null {
  return getVehicleChecks().find(check => check.id === id) ?? null;
}

export function saveVehicleCheck(check: VehicleCheck) {
  const checks = getVehicleChecks();
  const idx = checks.findIndex(c => c.id === check.id);
  if (idx >= 0) checks[idx] = check;
  else checks.push(check);
  save(VEHICLE_CHECKS_KEY, checks);
}
