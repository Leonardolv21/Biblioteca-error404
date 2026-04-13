const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
const { QueryTypes } = require('sequelize');
const { Usuario, Libro, Ejemplar, Prestamo, Reserva, Multa, Rol, Categoria, Auditoria, sequelize } = require('../models');

const todayString = () => new Date().toISOString().split('T')[0];

const formatLoanRow = (prestamo) => ({
    prestamo_id: prestamo.id,
    usuario: `${prestamo.usuario?.nombre || ''} ${prestamo.usuario?.apellido || ''}`.trim(),
    correo: prestamo.usuario?.correo || '',
    matricula: prestamo.usuario?.matricula || '',
    libro: prestamo.ejemplar?.libro?.titulo || '',
    ejemplar_codigo: prestamo.ejemplar?.codigo || '',
    fecha_inicio: prestamo.fecha_inicio,
    fecha_vencimiento: prestamo.fecha_vencimiento,
    fecha_devolucion: prestamo.fecha_devolucion,
    estado: prestamo.estado,
});

const getTopUsersReport = async () => {
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

    return usuarios.map((registro) => ({
        usuario_id: registro.usuario_id,
        nombre: registro.usuario?.nombre,
        apellido: registro.usuario?.apellido,
        correo: registro.usuario?.correo,
        matricula: registro.usuario?.matricula,
        cant_prestamos: parseInt(registro.get('cant_prestamos'), 10),
    }));
};

const getTopBooksReport = async () => {
    const libros = await sequelize.query(
        `
        SELECT
            l.id AS libro_id,
            l.titulo,
            l.autor,
            COUNT(p.id) AS cant_prestamos
        FROM prestamos p
        INNER JOIN ejemplares e ON e.id = p.ejemplar_id
        INNER JOIN libros l ON l.id = e.libro_id
        GROUP BY l.id, l.titulo, l.autor
        ORDER BY cant_prestamos DESC
        `,
        { type: QueryTypes.SELECT }
    );

    return libros.map((libro) => ({
        libro_id: libro.libro_id,
        titulo: libro.titulo,
        autor: libro.autor,
        cant_prestamos: parseInt(libro.cant_prestamos, 10),
    }));
};

const getLoansByStatusReport = async () => {
    const prestamos = await Prestamo.findAll({
        include: [
            {
                model: Ejemplar,
                as: 'ejemplar',
                include: [{ model: Libro, as: 'libro', attributes: ['id', 'titulo'] }],
                attributes: ['id', 'codigo'],
            },
            { model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'apellido', 'correo', 'matricula'] },
        ],
        order: [['fecha_vencimiento', 'ASC']],
    });

    const activos = [];
    const vencidos = [];
    const devueltos = [];
    const hoy = todayString();

    prestamos.forEach((prestamo) => {
        const row = formatLoanRow(prestamo);
        const fechaVencimiento = String(prestamo.fecha_vencimiento || '');

        if (prestamo.estado === 'devuelto') {
            devueltos.push(row);
            return;
        }

        if (prestamo.estado === 'vencido' || (fechaVencimiento && fechaVencimiento < hoy)) {
            vencidos.push(row);
            return;
        }

        activos.push(row);
    });

    return {
        resumen: {
            activos: activos.length,
            vencidos: vencidos.length,
            devueltos: devueltos.length,
            total: prestamos.length,
        },
        activos,
        vencidos,
        devueltos,
    };
};

const getAllReports = async () => {
    const [prestamos, usuarios, libros] = await Promise.all([
        getLoansByStatusReport(),
        getTopUsersReport(),
        getTopBooksReport(),
    ]);

    return { prestamos, usuarios, libros };
};

const addPdfTableSection = (doc, title, columns, rows, maxRows = 30) => {
    const safe = (value, limit = 26) => {
        if (value === null || value === undefined) return '';
        const text = String(value);
        return text.length > limit ? `${text.slice(0, limit - 3)}...` : text;
    };

    if (doc.y > 700) doc.addPage();

    doc.moveDown();
    doc.fontSize(13).text(title, { underline: true });
    doc.moveDown(0.4);
    doc.font('Helvetica-Bold').fontSize(9).text(columns.join(' | '));
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(9);

    const limitedRows = rows.slice(0, maxRows);
    limitedRows.forEach((row) => {
        if (doc.y > 760) doc.addPage();
        doc.text(row.map((value) => safe(value)).join(' | '));
    });

    if (rows.length > maxRows) {
        doc.moveDown(0.3);
        doc.fontSize(8).fillColor('gray').text(`Mostrando ${maxRows} de ${rows.length} filas.`).fillColor('black');
    }
};

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
        const resultado = await getTopUsersReport();
        return res.json(resultado);
    } catch (error) {
        console.error('ADMIN TOP USERS ERROR', error);
        return res.status(500).json({ error: 'No se pudo obtener el ranking de usuarios con más préstamos' });
    }
};

