const { Op } = require('sequelize');
const { Prestamo, Ejemplar, Usuario, Libro, Reserva, Notificacion, Multa } = require('../models');
const { createAudit } = require('../utils/audit');

const DAILY_FINE_AMOUNT = 2.5;

const listarPrestamos = async (req, res) => {
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
};

const obtenerPrestamo = async (req, res) => {
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
};

const asignarSiguienteReserva = async (req, ejemplar) => {
    const reserva = await Reserva.findOne({
        where: { libro_id: ejemplar.libro_id, estado: 'pendiente' },
        order: [['fecha_reserva', 'ASC']],
    });

    if (!reserva) {
        return null;
    }

    const fechaExpiracion = new Date();
    fechaExpiracion.setDate(fechaExpiracion.getDate() + 3);

    const reservaAntes = reserva.toJSON();
    await reserva.update({
        estado: 'disponible',
        ejemplar_id: ejemplar.id,
        fecha_expiracion: fechaExpiracion,
    });
    await createAudit({
        req,
        accion: 'asignar_reserva',
        entidad: 'reserva',
        entidad_id: reserva.id,
        detalle: { antes: reservaAntes, despues: reserva.toJSON() },
    });

    const ejemplarAntes = ejemplar.toJSON();
    await ejemplar.update({ estado: 'reservado' });
    await createAudit({
        req,
        accion: 'reservar_ejemplar',
        entidad: 'ejemplar',
        entidad_id: ejemplar.id,
        detalle: { antes: ejemplarAntes, despues: ejemplar.toJSON() },
    });

    await Notificacion.create({
        usuario_id: reserva.usuario_id,
        tipo: 'reserva_disponible',
        mensaje: `Tu reserva está disponible hasta el ${fechaExpiracion.toISOString().split('T')[0]}.`,
        referencia_id: reserva.id,
        referencia_tipo: 'reserva',
    });

    return reserva;
};

