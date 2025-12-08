import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { FileText, Download, Package, TrendingUp, ShieldAlert, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Reports() {
  const { user } = useAuth();
  const branchId = user?.branch_id || 1;
  const [reportType, setReportType] = useState('STOCK'); // STOCK, MOVEMENTS, VALUE

  // --- 1. CONSULTAS DE DATOS ---
  
  // A. Stock Real
  const { data: stockData, isLoading: loadStock } = useQuery({
    queryKey: ['inventory', branchId],
    queryFn: async () => (await api.get(`/inventory/${branchId}`)).data
  });

  // B. Auditoría (Movimientos)
  const { data: moveData, isLoading: loadMove } = useQuery({
    queryKey: ['movements', branchId],
    queryFn: async () => (await api.get(`/reports/movements/${branchId}`)).data
  });

  // C. Financiero
  const { data: valueData, isLoading: loadValue } = useQuery({
    queryKey: ['inventory-value', branchId],
    queryFn: async () => (await api.get(`/reports/inventory-value/${branchId}`)).data
  });

  const isLoading = loadStock || loadMove || loadValue;

  // --- 2. LÓGICA DE EXPORTACIÓN ---

  // Función auxiliar para agregar encabezado al PDF
  const addHeader = (doc, title) => {
    const fecha = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es });
    doc.setFontSize(14);
    doc.setTextColor(40);
    doc.text(title, 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado por: ${user?.username} | Fecha: ${fecha}`, 14, 22);
    doc.setDrawColor(200);
    doc.line(14, 25, 196, 25);
  };

  // Generar PDF Individual
  const handleExportCurrent = () => {
    const doc = new jsPDF();
    
    if (reportType === 'STOCK') {
      addHeader(doc, "Reporte de Stock Real");
      autoTable(doc, {
        startY: 30,
        head: [['SKU', 'Producto', 'Precio Unit.', 'Stock Actual', 'Estado']],
        body: stockData?.map(item => [
          item.sku, 
          item.product_name, 
          `$${item.price}`, 
          item.quantity,
          item.quantity <= 5 ? 'BAJO' : 'OK'
        ]),
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }
      });
      doc.save(`stock_real_${branchId}.pdf`);
    } 
    else if (reportType === 'MOVEMENTS') {
      addHeader(doc, "Reporte de Auditoría de Movimientos");
      autoTable(doc, {
        startY: 30,
        head: [['Fecha', 'Tipo', 'Producto', 'Razón', 'Cant.', 'Usuario']],
        body: moveData?.map(m => [
          format(new Date(m.created_at), "dd/MM/yy HH:mm"),
          m.type,
          m.product_name,
          m.reason || '-',
          m.quantity,
          m.performed_by
        ]),
        theme: 'grid',
        headStyles: { fillColor: [249, 115, 22] } // Naranja
      });
      doc.save(`auditoria_${branchId}.pdf`);
    }
    else if (reportType === 'VALUE') {
      addHeader(doc, "Reporte Financiero de Inventario");
      // Resumen arriba
      doc.setFontSize(12);
      doc.text(`Valor Total del Inventario: $${Number(valueData?.summary?.total_branch_value || 0).toLocaleString()}`, 14, 35);
      
      autoTable(doc, {
        startY: 40,
        head: [['SKU', 'Producto', 'Stock', 'Costo Unit.', 'Valor Total']],
        body: valueData?.details?.map(item => [
          item.sku,
          item.name,
          item.quantity,
          `$${item.price}`,
          `$${Number(item.total_value).toLocaleString()}`
        ]),
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] } // Verde
      });
      doc.save(`financiero_${branchId}.pdf`);
    }
  };

  // Generar PDF Completo (Todas las secciones)
  const handleExportAll = () => {
    const doc = new jsPDF();
    const fecha = format(new Date(), "dd_MM_yyyy");

    // Portada
    doc.setFontSize(22);
    doc.text("Reporte Consolidado de Inventario", 105, 100, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Sucursal ID: ${branchId}`, 105, 110, { align: 'center' });
    doc.text(`Fecha: ${format(new Date(), "dd MMMM yyyy", { locale: es })}`, 105, 118, { align: 'center' });
    
    // Sección 1: Financiero
    doc.addPage();
    addHeader(doc, "1. Resumen Financiero");
    doc.text(`Valor Total: $${Number(valueData?.summary?.total_branch_value || 0).toLocaleString()}`, 14, 35);
    autoTable(doc, {
      startY: 40,
      head: [['Producto', 'Stock', 'Valor Total']],
      body: valueData?.details?.map(i => [i.name, i.quantity, `$${i.total_value}`]),
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] }
    });

    // Sección 2: Stock Crítico
    // Filtramos solo lo importante para el reporte ejecutivo
    const criticalStock = stockData?.filter(i => i.quantity <= 5) || [];
    if (criticalStock.length > 0) {
        doc.addPage();
        addHeader(doc, "2. Alertas de Stock Bajo");
        autoTable(doc, {
          startY: 30,
          head: [['SKU', 'Producto', 'Stock Actual']],
          body: criticalStock.map(i => [i.sku, i.product_name, i.quantity]),
          theme: 'grid',
          headStyles: { fillColor: [220, 38, 38] }
        });
    }

    // Sección 3: Auditoría (Últimos 50)
    doc.addPage();
    addHeader(doc, "3. Últimos Movimientos (Auditoría)");
    autoTable(doc, {
      startY: 30,
      head: [['Fecha', 'Acción', 'Producto', 'Usuario']],
      body: moveData?.map(m => [
        format(new Date(m.created_at), "dd/MM HH:mm"),
        `${m.type} (${m.quantity})`,
        m.product_name,
        m.performed_by
      ]),
      theme: 'plain',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [100, 116, 139] }
    });

    doc.save(`Reporte_Completo_${fecha}.pdf`);
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500">Cargando datos de reportes...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Reportes</h2>
          <p className="text-slate-500">Consulta y exportación de datos</p>
        </div>
        <div className="flex gap-2">
          {/* Botón Exportar Actual */}
          <button 
            onClick={handleExportCurrent}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm"
          >
            <FileText size={16} /> Exportar Vista
          </button>
          {/* Botón Exportar TODO */}
          <button 
            onClick={handleExportAll}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium text-sm shadow-sm"
          >
            <Download size={16} /> Descargar Todo
          </button>
        </div>
      </div>

      {/* TABS DE NAVEGACIÓN */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6" aria-label="Tabs">
          <button
            onClick={() => setReportType('STOCK')}
            className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm ${
              reportType === 'STOCK'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Package size={18} /> Stock Real
          </button>
          <button
            onClick={() => setReportType('MOVEMENTS')}
            className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm ${
              reportType === 'MOVEMENTS'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <ShieldAlert size={18} /> Auditoría
          </button>
          <button
            onClick={() => setReportType('VALUE')}
            className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm ${
              reportType === 'VALUE'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <DollarSign size={18} /> Financiero
          </button>
        </nav>
      </div>

      {/* CONTENIDO DE LA TABLA DINÁMICA */}
      <div className="bg-surface rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* VISTA: STOCK REAL */}
        {reportType === 'STOCK' && (
          <table className="w-full text-left">
            <thead className="bg-blue-50/50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">SKU</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Producto</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase text-right">Precio</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase text-center">Stock</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stockData?.map((item) => (
                <tr key={item.inventory_id || item.product_id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-sm font-mono text-slate-600">{item.sku}</td>
                  <td className="px-6 py-3 text-sm font-medium">{item.product_name}</td>
                  <td className="px-6 py-3 text-sm text-right">${item.price}</td>
                  <td className="px-6 py-3 text-sm font-bold text-center">{item.quantity}</td>
                  <td className="px-6 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      item.quantity <= 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {item.quantity <= 5 ? 'BAJO' : 'OK'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* VISTA: AUDITORÍA (MOVIMIENTOS) */}
        {reportType === 'MOVEMENTS' && (
          <table className="w-full text-left">
            <thead className="bg-orange-50/50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Fecha</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Acción</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Producto</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Razón</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase text-right">Cant.</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase text-right">Usuario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {moveData?.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-sm text-slate-600">
                    {format(new Date(m.created_at), "dd/MM/yy HH:mm")}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      m.type === 'IN' ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
                    }`}>
                      {m.type}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm font-medium">{m.product_name}</td>
                  <td className="px-6 py-3 text-sm text-slate-500 italic">{m.reason || '-'}</td>
                  <td className="px-6 py-3 text-sm text-right font-mono">{m.quantity}</td>
                  <td className="px-6 py-3 text-sm text-right text-slate-600">{m.performed_by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* VISTA: FINANCIERO */}
        {reportType === 'VALUE' && (
          <>
            <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center">
              <span className="text-emerald-800 font-medium">Resumen de Valorización</span>
              <span className="text-2xl font-bold text-emerald-700">
                ${Number(valueData?.summary?.total_branch_value || 0).toLocaleString()}
              </span>
            </div>
            <table className="w-full text-left">
              <thead className="bg-emerald-50/30 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Producto</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase text-center">Stock</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase text-right">Costo Unit.</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase text-right">Valor Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {valueData?.details?.map((d) => (
                  <tr key={d.id || `${d.sku}-${d.name}`} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm font-medium">
                      {d.name} <span className="text-xs text-slate-400 ml-1 font-mono">({d.sku})</span>
                    </td>
                    <td className="px-6 py-3 text-sm text-center">{d.quantity}</td>
                    <td className="px-6 py-3 text-sm text-right text-slate-600">${d.price}</td>
                    <td className="px-6 py-3 text-sm text-right font-bold text-slate-800">
                      ${Number(d.total_value).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}