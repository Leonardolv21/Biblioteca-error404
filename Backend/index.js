require('dotenv').config();
const { sequelize } = require('./models');

sequelize.authenticate()
  .then(() => console.log('Conectado a MySQL'))
  .catch(err => console.error('Error de conexión:', err));
