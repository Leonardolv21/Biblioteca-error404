const PDFDocument = require('pdfkit');
const { Usuario, Libro, Ejemplar, Prestamo, Reserva, Multa, Rol, Categoria, Auditoria, sequelize } = require('../models');

const obtenerResumenAdmin = async (req, res) => {
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
};

const obtenerResumenAdminSummary = async (req, res) => {
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
};

const listarRoles = async (req, res) => {
    try {
        const roles = await Rol.findAll();
        return res.json(roles);
    } catch (error) {
        console.error('ADMIN ROLES ERROR', error);
        return res.status(500).json({ error: 'No se pudieron obtener los roles' });
    }
};

const crearRol = async (req, res) => {
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
};

const listarCategorias = async (req, res) => {
    try {
        const categorias = await Categoria.findAll();
        return res.json(categorias);
    } catch (error) {
        console.error('ADMIN CATEGORIES ERROR', error);
        return res.status(500).json({ error: 'No se pudieron obtener las categorías' });
    }
};

const crearCategoria = async (req, res) => {
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
};

const obtenerUsuariosMasPrestamos = async (req, res) => {
    try {
        const usuarios = await Prestamo.findAll({
            attributes: [
                'usuario_id',
                [sequelize.fn('COUNT', sequelize.col('Prestamo.id')), 'cant_prestamos'],
            ],
            include: [
                {
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['id', 'nombre', 'apellido', 'correo', 'matricula'],
                },
            ],
            group: ['usuario_id', 'usuario.id'],
            order: [[sequelize.literal('cant_prestamos'), 'DESC']],
        });

        const resultado = usuarios.map((registro) => ({
            usuario_id: registro.usuario_id,
            nombre: registro.usuario?.nombre,
            apellido: registro.usuario?.apellido,
            correo: registro.usuario?.correo,
            matricula: registro.usuario?.matricula,
            cant_prestamos: parseInt(registro.get('cant_prestamos'), 10),
        }));

        return res.json(resultado);
    } catch (error) {
        console.error('ADMIN TOP USERS ERROR', error);
        return res.status(500).json({ error: 'No se pudo obtener el ranking de usuarios con más préstamos' });
    }
};

const exportUsuariosMasPrestamos = async (req, res) => {
    try {
        const usuarios = await Prestamo.findAll({
            attributes: [
                'usuario_id',
                [sequelize.fn('COUNT', sequelize.col('Prestamo.id')), 'cant_prestamos'],
            ],
            include: [
                {
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['id', 'nombre', 'apellido', 'correo', 'matricula'],
                },
            ],
            group: ['usuario_id', 'usuario.id'],
            order: [[sequelize.literal('cant_prestamos'), 'DESC']],
        });

        const rows = [
            ['Usuario ID', 'Nombre', 'Apellido', 'Correo', 'Matrícula', 'Préstamos']
        ];

        usuarios.forEach((registro) => {
            rows.push([
                registro.usuario_id,
                registro.usuario?.nombre || '',
                registro.usuario?.apellido || '',
                registro.usuario?.correo || '',
                registro.usuario?.matricula || '',
                registro.get('cant_prestamos'),
            ]);
        });

        const csv = rows.map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(',')).join('\r\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="usuarios-mas-prestamos.csv"');
        return res.send(csv);
    } catch (error) {
        console.error('ADMIN EXPORT TOP USERS ERROR', error);
        return res.status(500).json({ error: 'No se pudo exportar el ranking de usuarios con más préstamos' });
    }
};

const exportUsuariosMasPrestamosPdf = async (req, res) => {
    try {
        const usuarios = await Prestamo.findAll({
            attributes: [
                'usuario_id',
                [sequelize.fn('COUNT', sequelize.col('Prestamo.id')), 'cant_prestamos'],
            ],
            include: [
                {
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['id', 'nombre', 'apellido', 'correo', 'matricula'],
                },
            ],
            group: ['usuario_id', 'usuario.id'],
            order: [[sequelize.literal('cant_prestamos'), 'DESC']],
        });

        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const filename = 'usuarios-mas-prestamos.pdf';

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        doc.fontSize(18).text('Usuarios con mayor número de préstamos', { align: 'center' });
        doc.moveDown();

        doc.fontSize(12);
        doc.text('ID', 40, doc.y, { continued: true, width: 50 });
        doc.text('Nombre', 90, doc.y, { continued: true, width: 120 });
        doc.text('Apellido', 210, doc.y, { continued: true, width: 120 });
        doc.text('Correo', 330, doc.y, { continued: true, width: 150 });
        doc.text('Matrícula', 480, doc.y, { continued: true, width: 80 });
        doc.text('Prestamos', 560, doc.y);
        doc.moveDown();

        usuarios.forEach((registro) => {
            doc.text(String(registro.usuario_id), 40, doc.y, { continued: true, width: 50 });
            doc.text(registro.usuario?.nombre || '', 90, doc.y, { continued: true, width: 120 });
            doc.text(registro.usuario?.apellido || '', 210, doc.y, { continued: true, width: 120 });
            doc.text(registro.usuario?.correo || '', 330, doc.y, { continued: true, width: 150 });
            doc.text(registro.usuario?.matricula || '', 480, doc.y, { continued: true, width: 80 });
            doc.text(String(registro.get('cant_prestamos')), 560, doc.y);
            doc.moveDown();
        });

        doc.pipe(res);
        doc.end();
    } catch (error) {
        console.error('ADMIN EXPORT PDF TOP USERS ERROR', error);
        return res.status(500).json({ error: 'No se pudo exportar el ranking de usuarios con más préstamos en PDF' });
    }
};

const obtenerAuditoria = async (req, res) => {
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
};

module.exports = {
    obtenerResumenAdmin,
    obtenerResumenAdminSummary,
    listarRoles,
    crearRol,
    listarCategorias,
    crearCategoria,
    obtenerUsuariosMasPrestamos,
    exportUsuariosMasPrestamos,
    exportUsuariosMasPrestamosPdf,
    obtenerAuditoria,
};