const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

const authenticate = async (req, res, next) => {
    try {
        let token = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({ error: 'Token de autenticación requerido' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_local_dev');

        const usuario = await Usuario.findByPk(decoded.id, {
            include: [{ model: require('../models/Rol'), as: 'rol' }],
        });

        if (!usuario) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }

        req.user = usuario;
        next();
    } catch (error) {
        console.error('AUTH MIDDLEWARE ERROR', error);
        return res.status(401).json({ error: 'Token inválido' });
    }
};

const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const userRole = req.user.rol.nombre;
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                error: 'Acceso denegado. Rol requerido: ' + allowedRoles.join(' o ')
            });
        }

        next();
    };
};

module.exports = {
    authenticate,
    authorize,
};
