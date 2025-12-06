import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { FileText, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// 1. IMPORTAR LIBRERÍAS DE PDF
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Reports() {
  const { user } = useAuth();
  const branchId = user?.branch_id || 1;

  const { data: movements, isLoading, isError, error } = useQuery({
    queryKey: ['movements', branchId],
    queryFn: async () => {
      const { data } = await api.get(`/reports/movements/${branchId}`);
      return data;
    }
  });

  // 2. FUNCIÓN PARA GENERAR Y DESCARGAR PDF
  const handleExportPDF = () => {
    if (!movements || movements.length === 0) {
      alert("No hay datos para exportar");
      return;
    }

    const doc = new jsPDF();
    const fechaReporte = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es });

    // Encabezado del PDF
    doc.setFontSize(18);
    doc.text("Reporte de Movimientos de Inventario", 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Generado por: ${user?.username || 'Sistema'}`, 14, 28);
    doc.text(`Fecha de emisión: ${fechaReporte}`, 14, 34);

    // Definir columnas y filas para la tabla
    const tableColumn = ["Fecha", "Tipo", "Producto", "SKU", "Razón", "Cant.", "Usuario"];
    const tableRows = [];

    movements.forEach(mov => {
      const rowData = [
        format(new Date(mov.created_at), "dd/MM/yyyy HH:mm"),
        mov.type === 'IN' ? 'ENTRADA' : 'SALIDA',
        mov.product_name,
        mov.sku,
        mov.reason || '-',
        mov.quantity,
        mov.performed_by
      ];
      tableRows.push(rowData);
    });

    // Generar tabla
    autoTable(doc, {
      startY: 40,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] }, // Color Primary (Azul)
      styles: { fontSize: 8, cellPadding: 2 },
    });

    // Guardar archivo
    doc.save(`reporte_movimientos_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`);
  };

  if (isLoading) return <div className="p-8">Generando reporte...</div>;
  
  if (isError) return (
    <div className="p-8 text-center bg-red-50 text-red-600 rounded-xl border border-red-100">
      Error: {error.response?.status === 403 ? 'No tienes permisos para ver reportes' : 'Error al cargar datos'}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Reporte de Movimientos</h2>
          <p className="text-slate-500">Historial de entradas y salidas de almacén</p>
        </div>
        {/* 3. CONECTAR EL BOTÓN A LA FUNCIÓN */}
        <button 
          onClick={handleExportPDF}
          className="flex items-center gap-2 text-primary font-medium hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors cursor-pointer"
        >
          <FileText size={18} /> Exportar PDF
        </button>
      </div>

      <div className="bg-surface rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Fecha</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Tipo</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Producto</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Razón</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Cantidad</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Usuario</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {movements?.map((mov) => (
              <tr key={mov.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm text-slate-600">
                  {format(new Date(mov.created_at), "dd MMM yyyy, HH:mm", { locale: es })}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                    mov.type === 'IN' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {mov.type === 'IN' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                    {mov.type === 'IN' ? 'Entrada' : 'Salida'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-800">{mov.product_name}</span>
                    <span className="text-xs text-slate-400 font-mono">{mov.sku}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{mov.reason || '-'}</td>
                <td className={`px-6 py-4 text-sm font-bold text-right ${
                  mov.type === 'IN' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {mov.type === 'IN' ? '+' : '-'}{mov.quantity}
                </td>
                <td className="px-6 py-4 text-sm text-slate-500 text-right">
                  {mov.performed_by}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {movements?.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            No hay movimientos registrados en esta sucursal.
          </div>
        )}
      </div>
    </div>
  );
}