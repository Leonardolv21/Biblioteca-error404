const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservation.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const authorizeOrOwn = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const userRole = req.user.rol.nombre;
    const userId = req.params.usuarioId;

    if (userRole === 'administrador' || userRole === 'bibliotecario' || req.user.id == userId) {
        return next();
    }

    return res.status(403).json({ error: 'Acceso denegado' });
};

router.get('/', authenticate, authorize('administrador', 'bibliotecario'), reservationController.listarReservas);
router.get('/pendientes', authenticate, authorize('administrador', 'bibliotecario'), reservationController.listarReservasPendientes);
router.get('/usuario/:usuarioId', authenticate, authorizeOrOwn, reservationController.listarReservasPorUsuario);
router.get('/:id', authenticate, authorize('administrador', 'bibliotecario'), reservationController.obtenerReserva);
router.post('/', authenticate, authorize('administrador', 'bibliotecario', 'estudiante'), reservationController.crearReserva);
router.put('/:id', authenticate, authorize('administrador', 'bibliotecario', 'estudiante'), reservationController.actualizarReserva);
router.delete('/:id', authenticate, authorize('administrador', 'bibliotecario'), reservationController.eliminarReserva);

module.exports = router;
