const bcrypt = require('bcryptjs');
const { Usuario, Rol, Prestamo, Reserva, Multa, Notificacion } = require('../models');
const generarMatricula = require('../utils/matricula');

const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({
      include: [{ model: Rol, as: 'rol' }],
    });
    return res.json(usuarios);
  } catch (error) {
    console.error('USER LIST ERROR', error);
    return res.status(500).json({ error: 'No se pudieron obtener los usuarios' });
  }
};

const obtenerUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id, {
      include: [
        { model: Rol, as: 'rol' },
        { model: Prestamo, as: 'prestamos' },
        { model: Reserva, as: 'reservas' },
        { model: Multa, as: 'multas' },
        { model: Notificacion, as: 'notificaciones' },
      ],
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json(usuario);
  } catch (error) {
    console.error('USER DETAIL ERROR', error);
    return res.status(500).json({ error: 'No se pudo obtener el usuario' });
  }
};

const crearUsuario = async (req, res) => {
  const { nombre, apellido, correo, password, rol_id, max_prestamos } = req.body;

  if (!nombre || !apellido || !correo || !password || !rol_id) {
    return res.status(400).json({
      error: 'nombre, apellido, correo, password y rol_id son requeridos',
    });
  }

  try {
    const rol = await Rol.findByPk(rol_id);
    if (!rol) return res.status(404).json({ error: 'Rol no encontrado' });

    const matricula = generarMatricula(nombre, apellido, rol.nombre);
    const hashedPassword = await bcrypt.hash(password, 10);

    const nuevoUsuario = await Usuario.create({
      nombre,
      apellido,
      correo,
      password_hash: hashedPassword,
      matricula,
      rol_id,
      max_prestamos: max_prestamos ?? 3,
    });

    return res.status(201).json(nuevoUsuario);
  } catch (error) {
    console.error('USER CREATE ERROR', error);
    return res.status(500).json({ error: 'No se pudo crear el usuario' });
  }
};

const actualizarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id, {
      include: [{ model: Rol, as: 'rol' }],
    });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const { nombre, apellido, password } = req.body;

    const nuevoNombre = nombre ?? usuario.nombre;
    const nuevoApellido = apellido ?? usuario.apellido;
    const hashedPassword = password
      ? await bcrypt.hash(password, 10)
      : usuario.password_hash;

    const cambioMatricula = nombre || apellido;
    const nuevaMatricula = cambioMatricula
      ? generarMatricula(nuevoNombre, nuevoApellido, usuario.rol.nombre)
      : usuario.matricula;

    await usuario.update({
      nombre: nuevoNombre,
      apellido: nuevoApellido,
      password_hash: hashedPassword,
      matricula: nuevaMatricula,
    });

    return res.json({ message: 'Usuario actualizado correctamente', usuario });
  } catch (error) {
    console.error('USER UPDATE ERROR', error);
    return res.status(500).json({ error: 'No se pudo actualizar el usuario' });
  }
};

const eliminarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await usuario.destroy();
    return res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('USER DELETE ERROR', error);
    return res.status(500).json({ error: 'No se pudo eliminar el usuario' });
  }
};
const hacerAdmin = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (usuario.rol_id === 1) {
      return res.status(400).json({ message: 'El usuario ya es administrador' });
    }

    await usuario.update({ rol_id: 1, max_prestamos: 0 });

    return res.json({ message: 'Usuario actualizado a administrador', usuario });
  } catch (error) {
    console.error('MAKE ADMIN ERROR', error);
    return res.status(500).json({ error: 'No se pudo actualizar el rol' });
  }
};

const hacerBibliotecario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (usuario.rol_id === 2) {
      return res.status(400).json({ message: 'El usuario ya es bibliotecario' });
    }

    const matricula = generarMatricula(usuario.nombre, usuario.apellido, 'bibliotecario');
    await usuario.update({ rol_id: 2, matricula, max_prestamos: 0 });

    return res.json({ message: 'Usuario actualizado a bibliotecario', usuario });
  } catch (error) {
    console.error('MAKE BIBLIOTECARIO ERROR', error);
    return res.status(500).json({ error: 'No se pudo actualizar el rol' });
  }
};

module.exports = {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  hacerAdmin,
  hacerBibliotecario,
};
