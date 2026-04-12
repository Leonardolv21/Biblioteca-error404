const { Auditoria } = require('../models');

const createAudit = async ({ req, accion, entidad, entidad_id, detalle }) => {
    const usuario_id = req.user?.id ?? null;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || null;

    return Auditoria.create({
        usuario_id,
        accion,
        entidad,
        entidad_id,
        detalle,
        ip,
    });
};

module.exports = {
    createAudit,
};