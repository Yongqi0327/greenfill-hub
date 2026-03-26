import { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Dashboard } from './components/Dashboard';
import { Payment } from './components/Payment';
import { Reminder } from './components/Reminder';
import { Dispensing } from './components/Dispensing';
import { UserProfile } from './components/UserProfile';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

type Screen = 'login' | 'register' | 'dashboard' | 'payment' | 'reminder' | 'dispensing' | 'profile';

interface Brand {
  id: string;
  name: string;
  pricePerTenMl: number;
  color: string;
}

interface Order {
  brand: Brand;
  volume: number;
  totalPrice: number;
  location: string;
  paymentMethod?: string;
}

export interface Voucher {
  id: string;
  name: string;
  description: string;
  points_required: number;
  discount_type: 'percent' | 'fixed' | 'free_volume';
  discount_value: number;
  applicable_brands?: string[];
  _instanceId?: string; // unique UUID per redeemed row
}

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-09ae98d3`;

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [currentUser, setCurrentUser] = useState<{ email: string; id: string } | null>(null);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [redeemedVouchers, setRedeemedVouchers] = useState<Voucher[]>([]);
  const [usedVoucherId, setUsedVoucherId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Called from UserProfile when a voucher is redeemed – already in DB, just update state
  const handleVoucherRedeemed = (voucher: Voucher) => {
    // Always append – user may redeem the same voucher type multiple times
    setRedeemedVouchers(prev => [...prev, { ...voucher, _instanceId: crypto.randomUUID() }]);
  };

  // Load unused redeemed vouchers from Supabase for a given user
  const loadRedeemedVouchers = async (userId: string) => {
    const { data } = await supabase
      .from('redeemed_vouchers')
      .select('*')
      .eq('user_id', userId)
      .eq('used', false);

    if (data && data.length > 0) {
      const vouchers: Voucher[] = data.map(row => ({
        id: row.voucher_id,
        name: row.voucher_name,
        description: row.voucher_description,
        points_required: 0,
        discount_type: row.discount_type as Voucher['discount_type'],
        discount_value: Number(row.discount_value),
        applicable_brands: row.applicable_brands ?? undefined,
        _instanceId: row.id, // DB row UUID – unique per redeemed instance
      }));
      setRedeemedVouchers(vouchers);
    }
  };

  // Check for existing session on mount using server-side verification
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (!error && user) {
          setCurrentUser({ email: user.email || '', id: user.id });
          await loadRedeemedVouchers(user.id);
          setScreen('dashboard');
        } else {
          // Clear any dead session from localStorage
          await supabase.auth.signOut();
          localStorage.clear();
        }
      } catch (error) {
        console.log('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  // Handle Registration (still uses edge function – needs admin createUser)
  const handleRegister = async (email: string, phone: string, password: string, firstName: string, lastName: string) => {
    try {
      const response = await fetch(`${SERVER_URL}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ email, phone, password, firstName, lastName })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Registration failed');
        return;
      }

      // Save first_name and last_name into user_profiles.
      // The edge function returns the created user id; update by user_id (more reliable than email).
      // Retry a few times in case the DB trigger that inserts the profile hasn't fired yet.
      const userId = data?.user?.id;
      if (userId) {
        const maxRetries = 5;
        let attempt = 0;
        let updated = false;

        while (attempt < maxRetries && !updated) {
          try {
            const { count, error } = await supabase
              .from('user_profiles')
              .update({ first_name: firstName, last_name: lastName })
              .eq('user_id', userId);

            if (!error) {
              updated = true;
            }
          } catch (err) {
            // ignore and retry
          }

          if (!updated) {
            attempt += 1;
            // wait a bit before retrying
            // eslint-disable-next-line no-await-in-loop
            await new Promise(res => setTimeout(res, 500 * attempt));
          }
        }
      }

      alert('Registration successful! Please sign in.');
      setScreen('login');
    } catch (error) {
      console.log('Registration error:', error);
      alert('Registration failed. Please try again.');
    }
  };

  // Handle Login
  const handleLogin = async (emailOrPhone: string, password: string, _rememberMe: boolean) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: emailOrPhone, password });

      if (error) {
        alert('Invalid email or password!');
        return;
      }

      if (data.session) {
        setCurrentUser({ email: data.user.email || '', id: data.user.id });
        await loadRedeemedVouchers(data.user.id);
        setScreen('dashboard');
      }
    } catch (error) {
      console.log('Login error:', error);
      alert('Login failed. Please try again.');
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setCurrentOrder(null);
    setScreen('login');
  };

  // Handle Proceed to Payment
  const handleProceedToPayment = (
    brand: Brand,
    volume: number,
    totalPrice: number,
    location: string
  ) => {
    setCurrentOrder({ brand, volume, totalPrice, location });
    setScreen('payment');
  };

  // Handle Profile Navigation
  const handleShowProfile = () => {
    setScreen('profile');
  };

  // Handle Payment Complete – place order directly via supabase client
  const handlePaymentComplete = async (paymentMethod: string, finalPrice: number, voucherId: string | null) => {
    if (!currentOrder || !currentUser) return;

    if (voucherId) setUsedVoucherId(voucherId);

    const updatedOrder = { ...currentOrder, paymentMethod, totalPrice: finalPrice };
    setCurrentOrder(updatedOrder);

    // Insert order row so ESP32 can poll and pick it up
    try {
      const { error } = await supabase
        .from('orders')
        .insert({
          user_id: currentUser.id,
          brand: currentOrder.brand.name,
          volume: currentOrder.volume,
          location: currentOrder.location,
          status: 'pending',
        });

      if (error) {
        console.log('Failed to place order:', error.message);
      } else {
        console.log('Order placed successfully');
      }
    } catch (error) {
      console.log('Failed to place order for ESP32:', error);
      // Non-fatal – dispensing screen will still show
    }

    setScreen('reminder');
  };

  const handleReminderConfirmed = () => {
    setScreen('dispensing');
  };

  // Handle Dispensing Complete – record refill directly via supabase client
  const handleDispensingComplete = async () => {
    if (!currentOrder || !currentUser) {
      setCurrentOrder(null);
      setScreen('dashboard');
      return;
    }

    try {
      const pointsEarned = Math.floor(currentOrder.totalPrice);

      const { error } = await supabase
        .from('refill_history')
        .insert({
          user_id: currentUser.id,
          email: currentUser.email,
          brand: currentOrder.brand.name,
          volume: currentOrder.volume,
          location: currentOrder.location,
          total_price: currentOrder.totalPrice,
          payment_method: currentOrder.paymentMethod || 'unknown',
          reward_points: pointsEarned,
        });

      if (error) {
        console.log('Error recording refill:', error.message);
      } else {
        console.log('Refill recorded. Points earned:', pointsEarned);

        // Update reward_points in user_profiles
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('reward_points')
          .eq('user_id', currentUser.id)
          .single();

        const currentPoints = profileData?.reward_points ?? 0;

        await supabase
          .from('user_profiles')
          .update({ reward_points: currentPoints + pointsEarned })
          .eq('user_id', currentUser.id);
      }
    } catch (error) {
      console.log('Error recording refill:', error);
    }

    setCurrentOrder(null);
    // Mark the used voucher row as used in DB by its UUID, then remove from state
    if (usedVoucherId && currentUser) {
      await supabase
        .from('redeemed_vouchers')
        .update({ used: true })
        .eq('id', usedVoucherId);
      setRedeemedVouchers(prev => prev.filter(v => v._instanceId !== usedVoucherId));
      setUsedVoucherId(null);
    }
    setScreen('dashboard');
  };

  // Handle Back from Payment
  const handleBackFromPayment = () => {
    setCurrentOrder(null);
    setScreen('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {screen === 'login' && (
        <Login
          onLogin={handleLogin}
          onSwitchToRegister={() => setScreen('register')}
        />
      )}

      {screen === 'register' && (
        <Register
          onRegister={handleRegister}
          onSwitchToLogin={() => setScreen('login')}
        />
      )}

      {screen === 'dashboard' && currentUser && (
        <Dashboard
          userEmail={currentUser.email}
          userId={currentUser.id}
          onLogout={handleLogout}
          onProceedToPayment={handleProceedToPayment}
          onShowProfile={handleShowProfile}
        />
      )}

      {screen === 'profile' && currentUser && (
        <UserProfile
          userEmail={currentUser.email}
          userId={currentUser.id}
          onBack={() => setScreen('dashboard')}
          onVoucherRedeemed={handleVoucherRedeemed}
        />
      )}

      {screen === 'payment' && currentOrder && (
        <Payment
          brand={currentOrder.brand}
          volume={currentOrder.volume}
          totalPrice={currentOrder.totalPrice}
          location={currentOrder.location}
          redeemedVouchers={redeemedVouchers}
          onBack={handleBackFromPayment}
          onPaymentComplete={handlePaymentComplete}
        />
      )}

      {screen === 'reminder' && currentOrder && (
        <Reminder
          brand={currentOrder.brand}
          volume={currentOrder.volume}
          location={currentOrder.location}
          onConfirm={handleReminderConfirmed}
        />
      )}

      {screen === 'dispensing' && currentOrder && (
        <Dispensing
          brand={currentOrder.brand}
          volume={currentOrder.volume}
          totalPrice={currentOrder.totalPrice}
          location={currentOrder.location}
          onComplete={handleDispensingComplete}
        />
      )}
    </>
  );
}
