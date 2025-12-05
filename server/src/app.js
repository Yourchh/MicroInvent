const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

// Importar rutas
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/movements', movementRoutes);
app.use('/api/inventory', inventoryRoutes);

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Usar Rutas (Aquí se definen los prefijos)
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

// Ruta base de prueba
app.get('/', (req, res) => res.send('API MicroInvent Funcionando 🚀'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));