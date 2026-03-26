import { useState } from 'react';
import { CreditCard, Wallet, ArrowLeft, Check, Tag, X } from 'lucide-react';
import { Voucher } from '../App';

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
  redeemedVouchers: Voucher[];
  onBack: () => void;
  onPaymentComplete: (paymentMethod: string, finalPrice: number, voucherInstanceId: string | null) => void;
}

type PaymentMethod = 'online-transfer' | 'e-wallet';

function applyVoucher(voucher: Voucher, basePrice: number, brand: Brand): number {
  if (voucher.applicable_brands && voucher.applicable_brands.length > 0) {
    const applies = voucher.applicable_brands.some(b =>
      brand.name.toLowerCase().includes(b.toLowerCase())
    );
    if (!applies) return basePrice;
  }

  switch (voucher.discount_type) {
    case 'percent':
      return basePrice * (1 - voucher.discount_value / 100);
    case 'fixed':
      if (voucher.id === '2' && basePrice < 20) return basePrice;
      return Math.max(0, basePrice - voucher.discount_value);
    case 'free_volume': {
      const freeMlCost = (voucher.discount_value / 10) * brand.pricePerTenMl;
      return Math.max(0, basePrice - freeMlCost);
    }
    default:
      return basePrice;
  }
}

function voucherDiscountLabel(voucher: Voucher, brand: Brand): string {
  if (voucher.applicable_brands && voucher.applicable_brands.length > 0) {
    const applies = voucher.applicable_brands.some(b =>
      brand.name.toLowerCase().includes(b.toLowerCase())
    );
    if (!applies) return 'Not for this brand';
  }
  if (voucher.discount_type === 'fixed' && voucher.id === '2') return 'Needs RM20+ order';
  return '';
}

export function Payment({ brand, volume, totalPrice, location, redeemedVouchers, onBack, onPaymentComplete }: PaymentProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [processing, setProcessing] = useState(false);

  const discountedPrice = selectedVoucher
    ? applyVoucher(selectedVoucher, totalPrice, brand)
    : totalPrice;
  const discountAmount = totalPrice - discountedPrice;

  const handlePayment = () => {
    if (!paymentMethod) return;
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      onPaymentComplete(paymentMethod, discountedPrice, selectedVoucher?._instanceId ?? null);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      <header className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <button onClick={onBack} disabled={processing}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground disabled:opacity-50">
              <ArrowLeft className="w-5 h-5" /> Back
            </button>
            <h1 className="text-xl">Payment</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">

          {/* Redeemed Vouchers */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5 text-green-600" />
              Your Vouchers
            </h2>
            {redeemedVouchers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No vouchers to redeem. Earn points and redeem them in your profile!
              </p>
            ) : (
              <div className="space-y-3">
                {redeemedVouchers.map(voucher => {
                  const warning = voucherDiscountLabel(voucher, brand);
                  const isSelected = selectedVoucher?._instanceId === voucher._instanceId;
                  const discounted = applyVoucher(voucher, totalPrice, brand);
                  const saving = totalPrice - discounted;

                  return (
                    <button
                      key={voucher.id}
                      onClick={() => setSelectedVoucher(isSelected ? null : voucher)}
                      disabled={!!warning}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${isSelected
                        ? 'border-green-500 bg-green-50'
                        : warning
                          ? 'border-border bg-gray-50 opacity-60 cursor-not-allowed'
                          : 'border-border hover:border-green-300'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{voucher.name}</span>
                            {warning && (
                              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{warning}</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{voucher.description}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          {saving > 0 && (
                            <p className="text-sm font-bold text-green-600">-RM {saving.toFixed(2)}</p>
                          )}
                          {isSelected
                            ? <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center mt-1 ml-auto"><Check className="w-3 h-3 text-white" /></div>
                            : <div className="w-5 h-5 rounded-full border-2 border-border mt-1 ml-auto" />
                          }
                        </div>
                      </div>
                    </button>
                  );
                })}

                {selectedVoucher && (
                  <button onClick={() => setSelectedVoucher(null)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1">
                    <X className="w-3 h-3" /> Remove voucher
                  </button>
                )}
              </div>
            )}
          </div>


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
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">RM {totalPrice.toFixed(2)}</span>
              </div>

              {selectedVoucher && discountAmount > 0 && (
                <div className="flex justify-between pb-4 border-b border-border items-center">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-green-600" />
                    <span className="text-green-700 font-medium text-sm">{selectedVoucher.name}</span>
                  </div>
                  <span className="text-green-600 font-medium">- RM {discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <span className="text-lg font-medium">Total Amount</span>
                <div className="text-right">
                  {discountAmount > 0 && (
                    <div className="text-sm text-muted-foreground line-through">RM {totalPrice.toFixed(2)}</div>
                  )}
                  <span className="text-2xl font-bold text-green-600">RM {discountedPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl mb-6">Select Payment Method</h2>
            <div className="space-y-4">
              <button onClick={() => setPaymentMethod('online-transfer')} disabled={processing}
                className={`w-full p-6 rounded-xl border-2 transition-all text-left disabled:opacity-50 ${paymentMethod === 'online-transfer' ? 'border-green-500 bg-green-50' : 'border-border hover:border-green-300'
                  }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">Online Banking Transfer</h3>
                      <p className="text-sm text-muted-foreground">FPX, Credit/Debit Card</p>
                    </div>
                  </div>
                  {paymentMethod === 'online-transfer' && (
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </button>

              <button onClick={() => setPaymentMethod('e-wallet')} disabled={processing}
                className={`w-full p-6 rounded-xl border-2 transition-all text-left disabled:opacity-50 ${paymentMethod === 'e-wallet' ? 'border-green-500 bg-green-50' : 'border-border hover:border-green-300'
                  }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">E-Wallet</h3>
                      <p className="text-sm text-muted-foreground">Touch 'n Go, GrabPay, Boost, ShopeePay</p>
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

          <button onClick={handlePayment} disabled={!paymentMethod || processing}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {processing ? (
              <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
            ) : (
              <><Check className="w-5 h-5" /> Pay RM {discountedPrice.toFixed(2)}</>
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