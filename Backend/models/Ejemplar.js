// models/Ejemplar.js
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
  },
  estado: {
    type:         DataTypes.ENUM('disponible', 'prestado', 'reservado', 'mantenimiento'),
    allowNull:    false,
    defaultValue: 'disponible',
  },
  notas: {
    type: DataTypes.STRING(255),
  },
}, {
  tableName:  'ejemplares',
  timestamps: true,
});

module.exports = Ejemplar;