const exportUsuariosMasPrestamos = async (req, res) => {
    try {
        const usuarios = await getTopUsersReport();

        const rows = [
            ['Usuario ID', 'Nombre', 'Apellido', 'Correo', 'Matrícula', 'Préstamos']
        ];

        usuarios.forEach((registro) => {
            rows.push([
                registro.usuario_id,
                registro.nombre || '',
                registro.apellido || '',
                registro.correo || '',
                registro.matricula || '',
                registro.cant_prestamos,
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
        const usuarios = await getTopUsersReport();

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
            doc.text(registro.nombre || '', 90, doc.y, { continued: true, width: 120 });
            doc.text(registro.apellido || '', 210, doc.y, { continued: true, width: 120 });
            doc.text(registro.correo || '', 330, doc.y, { continued: true, width: 150 });
            doc.text(registro.matricula || '', 480, doc.y, { continued: true, width: 80 });
            doc.text(String(registro.cant_prestamos), 560, doc.y);
            doc.moveDown();
        });

        doc.pipe(res);
        doc.end();
    } catch (error) {
        console.error('ADMIN EXPORT PDF TOP USERS ERROR', error);
        return res.status(500).json({ error: 'No se pudo exportar el ranking de usuarios con más préstamos en PDF' });
    }
};

const exportUsuariosMasPrestamosExcel = async (req, res) => {
    try {
        const usuarios = await getTopUsersReport();

        const workbook = XLSX.utils.book_new();
        const sheet = XLSX.utils.json_to_sheet(
            usuarios.map((u) => ({
                usuario_id: u.usuario_id,
                nombre: u.nombre,
                apellido: u.apellido,
                correo: u.correo,
                matricula: u.matricula,
                total_prestamos: u.cant_prestamos,
            }))
        );

        XLSX.utils.book_append_sheet(workbook, sheet, 'UsuariosActivos');

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="usuarios-mas-prestamos.xlsx"');
        return res.send(buffer);
    } catch (error) {
        console.error('ADMIN EXPORT EXCEL TOP USERS ERROR', error);
        return res.status(500).json({ error: 'No se pudo exportar el ranking de usuarios con más préstamos en Excel' });
    }
};

const obtenerLibrosMasPrestados = async (req, res) => {
    try {
        const resultado = await getTopBooksReport();
        return res.json(resultado);
    } catch (error) {
        console.error('ADMIN TOP BOOKS ERROR', error);
        return res.status(500).json({ error: 'No se pudo obtener el ranking de libros con más préstamos' });
    }
};

const obtenerReportes = async (req, res) => {
    try {
        const reportes = await getAllReports();
        return res.json(reportes);
    } catch (error) {
        console.error('ADMIN REPORTS ERROR', error);
        return res.status(500).json({ error: 'No se pudieron generar los reportes administrativos' });
    }
};

const exportReportesExcel = async (req, res) => {
    try {
        const reportes = await getAllReports();
        const workbook = XLSX.utils.book_new();

        const resumenSheet = XLSX.utils.json_to_sheet([
            { estado: 'activos', cantidad: reportes.prestamos.resumen.activos },
            { estado: 'vencidos', cantidad: reportes.prestamos.resumen.vencidos },
            { estado: 'devueltos', cantidad: reportes.prestamos.resumen.devueltos },
            { estado: 'total', cantidad: reportes.prestamos.resumen.total },
        ]);

        const usuariosSheet = XLSX.utils.json_to_sheet(
            reportes.usuarios.map((u) => ({
                usuario_id: u.usuario_id,
                nombre: u.nombre,
                apellido: u.apellido,
                correo: u.correo,
                matricula: u.matricula,
                total_prestamos: u.cant_prestamos,
            }))
        );

        const librosSheet = XLSX.utils.json_to_sheet(
            reportes.libros.map((l) => ({
                libro_id: l.libro_id,
                titulo: l.titulo,
                autor: l.autor,
                total_prestamos: l.cant_prestamos,
            }))
        );

        const activosSheet = XLSX.utils.json_to_sheet(reportes.prestamos.activos);
        const vencidosSheet = XLSX.utils.json_to_sheet(reportes.prestamos.vencidos);
        const devueltosSheet = XLSX.utils.json_to_sheet(reportes.prestamos.devueltos);

        XLSX.utils.book_append_sheet(workbook, resumenSheet, 'ResumenPrestamos');
        XLSX.utils.book_append_sheet(workbook, usuariosSheet, 'UsuariosActivos');
        XLSX.utils.book_append_sheet(workbook, librosSheet, 'LibrosMasPrestados');
        XLSX.utils.book_append_sheet(workbook, activosSheet, 'PrestamosActivos');
        XLSX.utils.book_append_sheet(workbook, vencidosSheet, 'PrestamosVencidos');
        XLSX.utils.book_append_sheet(workbook, devueltosSheet, 'PrestamosDevueltos');

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="reportes-biblioteca.xlsx"');
        return res.send(buffer);
    } catch (error) {
        console.error('ADMIN REPORTS EXPORT EXCEL ERROR', error);
        return res.status(500).json({ error: 'No se pudieron exportar los reportes en Excel' });
    }
};

const exportReportesPdf = async (req, res) => {
    try {
        const reportes = await getAllReports();

        const doc = new PDFDocument({ size: 'A4', margin: 36 });
        const filename = 'reportes-biblioteca.pdf';

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        doc.fontSize(18).text('Reportes de Biblioteca', { align: 'center' });
        doc.moveDown(0.4);
        doc.fontSize(10).text(`Fecha de generación: ${new Date().toLocaleString('es-MX')}`, { align: 'center' });
        doc.moveDown();

        doc.fontSize(12).text('Resumen de préstamos por estado');
        doc.moveDown(0.3);
        doc.fontSize(10).text(`Activos: ${reportes.prestamos.resumen.activos}`);
        doc.text(`Vencidos: ${reportes.prestamos.resumen.vencidos}`);
        doc.text(`Devueltos: ${reportes.prestamos.resumen.devueltos}`);
        doc.text(`Total: ${reportes.prestamos.resumen.total}`);

        addPdfTableSection(
            doc,
            'Usuarios más activos (más préstamos)',
            ['ID', 'Nombre', 'Correo', 'Matrícula', 'Préstamos'],
            reportes.usuarios.map((u) => [u.usuario_id, `${u.nombre || ''} ${u.apellido || ''}`.trim(), u.correo, u.matricula, u.cant_prestamos]),
            35
        );

        addPdfTableSection(
            doc,
            'Libros más prestados',
            ['ID', 'Título', 'Autor', 'Préstamos'],
            reportes.libros.map((l) => [l.libro_id, l.titulo, l.autor, l.cant_prestamos]),
            35
        );

        addPdfTableSection(
            doc,
            'Préstamos activos',
            ['ID', 'Usuario', 'Libro', 'Vencimiento', 'Estado'],
            reportes.prestamos.activos.map((p) => [p.prestamo_id, p.usuario, p.libro, p.fecha_vencimiento, p.estado]),
            30
        );

        addPdfTableSection(
            doc,
            'Préstamos vencidos',
            ['ID', 'Usuario', 'Libro', 'Vencimiento', 'Estado'],
            reportes.prestamos.vencidos.map((p) => [p.prestamo_id, p.usuario, p.libro, p.fecha_vencimiento, p.estado]),
            30
        );

        addPdfTableSection(
            doc,
            'Préstamos devueltos',
            ['ID', 'Usuario', 'Libro', 'Devolución', 'Estado'],
            reportes.prestamos.devueltos.map((p) => [p.prestamo_id, p.usuario, p.libro, p.fecha_devolucion || '-', p.estado]),
            30
        );

        doc.pipe(res);
        doc.end();
    } catch (error) {
        console.error('ADMIN REPORTS EXPORT PDF ERROR', error);
        return res.status(500).json({ error: 'No se pudieron exportar los reportes en PDF' });
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
    obtenerReportes,
    obtenerUsuariosMasPrestamos,
    obtenerLibrosMasPrestados,
    exportUsuariosMasPrestamos,
    exportUsuariosMasPrestamosPdf,
    exportUsuariosMasPrestamosExcel,
    exportReportesPdf,
    exportReportesExcel,
    obtenerAuditoria,
};
