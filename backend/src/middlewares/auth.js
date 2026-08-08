const jwt = require('jsonwebtoken');

async function autenticar(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token      = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ erro: 'A autenticação é necessária para acessar este recurso.' });
  }
  
  try { 
    const payload  = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario    = payload;
    next();
  } catch (erro) {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}

module.exports = autenticar;