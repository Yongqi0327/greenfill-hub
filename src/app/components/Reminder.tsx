import { AlertTriangle, Clock3, Package } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  pricePerTenMl: number;
  color: string;
}

interface ReminderProps {
  brand: Brand;
  volume: number;
  location: string;
  onConfirm: () => void;
}

export function Reminder({ brand, volume, location, onConfirm }: ReminderProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden">
        <div className="grid md:grid-cols-2">
          <div className="relative min-h-[320px] overflow-hidden bg-gradient-to-br from-emerald-100 via-teal-50 to-amber-50">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_transparent_45%)]" />
            <div className="absolute left-1/2 top-12 h-44 w-32 -translate-x-1/2 rounded-[2rem] bg-slate-800 shadow-2xl">
              <div className="absolute left-1/2 top-5 h-16 w-16 -translate-x-1/2 rounded-2xl bg-slate-700" />
              <div className="absolute left-1/2 top-11 h-4 w-4 -translate-x-1/2 rounded-full bg-emerald-300" />
              <div className="absolute left-1/2 top-28 h-8 w-10 -translate-x-1/2 rounded-full bg-slate-700" />
              <div className="absolute left-1/2 top-[8.8rem] h-10 w-2 -translate-x-1/2 rounded-full bg-slate-300" />
              <div className="absolute left-1/2 top-[11rem] h-10 w-1 -translate-x-1/2 rounded-full bg-sky-200/80" />
            </div>
            <div className="absolute left-1/2 top-64 h-28 w-20 -translate-x-1/2 rounded-[1.75rem] bg-white shadow-xl ring-4 ring-white/60">
              <div className="absolute left-1/2 -top-3 h-6 w-10 -translate-x-1/2 rounded-full bg-emerald-500" />
              <div className="absolute left-1/2 top-8 h-10 w-12 -translate-x-1/2 rounded-2xl bg-gradient-to-b from-emerald-200 to-emerald-100" />
              <div className="absolute inset-x-4 bottom-5 h-1 rounded-full bg-emerald-300" />
            </div>
            <div className="absolute inset-x-10 bottom-10 h-4 rounded-full bg-slate-300/60 blur-md" />
            <div className="absolute left-6 right-6 bottom-6 text-white">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm backdrop-blur">
                <Package className="h-4 w-4" />
                Ready your bottle first
              </div>
              <h2 className="mt-4 text-3xl font-semibold">Place your bottle under the nozzle</h2>
            </div>
          </div>

          <div className="p-8 md:p-10 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 self-start rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              Reminder before dispensing
            </div>

            <h1 className="mt-5 text-3xl font-semibold text-slate-900">Please confirm your bottle is in place</h1>
            <p className="mt-3 text-slate-600">
              After you confirm, the dispenser will wait 5 seconds and then start dispensing automatically.
            </p>

            <div className="mt-6 space-y-3 rounded-2xl bg-green-50 p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Brand</span>
                <span className="font-medium text-slate-900">{brand.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Volume</span>
                <span className="font-medium text-slate-900">{volume} ml</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Location</span>
                <span className="font-medium text-slate-900">{location}</span>
              </div>
              <div className="flex items-center gap-2 border-t border-green-200 pt-3 text-sm text-green-800">
                <Clock3 className="h-4 w-4" />
                Auto start delay: 5 seconds
              </div>
            </div>

            <button
              onClick={onConfirm}
              className="mt-8 w-full rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-5 py-4 text-white transition-opacity hover:opacity-90"
            >
              Confirm Bottle Is Ready
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
