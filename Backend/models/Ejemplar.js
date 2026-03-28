const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');

const Ejemplar = sequelize.define('Ejemplar', {
  id: {
    type:          DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey:    true,
  },
  libro_id: {
    type:      DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  codigo: {
    type:      DataTypes.STRING(50),
    allowNull: false,
    unique:    true,
    comment:   'Código de barras o QR único del ejemplar físico',
  },
  estado: {
    type:         DataTypes.ENUM('disponible', 'prestado', 'reservado', 'mantenimiento'),
    allowNull:    false,
    defaultValue: 'disponible',
  },
  notas: {
    type:    DataTypes.STRING(255),
    comment: 'Observaciones sobre el estado físico del ejemplar',
  },
}, {
  tableName:  'ejemplares',
  timestamps: true,
});

module.exports = Ejemplar;
