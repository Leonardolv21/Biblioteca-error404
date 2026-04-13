const { Auditoria } = require('../models');

const createAudit = async ({ req, accion, entidad, entidad_id, detalle }) => {
    const usuario_id = req.user?.id ?? null;

    return Auditoria.create({
        usuario_id,
        accion,
        entidad,
        entidad_id,
        detalle,
    });
};

module.exports = {
    createAudit,
};
