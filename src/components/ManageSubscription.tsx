import React, { useState, useEffect } from 'react';
import api from '../utils/api';

export function ManageSubscription() {
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await api.get('/payments/subscription-status');
      setSubscriptionStatus(response.data);
    } catch (error) {
      console.error('Error fetching subscription status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (window.confirm('Are you sure you want to cancel your subscription?')) {
      try {
        await api.post('/payments/cancel-subscription');
        alert('Subscription cancelled successfully');
        fetchSubscriptionStatus();
      } catch (error) {
        console.error('Error cancelling subscription:', error);
        alert('Failed to cancel subscription');
      }
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>Manage Your Subscription</h2>
      {subscriptionStatus && subscriptionStatus.status === 'active' ? (
        <>
          <p>Your subscription is active until: {new Date(subscriptionStatus.currentPeriodEnd).toLocaleDateString()}</p>
          <button onClick={handleCancelSubscription}>Cancel Subscription</button>
        </>
      ) : (
        <p>You don't have an active subscription.</p>
      )}
    </div>
  );
}