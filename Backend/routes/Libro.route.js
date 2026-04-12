const express          = require('express');
const router           = express.Router();
const libroController  = require('../controllers/libro.controller');
const upload = require('../middlewares/multer');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/',      authenticate, authorize('administrador', 'bibliotecario', 'estudiante'), libroController.getLibros);
router.get('/:id',   authenticate, authorize('administrador', 'bibliotecario', 'estudiante'), libroController.getLibroPorId);
router.post('/', authenticate, authorize('administrador', 'bibliotecario'), upload.single('imagen'), libroController.crearLibro);
router.put('/:id', authenticate, authorize('administrador', 'bibliotecario'), upload.single('imagen'), libroController.actualizarLibro);
router.delete('/:id', authenticate, authorize('administrador', 'bibliotecario'), libroController.eliminarLibro);

module.exports = router;