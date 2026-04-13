const { Reserva, Usuario, Libro, Ejemplar, Prestamo } = require('../models');
const { createAudit } = require('../utils/audit');

const listarReservas = async (req, res) => {
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
};

const listarReservasPendientes = async (req, res) => {
    try {
        const reservas = await Reserva.findAll({
            where: { estado: 'pendiente' },
            include: [
                { model: Usuario, as: 'usuario' },
                { model: Libro, as: 'libro' },
            ],
        });
        return res.json(reservas);
    } catch (error) {
        console.error('RESERVATION PENDING LIST ERROR', error);
        return res.status(500).json({ error: 'No se pudieron obtener las reservas pendientes' });
    }
};

const listarReservasPorUsuario = async (req, res) => {
    try {
        const reservas = await Reserva.findAll({
            where: { usuario_id: req.params.usuarioId },
            include: [
                { model: Libro, as: 'libro' },
                { model: Ejemplar, as: 'ejemplar' },
            ],
        });
        return res.json(reservas);
    } catch (error) {
        console.error('RESERVATION USER LIST ERROR', error);
        return res.status(500).json({ error: 'No se pudieron obtener las reservas del usuario' });
    }
};

const obtenerReserva = async (req, res) => {
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
};

const crearReserva = async (req, res) => {
    const { libro_id, usuario_id, fecha_reserva, fecha_expiracion, estado, ejemplar_id, notificado, solicitar_prestamo } = req.body;
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

        const activeLoans = await Prestamo.count({
            where: {
                usuario_id,
                estado: ['activo', 'renovado'],
            },
        });

        if (activeLoans >= usuario.max_prestamos) {
            return res.status(400).json({ error: 'El usuario alcanzó el máximo de préstamos activos' });
        }

        const ejemplaresDisponibles = await Ejemplar.count({
            where: { libro_id, estado: 'disponible' },
        });

        if (ejemplaresDisponibles > 0 && !solicitar_prestamo) {
            return res.status(400).json({ error: 'El libro tiene ejemplares disponibles; no es necesario reservarlo' });
        }

        const ejemplaresTotales = await Ejemplar.count({ where: { libro_id } });
        if (ejemplaresTotales === 0) {
            return res.status(400).json({ error: 'No hay ejemplares registrados para este libro' });
        }

        const reservaExistente = await Reserva.count({
            where: {
                libro_id,
                usuario_id,
                estado: ['pendiente', 'disponible'],
            },
        });

        if (reservaExistente > 0) {
            return res.status(400).json({ error: 'Ya existe una reserva activa para este libro por este usuario' });
        }

        const datosReserva = {
            libro_id,
            usuario_id,
            fecha_reserva: fecha_reserva || new Date(),
            fecha_expiracion,
            estado: estado || 'pendiente',
            ejemplar_id,
            notificado: notificado ?? false,
        };

        if (ejemplaresDisponibles > 0 && solicitar_prestamo) {
            const ejemplarDisponible = await Ejemplar.findOne({
                where: { libro_id, estado: 'disponible' },
                order: [['id', 'ASC']],
            });

            if (!ejemplarDisponible) {
                return res.status(400).json({ error: 'No se encontró un ejemplar disponible para generar la solicitud' });
            }

            const expiracion = new Date();
            expiracion.setDate(expiracion.getDate() + 2);

            datosReserva.estado = 'disponible';
            datosReserva.ejemplar_id = ejemplarDisponible.id;
            datosReserva.fecha_expiracion = fecha_expiracion || expiracion;
            datosReserva.notificado = true;

            const ejemplarAntes = ejemplarDisponible.toJSON();
            await ejemplarDisponible.update({ estado: 'reservado' });

            await createAudit({
                req,
                accion: 'reservar_ejemplar_desde_solicitud',
                entidad: 'ejemplar',
                entidad_id: ejemplarDisponible.id,
                detalle: { antes: ejemplarAntes, despues: ejemplarDisponible.toJSON() },
            });
        }

        const reserva = await Reserva.create(datosReserva);

        await createAudit({
            req,
            accion: solicitar_prestamo ? 'solicitar_prestamo_online' : 'crear_reserva',
            entidad: 'reserva',
            entidad_id: reserva.id,
            detalle: { reserva: reserva.toJSON() },
        });

        return res.status(201).json(reserva);
    } catch (error) {
        console.error('RESERVATION CREATE ERROR', error);
        return res.status(500).json({ error: 'No se pudo crear la reserva' });
    }
};

