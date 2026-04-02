// src/models/index.js
const sequelize    = require('../config/database');

const Rol          = require('./Rol');
const Usuario      = require('./Usuario');
const Categoria    = require('./Categoria');
const Libro        = require('./Libro');
const Prestamo     = require('./Prestamo');
const Reserva      = require('./Reserva');
const Multa        = require('./Multa');
const Notificacion = require('./Notificacion');
const Auditoria    = require('./Auditoria');

// Rol ↔ Usuario
Rol.hasMany(Usuario,     { foreignKey: 'rol_id', as: 'usuarios' });
Usuario.belongsTo(Rol,   { foreignKey: 'rol_id', as: 'rol' });

// Categoria ↔ Libro
Categoria.hasMany(Libro,   { foreignKey: 'categoria_id', as: 'libros' });
Libro.belongsTo(Categoria, { foreignKey: 'categoria_id', as: 'categoria' });

// Libro ↔ Prestamo  ← antes era Ejemplar ↔ Prestamo
Libro.hasMany(Prestamo,    { foreignKey: 'libro_id', as: 'prestamos' });
Prestamo.belongsTo(Libro,  { foreignKey: 'libro_id', as: 'libro' });

// Usuario ↔ Prestamo (como lector)
Usuario.hasMany(Prestamo,   { foreignKey: 'usuario_id', as: 'prestamos' });
Prestamo.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

// Usuario ↔ Prestamo (como bibliotecario)
Usuario.hasMany(Prestamo,   { foreignKey: 'bibliotecario_id', as: 'prestamos_gestionados' });
Prestamo.belongsTo(Usuario, { foreignKey: 'bibliotecario_id', as: 'bibliotecario' });

// Libro ↔ Reserva
Libro.hasMany(Reserva,     { foreignKey: 'libro_id', as: 'reservas' });
Reserva.belongsTo(Libro,   { foreignKey: 'libro_id', as: 'libro' });

// Usuario ↔ Reserva
Usuario.hasMany(Reserva,   { foreignKey: 'usuario_id', as: 'reservas' });
Reserva.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

// Prestamo ↔ Multa
Prestamo.hasOne(Multa,     { foreignKey: 'prestamo_id', as: 'multa' });
Multa.belongsTo(Prestamo,  { foreignKey: 'prestamo_id', as: 'prestamo' });

// Usuario ↔ Multa
Usuario.hasMany(Multa,     { foreignKey: 'usuario_id', as: 'multas' });
Multa.belongsTo(Usuario,   { foreignKey: 'usuario_id', as: 'usuario' });

// Usuario ↔ Notificacion
Usuario.hasMany(Notificacion,   { foreignKey: 'usuario_id', as: 'notificaciones' });
Notificacion.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

// Usuario ↔ Auditoria
Usuario.hasMany(Auditoria,   { foreignKey: 'usuario_id', as: 'acciones' });
Auditoria.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

module.exports = {
  sequelize,
  Rol,
  Usuario,
  Categoria,
  Libro,
  Prestamo,
  Reserva,
  Multa,
  Notificacion,
  Auditoria,
};