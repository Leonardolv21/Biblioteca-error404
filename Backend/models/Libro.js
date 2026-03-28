const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');

const Libro = sequelize.define('Libro', {
  id: {
    type:          DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey:    true,
  },
  titulo: {
    type:      DataTypes.STRING(300),
    allowNull: false,
  },
  autor: {
    type:      DataTypes.STRING(200),
    allowNull: false,
  },
  editorial: {
    type: DataTypes.STRING(150),
  },
  isbn: {
    type:   DataTypes.STRING(20),
    unique: true,
  },
  anio: {
    type:     DataTypes.INTEGER,
    validate: { min: 1000, max: new Date().getFullYear() + 1 },
  },
  categoria_id: {
    type: DataTypes.INTEGER.UNSIGNED,
  },
  descripcion: {
    type: DataTypes.TEXT,
  },
  imagen_url: {
    type:     DataTypes.STRING(500),
    validate: { isUrl: true },
  },
  palabras_clave: {
    type:         DataTypes.JSON,
    defaultValue: [],
    comment:      'Array de strings: ["historia","ciencia"]',
  },
}, {
  tableName:  'libros',
  timestamps: true,
});

module.exports = Libro;
