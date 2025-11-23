import { useState, useEffect } from 'react';
import { callSecuredApi } from '../utils/apiClient'; // <--- IMPORT

export function useOfflineSync(url) {
  const [status, setStatus] = useState('Online');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // 1. Initialize status safely
    if (typeof navigator !== 'undefined') {
      setStatus(navigator.onLine ? 'Online' : 'Offline');
    }

    // 2. Define Event Handlers
    const handleOnline = () => {
      setStatus('Online');
      alert("✅ Back Online! Attempting to sync data...");
      syncData();
    };

    const handleOffline = () => {
      setStatus('Offline');
      alert("⚠️ Connection Lost! Changes will be saved locally.");
    };

    // 3. Add Listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 4. Check for pending data on load
    syncData();

    // 5. Cleanup Listeners
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [url]);

  // Synchronization Logic 
  const syncData = async () => {
    const cachedData = localStorage.getItem('offline_floor_plan');
    
    if (cachedData) {
      setIsSyncing(true);
      try {
        const parsedData = JSON.parse(cachedData);
        
        // ADJUST URL: callSecuredApi adds '/api' automatically.
        // If the input 'url' already has '/api', strip it to prevent double '/api/api'
        const endpoint = url.startsWith('/api') ? url.replace('/api', '') : url;

        // USE SECURE CLIENT (Sends JWT Token)
        const response = await callSecuredApi(endpoint, 'POST', parsedData);
        const result = await response.json();

        if (response.ok) {
          localStorage.removeItem('offline_floor_plan');
          alert(`🔄 Sync Complete: ${result.message}`);
        } else if (response.status === 409) {
           alert(`❌ Sync Conflict: ${result.message}`);
        }
      } catch (error) {
        console.error("Sync failed:", error);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // Helper to save data
  const saveDataLocally = (data) => {
    localStorage.setItem('offline_floor_plan', JSON.stringify(data));
    alert('💾 Saved Offline! Will sync when connection returns.');
  };

  return { status, isSyncing, saveDataLocally };
}