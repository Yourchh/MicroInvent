import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, AlertTriangle, Package, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Componente reutilizable para las tarjetas de métricas
// eslint-disable-next-line no-unused-vars
const StatCard = ({ title, value, icon: Icon, color, subtext }) => (
  <div className="bg-surface p-6 rounded-xl border border-slate-100 shadow-sm flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
      {subtext && <p className="text-xs text-slate-400 mt-2">{subtext}</p>}
    </div>
    <div className={`p-3 rounded-lg ${color}`}>
      <Icon size={24} className="text-white" />
    </div>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const branchId = user?.branch_id || 1;

  // 1. Obtener datos de valor del inventario
  const { data: valueData, isLoading: loadingValue } = useQuery({
    queryKey: ['inventory-value', branchId],
    queryFn: async () => {
      const { data } = await api.get(`/reports/inventory-value/${branchId}`);
      return data;
    }
  });

  // 2. Obtener inventario para calcular stock bajo y gráficas
  const { data: inventoryData, isLoading: loadingInv } = useQuery({
    queryKey: ['inventory', branchId],
    queryFn: async () => {
      const { data } = await api.get(`/inventory/${branchId}`);
      return data;
    }
  });

  if (loadingValue || loadingInv) return <div className="p-8">Cargando métricas...</div>;

  // Cálculos simples en el cliente
  const totalProducts = inventoryData?.length || 0;
  const lowStockItems = inventoryData?.filter(item => item.quantity <= 5).length || 0;
  const totalValue = valueData?.summary?.total_branch_value || 0;
  
  // Preparamos datos para la gráfica (Top 5 productos con más stock)
  const chartData = inventoryData
    ?.sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)
    .map(item => ({
      name: item.product_name.length > 10 ? item.product_name.substring(0,10)+'...' : item.product_name,
      stock: item.quantity
    }));

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
        <p className="text-slate-500">Resumen general de tu sucursal</p>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Valor Total Inventario" 
          value={`$${Number(totalValue).toLocaleString()}`} 
          icon={DollarSign} 
          color="bg-emerald-500"
          subtext="Costo total de mercancía"
        />
        <StatCard 
          title="Productos Registrados" 
          value={totalProducts} 
          icon={Package} 
          color="bg-blue-500"
          subtext="SKUs únicos en sucursal"
        />
        <StatCard 
          title="Stock Bajo" 
          value={lowStockItems} 
          icon={AlertTriangle} 
          color="bg-amber-500"
          subtext="Productos requieren reorden"
        />
      </div>

      {/* Gráfica */}
      <div className="bg-surface p-6 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="text-primary" size={20} />
          <h3 className="font-bold text-slate-700">Top Productos por Stock</h3>
        </div>
        
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <Tooltip 
                cursor={{fill: '#f8fafc'}}
                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
              />
              <Bar dataKey="stock" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}