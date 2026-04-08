const express = require('express');
const crypto = require('crypto');

module.exports = (app, db) => {
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    const { Usuario, Rol } = db || {};

    app.get('/login', (req, res) => {
        res.status(405).json({ message: 'usa el POST /login para autenticar' });
    });

    app.post('/login', async (req, res) => {
        if (!Usuario) {
            return res.status(500).json({ error: 'Modelos de base de datos no disponibles' });
        }

        const { correo, password } = req.body;
        if (!correo || !password) {
            return res.status(400).json({ error: 'Correo y password son requeridos' });
        }

        try {
            const usuario = await Usuario.findOne({
                where: { correo },
                include: [{ model: Rol, as: 'rol' }],
            });

            if (!usuario || usuario.password_hash !== password) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }

            const token = crypto.randomBytes(24).toString('hex');
            await usuario.update({ token });

            return res.json({
                token,
                user: {
                    id: usuario.id,
                    nombre: usuario.nombre,
                    apellido: usuario.apellido,
                    correo: usuario.correo,
                    matricula: usuario.matricula,
                    rol_id: usuario.rol_id,
                    rol: usuario.rol ? usuario.rol.nombre : null,
                    max_prestamos: usuario.max_prestamos,
                },
            });
        } catch (error) {
            console.error('LOGIN ERROR', error);
            return res.status(500).json({ error: 'No se pudo iniciar sesión' });
        }
    });

    app.post('/register', async (req, res) => {
        if (!Usuario) {
            return res.status(500).json({ error: 'Modelos de base de datos no disponibles' });
        }

        const { nombre, apellido, correo, password, matricula, rol_id, max_prestamos } = req.body;
        if (!nombre || !apellido || !correo || !password || !rol_id) {
            return res.status(400).json({
                error: 'nombre, apellido, correo, password y rol_id son requeridos',
            });
        }

        try {
            const nuevoUsuario = await Usuario.create({
                nombre,
                apellido,
                correo,
                password_hash: password,
                matricula,
                rol_id,
                max_prestamos: max_prestamos ?? 3,
            });

            return res.status(201).json(nuevoUsuario);
        } catch (error) {
            console.error('REGISTER ERROR', error);
            return res.status(500).json({ error: 'No se pudo crear el usuario' });
        }
    });
};