import { useState, useEffect } from 'react';
import { api } from '../services/api';

export const useBackendConnection = () => {
  const [backendConnected, setBackendConnected] = useState<boolean>(false);

  const checkBackendConnection = async () => {
    const isConnected = await api.checkHealth();
    setBackendConnected(isConnected);
  };

  useEffect(() => {
    checkBackendConnection();

    const interval = setInterval(checkBackendConnection, 10000);
    return () => clearInterval(interval);
  }, []);

  return { backendConnected, checkBackendConnection };
};