const listarPrestamosPorUsuario = async (req, res) => {
    try {
        const prestamos = await Prestamo.findAll({
            where: { usuario_id: req.params.usuarioId },
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
        console.error('LOAN USER LIST ERROR', error);
        return res.status(500).json({ error: 'No se pudieron obtener los préstamos del usuario' });
    }
};

const listarPrestamosVencidos = async (req, res) => {
    try {
        const hoy = new Date().toISOString().split('T')[0];
        const prestamos = await Prestamo.findAll({
            where: {
                fecha_vencimiento: { [Op.lt]: hoy },
                estado: ['activo', 'renovado'],
            },
            include: [
                {
                    model: Ejemplar,
                    as: 'ejemplar',
                    include: [{ model: Libro, as: 'libro' }],
                },
                { model: Usuario, as: 'usuario' },
            ],
        });
        return res.json(prestamos);
    } catch (error) {
        console.error('LOAN OVERDUE LIST ERROR', error);
        return res.status(500).json({ error: 'No se pudieron obtener los préstamos vencidos' });
    }
};

const listarMultasPorUsuario = async (req, res) => {
    try {
        const multas = await Multa.findAll({
            where: { usuario_id: req.params.usuarioId },
            order: [['createdAt', 'DESC']],
        });
        return res.json(multas);
    } catch (error) {
        console.error('FINE LIST ERROR', error);
        return res.status(500).json({ error: 'No se pudieron obtener las multas del usuario' });
    }
};

const notificarVencimientosYRetrasos = async (req, res) => {
    try {
        const hoy = new Date().toISOString().split('T')[0];
        const proximos = new Date();
        proximos.setDate(proximos.getDate() + 2);
        const fechaProxima = proximos.toISOString().split('T')[0];

        const prestamos = await Prestamo.findAll({
            where: { estado: ['activo', 'renovado'] },
        });

        const notificacionesCreadas = [];

        for (const prestamo of prestamos) {
            const fechaVencimiento = prestamo.fecha_vencimiento;
            const existeVencimiento = fechaVencimiento <= fechaProxima && fechaVencimiento >= hoy;
            const estaVencido = fechaVencimiento < hoy;

            if (existeVencimiento) {
                const [notificacion] = await Notificacion.findOrCreate({
                    where: {
                        usuario_id: prestamo.usuario_id,
                        tipo: 'vencimiento_proximo',
                        referencia_id: prestamo.id,
                        referencia_tipo: 'prestamo',
                    },
                    defaults: {
                        mensaje: `Tu préstamo vence el ${fechaVencimiento}.`,
                        leida: false,
                    },
                });
                notificacionesCreadas.push(notificacion);
            }

            if (estaVencido) {
                const [notificacion] = await Notificacion.findOrCreate({
                    where: {
                        usuario_id: prestamo.usuario_id,
                        tipo: 'multa_pendiente',
                        referencia_id: prestamo.id,
                        referencia_tipo: 'prestamo',
                    },
                    defaults: {
                        mensaje: `Tu préstamo está vencido desde el ${fechaVencimiento}. Por favor devuélvelo lo antes posible.`,
                        leida: false,
                    },
                });
                notificacionesCreadas.push(notificacion);
            }
        }

        return res.json({
            message: 'Notificaciones de vencimiento/retraso procesadas',
            cantidad: notificacionesCreadas.length,
            notificaciones: notificacionesCreadas,
        });
    } catch (error) {
        console.error('LOAN NOTIFICATION ERROR', error);
        return res.status(500).json({ error: 'No se pudieron crear las notificaciones' });
    }
};

const crearPrestamo = async (req, res) => {
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
        const ejemplar = await Ejemplar.findByPk(ejemplar_id, {
            include: [{ model: Libro, as: 'libro' }],
        });
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

        const reservaUsuario = await Reserva.findOne({
            where: {
                libro_id: ejemplar.libro_id,
                usuario_id,
                estado: ['pendiente', 'disponible'],
            },
        });

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
        await createAudit({
            req,
            accion: 'crear_prestamo',
            entidad: 'prestamo',
            entidad_id: nuevoPrestamo.id,
            detalle: { prestamo: nuevoPrestamo.toJSON(), ejemplar: ejemplar.toJSON() },
        });

        if (reservaUsuario) {
            const reservaAntes = reservaUsuario.toJSON();
            await reservaUsuario.update({ estado: 'completada', ejemplar_id: ejemplar.id });
            await createAudit({
                req,
                accion: 'completar_reserva',
                entidad: 'reserva',
                entidad_id: reservaUsuario.id,
                detalle: { antes: reservaAntes, despues: reservaUsuario.toJSON() },
            });
        }

        return res.status(201).json(nuevoPrestamo);
    } catch (error) {
        console.error('LOAN CREATE ERROR', error);
        return res.status(500).json({ error: 'No se pudo crear el préstamo' });
    }
};

const crearMultaPorRetraso = async (prestamo, fechaDevolucion) => {
    const fechaVencimiento = new Date(prestamo.fecha_vencimiento);
    const fechaDev = new Date(fechaDevolucion);
    const difMs = fechaDev - fechaVencimiento;
    const diasRetraso = Math.max(0, Math.ceil(difMs / (1000 * 60 * 60 * 24)));

    if (diasRetraso <= 0) {
        return null;
    }

    const monto = parseFloat((diasRetraso * DAILY_FINE_AMOUNT).toFixed(2));

    const [multa] = await Multa.findOrCreate({
        where: { prestamo_id: prestamo.id },
        defaults: {
            prestamo_id: prestamo.id,
            usuario_id: prestamo.usuario_id,
            dias_retraso: diasRetraso,
            monto,
            estado: 'pendiente',
        },
    });

    if (!multa.isNewRecord) {
        await multa.update({ dias_retraso: diasRetraso, monto, estado: 'pendiente' });
    }

    return multa;
};

const actualizarPrestamo = async (req, res) => {
    try {
        const prestamo = await Prestamo.findByPk(req.params.id);
        if (!prestamo) {
            return res.status(404).json({ error: 'Préstamo no encontrado' });
        }

        const prestamoAntes = prestamo.toJSON();
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

        let fechaDevolucionFinal;
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
                fechaDevolucionFinal = fecha_devolucion
                    ? fecha_devolucion
                    : new Date().toISOString().split('T')[0];
                datosActualizar.fecha_devolucion = fechaDevolucionFinal;
            } else {
                datosActualizar.estado = estado;
            }
        }

        await prestamo.update(datosActualizar);
        await createAudit({
            req,
            accion: 'actualizar_prestamo',
            entidad: 'prestamo',
            entidad_id: prestamo.id,
            detalle: { antes: prestamoAntes, despues: prestamo.toJSON() },
        });

        if (estado === 'devuelto') {
            const ejemplar = await Ejemplar.findByPk(prestamo.ejemplar_id);
            if (ejemplar) {
                await ejemplar.update({ estado: 'disponible' });
                await asignarSiguienteReserva(req, ejemplar);
            }

            await Notificacion.create({
                usuario_id: prestamo.usuario_id,
                tipo: 'devolucion_confirmada',
                mensaje: `El préstamo #${prestamo.id} ha sido marcado como devuelto.`,
                referencia_id: prestamo.id,
                referencia_tipo: 'prestamo',
            });

            const fechaParaMulta = fechaDevolucionFinal || prestamo.fecha_devolucion || new Date().toISOString().split('T')[0];
            const multa = await crearMultaPorRetraso(prestamo, fechaParaMulta);
            if (multa) {
                return res.json({ prestamo, multa });
            }
        }

        return res.json(prestamo);
    } catch (error) {
        console.error('LOAN UPDATE ERROR', error);
        return res.status(500).json({ error: 'No se pudo actualizar el préstamo' });
    }
};

