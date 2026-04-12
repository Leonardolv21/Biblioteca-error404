const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Usuario, Rol } = require('../models');
const jwtSecret = process.env.JWT_SECRET || 'secret_local_dev';
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1h';
const { crearUsuario } = require('./user.controller');

const login = async (req, res) => {
    const body = req.body || {};
    const { correo, password } = body;
    if (!correo || !password) {
        return res.status(400).json({ error: 'Correo y password son requeridos' });
    }

    try {
        const usuario = await Usuario.findOne({
            where: { correo },
            include: [{ model: Rol, as: 'rol' }],
        });

        if (!usuario || !(await bcrypt.compare(password, usuario.password_hash))) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const payload = {
            id: usuario.id,
            correo: usuario.correo,
            rol_id: usuario.rol_id,
        };

        const token = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });
        await usuario.update({ token });

        return res.json({
            token,
            user: {
                id: usuario.id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                correo: usuario.correo,
                matricula: usuario.matricula,
                rol_id: usuario.rol_id,
                rol: usuario.rol ? usuario.rol.nombre : null,
                max_prestamos: usuario.max_prestamos,
            },
        });
    } catch (error) {
        console.error('LOGIN ERROR', error);
        return res.status(500).json({ error: 'No se pudo iniciar sesión' });
    }
};

const register = async (req, res) => {
  const { nombre, apellido, correo, password } = req.body;

  if (!nombre || !apellido || !correo || !password) {
    return res.status(400).json({
      error: 'nombre, apellido, correo y password son requeridos',
    });
  }
  req.body.rol_id        = 3;
  req.body.max_prestamos = 3;

  return crearUsuario(req, res);
};

module.exports = {
    login,
    register,
};