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
