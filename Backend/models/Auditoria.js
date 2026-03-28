const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');

const Auditoria = sequelize.define('Auditoria', {
  id: {
    type:          DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey:    true,
  },
  usuario_id: {
    type:    DataTypes.INTEGER.UNSIGNED,
    comment: 'Quien ejecutó la acción (NULL si fue el sistema)',
  },
  accion: {
    type:      DataTypes.STRING(100),
    allowNull: false,
    comment:   'Ej: "crear_prestamo", "devolver_libro", "cancelar_reserva"',
  },
  entidad: {
    type:      DataTypes.STRING(50),
    allowNull: false,
    comment:   'Tabla afectada: "prestamo", "ejemplar", "usuario", etc.',
  },
  entidad_id: {
    type: DataTypes.INTEGER.UNSIGNED,
  },
  detalle: {
    type:    DataTypes.JSON,
    comment: 'Snapshot del registro antes y/o después del cambio',
  },
  ip: {
    type:    DataTypes.STRING(45),
    comment: 'IPv4 o IPv6 del cliente',
  },
}, {
  tableName:  'auditoria',
  timestamps: true,
});

module.exports = Auditoria;
