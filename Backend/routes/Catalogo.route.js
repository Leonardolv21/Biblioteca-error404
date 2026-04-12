const express          = require('express');
const router           = express.Router();
const catalogoController  = require('../controllers/catalogo.controller');

router.get('/mas-solicitados', catalogoController.getMasSolicitados);

module.exports = router;