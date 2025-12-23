import { useState } from 'react';
import { CreditCard, Wallet, ArrowLeft, Check } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  pricePerTenMl: number;
  color: string;
}

interface PaymentProps {
  brand: Brand;
  volume: number;
  totalPrice: number;
  location: string;
  onBack: () => void;
  onPaymentComplete: (paymentMethod: string) => void;
}

type PaymentMethod = 'online-transfer' | 'e-wallet';

export function Payment({ brand, volume, totalPrice, location, onBack, onPaymentComplete }: PaymentProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [processing, setProcessing] = useState(false);

  const handlePayment = () => {
    if (!paymentMethod) return;

    setProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setProcessing(false);
      onPaymentComplete(paymentMethod);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      {/* Header */}
      <header className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <button
              onClick={onBack}
              disabled={processing}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <h1 className="text-xl">Payment</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl mb-6">Order Summary</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-border">
                <span className="text-muted-foreground">Brand</span>
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded bg-gradient-to-br ${brand.color}`} />
                  <span className="font-medium">{brand.name}</span>
                </div>
              </div>
              <div className="flex justify-between pb-4 border-b border-border">
                <span className="text-muted-foreground">Volume</span>
                <span className="font-medium">{volume} ml</span>
              </div>
              <div className="flex justify-between pb-4 border-b border-border">
                <span className="text-muted-foreground">Location</span>
                <span className="font-medium">{location}</span>
              </div>
              <div className="flex justify-between pb-4 border-b border-border">
                <span className="text-muted-foreground">Price per 10ml</span>
                <span className="font-medium">RM {brand.pricePerTenMl.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-lg font-medium">Total Amount</span>
                <span className="text-2xl font-bold text-green-600">
                  RM {totalPrice.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl mb-6">Select Payment Method</h2>
            <div className="space-y-4">
              {/* Online Transfer */}
              <button
                onClick={() => setPaymentMethod('online-transfer')}
                disabled={processing}
                className={`w-full p-6 rounded-xl border-2 transition-all text-left disabled:opacity-50 ${
                  paymentMethod === 'online-transfer'
                    ? 'border-green-500 bg-green-50'
                    : 'border-border hover:border-green-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">Online Banking Transfer</h3>
                      <p className="text-sm text-muted-foreground">
                        FPX, Credit/Debit Card
                      </p>
                    </div>
                  </div>
                  {paymentMethod === 'online-transfer' && (
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </button>

              {/* E-Wallet */}
              <button
                onClick={() => setPaymentMethod('e-wallet')}
                disabled={processing}
                className={`w-full p-6 rounded-xl border-2 transition-all text-left disabled:opacity-50 ${
                  paymentMethod === 'e-wallet'
                    ? 'border-green-500 bg-green-50'
                    : 'border-border hover:border-green-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">E-Wallet</h3>
                      <p className="text-sm text-muted-foreground">
                        Touch 'n Go, GrabPay, Boost, ShopeePay
                      </p>
                    </div>
                  </div>
                  {paymentMethod === 'e-wallet' && (
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Pay Button */}
          <button
            onClick={handlePayment}
            disabled={!paymentMethod || processing}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Pay RM {totalPrice.toFixed(2)}
              </>
            )}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            Your payment is secure and encrypted. The dispenser will start automatically after payment confirmation.
          </p>
        </div>
      </main>
    </div>
  );
}