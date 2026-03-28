const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');

const Notificacion = sequelize.define('Notificacion', {
  id: {
    type:          DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey:    true,
  },
  usuario_id: {
    type:      DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  tipo: {
    type:      DataTypes.ENUM(
      'reserva_disponible',
      'vencimiento_proximo',
      'multa_pendiente',
      'devolucion_confirmada'
    ),
    allowNull: false,
  },
  mensaje: {
    type:      DataTypes.TEXT,
    allowNull: false,
  },
  leida: {
    type:         DataTypes.BOOLEAN,
    allowNull:    false,
    defaultValue: false,
  },
  referencia_id: {
    type:    DataTypes.INTEGER.UNSIGNED,
    comment: 'ID del préstamo, reserva o multa relacionado',
  },
  referencia_tipo: {
    type:    DataTypes.STRING(20),
    comment: '"prestamo" | "reserva" | "multa"',
  },
}, {
  tableName:  'notificaciones',
  timestamps: true,
});

module.exports = Notificacion;
