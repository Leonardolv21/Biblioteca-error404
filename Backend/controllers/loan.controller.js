const express = require('express');

module.exports = (app, db) => {
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    const { Prestamo, Ejemplar, Usuario, Libro } = db || {};

    app.get('/loan', async (req, res) => {
        if (!Prestamo) {
            return res.status(500).json({ error: 'Modelo Prestamo no disponible' });
        }

        try {
            const prestamos = await Prestamo.findAll({
                include: [
                    {
                        model: Ejemplar,
                        as: 'ejemplar',
                        include: [{ model: Libro, as: 'libro' }],
                    },
                    { model: Usuario, as: 'usuario' },
                    { model: Usuario, as: 'bibliotecario' },
                ],
            });
            return res.json(prestamos);
        } catch (error) {
            console.error('LOAN LIST ERROR', error);
            return res.status(500).json({ error: 'No se pudieron obtener los préstamos' });
        }
    });

    app.get('/loan/:id', async (req, res) => {
        if (!Prestamo) {
            return res.status(500).json({ error: 'Modelo Prestamo no disponible' });
        }

        try {
            const prestamo = await Prestamo.findByPk(req.params.id, {
                include: [
                    {
                        model: Ejemplar,
                        as: 'ejemplar',
                        include: [{ model: Libro, as: 'libro' }],
                    },
                    { model: Usuario, as: 'usuario' },
                    { model: Usuario, as: 'bibliotecario' },
                ],
            });

            if (!prestamo) {
                return res.status(404).json({ error: 'Préstamo no encontrado' });
            }

            return res.json(prestamo);
        } catch (error) {
            console.error('LOAN DETAIL ERROR', error);
            return res.status(500).json({ error: 'No se pudo obtener el préstamo' });
        }
    });

    app.post('/loan', async (req, res) => {
        if (!Prestamo || !Ejemplar || !Usuario) {
            return res.status(500).json({ error: 'Modelos de base de datos no disponibles' });
        }

        const {
            ejemplar_id,
            usuario_id,
            bibliotecario_id,
            fecha_inicio,
            fecha_vencimiento,
            observaciones,
        } = req.body;

        if (!ejemplar_id || !usuario_id) {
            return res.status(400).json({ error: 'ejemplar_id y usuario_id son requeridos' });
        }

        try {
            const ejemplar = await Ejemplar.findByPk(ejemplar_id);
            if (!ejemplar) {
                return res.status(404).json({ error: 'Ejemplar no encontrado' });
            }

            if (ejemplar.estado !== 'disponible') {
                return res.status(400).json({ error: 'El ejemplar no está disponible para préstamo' });
            }

            const usuario = await Usuario.findByPk(usuario_id);
            if (!usuario) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            const activeLoans = await Prestamo.count({
                where: {
                    usuario_id,
                    estado: ['activo', 'renovado'],
                },
            });

            if (activeLoans >= usuario.max_prestamos) {
                return res.status(400).json({ error: 'El usuario alcanzó el máximo de préstamos activos' });
            }

            const inicio = fecha_inicio ? new Date(fecha_inicio) : new Date();
            const vencimiento = fecha_vencimiento
                ? new Date(fecha_vencimiento)
                : new Date(inicio.getTime() + 14 * 24 * 60 * 60 * 1000);

            const nuevoPrestamo = await Prestamo.create({
                ejemplar_id,
                usuario_id,
                bibliotecario_id,
                fecha_inicio: inicio.toISOString().split('T')[0],
                fecha_vencimiento: vencimiento.toISOString().split('T')[0],
                observaciones,
                estado: 'activo',
            });

            await ejemplar.update({ estado: 'prestado' });
            return res.status(201).json(nuevoPrestamo);
        } catch (error) {
            console.error('LOAN CREATE ERROR', error);
            return res.status(500).json({ error: 'No se pudo crear el préstamo' });
        }
    });

    app.put('/loan/:id', async (req, res) => {
        if (!Prestamo || !Ejemplar) {
            return res.status(500).json({ error: 'Modelos de base de datos no disponibles' });
        }

        try {
            const prestamo = await Prestamo.findByPk(req.params.id);
            if (!prestamo) {
                return res.status(404).json({ error: 'Préstamo no encontrado' });
            }

            const {
                estado,
                fecha_vencimiento,
                fecha_devolucion,
                observaciones,
                bibliotecario_id,
            } = req.body;

            const datosActualizar = {};
            if (observaciones !== undefined) datosActualizar.observaciones = observaciones;
            if (bibliotecario_id !== undefined) datosActualizar.bibliotecario_id = bibliotecario_id;
            if (fecha_vencimiento) datosActualizar.fecha_vencimiento = fecha_vencimiento;
            if (fecha_devolucion) datosActualizar.fecha_devolucion = fecha_devolucion;

            if (estado) {
                if (estado === 'renovado') {
                    if (prestamo.renovaciones >= 2) {
                        return res.status(400).json({ error: 'No se puede renovar este préstamo nuevamente' });
                    }

                    datosActualizar.estado = 'renovado';
                    datosActualizar.renovaciones = prestamo.renovaciones + 1;
                    if (!fecha_vencimiento) {
                        const actual = new Date(prestamo.fecha_vencimiento || new Date());
                        datosActualizar.fecha_vencimiento = new Date(actual.getTime() + 7 * 24 * 60 * 60 * 1000)
                            .toISOString()
                            .split('T')[0];
                    }
                } else if (estado === 'devuelto') {
                    datosActualizar.estado = 'devuelto';
                    datosActualizar.fecha_devolucion = fecha_devolucion
                        ? fecha_devolucion
                        : new Date().toISOString().split('T')[0];
                } else {
                    datosActualizar.estado = estado;
                }
            }

            await prestamo.update(datosActualizar);

            if (estado === 'devuelto') {
                const ejemplar = await Ejemplar.findByPk(prestamo.ejemplar_id);
                if (ejemplar) {
                    await ejemplar.update({ estado: 'disponible' });
                }
            }

            return res.json(prestamo);
        } catch (error) {
            console.error('LOAN UPDATE ERROR', error);
            return res.status(500).json({ error: 'No se pudo actualizar el préstamo' });
        }
    });

    app.post('/loan/:id/renew', async (req, res) => {
        if (!Prestamo) {
            return res.status(500).json({ error: 'Modelo Prestamo no disponible' });
        }

        try {
            const prestamo = await Prestamo.findByPk(req.params.id);
            if (!prestamo) {
                return res.status(404).json({ error: 'Préstamo no encontrado' });
            }

            if (prestamo.estado === 'devuelto') {
                return res.status(400).json({ error: 'No se puede renovar un préstamo devuelto' });
            }

            if (prestamo.renovaciones >= 2) {
                return res.status(400).json({ error: 'Se alcanzó el límite de renovaciones' });
            }

            const nuevaFecha = new Date(prestamo.fecha_vencimiento || new Date());
            nuevaFecha.setDate(nuevaFecha.getDate() + 7);

            prestamo.renovaciones += 1;
            prestamo.estado = 'renovado';
            prestamo.fecha_vencimiento = nuevaFecha.toISOString().split('T')[0];
            await prestamo.save();

            return res.json(prestamo);
        } catch (error) {
            console.error('LOAN RENEW ERROR', error);
            return res.status(500).json({ error: 'No se pudo renovar el préstamo' });
        }
    });

    app.delete('/loan/:id', async (req, res) => {
        if (!Prestamo) {
            return res.status(500).json({ error: 'Modelo Prestamo no disponible' });
        }

        try {
            const prestamo = await Prestamo.findByPk(req.params.id);
            if (!prestamo) {
                return res.status(404).json({ error: 'Préstamo no encontrado' });
            }

            await prestamo.destroy();
            return res.json({ message: 'Préstamo eliminado correctamente' });
        } catch (error) {
            console.error('LOAN DELETE ERROR', error);
            return res.status(500).json({ error: 'No se pudo eliminar el préstamo' });
        }
    });
};