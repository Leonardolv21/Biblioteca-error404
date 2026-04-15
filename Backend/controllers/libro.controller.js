const Libro = require('../models/Libro');
const Categoria = require('../models/Categoria');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const Ejemplar = require('../models/Ejemplar');

const getLibros = async (req, res) => {
  try {
    const { titulo, autor, categoria_id, isbn, q, keyword, categoria } = req.query;
    const where = {};
    const orConditions = [];

    if (titulo) where.titulo = { [Op.like]: `%${titulo}%` };
    if (autor) where.autor = { [Op.like]: `%${autor}%` };
    if (categoria_id) where.categoria_id = categoria_id;
    if (isbn) where.isbn = { [Op.like]: `%${isbn}%` };

    if (q) {
      orConditions.push(
        { titulo: { [Op.like]: `%${q}%` } },
        { autor: { [Op.like]: `%${q}%` } },
        { isbn: { [Op.like]: `%${q}%` } },
        { descripcion: { [Op.like]: `%${q}%` } },
        { palabras_clave: { [Op.like]: `%${q}%` } },
      );
    }

    if (keyword) {
      orConditions.push(
        { descripcion: { [Op.like]: `%${keyword}%` } },
        { palabras_clave: { [Op.like]: `%${keyword}%` } },
        { titulo: { [Op.like]: `%${keyword}%` } },
        { autor: { [Op.like]: `%${keyword}%` } },
      );
    }

    if (orConditions.length) {
      where[Op.and] = [
        ...(where[Op.and] || []),
        { [Op.or]: orConditions },
      ];
    }

    const categoriaInclude = { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] };
    if (categoria) {
      categoriaInclude.where = { nombre: { [Op.like]: `%${categoria}%` } };
    }

    const libros = await Libro.findAll({
      where,
      include: [
        categoriaInclude,
        { model: Ejemplar, as: 'copias', attributes: ['id', 'codigo', 'estado'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json(libros);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener libros' });
  }
};

const getLibroPorId = async (req, res) => {
  const { id } = req.params;
  try {
    const libro = await Libro.findByPk(id, {
      include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] }],
    });

    if (!libro) return res.status(404).json({ error: 'Libro no encontrado' });

    res.json(libro);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener libro' });
  }
};

const crearLibro = async (req, res) => {
  const { titulo, autor, editorial, isbn, anio, categoria_id, descripcion, palabras_clave, ejemplares } = req.body;
  try {
    const imagen_url = req.file ? req.file.filename : null;

    const libro = await Libro.create({
      titulo, autor, editorial, isbn, anio,
      categoria_id, descripcion, palabras_clave, imagen_url, ejemplares,
    });

    res.status(201).json(libro);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear libro', details: err.message });
  }
};

const actualizarLibro = async (req, res) => {
  const { id } = req.params;
  try {
    const libro = await Libro.findByPk(id);
    if (!libro) return res.status(404).json({ error: 'Libro no encontrado' });

    if (req.file) {
      if (libro.imagen_url) {
        const rutaAnterior = path.join('Media/uploads', libro.imagen_url);
        if (fs.existsSync(rutaAnterior)) fs.unlinkSync(rutaAnterior);
      }

      const ext = path.extname(req.file.filename);
      const nuevoNombre = `${libro.isbn}${ext}`;
      const rutaActual = path.join('Media/uploads', req.file.filename);
      const rutaNueva = path.join('Media/uploads', nuevoNombre);

      fs.renameSync(rutaActual, rutaNueva);
      req.body.imagen_url = nuevoNombre;
    }

    await libro.update(req.body);

    res.json({ message: 'Libro actualizado correctamente', libro });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar libro', details: err.message });
  }
};

const eliminarLibro = async (req, res) => {
  const { id } = req.params;
  try {
    const libro = await Libro.findByPk(id);
    if (!libro) return res.status(404).json({ error: 'Libro no encontrado' });

    if (libro.imagen_url) {
      const rutaImagen = path.join('Media/uploads', libro.imagen_url);
      if (fs.existsSync(rutaImagen)) {
        fs.unlinkSync(rutaImagen);
      }
    }
    await libro.destroy();

    res.json({ message: 'Libro eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar libro', details: err.message });
  }
};

module.exports = {
  getLibros,
  getLibroPorId,
  crearLibro,
  actualizarLibro,
  eliminarLibro,
};
