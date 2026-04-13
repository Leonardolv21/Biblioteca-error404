const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loan.controller');
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

router.get('/', authenticate, authorize('administrador', 'bibliotecario'), loanController.listarPrestamos);
router.get('/overdue', authenticate, authorize('administrador', 'bibliotecario'), loanController.listarPrestamosVencidos);
router.get('/usuario/:usuarioId', authenticate, authorizeOrOwn, loanController.listarPrestamosPorUsuario);
router.get('/multas/usuario/:usuarioId', authenticate, authorizeOrOwn, loanController.listarMultasPorUsuario);
router.get('/notifications', authenticate, authorize('administrador', 'bibliotecario'), loanController.notificarVencimientosYRetrasos);
router.get('/:id', authenticate, authorize('administrador', 'bibliotecario'), loanController.obtenerPrestamo);
router.post('/', authenticate, authorize('administrador', 'bibliotecario'), loanController.crearPrestamo);
router.put('/:id', authenticate, authorize('administrador', 'bibliotecario'), loanController.actualizarPrestamo);
router.post('/:id/renew', authenticate, authorize('administrador', 'bibliotecario'), loanController.renovarPrestamo);
router.delete('/:id', authenticate, authorize('administrador', 'bibliotecario'), loanController.eliminarPrestamo);

module.exports = router;
