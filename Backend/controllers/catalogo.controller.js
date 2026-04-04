const { sequelize } = require('../models');
const Libro      = require('../models/Libro');
const Categoria  = require('../models/Categoria');
const Ejemplar   = require('../models/Ejemplar');
const getMasSolicitados = async (req, res) => {
  try {
    const libros = await Libro.findAll({
      include: [
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
        { model: Ejemplar,  as: 'copias',    attributes: ['id', 'codigo', 'estado'] },
      ],
      order: [
        [sequelize.literal(`(
          SELECT COUNT(*) FROM ejemplares 
          WHERE ejemplares.libro_id = Libro.id 
          AND ejemplares.estado IN ('prestado', 'reservado')
        )`), 'DESC'],
      ],
    });

    res.json(libros);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener libros más solicitados', details: err.message });
  }
};

module.exports = {
  getMasSolicitados,
};