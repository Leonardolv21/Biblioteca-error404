const express            = require('express');
const router             = express.Router();
const ejemplarController = require('../controllers/Ejemplar.controller');

router.get('/libro/:libro_id',  ejemplarController.getEjemplaresPorLibro);
router.post('/',                ejemplarController.crearEjemplar);
router.put('/:id/estado',       ejemplarController.cambiarEstado);
router.delete('/:id',           ejemplarController.eliminarEjemplar);

module.exports = router;