import { useState, useEffect } from 'react';
import { LogOut, User, ShoppingCart, MapPin, Star } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import oliveImg from '../../assets/the-olive-tree.png';
import { supabase } from '../../lib/supabase';

interface Brand {
  id: string;
  name: string;
  pricePerTenMl: number;
  color: string;
  image?: string;
}

const brands: Brand[] = [
  { id: 'olive-tree-earl-grey', name: 'The Olive Tree — Earl Grey', pricePerTenMl: 0.025, color: 'from-emerald-500 to-emerald-600', image: oliveImg },
  { id: 'olive-tree-lavender-bergamot', name: 'The Olive Tree — Lavender Bergamot', pricePerTenMl: 0.025, color: 'from-emerald-500 to-emerald-600', image: oliveImg },
  { id: 'lifebuoy', name: 'Lifebuoy', pricePerTenMl: 0.015, color: 'from-red-500 to-red-600' },
  { id: 'antabax', name: 'Antabax', pricePerTenMl: 0.018, color: 'from-green-500 to-green-600' },
  { id: 'shokubutsu', name: 'Shokubutsu', pricePerTenMl: 0.02, color: 'from-pink-500 to-pink-600' },
  { id: 'summerie', name: 'Summerie', pricePerTenMl: 0.02, color: 'from-yellow-500 to-amber-600' },
  { id: 'pureen', name: 'Pureen', pricePerTenMl: 0.18, color: 'from-blue-500 to-blue-600' },
];

const locations = ['KK1', 'KK2', 'KK3', 'KK4', 'KK5', 'KK6', 'KK7', 'KK8', 'KK9', 'KK10', 'KK11', 'KK12', 'KK13'];

interface DashboardProps {
  userEmail: string;
  userId: string;
  onLogout: () => void;
  onProceedToPayment: (brand: Brand, volume: number, totalPrice: number, location: string) => void;
  onShowProfile: () => void;
}

export function Dashboard({ userEmail, userId, onLogout, onProceedToPayment, onShowProfile }: DashboardProps) {
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [volume, setVolume] = useState<string>('');
  const [showCalculation, setShowCalculation] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [rewardPoints, setRewardPoints] = useState(0);

  // Fetch user's name and reward points from user_profiles
  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, reward_points')
        .eq('user_id', userId)
        .single();

      if (data) {
        const name = [data.first_name, data.last_name].filter(Boolean).join(' ');
        setDisplayName(name || userEmail.split('@')[0]);
        setRewardPoints(data.reward_points || 0);
      } else {
        setDisplayName(userEmail.split('@')[0]);
      }
    };
    fetchProfile();
  }, [userId, userEmail]);

  const calculatePrice = () => {
    if (!selectedBrand || !volume) return 0;
    const volumeNum = parseFloat(volume);
    if (isNaN(volumeNum) || volumeNum <= 0) return 0;
    // Price is per 10ml, so divide volume by 10 and multiply by price
    return (volumeNum / 10) * selectedBrand.pricePerTenMl;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers
    if (value === '' || /^\d+\.?\d*$/.test(value)) {
      setVolume(value);
      setShowCalculation(value !== '' && parseFloat(value) > 0);
    }
  };

  const handleProceed = () => {
    if (selectedBrand && selectedLocation && volume && parseFloat(volume) > 0) {
      const totalPrice = calculatePrice();
      onProceedToPayment(selectedBrand, parseFloat(volume), totalPrice, selectedLocation);
    }
  };

  const totalPrice = calculatePrice();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      {/* Header */}
      <header className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl">Greenfill Hub</h1>
            <div className="flex items-center gap-6">
              {/* Reward Points */}
              <div className="flex items-center gap-1 bg-green-100 text-green-700 text-xs font-medium px-3 py-1.5 rounded-full">
                <Star className="w-3.5 h-3.5" />
                {rewardPoints} pts
              </div>

              {/* Username */}
              <button
                onClick={onShowProfile}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <User className="w-4 h-4" />
                <span>{displayName}</span>
              </button>

              {/* Logout */}
              <button
                onClick={onLogout}
                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 transition-colors ml-8"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left - Machine Image */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl mb-6">Dispenser Machine</h2>
            <div className="aspect-[3/4] rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1758633854748-15ed2ef681a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2ZW5kaW5nJTIwbWFjaGluZSUyMG1vZGVybnxlbnwxfHx8fDE3NjY0NjU2ODd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Greenfill Hub Dispenser Machine"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">
                <strong>Status:</strong> Ready to dispense
              </p>
            </div>
          </div>

          {/* Right - Brand Selection & Purchase */}
          <div className="space-y-6">
            {/* Location Selection */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-center gap-2 mb-6">
                <MapPin className="w-6 h-6 text-green-600" />
                <h2 className="text-2xl">Select Dispenser Location</h2>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {locations.map((location) => (
                  <button
                    key={location}
                    onClick={() => setSelectedLocation(location)}
                    className={`p-3 rounded-lg border-2 transition-all font-medium ${selectedLocation === location
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-border hover:border-green-300'
                      }`}
                  >
                    {location}
                  </button>
                ))}
              </div>
            </div>

            {/* Brand Selection */}
            {selectedLocation && (
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl mb-6">Select Brand</h2>
                <div className="space-y-3">
                  {brands.map((brand) => (
                    <button
                      key={brand.id}
                      onClick={() => setSelectedBrand(brand)}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${selectedBrand?.id === brand.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-border hover:border-green-300'
                        }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-3">
                            {brand.image ? (
                              <ImageWithFallback src={brand.image} alt={brand.name} className="w-10 h-10 rounded-lg object-cover" />
                            ) : (
                              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${brand.color}`} />
                            )}
                            <div>
                              <h3 className="font-medium">{brand.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                RM {brand.pricePerTenMl.toFixed(3)} per 10ml
                              </p>
                            </div>
                          </div>
                        </div>
                        {selectedBrand?.id === brand.id && (
                          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Volume Input */}
            {selectedBrand && selectedLocation && (
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl mb-6">Enter Volume</h2>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="volume" className="block mb-2">
                      Volume (ml)
                    </label>
                    <input
                      id="volume"
                      type="text"
                      value={volume}
                      onChange={handleVolumeChange}
                      placeholder="Enter volume in ml (e.g., 100)"
                      className="w-full px-4 py-3 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {showCalculation && totalPrice > 0 && (
                    <div className="p-4 bg-green-50 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Brand:</span>
                        <span className="font-medium">{selectedBrand.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Volume:</span>
                        <span className="font-medium">{volume} ml</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Price per 10ml:</span>
                        <span className="font-medium">RM {selectedBrand.pricePerTenMl.toFixed(3)}</span>
                      </div>
                      <div className="border-t border-green-200 pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="font-medium">Total:</span>
                          <span className="text-xl font-bold text-green-600">
                            RM {totalPrice.toFixed(3)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleProceed}
                    disabled={!volume || parseFloat(volume) <= 0 || !selectedLocation}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Proceed to Payment - RM {totalPrice.toFixed(2)}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}