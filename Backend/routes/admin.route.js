const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/', authenticate, authorize('administrador'), adminController.obtenerResumenAdmin);
router.get('/summary', authenticate, authorize('administrador'), adminController.obtenerResumenAdminSummary);
router.get('/roles', authenticate, authorize('administrador'), adminController.listarRoles);
router.post('/role', authenticate, authorize('administrador'), adminController.crearRol);
router.get('/categories', authenticate, authorize('administrador'), adminController.listarCategorias);
router.post('/category', authenticate, authorize('administrador'), adminController.crearCategoria);
router.get('/usuarios-mas-prestamos', authenticate, authorize('administrador'), adminController.obtenerUsuariosMasPrestamos);
router.get('/usuarios-mas-prestamos/export', authenticate, authorize('administrador'), adminController.exportUsuariosMasPrestamos);
router.get('/usuarios-mas-prestamos/export/pdf', authenticate, authorize('administrador'), adminController.exportUsuariosMasPrestamosPdf);
router.get('/auditoria', authenticate, authorize('administrador'), adminController.obtenerAuditoria);

module.exports = router;