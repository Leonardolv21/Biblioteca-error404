require('dotenv').config();
const express = require('express');
const app     = express();
const { sequelize } = require('./models');

app.use(express.json());

app.use('/api/libros', require('./routes/Catalogo.route'));
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
sequelize.authenticate()
  .then(() => console.log('Conectado a MySQL'))
  .catch(err => console.error('Error de conexión:', err));