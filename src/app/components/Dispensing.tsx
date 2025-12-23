import { useState, useEffect } from 'react';
import { Check, Droplet } from 'lucide-react';

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
  const [status, setStatus] = useState<'dispensing' | 'complete'>('dispensing');

  useEffect(() => {
    // Simulate dispensing progress
    const duration = 5000; // 5 seconds
    const interval = 50;
    const increment = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(timer);
          setStatus('complete');
          return 100;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        {status === 'dispensing' ? (
          <>
            {/* Dispensing Animation */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full animate-ping opacity-20" />
                <div className="relative w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                  <Droplet className="w-10 h-10 text-white animate-pulse" />
                </div>
              </div>
              <h2 className="text-2xl mb-2">Dispensing in Progress</h2>
              <p className="text-muted-foreground">
                Please wait while your {brand.name} is being dispensed...
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-sm text-muted-foreground mt-2">
                {Math.round(progress)}% Complete
              </p>
            </div>

            {/* Order Details */}
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