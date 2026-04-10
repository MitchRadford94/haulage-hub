import { Truck, LayoutDashboard, ClipboardList, ShieldCheck } from 'lucide-react';

interface NavBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'jobs', label: 'Jobs', icon: ClipboardList },
  { id: 'fleet', label: 'Fleet & Drivers', icon: ShieldCheck },
];

export default function NavBar({ activeTab, onTabChange }: NavBarProps) {
  return (
    <header className="h-12 border-b border-border bg-card flex items-center px-4 gap-6 shrink-0">
      <div className="flex items-center gap-2 mr-6">
        <Truck className="h-5 w-5 text-primary" />
        <span className="font-heading text-sm font-bold tracking-wider text-primary">TMS</span>
        <span className="text-[10px] text-muted-foreground font-mono">CONTROL</span>
      </div>
      <nav className="flex gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              activeTab === tab.id
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-accent animate-pulse-glow" />
        <span className="text-[10px] text-muted-foreground font-mono">SYSTEM ONLINE</span>
      </div>
    </header>
  );
}
