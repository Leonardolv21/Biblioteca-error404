const Ejemplar = require('../models/Ejemplar');
const Libro = require('../models/Libro');
const Prestamo = require('../models/Prestamo');
const { Op } = require('sequelize');
const { createAudit } = require('../utils/audit');

const crearEjemplar = async (req, res) => {
  const { libro_id, notas } = req.body;
  try {
    const libro = await Libro.findByPk(libro_id);
    if (!libro) return res.status(404).json({ error: 'Libro no encontrado' });

    const total = await Ejemplar.count({ where: { libro_id } });
    const codigo = `${libro.isbn}-${total + 1}`;

    const ejemplar = await Ejemplar.create({ libro_id, codigo, notas });

    await createAudit({
      req,
      accion: 'crear_ejemplar',
      entidad: 'ejemplar',
      entidad_id: ejemplar.id,
      detalle: { ejemplar: ejemplar.toJSON() },
    });

    res.status(201).json(ejemplar);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear ejemplar', details: err.message });
  }
};

const cambiarEstado = async (req, res) => {
  const { id } = req.params;
  const { estado, notas } = req.body;

  const estadosValidos = ['disponible', 'prestado', 'reservado', 'mantenimiento'];
  if (estado && !estadosValidos.includes(estado)) {
    return res.status(400).json({ error: `Estado inválido. Usa: ${estadosValidos.join(', ')}` });
  }

  if (!estado && notas === undefined) {
    return res.status(400).json({ error: 'Debes enviar al menos estado o notas' });
  }

  try {
    const ejemplar = await Ejemplar.findByPk(id);
    if (!ejemplar) return res.status(404).json({ error: 'Ejemplar no encontrado' });

    const antes = ejemplar.toJSON();

    const cambios = {};
    if (estado) cambios.estado = estado;
    if (notas !== undefined) cambios.notas = notas;

    await ejemplar.update(cambios);

    await createAudit({
      req,
      accion: 'actualizar_ejemplar',
      entidad: 'ejemplar',
      entidad_id: ejemplar.id,
      detalle: { antes, despues: ejemplar.toJSON() },
    });

    res.json({ message: 'Ejemplar actualizado', ejemplar });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar ejemplar', details: err.message });
  }
};

const getEjemplaresPorLibro = async (req, res) => {
  const { libro_id } = req.params;
  try {
    const ejemplares = await Ejemplar.findAll({
      where: { libro_id },
      order: [['id', 'ASC']],
    });

    const ejemplarIds = ejemplares.map((e) => e.id);
    const prestamosActivos = ejemplarIds.length
      ? await Prestamo.findAll({
        where: {
          ejemplar_id: { [Op.in]: ejemplarIds },
          estado: ['activo', 'renovado'],
        },
        order: [['updatedAt', 'DESC']],
      })
      : [];

    const vencimientoPorEjemplar = new Map();
    prestamosActivos.forEach((p) => {
      if (!vencimientoPorEjemplar.has(p.ejemplar_id)) {
        vencimientoPorEjemplar.set(p.ejemplar_id, p.fecha_vencimiento);
      }
    });

    const response = ejemplares.map((e) => ({
      ...e.toJSON(),
      fecha_devolucion_estimada: vencimientoPorEjemplar.get(e.id) || null,
    }));

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener ejemplares' });
  }
};

const eliminarEjemplar = async (req, res) => {
  const { id } = req.params;
  try {
    const ejemplar = await Ejemplar.findByPk(id);
    if (!ejemplar) return res.status(404).json({ error: 'Ejemplar no encontrado' });

    const antes = ejemplar.toJSON();

    if (ejemplar.estado !== 'disponible') {
      return res.status(400).json({ error: 'Solo se pueden eliminar ejemplares disponibles' });
    }

    await ejemplar.destroy();

    await createAudit({
      req,
      accion: 'eliminar_ejemplar',
      entidad: 'ejemplar',
      entidad_id: antes.id,
      detalle: { antes },
    });

    res.json({ message: 'Ejemplar eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar ejemplar', details: err.message });
  }
};

module.exports = {
  crearEjemplar,
  cambiarEstado,
  getEjemplaresPorLibro,
  eliminarEjemplar,
};
