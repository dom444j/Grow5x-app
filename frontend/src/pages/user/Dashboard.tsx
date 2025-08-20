import React, { useEffect, useState } from 'react';
import { withAuth } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import UserLayout from '../../components/UserLayout';

type MeResp = { user: { name?: string; role: string }; balances?: { availableBalance:number; pendingBalance:number; totalEarned:number; } };

export default function Dashboard() {
  const { token } = useAuth();
  const [data, setData] = useState<MeResp | null>(null);

  useEffect(() => {
    const load = async () => {
      const client = withAuth(token);
      const res = await client.GET('/api/me', {});
      if ((res as any)?.data) setData((res as any).data);
    };
    load();
  }, [token]);

  const b = data?.balances;
  return (
    <UserLayout title="Dashboard">
      <div className="p-6 grid gap-4 md:grid-cols-3">
        <Card title="Disponible" value={b?.availableBalance ?? 0} />
        <Card title="Pendiente" value={b?.pendingBalance ?? 0} />
        <Card title="Total Ganado" value={b?.totalEarned ?? 0} />
      </div>
    </UserLayout>
  );
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="border rounded-xl p-4 shadow-sm">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold">{value.toFixed(2)} USDT</div>
    </div>
  );
}