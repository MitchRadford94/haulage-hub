import { Job, Driver, Vehicle } from '@/types/tms';

const JOBS_KEY = 'tms_jobs';
const DRIVERS_KEY = 'tms_drivers';
const VEHICLES_KEY = 'tms_vehicles';

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
