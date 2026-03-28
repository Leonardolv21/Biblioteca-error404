console.log("hola mundo");
console.log("hola mundo 2");
console.log("hola mundo 3 desde mi rama")
require('dotenv').config();
const { sequelize } = require('./models');

sequelize.authenticate()
  .then(() => console.log('Conectado a MySQL'))
  .catch(err => console.error('Error de conexión:', err));
