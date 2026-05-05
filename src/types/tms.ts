export type JobStatus = 'not_started' | 'in_progress' | 'completed';

export interface Stop {
  id: string;
  address: string;
  completed: boolean;
  lat?: number;
  lng?: number;
}

export interface Job {
  id: string;
  driverId: string;
  vehicleId: string;
  date: string;
  stops: Stop[];
  notes: string;
  status: JobStatus;
  startTime?: string;
  completionTime?: string;
  createdAt: string;
  depotAddress?: string;
  depotLat?: number;
  depotLng?: number;
}

export interface Driver {
  id: string;
  name: string;
}

export interface Vehicle {
  id: string;
  registration: string;
}

export type VehicleCheckStatus = 'OK' | 'DEFECT';

export interface VehicleCheckResult {
  item: string;
  status: VehicleCheckStatus;
  note: string;
  photoRequired: boolean;
  photo: string | null;
}

export interface VehicleCheck {
  id: string;
  driver: string;
  vehicle: string;
  startedAt: string;
  submittedAt: string;
  requiredPhotoChecks: string[];
  results: VehicleCheckResult[];
  notes: string;
}

export interface VehicleCheckFilters {
  driver?: string;
  vehicle?: string;
  date?: string;
  defectsOnly?: boolean;
}
