import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Job, Driver, Vehicle } from '@/types/tms';
import * as store from '@/lib/store';

interface TMSContextType {
  jobs: Job[];
  drivers: Driver[];
  vehicles: Vehicle[];
  selectedJobId: string | null;
  setSelectedJobId: (id: string | null) => void;
  refreshData: () => void;
  addJob: (job: Job) => void;
  updateJob: (job: Job) => void;
  removeJob: (id: string) => void;
  addDriver: (driver: Driver) => boolean;
  removeDriver: (id: string) => void;
  addVehicle: (vehicle: Vehicle) => boolean;
  removeVehicle: (id: string) => void;
}

const TMSContext = createContext<TMSContextType | null>(null);

export function TMSProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>(store.getJobs);
  const [drivers, setDrivers] = useState<Driver[]>(store.getDrivers);
  const [vehicles, setVehicles] = useState<Vehicle[]>(store.getVehicles);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const refreshData = useCallback(() => {
    setJobs(store.getJobs());
    setDrivers(store.getDrivers());
    setVehicles(store.getVehicles());
  }, []);

  const addJob = useCallback((job: Job) => {
    store.saveJob(job);
    setJobs(store.getJobs());
  }, []);

  const updateJob = useCallback((job: Job) => {
    store.saveJob(job);
    setJobs(store.getJobs());
  }, []);

  const removeJob = useCallback((id: string) => {
    store.deleteJob(id);
    setJobs(store.getJobs());
    setSelectedJobId(prev => prev === id ? null : prev);
  }, []);

  const addDriverFn = useCallback((driver: Driver) => {
    const ok = store.addDriver(driver);
    if (ok) setDrivers(store.getDrivers());
    return ok;
  }, []);

  const removeDriver = useCallback((id: string) => {
    store.deleteDriver(id);
    setDrivers(store.getDrivers());
  }, []);

  const addVehicleFn = useCallback((vehicle: Vehicle) => {
    const ok = store.addVehicle(vehicle);
    if (ok) setVehicles(store.getVehicles());
    return ok;
  }, []);

  const removeVehicle = useCallback((id: string) => {
    store.deleteVehicle(id);
    setVehicles(store.getVehicles());
  }, []);

  return (
    <TMSContext.Provider value={{
      jobs, drivers, vehicles, selectedJobId, setSelectedJobId,
      refreshData, addJob, updateJob, removeJob,
      addDriver: addDriverFn, removeDriver,
      addVehicle: addVehicleFn, removeVehicle,
    }}>
      {children}
    </TMSContext.Provider>
  );
}

export function useTMS() {
  const ctx = useContext(TMSContext);
  if (!ctx) throw new Error('useTMS must be used within TMSProvider');
  return ctx;
}
