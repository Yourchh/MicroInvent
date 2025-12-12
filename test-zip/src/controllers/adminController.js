const pool = require('../config/db');

exports.resetDatabase = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const currentUserId = req.user.id; // ID del admin que está ejecutando esto

    await client.query('BEGIN'); // Iniciar transacción

    // 1. Limpiar tablas transaccionales (Movimientos, Transferencias, Inventario)
    // TRUNCATE es más rápido que DELETE y resetea los IDs autoincrementables
    // CASCADE borra también los registros dependientes (ej: items de transferencias)
    await client.query(`
      TRUNCATE TABLE 
        movements, 
        transfer_items, 
        transfers, 
        inventory 
      RESTART IDENTITY CASCADE;
    `);

    // 2. Limpiar Catálogo de Productos
    // (Esto también borraría inventario si no lo hubieramos borrado arriba, por el CASCADE)
    await client.query('TRUNCATE TABLE products RESTART IDENTITY CASCADE;');

    // 3. Limpiar Usuarios (EXCEPTO el actual)
    // Aquí usamos DELETE porque queremos conservar al menos uno
    await client.query('DELETE FROM users WHERE id != $1', [currentUserId]);

    // Opcional: ¿Borrar sucursales? 
    // Generalmente se dejan las sucursales físicas, pero si quieres borrar todo menos la principal:
    // await client.query("DELETE FROM branches WHERE id != 1"); 

    await client.query('COMMIT');
    
    res.json({ message: 'Sistema reseteado correctamente. Todos los datos han sido eliminados excepto tu usuario.' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error en resetDatabase:", error);
    res.status(500).json({ message: 'Error crítico al resetear base de datos', error: error.message });
  } finally {
    client.release();
  }
};