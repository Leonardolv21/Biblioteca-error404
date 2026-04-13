const express            = require('express');
const router             = express.Router();
const ejemplarController = require('../controllers/Ejemplar.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/libro/:libro_id',  ejemplarController.getEjemplaresPorLibro);
router.post('/',         authenticate, authorize('administrador', 'bibliotecario'),       ejemplarController.crearEjemplar);
router.put('/:id/estado', authenticate, authorize('administrador', 'bibliotecario'),      ejemplarController.cambiarEstado);
router.delete('/:id',   authenticate, authorize('administrador', 'bibliotecario'),        ejemplarController.eliminarEjemplar);

module.exports = router;
