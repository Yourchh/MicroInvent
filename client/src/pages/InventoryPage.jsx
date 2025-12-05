import { useInventory } from '../hooks/useInventory';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react'; // Asegúrate de tener instalado lucide-react

function InventoryPage() {
  const { data: products, isLoading, isError, error } = useInventory();
  const { user, logout } = useAuth();

  if (isLoading) return <div className="p-10 text-center">Cargando inventario...</div>;
  if (isError) return <div className="p-10 text-red-600">Error: {error.message}</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Barra Superior */}
      <nav className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">MicroInvent 📦</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            Hola, {user?.username} (Sucursal {user?.branch_id})
          </span>
          <button 
            onClick={logout}
            className="p-2 hover:bg-gray-100 rounded-full text-red-500"
            title="Cerrar Sesión"
          >
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      {/* Contenido Principal */}
      <main className="p-6 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Inventario Actual</h2>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-100 text-gray-600 uppercase text-sm">
              <tr>
                <th className="p-4">SKU</th>
                <th className="p-4">Producto</th>
                <th className="p-4">Precio</th>
                <th className="p-4 text-center">Stock</th>
                <th className="p-4 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products?.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition">
                  <td className="p-4 font-mono text-sm text-gray-500">{item.sku}</td>
                  <td className="p-4 font-medium text-gray-900">{item.product_name}</td>
                  <td className="p-4 text-gray-600">${item.price}</td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      item.quantity < 5 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {item.quantity}
                    </span>
                  </td>
                  <td className="p-4 text-right text-sm text-gray-400">
                    Sincronizado ✅
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {products?.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No hay productos en esta sucursal.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default InventoryPage;