const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');

const Multa = sequelize.define('Multa', {
  id: {
    type:          DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey:    true,
  },
  prestamo_id: {
    type:      DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    unique:    true,
    comment:   'Un préstamo solo puede generar una multa',
  },
  usuario_id: {
    type:      DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  dias_retraso: {
    type:         DataTypes.INTEGER.UNSIGNED,
    allowNull:    false,
    defaultValue: 0,
  },
  monto: {
    type:         DataTypes.DECIMAL(8, 2),
    allowNull:    false,
    defaultValue: 0.00,
  },
  estado: {
    type:         DataTypes.ENUM('pendiente', 'pagada', 'condonada'),
    allowNull:    false,
    defaultValue: 'pendiente',
  },
  fecha_pago: {
    type: DataTypes.DATEONLY,
  },
}, {
  tableName:  'multas',
  timestamps: true,
});

module.exports = Multa;
