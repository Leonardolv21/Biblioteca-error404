const express = require('express');

module.exports = (app, db) => {
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    const { Usuario, Libro, Ejemplar, Prestamo, Reserva, Multa, Rol, Categoria, Auditoria } = db || {};

    app.get('/admin', async (req, res) => {
        if (!Usuario || !Libro || !Ejemplar || !Prestamo || !Reserva || !Multa) {
            return res.status(500).json({ error: 'Modelos de base de datos no disponibles' });
        }

        try {
            const [usuarios, libros, ejemplares, prestamosActivos, reservasPendientes, multasPendientes] = await Promise.all([
                Usuario.count(),
                Libro.count(),
                Ejemplar.count(),
                Prestamo.count({ where: { estado: ['activo', 'renovado'] } }),
                Reserva.count({ where: { estado: 'pendiente' } }),
                Multa.count({ where: { estado: 'pendiente' } }),
            ]);

            return res.json({
                usuarios,
                libros,
                ejemplares,
                prestamosActivos,
                reservasPendientes,
                multasPendientes,
            });
        } catch (error) {
            console.error('ADMIN SUMMARY ERROR', error);
            return res.status(500).json({ error: 'No se pudo obtener el resumen administrativo' });
        }
    });

    app.get('/admin/summary', async (req, res) => {
        if (!Usuario || !Libro || !Ejemplar || !Prestamo || !Reserva || !Multa) {
            return res.status(500).json({ error: 'Modelos de base de datos no disponibles' });
        }

        try {
            const [usuarios, libros, ejemplares, prestamosActivos, reservasPendientes, multasPendientes] = await Promise.all([
                Usuario.count(),
                Libro.count(),
                Ejemplar.count(),
                Prestamo.count({ where: { estado: ['activo', 'renovado'] } }),
                Reserva.count({ where: { estado: 'pendiente' } }),
                Multa.count({ where: { estado: 'pendiente' } }),
            ]);

            return res.json({
                usuarios,
                libros,
                ejemplares,
                prestamosActivos,
                reservasPendientes,
                multasPendientes,
            });
        } catch (error) {
            console.error('ADMIN SUMMARY ERROR', error);
            return res.status(500).json({ error: 'No se pudo obtener el resumen administrativo' });
        }
    });

    app.get('/admin/roles', async (req, res) => {
        if (!Rol) {
            return res.status(500).json({ error: 'Modelo Rol no disponible' });
        }

        try {
            const roles = await Rol.findAll();
            return res.json(roles);
        } catch (error) {
            console.error('ADMIN ROLES ERROR', error);
            return res.status(500).json({ error: 'No se pudieron obtener los roles' });
        }
    });

    app.post('/admin/role', async (req, res) => {
        if (!Rol) {
            return res.status(500).json({ error: 'Modelo Rol no disponible' });
        }

        const { nombre, descripcion } = req.body;
        if (!nombre) {
            return res.status(400).json({ error: 'El nombre del rol es requerido' });
        }

        try {
            const nuevoRol = await Rol.create({ nombre, descripcion });
            return res.status(201).json(nuevoRol);
        } catch (error) {
            console.error('ADMIN CREATE ROLE ERROR', error);
            return res.status(500).json({ error: 'No se pudo crear el rol' });
        }
    });

    app.get('/admin/categories', async (req, res) => {
        if (!Categoria) {
            return res.status(500).json({ error: 'Modelo Categoria no disponible' });
        }

        try {
            const categorias = await Categoria.findAll();
            return res.json(categorias);
        } catch (error) {
            console.error('ADMIN CATEGORIES ERROR', error);
            return res.status(500).json({ error: 'No se pudieron obtener las categorías' });
        }
    });

    app.post('/admin/category', async (req, res) => {
        if (!Categoria) {
            return res.status(500).json({ error: 'Modelo Categoria no disponible' });
        }

        const { nombre, descripcion } = req.body;
        if (!nombre) {
            return res.status(400).json({ error: 'El nombre de la categoría es requerido' });
        }

        try {
            const categoria = await Categoria.create({ nombre, descripcion });
            return res.status(201).json(categoria);
        } catch (error) {
            console.error('ADMIN CREATE CATEGORY ERROR', error);
            return res.status(500).json({ error: 'No se pudo crear la categoría' });
        }
    });

    app.get('/admin/auditoria', async (req, res) => {
        if (!Auditoria) {
            return res.status(500).json({ error: 'Modelo Auditoria no disponible' });
        }

        try {
            const filtros = {};
            if (req.query.usuario_id) {
                filtros.usuario_id = req.query.usuario_id;
            }

            const auditorias = await Auditoria.findAll({ where: filtros });
            return res.json(auditorias);
        } catch (error) {
            console.error('ADMIN AUDIT ERROR', error);
            return res.status(500).json({ error: 'No se pudo obtener la auditoría' });
        }
    });
};