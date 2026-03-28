const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');

const Rol = sequelize.define('Rol', {
  id: {
    type:          DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey:    true,
  },
  nombre: {
    type:      DataTypes.ENUM('administrador', 'bibliotecario', 'estudiante'),
    allowNull: false,
    unique:    true,
  },
  descripcion: {
    type: DataTypes.STRING(255),
  },
}, {
  tableName:  'roles',
  timestamps: true,
});

module.exports = Rol;