const renovarPrestamo = async (req, res) => {
    try {
        const prestamo = await Prestamo.findByPk(req.params.id, {
            include: [{ model: Ejemplar, as: 'ejemplar' }],
        });
        if (!prestamo) {
            return res.status(404).json({ error: 'Préstamo no encontrado' });
        }

        const prestamoAntes = prestamo.toJSON();

        if (prestamo.estado === 'devuelto') {
            return res.status(400).json({ error: 'No se puede renovar un préstamo devuelto' });
        }

        if (prestamo.renovaciones >= 2) {
            return res.status(400).json({ error: 'Se alcanzó el límite de renovaciones' });
        }

        const ejemplar = await Ejemplar.findByPk(prestamo.ejemplar_id);
        if (!ejemplar) {
            return res.status(400).json({ error: 'Ejemplar del préstamo no encontrado' });
        }

        const reservasPendientes = await Reserva.count({
            where: {
                libro_id: ejemplar.libro_id,
                estado: ['pendiente', 'disponible'],
            },
        });

        if (reservasPendientes > 0) {
            return res.status(400).json({ error: 'No se puede renovar el préstamo porque existe una reserva pendiente para el libro' });
        }

        const nuevaFecha = new Date(prestamo.fecha_vencimiento || new Date());
        nuevaFecha.setDate(nuevaFecha.getDate() + 7);

        prestamo.renovaciones += 1;
        prestamo.estado = 'renovado';
        prestamo.fecha_vencimiento = nuevaFecha.toISOString().split('T')[0];
        await prestamo.save();
        await createAudit({
            req,
            accion: 'renovar_prestamo',
            entidad: 'prestamo',
            entidad_id: prestamo.id,
            detalle: { antes: prestamoAntes, despues: prestamo.toJSON() },
        });

        return res.json(prestamo);
    } catch (error) {
        console.error('LOAN RENEW ERROR', error);
        return res.status(500).json({ error: 'No se pudo renovar el préstamo' });
    }
};

const eliminarPrestamo = async (req, res) => {
    try {
        const prestamo = await Prestamo.findByPk(req.params.id);
        if (!prestamo) {
            return res.status(404).json({ error: 'Préstamo no encontrado' });
        }

        const prestamoAntes = prestamo.toJSON();
        if (prestamo.estado !== 'devuelto') {
            const ejemplar = await Ejemplar.findByPk(prestamo.ejemplar_id);
            if (ejemplar) {
                await ejemplar.update({ estado: 'disponible' });
            }
        }

        await prestamo.destroy();
        await createAudit({
            req,
            accion: 'eliminar_prestamo',
            entidad: 'prestamo',
            entidad_id: prestamoAntes.id,
            detalle: { antes: prestamoAntes },
        });
        return res.json({ message: 'Préstamo eliminado correctamente' });
    } catch (error) {
        console.error('LOAN DELETE ERROR', error);
        return res.status(500).json({ error: 'No se pudo eliminar el préstamo' });
    }
};

module.exports = {
    listarPrestamos,
    obtenerPrestamo,
    listarPrestamosPorUsuario,
    listarPrestamosVencidos,
    listarMultasPorUsuario,
    notificarVencimientosYRetrasos,
    crearPrestamo,
    actualizarPrestamo,
    renovarPrestamo,
    eliminarPrestamo,
};