const { Reserva, Usuario, Libro, Ejemplar } = require('../models');

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

        const ejemplaresDisponibles = await Ejemplar.count({
            where: { libro_id, estado: 'disponible' },
        });

        if (ejemplaresDisponibles > 0) {
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
};

const actualizarReserva = async (req, res) => {
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

        if (estado === 'disponible' && ejemplar_id) {
            const ejemplar = await Ejemplar.findByPk(ejemplar_id);
            if (ejemplar) {
                await ejemplar.update({ estado: 'reservado' });
            }
        }

        if (['cancelada', 'completada'].includes(estado) && reserva.ejemplar_id) {
            const ejemplar = await Ejemplar.findByPk(reserva.ejemplar_id);
            if (ejemplar && ejemplar.estado === 'reservado') {
                await ejemplar.update({ estado: 'disponible' });
            }
        }

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

        if (reserva.ejemplar_id) {
            const ejemplar = await Ejemplar.findByPk(reserva.ejemplar_id);
            if (ejemplar && ejemplar.estado === 'reservado') {
                await ejemplar.update({ estado: 'disponible' });
            }
        }

        await reserva.destroy();
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