const actualizarReserva = async (req, res) => {
    try {
        const reserva = await Reserva.findByPk(req.params.id);
        if (!reserva) {
            return res.status(404).json({ error: 'Reserva no encontrada' });
        }

        const reservaAntes = reserva.toJSON();

        const role = req.user.rol.nombre;
        if (role === 'estudiante') {
            if (reserva.usuario_id !== req.user.id) {
                return res.status(403).json({ error: 'No puedes modificar reservas de otro usuario' });
            }
            if (req.body.estado !== 'cancelada') {
                return res.status(403).json({ error: 'Solo puedes cancelar tu reserva' });
            }
        }

        const { fecha_expiracion, estado, ejemplar_id, notificado } = req.body;
        const datosActualizar = {};

        if (fecha_expiracion !== undefined) datosActualizar.fecha_expiracion = fecha_expiracion;
        if (estado !== undefined) datosActualizar.estado = estado;
        if (ejemplar_id !== undefined) datosActualizar.ejemplar_id = ejemplar_id;
        if (notificado !== undefined) datosActualizar.notificado = notificado;

        await reserva.update(datosActualizar);

        if (estado === 'disponible' && ejemplar_id) {
            const ejemplar = await Ejemplar.findByPk(ejemplar_id);
            if (ejemplar) {
                const ejemplarAntes = ejemplar.toJSON();
                await ejemplar.update({ estado: 'reservado' });
                await createAudit({
                    req,
                    accion: 'reservar_ejemplar',
                    entidad: 'ejemplar',
                    entidad_id: ejemplar.id,
                    detalle: { antes: ejemplarAntes, despues: ejemplar.toJSON() },
                });
            }
        }

        if (estado === 'completada') {
            if (!reserva.ejemplar_id) {
                return res.status(400).json({ error: 'La reserva no tiene ejemplar asignado para completar el préstamo' });
            }

            const ejemplar = await Ejemplar.findByPk(reserva.ejemplar_id);
            if (!ejemplar) {
                return res.status(404).json({ error: 'Ejemplar no encontrado para completar la reserva' });
            }

            const usuario = await Usuario.findByPk(reserva.usuario_id);
            if (!usuario) {
                return res.status(404).json({ error: 'Usuario no encontrado para completar la reserva' });
            }

            const activeLoans = await Prestamo.count({
                where: {
                    usuario_id: reserva.usuario_id,
                    estado: ['activo', 'renovado'],
                },
            });

            if (activeLoans >= usuario.max_prestamos) {
                return res.status(400).json({ error: 'El usuario alcanzó el máximo de préstamos activos' });
            }

            const existePrestamoActivo = await Prestamo.count({
                where: {
                    ejemplar_id: reserva.ejemplar_id,
                    estado: ['activo', 'renovado'],
                },
            });

            if (existePrestamoActivo > 0) {
                return res.status(400).json({ error: 'El ejemplar ya tiene un préstamo activo' });
            }

            const ejemplarAntes = ejemplar.toJSON();
            await ejemplar.update({ estado: 'prestado' });

            const fechaInicio = new Date();
            const fechaVencimiento = new Date();
            fechaVencimiento.setDate(fechaVencimiento.getDate() + 14);

            const nuevoPrestamo = await Prestamo.create({
                usuario_id: reserva.usuario_id,
                ejemplar_id: reserva.ejemplar_id,
                bibliotecario_id: req.user?.rol?.nombre === 'bibliotecario' || req.user?.rol?.nombre === 'administrador'
                    ? req.user.id
                    : null,
                fecha_inicio: fechaInicio.toISOString().split('T')[0],
                fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0],
                estado: 'activo',
                renovaciones: 0,
            });

            await createAudit({
                req,
                accion: 'completar_reserva',
                entidad: 'reserva',
                entidad_id: reserva.id,
                detalle: { antes: reservaAntes, despues: reserva.toJSON() },
            });

            await createAudit({
                req,
                accion: 'crear_prestamo_desde_reserva',
                entidad: 'prestamo',
                entidad_id: nuevoPrestamo.id,
                detalle: { prestamo: nuevoPrestamo.toJSON() },
            });

            await createAudit({
                req,
                accion: 'actualizar_ejemplar',
                entidad: 'ejemplar',
                entidad_id: ejemplar.id,
                detalle: { antes: ejemplarAntes, despues: ejemplar.toJSON() },
            });
        }

        if (estado === 'cancelada' && reserva.ejemplar_id) {
            const ejemplar = await Ejemplar.findByPk(reserva.ejemplar_id);
            if (ejemplar && ejemplar.estado === 'reservado') {
                const ejemplarAntes = ejemplar.toJSON();
                await ejemplar.update({ estado: 'disponible' });
                await createAudit({
                    req,
                    accion: 'liberar_ejemplar_reserva_cancelada',
                    entidad: 'ejemplar',
                    entidad_id: ejemplar.id,
                    detalle: { antes: ejemplarAntes, despues: ejemplar.toJSON() },
                });
            }
        }

        await createAudit({
            req,
            accion: 'actualizar_reserva',
            entidad: 'reserva',
            entidad_id: reserva.id,
            detalle: { antes: reservaAntes, despues: reserva.toJSON() },
        });

        return res.json(reserva);
    } catch (error) {
        console.error('RESERVATION UPDATE ERROR', error);
        return res.status(500).json({ error: 'No se pudo actualizar la reserva' });
    }
};

const eliminarReserva = async (req, res) => {
    try {
        const reserva = await Reserva.findByPk(req.params.id);
        if (!reserva) {
            return res.status(404).json({ error: 'Reserva no encontrada' });
        }

        const reservaAntes = reserva.toJSON();

        if (reserva.ejemplar_id) {
            const ejemplar = await Ejemplar.findByPk(reserva.ejemplar_id);
            if (ejemplar && ejemplar.estado === 'reservado') {
                const ejemplarAntes = ejemplar.toJSON();
                await ejemplar.update({ estado: 'disponible' });
                await createAudit({
                    req,
                    accion: 'liberar_ejemplar_reserva_eliminada',
                    entidad: 'ejemplar',
                    entidad_id: ejemplar.id,
                    detalle: { antes: ejemplarAntes, despues: ejemplar.toJSON() },
                });
            }
        }

        await reserva.destroy();

        await createAudit({
            req,
            accion: 'eliminar_reserva',
            entidad: 'reserva',
            entidad_id: reservaAntes.id,
            detalle: { antes: reservaAntes },
        });

        return res.json({ message: 'Reserva eliminada correctamente' });
    } catch (error) {
        console.error('RESERVATION DELETE ERROR', error);
        return res.status(500).json({ error: 'No se pudo eliminar la reserva' });
    }
};

module.exports = {
    listarReservas,
    listarReservasPendientes,
    listarReservasPorUsuario,
    obtenerReserva,
    crearReserva,
    actualizarReserva,
    eliminarReserva,
};
