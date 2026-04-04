// controllers/ejemplar.controller.js
const Ejemplar = require('../models/Ejemplar');
const Libro    = require('../models/Libro');

const crearEjemplar = async (req, res) => {
  const { libro_id, notas } = req.body;
  try {
    const libro = await Libro.findByPk(libro_id);
    if (!libro) return res.status(404).json({ error: 'Libro no encontrado' });

    // Contar cuántos ejemplares ya existen para generar el ID secuencial
    const total  = await Ejemplar.count({ where: { libro_id } });
    const codigo = `${libro.isbn}-${total + 1}`;

    const ejemplar = await Ejemplar.create({ libro_id, codigo, notas });

    res.status(201).json(ejemplar);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear ejemplar', details: err.message });
  }
};

const cambiarEstado = async (req, res) => {
  const { id }           = req.params;
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

    const cambios = {};
    if (estado) cambios.estado = estado;
    if (notas !== undefined) cambios.notas = notas;

    await ejemplar.update(cambios);

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

    res.json(ejemplares);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener ejemplares' });
  }
};

const eliminarEjemplar = async (req, res) => {
  const { id } = req.params;
  try {
    const ejemplar = await Ejemplar.findByPk(id);
    if (!ejemplar) return res.status(404).json({ error: 'Ejemplar no encontrado' });

    if (ejemplar.estado !== 'disponible') {
      return res.status(400).json({ error: 'Solo se pueden eliminar ejemplares disponibles' });
    }

    await ejemplar.destroy();

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