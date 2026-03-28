

const sequelize    = require('../config/database');

const Rol= require('./Rol');
const Usuario= require('./Usuario');
const Categoria= require('./Categoria');
const Libro= require('./Libro');
const Ejemplar= require('./Ejemplar');
const Prestamo= require('./Prestamo');
const Reserva= require('./Reserva');
const Multa= require('./Multa');
const Notificacion= require('./Notificacion');
const Auditoria= require('./Auditoria');


Rol.hasMany(Usuario,      { foreignKey: 'rol_id', as: 'usuarios' });
Usuario.belongsTo(Rol,    { foreignKey: 'rol_id', as: 'rol' });

Categoria.hasMany(Libro,     { foreignKey: 'categoria_id', as: 'libros' });
Libro.belongsTo(Categoria,   { foreignKey: 'categoria_id', as: 'categoria' });

Libro.hasMany(Ejemplar,      { foreignKey: 'libro_id', as: 'ejemplares' });
Ejemplar.belongsTo(Libro,    { foreignKey: 'libro_id', as: 'libro' });

Ejemplar.hasMany(Prestamo,   { foreignKey: 'ejemplar_id', as: 'prestamos' });
Prestamo.belongsTo(Ejemplar, { foreignKey: 'ejemplar_id', as: 'ejemplar' });

Usuario.hasMany(Prestamo,    { foreignKey: 'usuario_id', as: 'prestamos' });
Prestamo.belongsTo(Usuario,  { foreignKey: 'usuario_id', as: 'usuario' });

Usuario.hasMany(Prestamo,    { foreignKey: 'bibliotecario_id', as: 'prestamos_gestionados' });
Prestamo.belongsTo(Usuario,  { foreignKey: 'bibliotecario_id', as: 'bibliotecario' });

Libro.hasMany(Reserva,       { foreignKey: 'libro_id', as: 'reservas' });
Reserva.belongsTo(Libro,     { foreignKey: 'libro_id', as: 'libro' });

Usuario.hasMany(Reserva,     { foreignKey: 'usuario_id', as: 'reservas' });
Reserva.belongsTo(Usuario,   { foreignKey: 'usuario_id', as: 'usuario' });

Ejemplar.hasMany(Reserva,    { foreignKey: 'ejemplar_id', as: 'reservas' });
Reserva.belongsTo(Ejemplar,  { foreignKey: 'ejemplar_id', as: 'ejemplar' });

Prestamo.hasOne(Multa,       { foreignKey: 'prestamo_id', as: 'multa' });
Multa.belongsTo(Prestamo,    { foreignKey: 'prestamo_id', as: 'prestamo' });

Usuario.hasMany(Multa,       { foreignKey: 'usuario_id', as: 'multas' });
Multa.belongsTo(Usuario,     { foreignKey: 'usuario_id', as: 'usuario' });

Usuario.hasMany(Notificacion,    { foreignKey: 'usuario_id', as: 'notificaciones' });
Notificacion.belongsTo(Usuario,  { foreignKey: 'usuario_id', as: 'usuario' });

Usuario.hasMany(Auditoria,   { foreignKey: 'usuario_id', as: 'acciones' });
Auditoria.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });


module.exports = {
  sequelize,
  Rol,
  Usuario,
  Categoria,
  Libro,
  Ejemplar,
  Prestamo,
  Reserva,
  Multa,
  Notificacion,
  Auditoria,
};