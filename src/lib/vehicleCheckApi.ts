import { VehicleCheck, VehicleCheckFilters } from '@/types/tms';
import * as store from '@/lib/store';

export async function postVehicleCheck(check: VehicleCheck): Promise<VehicleCheck> {
  store.saveVehicleCheck(check);
  return check;
}

export async function getVehicleChecks(filters?: VehicleCheckFilters): Promise<VehicleCheck[]> {
  return store.getVehicleChecks(filters);
}

export async function getVehicleCheck(id: string): Promise<VehicleCheck | null> {
  return store.getVehicleCheck(id);
}
