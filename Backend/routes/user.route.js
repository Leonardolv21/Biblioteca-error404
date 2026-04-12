const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/', authenticate, authorize('administrador', 'bibliotecario'), userController.listarUsuarios);
router.get('/:id', authenticate, authorize('administrador', 'bibliotecario'), userController.obtenerUsuario);
router.put('/:id', authenticate, userController.actualizarUsuario);
router.delete('/:id', authenticate, userController.eliminarUsuario);
router.put('/:id/hacer-admin',         authenticate, authorize('administrador'), userController.hacerAdmin);
router.put('/:id/hacer-bibliotecario', authenticate, authorize('administrador'), userController.hacerBibliotecario);

module.exports = router;