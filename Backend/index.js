require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const { sequelize } = require('./models');
const bcrypt = require('bcryptjs');
const { Usuario, Rol } = require('./models');
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/uploads', express.static('Media/uploads'));

app.use('/api/libros', require('./routes/Libro.route'));
app.use('/api/catalogo', require('./routes/Catalogo.route'));
app.use('/api/ejemplares', require('./routes/Ejemplar.route'));
app.use('/api/auth', require('./routes/auth.route'));
app.use('/api/users', require('./routes/user.route'));
app.use('/api/loans', require('./routes/loan.route'));
app.use('/api/reservations', require('./routes/reservation.route'));
app.use('/api/admin', require('./routes/admin.route'));
const seedAdmin = async () => {
  try {
    const rolAdmin = await Rol.findOne({ where: { nombre: 'administrador' } });
    if (!rolAdmin) return console.log('Rol administrador no encontrado en la BD');

    const existe = await Usuario.findOne({ where: { correo: process.env.ADMIN_EMAIL || 'admin@biblioteca.com' } });
    if (existe) return console.log('Admin ya existe, omitiendo creación');

    await Usuario.create({
      nombre: 'Admin',
      apellido: 'Sistema',
      correo: process.env.ADMIN_EMAIL || 'admin@biblioteca.com',
      password_hash: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10),
      rol_id: rolAdmin.id,
      max_prestamos: 0,
    });

    console.log('Usuario admin creado correctamente');
  } catch (error) {
    console.error('Error al crear admin:', error.message);
  }
};
const PORT = process.env.PORT;
sequelize.authenticate()
  .then(async () => {
    console.log('Conectado a MySQL');
    await seedAdmin();
    app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
  })
  .catch(err => console.error('Error de conexión:', err));
