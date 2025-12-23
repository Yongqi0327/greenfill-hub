import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Dashboard } from './components/Dashboard';
import { Payment } from './components/Payment';
import { Dispensing } from './components/Dispensing';
import { UserProfile } from './components/UserProfile';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

type Screen = 'login' | 'register' | 'dashboard' | 'payment' | 'dispensing' | 'profile';

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

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-09ae98d3`;

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [currentUser, setCurrentUser] = useState<{ email: string; accessToken: string } | null>(null);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!error && session?.user) {
          setCurrentUser({
            email: session.user.email || '',
            accessToken: session.access_token
          });
          setScreen('dashboard');
        }
      } catch (error) {
        console.log('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  // Handle Registration
  const handleRegister = async (email: string, phone: string, password: string) => {
    try {
      const response = await fetch(`${SERVER_URL}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ email, phone, password })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Registration failed');
        return;
      }

      alert('Registration successful! Please sign in.');
      setScreen('login');
    } catch (error) {
      console.log('Registration error:', error);
      alert('Registration failed. Please try again.');
    }
  };

  // Handle Login
  const handleLogin = async (emailOrPhone: string, password: string, rememberMe: boolean) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailOrPhone,
        password: password,
      });

      if (error) {
        alert('Invalid credentials!');
        return;
      }

      if (data.session) {
        setCurrentUser({
          email: data.user.email || '',
          accessToken: data.session.access_token
        });
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

  // Handle Payment Complete
  const handlePaymentComplete = async (paymentMethod: string) => {
    if (!currentOrder) return;

    // Store payment method in the order for later use
    setCurrentOrder({ ...currentOrder, paymentMethod });
    setScreen('dispensing');
  };

  // Handle Dispensing Complete
  const handleDispensingComplete = async () => {
    if (!currentOrder || !currentUser) {
      setCurrentOrder(null);
      setScreen('dashboard');
      return;
    }

    try {
      // Record the refill in the database after dispensing completes
      const response = await fetch(`${SERVER_URL}/add-refill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.accessToken}`
        },
        body: JSON.stringify({
          brand: currentOrder.brand.name,
          volume: currentOrder.volume,
          totalPrice: currentOrder.totalPrice,
          location: currentOrder.location,
          paymentMethod: currentOrder.paymentMethod || 'unknown'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.log('Error recording refill:', data.error);
      } else {
        console.log('Refill recorded successfully. Points earned:', data.pointsEarned);
      }
    } catch (error) {
      console.log('Error recording refill:', error);
    }

    setCurrentOrder(null);
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
          onLogout={handleLogout}
          onProceedToPayment={handleProceedToPayment}
          onShowProfile={handleShowProfile}
        />
      )}

      {screen === 'profile' && currentUser && (
        <UserProfile
          userEmail={currentUser.email}
          accessToken={currentUser.accessToken}
          onBack={() => setScreen('dashboard')}
        />
      )}

      {screen === 'payment' && currentOrder && (
        <Payment
          brand={currentOrder.brand}
          volume={currentOrder.volume}
          totalPrice={currentOrder.totalPrice}
          location={currentOrder.location}
          onBack={handleBackFromPayment}
          onPaymentComplete={handlePaymentComplete}
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