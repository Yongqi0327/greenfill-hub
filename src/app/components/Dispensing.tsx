import { useState, useEffect } from 'react';
import { AlertCircle, Check, Droplet, Wifi } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  pricePerTenMl: number;
  color: string;
}

interface DispensingProps {
  brand: Brand;
  volume: number;
  totalPrice: number;
  location: string;
  onComplete: () => void;
}

export function Dispensing({ brand, volume, totalPrice, location, onComplete }: DispensingProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'waiting' | 'dispensing' | 'complete'>('waiting');
  const [esp32Host, setEsp32Host] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('ESP32_IP') || import.meta.env.VITE_ESP32_IP || '';
  });
  const [hostInput, setHostInput] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('ESP32_IP') || import.meta.env.VITE_ESP32_IP || '';
  });
  const [connectionError, setConnectionError] = useState('');

  const normalizedHost = esp32Host.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');

  useEffect(() => {
    if (!normalizedHost) return;

    let polling: number | undefined;
    let finished = false;

    // Arm the paid volume on the ESP32. The firmware waits 5 seconds, then starts automatically.
    fetch(`http://${normalizedHost}/dispense?ml=${volume}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`ESP32 returned ${res.status}`);
        }
        setConnectionError('');
      })
      .catch((err) => {
        console.error('Dispense request failed', err);
        setConnectionError(`Cannot reach ESP32 at ${normalizedHost}. Check the IP address and make sure the ESP32 is connected to WiFi.`);
      });

    // Poll status every 500ms
    polling = window.setInterval(async () => {
      try {
        const res = await fetch(`http://${normalizedHost}/status`);
        if (!res.ok) return;
        setConnectionError('');
        const json = await res.json();
        // Prefer the exact target from the ESP32 so the UI matches the firmware calibration.
        const pulseCount = Number(json.pulseCount || 0);
        const targetPulses = Math.max(
          1,
          Number(json.targetPulseCount || 0) || Math.round((Number(json.pulsesPer100ml || 9447) * volume) / 100)
        );
        const pct = Math.min(100, Math.round((pulseCount / targetPulses) * 100));
        setProgress(pct);

        const pumpState = (json.pumpState === true || json.pumpState === 'true');
        const dispenseArmed = (json.dispenseArmed === true || json.dispenseArmed === 'true');

        if (pumpState) {
          setStatus('dispensing');
        } else if (dispenseArmed && pct < 100) {
          setStatus('waiting');
        }

        if (!pumpState && pct >= 100 && !finished) {
          finished = true;
          setStatus('complete');
          if (polling) window.clearInterval(polling);
          // give UI a short moment then call onComplete
          setTimeout(() => onComplete(), 1200);
        }
      } catch (e) {
        setConnectionError(`Cannot reach ESP32 at ${normalizedHost}. Check the IP address and make sure the ESP32 is connected to WiFi.`);
      }
    }, 500);

    return () => {
      if (polling) window.clearInterval(polling);
    };
  }, [normalizedHost, onComplete, volume]);

  const handleSaveHost = () => {
    const nextHost = hostInput.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    if (!nextHost) {
      setConnectionError('Please enter your ESP32 IP address first.');
      return;
    }

    localStorage.setItem('ESP32_IP', nextHost);
    setEsp32Host(nextHost);
    setConnectionError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        {!normalizedHost && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-900">ESP32 IP address is not set</p>
                <p className="mt-1 text-sm text-amber-800">
                  Enter the ESP32 IP shown in the Serial Monitor, for example `192.168.4.1` or `192.168.1.88`.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <input
                type="text"
                value={hostInput}
                onChange={(e) => setHostInput(e.target.value)}
                placeholder="192.168.x.x"
                className="w-full rounded-lg border border-amber-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                onClick={handleSaveHost}
                className="w-full rounded-lg bg-amber-500 px-4 py-3 text-white transition-opacity hover:opacity-90"
              >
                Save ESP32 IP
              </button>
            </div>
          </div>
        )}

        {normalizedHost && connectionError && status !== 'complete' && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-start gap-3">
              <Wifi className="mt-0.5 h-5 w-5" />
              <div>
                <p className="font-medium">ESP32 connection problem</p>
                <p className="mt-1">{connectionError}</p>
                <p className="mt-2">
                  Saved host: <span className="font-medium">{normalizedHost}</span>
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <input
                type="text"
                value={hostInput}
                onChange={(e) => setHostInput(e.target.value)}
                placeholder="Update ESP32 IP"
                className="w-full rounded-lg border border-red-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-300"
              />
              <button
                onClick={handleSaveHost}
                className="w-full rounded-lg bg-red-500 px-4 py-3 text-white transition-opacity hover:opacity-90"
              >
                Update ESP32 IP
              </button>
            </div>
          </div>
        )}

        {status !== 'complete' ? (
          <>
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full animate-ping opacity-20" />
                <div className="relative w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                  <Droplet className="w-10 h-10 text-white animate-pulse" />
                </div>
              </div>
              <h2 className="text-2xl mb-2">
                {status === 'waiting' ? 'Preparing to Dispense' : 'Dispensing in Progress'}
              </h2>
              <p className="text-muted-foreground">
                {status === 'waiting'
                  ? `Bottle confirmed. The dispenser will start automatically after 5 seconds for ${volume} ml of ${brand.name}.`
                  : `Please wait while your ${brand.name} is being dispensed...`}
              </p>
            </div>

            <div className="mb-6">
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-sm text-muted-foreground mt-2">
                {status === 'waiting' ? 'Waiting for automatic start' : `${Math.round(progress)}% Complete`}
              </p>
            </div>

            <div className="space-y-3 p-4 bg-green-50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Brand:</span>
                <span className="font-medium">{brand.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Volume:</span>
                <span className="font-medium">{volume} ml</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount Paid:</span>
                <span className="font-medium">RM {totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-green-200">
                <span className="text-muted-foreground">Location:</span>
                <span className="font-medium">{location}</span>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Completion Success */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl mb-2">Dispensing Complete!</h2>
              <p className="text-muted-foreground mb-8">
                Your {brand.name} body wash has been successfully dispensed.
              </p>

              {/* Order Details */}
              <div className="space-y-3 p-4 bg-green-50 rounded-lg mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Brand:</span>
                  <span className="font-medium">{brand.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Volume:</span>
                  <span className="font-medium">{volume} ml</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount Paid:</span>
                  <span className="font-medium">RM {totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-green-200">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium text-green-600">Complete</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-green-200">
                  <span className="text-muted-foreground">Location:</span>
                  <span className="font-medium">{location}</span>
                </div>
              </div>

              <button
                onClick={onComplete}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-lg hover:opacity-90 transition-opacity"
              >
                Return to Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
