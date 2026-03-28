const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');

const Usuario = sequelize.define('Usuario', {
  id: {
    type:          DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey:    true,
  },
  nombre: {
    type:      DataTypes.STRING(150),
    allowNull: false,
  },
  apellido: {
    type:      DataTypes.STRING(150),
    allowNull: false,
  },
  correo: {
    type:      DataTypes.STRING(255),
    allowNull: false,
    unique:    true,
    validate:  { isEmail: true },
  },
  password_hash: {
    type:      DataTypes.STRING(255),
    allowNull: false,
  },
  matricula: {
    type:   DataTypes.STRING(50),
    unique: true,
  },
  rol_id: {
    type:      DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  activo: {
    type:         DataTypes.BOOLEAN,
    allowNull:    false,
    defaultValue: true,
  },
  max_prestamos: {
    type:         DataTypes.TINYINT.UNSIGNED,
    allowNull:    false,
    defaultValue: 3,
  },
}, {
  tableName:  'usuarios',
  timestamps: true,
});

module.exports = Usuario;
