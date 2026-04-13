import { useState } from 'react';
import { TMSProvider } from '@/contexts/TMSContext';
import NavBar from '@/components/tms/NavBar';
import StatsBar from '@/components/tms/StatsBar';
import JobCreationPanel from '@/components/tms/JobCreationPanel';
import JobList from '@/components/tms/JobList';
import MapView from '@/components/tms/MapView';
import FleetPanel from '@/components/tms/FleetPanel';
import RoutePlanner from '@/components/tms/RoutePlanner';

function DashboardView() {
  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left: Job Creation */}
      <div className="w-72 border-r border-border bg-card shrink-0 flex flex-col">
        <JobCreationPanel />
      </div>

      {/* Right: Job List + Map */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <StatsBar />
        <div className="flex flex-1 overflow-hidden">
          <div className="w-96 border-r border-border overflow-hidden flex flex-col">
            <div className="px-3 py-2 border-b border-border">
              <h3 className="font-heading text-xs font-bold tracking-wider text-muted-foreground uppercase">Live Jobs</h3>
            </div>
            <JobList />
          </div>
          <div className="flex-1">
            <MapView />
          </div>
        </div>
      </div>
    </div>
  );
}

function JobsView() {
  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <StatsBar />
      <div className="flex-1 overflow-auto p-4">
        <h2 className="font-heading text-sm font-bold tracking-wider text-primary uppercase mb-3">All Jobs</h2>
        <JobList />
      </div>
    </div>
  );
}

export default function Index() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <TMSProvider>
      <div className="h-screen flex flex-col overflow-hidden">
        <NavBar activeTab={activeTab} onTabChange={setActiveTab} />
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'jobs' && <JobsView />}
        {activeTab === 'fleet' && <FleetPanel />}
      </div>
    </TMSProvider>
  );
}
