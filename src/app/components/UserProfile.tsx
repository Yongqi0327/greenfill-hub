import { useState, useEffect } from 'react';
import { ArrowLeft, Gift, History, Star, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Voucher } from '../App';

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


interface UserProfileProps {
  userEmail: string;
  userId: string;
  onBack: () => void;
  onVoucherRedeemed: (voucher: Voucher) => void;
}

const availableVouchers: Voucher[] = [
  { id: '1', name: '10% Off Next Purchase', description: 'Get 10% discount on your next refill', points_required: 50, discount_type: 'percent', discount_value: 10 },
  { id: '2', name: 'RM5 Off', description: 'RM5 discount on purchases above RM20', points_required: 100, discount_type: 'fixed', discount_value: 5 },
  { id: '3', name: 'Free 50ml Refill', description: 'Get 50ml refill of any brand for free', points_required: 150, discount_type: 'free_volume', discount_value: 50 },
  { id: '4', name: '20% Off Premium Brands', description: '20% off on The Olive Tree', points_required: 200, discount_type: 'percent', discount_value: 20, applicable_brands: ['The Olive Tree'] },
];

export function UserProfile({ userEmail, userId, onBack, onVoucherRedeemed }: UserProfileProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'rewards'>('history');
  const [refillHistory, setRefillHistory] = useState<RefillRecord[]>([]);
  const [voucherHistory, setVoucherHistory] = useState<{ id: string; name: string; points_used: number; redeemed_at: string }[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const SERVER_URL = '';
  void SERVER_URL; // kept for potential future use

  // Summary statistics
  const totalRefills = refillHistory.length;
  const totalVolume = refillHistory.reduce((sum, record) => sum + record.volume, 0);
  const totalSpent = refillHistory.reduce((sum, record) => sum + record.total_price, 0);

  // Load refill history + authoritative reward points from user_profiles
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch refill history
        const { data, error: fetchError } = await supabase
          .from('refill_history')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (fetchError) throw new Error(fetchError.message);
        setRefillHistory(data || []);

        // Fetch voucher redemption history (all, including used)
        const { data: vData } = await supabase
          .from('redeemed_vouchers')
          .select('id, voucher_name, points_required:discount_value, redeemed_at')
          .eq('user_id', userId)
          .order('redeemed_at', { ascending: false });

        if (vData) {
          setVoucherHistory(vData.map(v => ({
            id: v.id,
            name: v.voucher_name,
            points_used: Number(v.points_required),
            redeemed_at: v.redeemed_at,
          })));
        }

        // Fetch authoritative reward points + name from user_profiles
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('reward_points, first_name, last_name')
          .eq('user_id', userId)
          .single();

        if (!profileError && profileData) {
          setTotalPoints(profileData.reward_points || 0);
          const name = [profileData.first_name, profileData.last_name].filter(Boolean).join(' ');
          setFullName(name);
        } else {
          setTotalPoints((data || []).reduce((sum, r) => sum + (r.reward_points || 0), 0));
        }
      } catch (err) {
        console.log('Error loading refill history:', err);
        setError('Failed to load your history. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [userId]);

  const redeemVoucher = async (voucher: Voucher) => {
    if (totalPoints < voucher.points_required) {
      alert('❌ Insufficient points!\n\nYou need ' + (voucher.points_required - totalPoints) + ' more points to redeem this voucher.');
      return;
    }

    const newPoints = totalPoints - voucher.points_required;

    // Deduct from DB
    await supabase
      .from('user_profiles')
      .update({ reward_points: newPoints })
      .eq('user_id', userId);

    // Persist redeemed voucher so it survives page refresh
    await supabase
      .from('redeemed_vouchers')
      .insert({
        user_id: userId,
        voucher_id: voucher.id,
        voucher_name: voucher.name,
        voucher_description: voucher.description,
        discount_type: voucher.discount_type,
        discount_value: voucher.discount_value,
        applicable_brands: voucher.applicable_brands ?? null,
        used: false,
      });

    setTotalPoints(newPoints);

    // Immediately add to history so it appears without refresh
    setVoucherHistory(prev => [{
      id: crypto.randomUUID(),
      name: voucher.name,
      points_used: voucher.points_required,
      redeemed_at: new Date().toISOString(),
    }, ...prev]);

    // Notify App so the voucher appears in checkout immediately
    onVoucherRedeemed(voucher);

    alert(`✅ Voucher "${voucher.name}" redeemed!\n\nIt will be applied automatically on your next payment.\nRemaining points: ${newPoints}`);
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
                <h2 className="text-xl sm:text-2xl font-bold mb-1">
                  {fullName || userEmail.split('@')[0]}
                </h2>
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
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${activeTab === 'history'
                ? 'bg-green-50 text-green-600 border-b-2 border-green-500'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <History className="w-5 h-5 inline mr-2" />
              Reward Points History
            </button>
            <button
              onClick={() => setActiveTab('rewards')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${activeTab === 'rewards'
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
              <div className="space-y-3">
                {error ? (
                  <div className="text-center py-8">
                    <p className="text-red-500 mb-3">{error}</p>
                    <button onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                      Try Again
                    </button>
                  </div>
                ) : (() => {
                  // Merge refills (+points) and voucher redemptions (-points) into a unified sorted list
                  type HistoryItem =
                    | { kind: 'refill'; date: string; data: typeof refillHistory[0] }
                    | { kind: 'voucher'; date: string; data: typeof voucherHistory[0] };

                  const items: HistoryItem[] = [
                    ...refillHistory.map(r => ({ kind: 'refill' as const, date: r.created_at, data: r })),
                    ...voucherHistory.map(v => ({ kind: 'voucher' as const, date: v.redeemed_at, data: v })),
                  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                  if (items.length === 0) {
                    return <p className="text-center text-muted-foreground py-8">No activity yet. Place your first order!</p>;
                  }

                  return items.map(item =>
                    item.kind === 'refill' ? (
                      <div key={`r-${item.data.id}`} className="border border-border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium">{item.data.brand}</h3>
                            <p className="text-sm text-muted-foreground">{item.data.volume}ml at {item.data.location}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">RM {item.data.total_price.toFixed(2)}</p>
                            <p className="text-sm text-green-600 font-medium">+{item.data.reward_points} pts</p>
                          </div>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{item.data.payment_method}</span>
                          <span>{new Date(item.data.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ) : (
                      <div key={`v-${item.data.id}`} className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium text-amber-800">Voucher Redeemed</h3>
                            <p className="text-sm text-amber-700">{item.data.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-red-500 font-medium">−{item.data.points_used} pts</p>
                            <p className="text-xs text-muted-foreground">{new Date(item.data.redeemed_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    )
                  );
                })()}
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