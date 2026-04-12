const express          = require('express');
const router           = express.Router();
const libroController  = require('../controllers/libro.controller');
const upload = require('../middlewares/multer');

router.get('/',      libroController.getLibros);
router.get('/:id',   libroController.getLibroPorId);
router.post('/', upload.single('imagen'), libroController.crearLibro);
router.put('/:id', upload.single('imagen'), libroController.actualizarLibro);
router.delete('/:id', libroController.eliminarLibro);

module.exports = router;