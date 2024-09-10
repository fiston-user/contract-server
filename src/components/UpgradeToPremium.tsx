import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import api from '../utils/api';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function UpgradeToPremium() {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const response = await api.post('/payments/create-checkout-session');
      const stripe = await stripePromise;
      await stripe?.redirectToCheckout({ sessionId: response.data.sessionId });
    } catch (error) {
      console.error('Error creating checkout session:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleUpgrade} disabled={loading}>
      {loading ? 'Processing...' : 'Upgrade to Premium'}
    </button>
  );
}