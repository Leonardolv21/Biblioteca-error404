const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');

const Reserva = sequelize.define('Reserva', {
  id: {
    type:          DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey:    true,
  },
  libro_id: {
    type:      DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    comment:   'Se reserva el libro; el ejemplar se asigna cuando queda disponible',
  },
  usuario_id: {
    type:      DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  fecha_reserva: {
    type:         DataTypes.DATE,
    allowNull:    false,
    defaultValue: DataTypes.NOW,
  },
  fecha_expiracion: {
    type:    DataTypes.DATE,
    comment: 'Deadline para recoger el libro una vez disponible',
  },
  estado: {
    type:         DataTypes.ENUM('pendiente', 'disponible', 'cancelada', 'completada'),
    allowNull:    false,
    defaultValue: 'pendiente',
  },
  ejemplar_id: {
    type:    DataTypes.INTEGER.UNSIGNED,
    comment: 'Ejemplar asignado cuando la reserva pasa a disponible',
  },
  notificado: {
    type:         DataTypes.BOOLEAN,
    allowNull:    false,
    defaultValue: false,
    comment:      'Si ya se envió la notificación al usuario',
  },
}, {
  tableName:  'reservas',
  timestamps: true,
});

module.exports = Reserva;
