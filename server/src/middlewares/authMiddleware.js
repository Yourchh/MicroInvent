const jwt = require('jsonwebtoken');

// 1. Verificar si el usuario tiene un Token válido
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <TOKEN>"

  console.log(`🔐 Verificando token para ${req.method} ${req.path}`);
  
  if (!token) {
    console.log('❌ No hay token');
    return res.status(403).json({ message: 'Acceso denegado: Token requerido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Guardamos los datos del usuario en la petición
    console.log('✅ Token válido para usuario:', decoded.username);
    next();
  } catch (err) {
    console.log('❌ Token inválido:', err.message);
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

// 2. Verificar si el usuario tiene el ROL necesario (NUEVO)
const verifyRole = (requiredRole) => {
  return (req, res, next) => {
    // Si no hay usuario (falló verifyToken) o el rol no coincide
    if (!req.user || (req.user.role !== requiredRole && req.user.role !== 'admin')) {
      return res.status(403).json({ message: `Requiere rol: ${requiredRole}` });
    }
    next();
  };
};

// ¡Importante exportar ambas funciones!
module.exports = { verifyToken, verifyRole };