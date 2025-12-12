const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log(`🔐 Verificando token para ${req.method} ${req.path}`);
  
  if (!token) {
    console.log('❌ No hay token');
    return res.status(403).json({ message: 'Acceso denegado: Token requerido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    console.log('✅ Token válido para usuario:', decoded.username);
    next();
  } catch (err) {
    console.log('❌ Token inválido:', err.message);
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

const verifyRole = (requiredRole) => {
  return (req, res, next) => {
    if (req.user && req.user.role === 'superadmin') {
      return next();
    }
    
    if (!req.user || req.user.role !== requiredRole) {
      return res.status(403).json({ message: `Requiere rol: ${requiredRole}` });
    }
    next();
  };
};

module.exports = { verifyToken, verifyRole };