require('dotenv').config();
const express = require('express');
const app = express();
const { sequelize } = require('./models');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/libros', require('./routes/Libro.route'));
app.use('/api/catalogo', require('./routes/Catalogo.route'));
app.use('/api/ejemplares', require('./routes/Ejemplar.route'));
app.use('/api/auth', require('./routes/auth.route'));
app.use('/api/users', require('./routes/user.route'));
app.use('/api/loans', require('./routes/loan.route'));
app.use('/api/reservations', require('./routes/reservation.route'));
app.use('/api/admin', require('./routes/admin.route'));

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
sequelize.authenticate()
  .then(() => console.log('Conectado a MySQL'))
  .catch(err => console.error('Error de conexión:', err));
