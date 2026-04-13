const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');

const ensureLibroPalabrasClaveColumn = async () => {
    const columns = await sequelize.query("SHOW COLUMNS FROM libros LIKE 'palabras_clave'", {
        type: QueryTypes.SELECT,
    });

    if (columns.length > 0) {
        return false;
    }

    await sequelize.query('ALTER TABLE libros ADD COLUMN palabras_clave VARCHAR(500) NULL AFTER descripcion');
    return true;
};

const runDbMigrations = async () => {
    try {
        const added = await ensureLibroPalabrasClaveColumn();
        if (added) {
            console.log('Migracion aplicada: columna libros.palabras_clave creada');
        }
    } catch (error) {
        console.error('Error en migraciones de BD:', error.message);
    }
};

module.exports = {
    runDbMigrations,
};
