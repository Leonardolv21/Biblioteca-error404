const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');

const Prestamo = sequelize.define('Prestamo', {
  id: {
    type:          DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey:    true,
  },
  ejemplar_id: {
    type:      DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  usuario_id: {
    type:      DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  bibliotecario_id: {
    type:    DataTypes.INTEGER.UNSIGNED,
    comment: 'Bibliotecario que procesó el préstamo (puede ser null si el sistema lo genera)',
  },
  fecha_inicio: {
    type:      DataTypes.DATEONLY,
    allowNull: false,
  },
  fecha_vencimiento: {
    type:      DataTypes.DATEONLY,
    allowNull: false,
  },
  fecha_devolucion: {
    type:    DataTypes.DATEONLY,
    comment: 'NULL mientras el libro no haya sido devuelto',
  },
  estado: {
    type:         DataTypes.ENUM('activo', 'renovado', 'devuelto', 'vencido'),
    allowNull:    false,
    defaultValue: 'activo',
  },
  renovaciones: {
    type:         DataTypes.TINYINT.UNSIGNED,
    allowNull:    false,
    defaultValue: 0,
    comment:      'Número de veces que se ha renovado este préstamo',
  },
  observaciones: {
    type: DataTypes.TEXT,
  },
}, {
  tableName:  'prestamos',
  timestamps: true,
});

module.exports = Prestamo;
