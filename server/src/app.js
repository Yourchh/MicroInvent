const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

// 1. IMPORTAR RUTAS
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const reportRoutes = require('./routes/reportRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const branchRoutes = require('./routes/branchRoutes');

// 2. INICIALIZAR LA APP (¡Esta línea debe ir antes de los app.use!)
const app = express(); 

// 3. MIDDLEWARES GLOBALES
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// 4. USAR LAS RUTAS
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/branches', branchRoutes);
// Ruta base de prueba
app.get('/', (req, res) => res.send('API MicroInvent Funcionando 🚀'));

// 5. ARRANCAR EL SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));