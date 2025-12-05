import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Search } from 'lucide-react';
import { useState } from 'react';

export default function Inventory() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  // Fetch data usando TanStack Query
  const { data: products, isLoading, isError } = useQuery({
    queryKey: ['inventory', user?.branch_id], // user.branch_id viene del login
    queryFn: async () => {
        // Asumimos un ID de sucursal default si no viene en el user (para pruebas)
        const branchId = user?.branch_id || 1; 
        const { data } = await api.get(`/inventory/${branchId}`);
        return data;
    }
  });

  const filteredProducts = products?.filter(p => 
    p.product_name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="p-8 text-center text-slate-500">Cargando inventario...</div>;
  if (isError) return <div className="p-8 text-center text-red-500">Error cargando datos</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Inventario</h2>
          <p className="text-slate-500">Gestión de stock en tiempo real</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o SKU..." 
            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white shadow-sm w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-surface rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">SKU</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Producto</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Precio</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Stock</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm font-mono text-slate-600">{product.sku}</td>
                <td className="px-6 py-4 text-sm font-medium text-slate-800">{product.product_name}</td>
                <td className="px-6 py-4 text-sm text-slate-600 text-right">${product.price}</td>
                <td className="px-6 py-4 text-sm font-bold text-center text-slate-800">{product.quantity}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    product.quantity > 5 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {product.quantity > 5 ? 'Disponible' : 'Bajo Stock'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredProducts.length === 0 && (
            <div className="p-8 text-center text-slate-400">No se encontraron productos</div>
        )}
      </div>
    </div>
  );
}