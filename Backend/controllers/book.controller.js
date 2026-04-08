const express = require('express');

module.exports = (app, db) => {
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    const { Libro, Categoria, Ejemplar } = db || {};

    app.get('/book', async (req, res) => {
        if (!Libro) {
            return res.status(500).json({ error: 'Modelo Libro no disponible' });
        }

        try {
            const libros = await Libro.findAll({
                include: [{ model: Categoria, as: 'categoria' }],
            });
            return res.json(libros);
        } catch (error) {
            console.error('BOOK LIST ERROR', error);
            return res.status(500).json({ error: 'No se pudo obtener la lista de libros' });
        }
    });

    app.get('/book/:id', async (req, res) => {
        if (!Libro) {
            return res.status(500).json({ error: 'Modelo Libro no disponible' });
        }

        try {
            const libro = await Libro.findByPk(req.params.id, {
                include: [
                    { model: Categoria, as: 'categoria' },
                    { model: Ejemplar, as: 'ejemplares' },
                ],
            });

            if (!libro) {
                return res.status(404).json({ error: 'Libro no encontrado' });
            }

            return res.json(libro);
        } catch (error) {
            console.error('BOOK DETAIL ERROR', error);
            return res.status(500).json({ error: 'No se pudo obtener el libro' });
        }
    });

    app.post('/book', async (req, res) => {
        if (!Libro) {
            return res.status(500).json({ error: 'Modelo Libro no disponible' });
        }

        const {
            titulo,
            autor,
            editorial,
            isbn,
            anio,
            categoria_id,
            descripcion,
            imagen_url,
            palabras_clave,
        } = req.body;

        if (!titulo || !autor) {
            return res.status(400).json({ error: 'titulo y autor son requeridos' });
        }

        const keywords = Array.isArray(palabras_clave)
            ? palabras_clave
            : typeof palabras_clave === 'string'
                ? palabras_clave.split(',').map((item) => item.trim()).filter(Boolean)
                : [];

        try {
            const nuevoLibro = await Libro.create({
                titulo,
                autor,
                editorial,
                isbn,
                anio,
                categoria_id,
                descripcion,
                imagen_url,
                palabras_clave: keywords,
            });

            return res.status(201).json(nuevoLibro);
        } catch (error) {
            console.error('BOOK CREATE ERROR', error);
            return res.status(500).json({ error: 'No se pudo crear el libro' });
        }
    });

    app.put('/book/:id', async (req, res) => {
        if (!Libro) {
            return res.status(500).json({ error: 'Modelo Libro no disponible' });
        }

        try {
            const libro = await Libro.findByPk(req.params.id);
            if (!libro) {
                return res.status(404).json({ error: 'Libro no encontrado' });
            }

            const {
                titulo,
                autor,
                editorial,
                isbn,
                anio,
                categoria_id,
                descripcion,
                imagen_url,
                palabras_clave,
            } = req.body;

            const keywords = Array.isArray(palabras_clave)
                ? palabras_clave
                : typeof palabras_clave === 'string'
                    ? palabras_clave.split(',').map((item) => item.trim()).filter(Boolean)
                    : libro.palabras_clave;

            await libro.update({
                titulo: titulo ?? libro.titulo,
                autor: autor ?? libro.autor,
                editorial: editorial ?? libro.editorial,
                isbn: isbn ?? libro.isbn,
                anio: anio ?? libro.anio,
                categoria_id: categoria_id ?? libro.categoria_id,
                descripcion: descripcion ?? libro.descripcion,
                imagen_url: imagen_url ?? libro.imagen_url,
                palabras_clave: keywords,
            });

            return res.json(libro);
        } catch (error) {
            console.error('BOOK UPDATE ERROR', error);
            return res.status(500).json({ error: 'No se pudo actualizar el libro' });
        }
    });

    app.delete('/book/:id', async (req, res) => {
        if (!Libro) {
            return res.status(500).json({ error: 'Modelo Libro no disponible' });
        }

        try {
            const libro = await Libro.findByPk(req.params.id);
            if (!libro) {
                return res.status(404).json({ error: 'Libro no encontrado' });
            }

            await libro.destroy();
            return res.json({ message: 'Libro eliminado correctamente' });
        } catch (error) {
            console.error('BOOK DELETE ERROR', error);
            return res.status(500).json({ error: 'No se pudo eliminar el libro' });
        }
    });
};