const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/', authenticate, authorize('administrador'), adminController.obtenerResumenAdmin);
router.get('/summary', authenticate, authorize('administrador', 'bibliotecario'), adminController.obtenerResumenAdminSummary);
router.get('/roles', authenticate, authorize('administrador'), adminController.listarRoles);
router.post('/role', authenticate, authorize('administrador'), adminController.crearRol);
router.get('/categories', authenticate, authorize('administrador', 'bibliotecario'), adminController.listarCategorias);
router.post('/category', authenticate, authorize('administrador', 'bibliotecario'), adminController.crearCategoria);
router.get('/reportes', authenticate, authorize('administrador'), adminController.obtenerReportes);
router.get('/reportes/export/pdf', authenticate, authorize('administrador'), adminController.exportReportesPdf);
router.get('/reportes/export/excel', authenticate, authorize('administrador'), adminController.exportReportesExcel);
router.get('/usuarios-mas-prestamos', authenticate, authorize('administrador'), adminController.obtenerUsuariosMasPrestamos);
router.get('/usuarios-mas-prestamos/export', authenticate, authorize('administrador'), adminController.exportUsuariosMasPrestamos);
router.get('/usuarios-mas-prestamos/export/pdf', authenticate, authorize('administrador'), adminController.exportUsuariosMasPrestamosPdf);
router.get('/usuarios-mas-prestamos/export/excel', authenticate, authorize('administrador'), adminController.exportUsuariosMasPrestamosExcel);
router.get('/libros-mas-prestados', authenticate, authorize('administrador'), adminController.obtenerLibrosMasPrestados);
router.get('/auditoria', authenticate, authorize('administrador'), adminController.obtenerAuditoria);

module.exports = router;
