const express = require('express');

module.exports = (app, db) => {
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    const { Reserva, Usuario, Libro, Ejemplar } = db || {};

    app.get('/reservation', async (req, res) => {
        if (!Reserva) {
            return res.status(500).json({ error: 'Modelo Reserva no disponible' });
        }

        try {
            const reservas = await Reserva.findAll({
                include: [
                    { model: Usuario, as: 'usuario' },
                    { model: Libro, as: 'libro' },
                    { model: Ejemplar, as: 'ejemplar' },
                ],
            });
            return res.json(reservas);
        } catch (error) {
            console.error('RESERVATION LIST ERROR', error);
            return res.status(500).json({ error: 'No se pudieron obtener las reservas' });
        }
    });

    app.get('/reservation/:id', async (req, res) => {
        if (!Reserva) {
            return res.status(500).json({ error: 'Modelo Reserva no disponible' });
        }

        try {
            const reserva = await Reserva.findByPk(req.params.id, {
                include: [
                    { model: Usuario, as: 'usuario' },
                    { model: Libro, as: 'libro' },
                    { model: Ejemplar, as: 'ejemplar' },
                ],
            });

            if (!reserva) {
                return res.status(404).json({ error: 'Reserva no encontrada' });
            }

            return res.json(reserva);
        } catch (error) {
            console.error('RESERVATION DETAIL ERROR', error);
            return res.status(500).json({ error: 'No se pudo obtener la reserva' });
        }
    });

    app.post('/reservation', async (req, res) => {
        if (!Reserva || !Usuario || !Libro) {
            return res.status(500).json({ error: 'Modelos de base de datos no disponibles' });
        }

        const { libro_id, usuario_id, fecha_reserva, fecha_expiracion, estado, ejemplar_id, notificado } = req.body;
        if (!libro_id || !usuario_id) {
            return res.status(400).json({ error: 'libro_id y usuario_id son requeridos' });
        }

        try {
            const libro = await Libro.findByPk(libro_id);
            if (!libro) {
                return res.status(404).json({ error: 'Libro no encontrado' });
            }

            const usuario = await Usuario.findByPk(usuario_id);
            if (!usuario) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            const reserva = await Reserva.create({
                libro_id,
                usuario_id,
                fecha_reserva: fecha_reserva || new Date(),
                fecha_expiracion,
                estado: estado || 'pendiente',
                ejemplar_id,
                notificado: notificado ?? false,
            });

            return res.status(201).json(reserva);
        } catch (error) {
            console.error('RESERVATION CREATE ERROR', error);
            return res.status(500).json({ error: 'No se pudo crear la reserva' });
        }
    });

    app.put('/reservation/:id', async (req, res) => {
        if (!Reserva) {
            return res.status(500).json({ error: 'Modelo Reserva no disponible' });
        }

        try {
            const reserva = await Reserva.findByPk(req.params.id);
            if (!reserva) {
                return res.status(404).json({ error: 'Reserva no encontrada' });
            }

            const { fecha_expiracion, estado, ejemplar_id, notificado } = req.body;
            const datosActualizar = {};

            if (fecha_expiracion !== undefined) datosActualizar.fecha_expiracion = fecha_expiracion;
            if (estado !== undefined) datosActualizar.estado = estado;
            if (ejemplar_id !== undefined) datosActualizar.ejemplar_id = ejemplar_id;
            if (notificado !== undefined) datosActualizar.notificado = notificado;

            await reserva.update(datosActualizar);
            return res.json(reserva);
        } catch (error) {
            console.error('RESERVATION UPDATE ERROR', error);
            return res.status(500).json({ error: 'No se pudo actualizar la reserva' });
        }
    });

    app.delete('/reservation/:id', async (req, res) => {
        if (!Reserva) {
            return res.status(500).json({ error: 'Modelo Reserva no disponible' });
        }

        try {
            const reserva = await Reserva.findByPk(req.params.id);
            if (!reserva) {
                return res.status(404).json({ error: 'Reserva no encontrada' });
            }

            await reserva.destroy();
            return res.json({ message: 'Reserva eliminada correctamente' });
        } catch (error) {
            console.error('RESERVATION DELETE ERROR', error);
            return res.status(500).json({ error: 'No se pudo eliminar la reserva' });
        }
    });
};