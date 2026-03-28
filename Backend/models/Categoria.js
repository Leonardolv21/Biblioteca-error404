const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');

const Categoria = sequelize.define('Categoria', {
  id: {
    type:          DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey:    true,
  },
  nombre: {
    type:      DataTypes.STRING(100),
    allowNull: false,
    unique:    true,
  },
  descripcion: {
    type: DataTypes.STRING(255),
  },
}, {
  tableName:  'categorias',
  timestamps: true,
});

module.exports = Categoria;
