const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/', authenticate, authorize('administrador', 'bibliotecario'), userController.listarUsuarios);
router.get('/:id', authenticate, authorize('administrador', 'bibliotecario'), userController.obtenerUsuario);
router.post('/', authenticate, authorize('administrador', 'bibliotecario'), userController.crearUsuario);
router.put('/:id', authenticate, authorize('administrador', 'bibliotecario'), userController.actualizarUsuario);
router.delete('/:id', authenticate, authorize('administrador', 'bibliotecario'), userController.eliminarUsuario);

module.exports = router;