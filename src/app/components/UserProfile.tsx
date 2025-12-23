import { useState, useEffect } from 'react';
import { ArrowLeft, Gift, History, Star, User } from 'lucide-react';
import { projectId } from '../../../utils/supabase/info';

interface RefillRecord {
  id: string;
  brand: string;
  volume: number;
  total_price: number;
  location: string;
  payment_method: string;
  reward_points: number;
  created_at: string;
}

interface Voucher {
  id: string;
  name: string;
  description: string;
  points_required: number;
  discount_amount: number;
}

interface UserProfileProps {
  userEmail: string;
  accessToken: string;
  onBack: () => void;
}

const availableVouchers: Voucher[] = [
  { id: '1', name: '10% Off Next Purchase', description: 'Get 10% discount on your next refill', points_required: 50, discount_amount: 10 },
  { id: '2', name: 'RM5 Off', description: 'RM5 discount on purchases above RM20', points_required: 100, discount_amount: 5 },
  { id: '3', name: 'Free 50ml Refill', description: 'Get 50ml refill of any brand for free', points_required: 150, discount_amount: 0 },
  { id: '4', name: '20% Off Premium Brands', description: '20% off on Pureen and Antabax brands', points_required: 200, discount_amount: 20 },
];

export function UserProfile({ userEmail, accessToken, onBack }: UserProfileProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'rewards'>('history');
  const [refillHistory, setRefillHistory] = useState<RefillRecord[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-09ae98d3`;

  // Calculate summary statistics
  const totalRefills = refillHistory.length;
  const totalVolume = refillHistory.reduce((sum, record) => sum + record.volume, 0);
  const totalSpent = refillHistory.reduce((sum, record) => sum + record.total_price, 0);

  useEffect(() => {
    // Use mock data for demo
    const mockRefillHistory: RefillRecord[] = [
      {
        id: '1',
        brand: 'Lifebuoy',
        volume: 250,
        total_price: 12.50,
        location: 'KK1',
        payment_method: 'Credit Card',
        reward_points: 12,
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        brand: 'Shokubutsu',
        volume: 150,
        total_price: 6.75,
        location: 'KK3',
        payment_method: 'E-Wallet',
        reward_points: 6,
        created_at: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: '3',
        brand: 'Pureen',
        volume: 100,
        total_price: 6.00,
        location: 'KK2',
        payment_method: 'Cash',
        reward_points: 6,
        created_at: new Date(Date.now() - 172800000).toISOString()
      },
      {
        id: '4',
        brand: 'Antabax',
        volume: 200,
        total_price: 10.40,
        location: 'KK5',
        payment_method: 'Credit Card',
        reward_points: 10,
        created_at: new Date(Date.now() - 259200000).toISOString()
      },
      {
        id: '5',
        brand: 'Summerie',
        volume: 120,
        total_price: 6.60,
        location: 'KK4',
        payment_method: 'E-Wallet',
        reward_points: 6,
        created_at: new Date(Date.now() - 345600000).toISOString()
      },
      {
        id: '6',
        brand: 'Lifebuoy',
        volume: 300,
        total_price: 15.00,
        location: 'KK6',
        payment_method: 'Credit Card',
        reward_points: 15,
        created_at: new Date(Date.now() - 432000000).toISOString()
      },
      {
        id: '7',
        brand: 'Pureen',
        volume: 250,
        total_price: 15.00,
        location: 'KK7',
        payment_method: 'E-Wallet',
        reward_points: 15,
        created_at: new Date(Date.now() - 518400000).toISOString()
      },
      {
        id: '8',
        brand: 'Antabax',
        volume: 350,
        total_price: 18.20,
        location: 'KK8',
        payment_method: 'Credit Card',
        reward_points: 18,
        created_at: new Date(Date.now() - 604800000).toISOString()
      },
      {
        id: '9',
        brand: 'Shokubutsu',
        volume: 280,
        total_price: 12.60,
        location: 'KK9',
        payment_method: 'E-Wallet',
        reward_points: 12,
        created_at: new Date(Date.now() - 691200000).toISOString()
      },
      {
        id: '10',
        brand: 'Summerie',
        volume: 400,
        total_price: 22.00,
        location: 'KK10',
        payment_method: 'Credit Card',
        reward_points: 22,
        created_at: new Date(Date.now() - 777600000).toISOString()
      },
      {
        id: '11',
        brand: 'Lifebuoy',
        volume: 180,
        total_price: 9.00,
        location: 'KK11',
        payment_method: 'E-Wallet',
        reward_points: 9,
        created_at: new Date(Date.now() - 864000000).toISOString()
      },
      {
        id: '12',
        brand: 'Pureen',
        volume: 320,
        total_price: 19.20,
        location: 'KK12',
        payment_method: 'Credit Card',
        reward_points: 19,
        created_at: new Date(Date.now() - 950400000).toISOString()
      }
    ];
    
    const mockTotalPoints = mockRefillHistory.reduce((sum, record) => sum + record.reward_points, 0);
    
    setRefillHistory(mockRefillHistory);
    setTotalPoints(mockTotalPoints);
    setLoading(false);
  }, []);

  const redeemVoucher = async (voucher: Voucher) => {
    if (totalPoints < voucher.points_required) {
      alert('❌ Insufficient points!\n\nYou need ' + (voucher.points_required - totalPoints) + ' more points to redeem this voucher.');
      return;
    }

    const newPoints = totalPoints - voucher.points_required;
    setTotalPoints(newPoints);
    alert(`✅ Successfully redeemed: ${voucher.name}\n\nPoints used: ${voucher.points_required}\nRemaining points: ${newPoints}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      {/* Header */}
      <header className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mr-4"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <h1 className="text-xl font-semibold">User Profile</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Info & Points */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold mb-1">User Profile</h2>
                <p className="text-sm text-muted-foreground break-all">{userEmail}</p>
              </div>
            </div>
          </div>
          
          {/* Reward Points */}
          <div className="bg-green-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2">
              <Star className="w-6 h-6 text-green-600" />
              <span className="text-3xl font-bold text-green-600">{totalPoints}</span>
            </div>
            <p className="text-center text-sm text-muted-foreground mt-1">Reward Points</p>
          </div>
          
          {/* Summary Statistics */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="text-center">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">{totalRefills}</div>
              <p className="text-xs sm:text-sm text-muted-foreground">Total Refills</p>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600">{totalVolume}ml</div>
              <p className="text-xs sm:text-sm text-muted-foreground">Total Volume</p>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600 break-all">RM{totalSpent.toFixed(2)}</div>
              <p className="text-xs sm:text-sm text-muted-foreground">Total Spent</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-green-50 text-green-600 border-b-2 border-green-500'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <History className="w-5 h-5 inline mr-2" />
              Refill History
            </button>
            <button
              onClick={() => setActiveTab('rewards')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'rewards'
                  ? 'bg-green-50 text-green-600 border-b-2 border-green-500'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Gift className="w-5 h-5 inline mr-2" />
              Redeem Rewards
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'history' && (
              <div className="space-y-4">
                {refillHistory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No refill history found</p>
                ) : (
                  refillHistory.map((record) => (
                    <div key={record.id} className="border border-border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium">{record.brand}</h3>
                          <p className="text-sm text-muted-foreground">
                            {record.volume}ml at {record.location}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">RM {record.total_price.toFixed(2)}</p>
                          <p className="text-sm text-green-600">+{record.reward_points} points</p>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{record.payment_method}</span>
                        <span>{new Date(record.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'rewards' && (
              <div className="space-y-4">
                {availableVouchers.map((voucher) => (
                  <div key={voucher.id} className="border border-border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium mb-1">{voucher.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{voucher.description}</p>
                        <p className="text-sm font-medium text-green-600">
                          {voucher.points_required} points required
                        </p>
                      </div>
                      <button
                        onClick={() => redeemVoucher(voucher)}
                        disabled={totalPoints < voucher.points_required}
                        className="ml-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Redeem
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}