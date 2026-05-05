import { ChangeEvent, useMemo, useState } from 'react';
import { AlertTriangle, Camera, CheckCircle, ChevronLeft, ChevronRight, ClipboardCheck, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useTMS } from '@/contexts/TMSContext';
import { VehicleCheck, VehicleCheckStatus } from '@/types/tms';
import { selectRandomPhotoChecks, VEHICLE_CHECK_ITEMS } from '@/lib/vehicleChecks';

interface DraftResult {
  status?: VehicleCheckStatus;
  note: string;
  photo: string | null;
}

export default function DriverVehicleCheck() {
  const { drivers, vehicles, addVehicleCheck } = useTMS();
  const [driver, setDriver] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [requiredPhotoChecks, setRequiredPhotoChecks] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [draftResults, setDraftResults] = useState<Record<string, DraftResult>>({});
  const [notes, setNotes] = useState('');
  const [lastSubmitted, setLastSubmitted] = useState<VehicleCheck | null>(null);

  const currentItem = VEHICLE_CHECK_ITEMS[currentIndex];
  const currentResult = draftResults[currentItem] ?? { note: '', photo: null };
  const photoRequired = requiredPhotoChecks.includes(currentItem);
  const progress = Math.round(((currentIndex + 1) / VEHICLE_CHECK_ITEMS.length) * 100);
  const isFinalItem = currentIndex === VEHICLE_CHECK_ITEMS.length - 1;

  const currentValidation = useMemo(() => {
    if (!currentResult.status) return 'Select OK or Defect';
    if (currentResult.status === 'DEFECT' && currentResult.note.trim().length === 0) return 'Defect notes are required';
    if (photoRequired && !currentResult.photo) return 'Photo proof is required';
    return null;
  }, [currentResult.note, currentResult.photo, currentResult.status, photoRequired]);

  const updateCurrentResult = (patch: Partial<DraftResult>) => {
    setDraftResults(prev => ({
      ...prev,
      [currentItem]: {
        note: '',
        photo: null,
        ...prev[currentItem],
        ...patch,
      },
    }));
  };

  const startCheck = () => {
    if (!driver || !vehicle) {
      toast.error('Select driver and vehicle');
      return;
    }

    setStartedAt(new Date().toISOString());
    // Photo checks are selected at start and stored for audit, but only revealed when the driver reaches that item.
    setRequiredPhotoChecks(selectRandomPhotoChecks(VEHICLE_CHECK_ITEMS, 5));
    setDraftResults({});
    setCurrentIndex(0);
    setNotes('');
    setLastSubmitted(null);
  };

  const handlePhotoSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const safeName = file.name.replace(/[^a-z0-9_.-]/gi, '-').toLowerCase();
    updateCurrentResult({ photo: `pending-upload/${Date.now()}-${safeName}` });
  };

  const validateAllResults = () => {
    for (const item of VEHICLE_CHECK_ITEMS) {
      const result = draftResults[item];
      if (!result?.status) return `${item} has not been checked`;
      if (result.status === 'DEFECT' && result.note.trim().length === 0) return `${item} needs defect notes`;
      if (requiredPhotoChecks.includes(item) && !result.photo) return `${item} needs photo proof`;
    }
    return null;
  };

  const submitCheck = () => {
    if (!startedAt) return;

    const validationError = validateAllResults();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const submittedAt = new Date().toISOString();
    const check: VehicleCheck = {
      id: crypto.randomUUID(),
      driver,
      vehicle,
      startedAt,
      submittedAt,
      requiredPhotoChecks,
      notes: notes.trim(),
      results: VEHICLE_CHECK_ITEMS.map(item => {
        const result = draftResults[item];
        return {
          item,
          status: result.status!,
          note: result.note.trim(),
          photoRequired: requiredPhotoChecks.includes(item),
          photo: result.photo,
        };
      }),
    };

    addVehicleCheck(check);
    setLastSubmitted(check);
    setStartedAt(null);
    toast.success('Vehicle check submitted');
  };

  const continueCheck = () => {
    if (currentValidation) {
      toast.error(currentValidation);
      return;
    }

    if (isFinalItem) submitCheck();
    else setCurrentIndex(prev => prev + 1);
  };

  const resetCheck = () => {
    setStartedAt(null);
    setRequiredPhotoChecks([]);
    setDraftResults({});
    setCurrentIndex(0);
    setNotes('');
  };

  if (!startedAt) {
    return (
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="mx-auto flex min-h-full w-full max-w-md flex-col p-4 sm:py-8">
          <div className="mb-5 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-primary">Driver Check</h2>
              <p className="text-[11px] text-muted-foreground">{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {lastSubmitted && (
            <div className="mb-4 rounded border border-accent/40 bg-accent/10 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-accent">
                <CheckCircle className="h-4 w-4" />
                Submitted
              </div>
              <div className="mt-1 text-xs text-secondary-foreground">{lastSubmitted.vehicle} by {lastSubmitted.driver}</div>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Driver</label>
              <select value={driver} onChange={e => setDriver(e.target.value)} className="h-12 w-full rounded border border-border bg-input px-3 text-base text-foreground">
                <option value="">Select driver</option>
                {drivers.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Vehicle</label>
              <select value={vehicle} onChange={e => setVehicle(e.target.value)} className="h-12 w-full rounded border border-border bg-input px-3 text-base text-foreground">
                <option value="">Select vehicle</option>
                {vehicles.map(v => <option key={v.id} value={v.registration}>{v.registration}</option>)}
              </select>
            </div>
          </div>

          {(drivers.length === 0 || vehicles.length === 0) && (
            <div className="mt-4 rounded border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
              Add drivers and vehicles in Fleet & Drivers before starting checks.
            </div>
          )}

          <button
            type="button"
            onClick={startCheck}
            disabled={drivers.length === 0 || vehicles.length === 0}
            className="mt-5 h-14 rounded bg-primary text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start Daily Check
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col p-4 sm:py-8">
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>{driver}</span>
            <span>{vehicle}</span>
          </div>
          <div className="h-2 overflow-hidden rounded bg-secondary">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
            <span>Item {currentIndex + 1} / {VEHICLE_CHECK_ITEMS.length}</span>
            <span>{progress}%</span>
          </div>
        </div>

        <div className="flex-1 rounded border border-border bg-card p-4">
          <div className="mb-3 text-[10px] uppercase tracking-wider text-muted-foreground">Daily walkaround</div>
          <h2 className="text-xl font-semibold leading-tight text-foreground">{currentItem}</h2>

          {photoRequired && (
            <div className="mt-4 rounded border border-primary/40 bg-primary/10 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Camera className="h-4 w-4" />
                Photo proof required
              </div>
              {currentResult.photo && <div className="mt-1 break-all text-[11px] text-secondary-foreground">{currentResult.photo}</div>}
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => updateCurrentResult({ status: 'OK' })}
              className={`h-20 rounded border text-base font-bold transition-colors ${
                currentResult.status === 'OK'
                  ? 'border-accent bg-accent text-accent-foreground'
                  : 'border-border bg-secondary text-secondary-foreground hover:border-accent/60'
              }`}
            >
              OK
            </button>
            <button
              type="button"
              onClick={() => updateCurrentResult({ status: 'DEFECT' })}
              className={`h-20 rounded border text-base font-bold transition-colors ${
                currentResult.status === 'DEFECT'
                  ? 'border-destructive bg-destructive text-destructive-foreground'
                  : 'border-border bg-secondary text-secondary-foreground hover:border-destructive/60'
              }`}
            >
              Defect
            </button>
          </div>

          {currentResult.status === 'DEFECT' && (
            <div className="mt-4">
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Defect notes</label>
              <textarea
                value={currentResult.note}
                onChange={e => updateCurrentResult({ note: e.target.value })}
                rows={4}
                className="w-full resize-none rounded border border-border bg-input p-3 text-base text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Describe the defect"
              />
            </div>
          )}

          {photoRequired && (
            <div className="mt-4">
              <input id="vehicle-check-photo" type="file" accept="image/*" capture="environment" onChange={handlePhotoSelected} className="hidden" />
              <label htmlFor="vehicle-check-photo" className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded border border-primary/40 bg-primary/10 text-sm font-semibold text-primary">
                <Camera className="h-4 w-4" />
                Add Photo
              </label>
            </div>
          )}

          {isFinalItem && (
            <div className="mt-4">
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Final notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="w-full resize-none rounded border border-border bg-input p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Optional notes"
              />
            </div>
          )}

          {currentValidation && (
            <div className="mt-4 flex items-center gap-2 text-xs text-warning">
              <AlertTriangle className="h-3.5 w-3.5" />
              {currentValidation}
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-[auto_1fr_auto] gap-2">
          <button type="button" onClick={resetCheck} className="h-12 w-12 rounded border border-border bg-secondary text-muted-foreground">
            <RotateCcw className="mx-auto h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="h-12 rounded border border-border bg-secondary text-sm font-semibold text-secondary-foreground disabled:opacity-40"
          >
            <ChevronLeft className="mx-auto h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={continueCheck}
            className="flex h-12 min-w-28 items-center justify-center gap-2 rounded bg-primary px-4 text-sm font-bold text-primary-foreground"
          >
            {isFinalItem ? 'Submit' : 'Next'}
            {!isFinalItem && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
