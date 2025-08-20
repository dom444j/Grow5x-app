import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { getJSON } from '../services/api';

export interface OverviewData {
  asOf: string;
  sales: {
    count24h: number;
    amount24hUSDT: number;
    count7d: number;
    amount7dUSDT: number;
  };
  referrals: {
    direct24hUSDT: number;
    parentGlobalQueuedUSDT: number;
    parentGlobalReleased24hUSDT: number;
  };
  benefits: {
    todayUSDT: number;
    pendingCount: number;
    paidCount: number;
  };
  withdrawals: {
    pending: number;
    approved: number;
    completed24h: number;
    slaHitRate7d: number;
  };
  poolV2: {
    total: number;
    available: number;
    medianIntervalMs: number;
    p90IntervalMs: number;
  };
}

export function useAdminOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get token from g5.session structure
      const sessionData = localStorage.getItem('g5.session');
      if (!sessionData) {
        throw new Error('No hay sesión activa');
      }
      
      let token;
      try {
        const session = JSON.parse(sessionData);
        token = session.token;
      } catch (error) {
        throw new Error('Error al leer datos de sesión');
      }
      
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const result = await getJSON<{success: boolean, data: OverviewData}>('/admin/overview');
      
      if (!result.success) {
        throw new Error('Error al obtener datos del overview');
      }

      setData(result.data);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error(`Error al cargar overview: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Cargar datos inicialmente
    fetchOverview();
    
    // Configurar actualización automática cada 30 segundos
    intervalRef.current = setInterval(() => {
      fetchOverview();
    }, 30000);
    
    // Limpiar intervalo al desmontar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refetch: fetchOverview
  };
}