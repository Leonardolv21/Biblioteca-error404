
// --- Mocks de dependencias externas ---
jest.mock('sequelize', () => {
  const actual = jest.requireActual('sequelize');
  return { ...actual, Op: actual.Op };
});

jest.mock('../../../utils/audit', () => ({ createAudit: jest.fn() }));

jest.mock('../../../models/Ejemplar', () => ({
  findByPk: jest.fn(),
  findAll: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../../../models/Libro', () => ({
  findByPk: jest.fn(),
}));

jest.mock('../../../models/Prestamo', () => ({
  findAll: jest.fn(),
}));

const Ejemplar = require('../../../models/Ejemplar');
const Libro = require('../../../models/Libro');
const Prestamo = require('../../../models/Prestamo');

const {
  crearEjemplar,
  cambiarEstado,
  getEjemplaresPorLibro,
  eliminarEjemplar,
} = require('../../../controllers/Ejemplar.controller');

// Helper: res estandar
const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Mock de un ejemplar de BD con metodos de instancia
const makeEjemplarInstance = (overrides = {}) => ({
  id: 1, libro_id: 10, codigo: 'ISBN01-1', estado: 'disponible', notas: null,
  toJSON: jest.fn().mockReturnValue({ id: 1, libro_id: 10, codigo: 'ISBN01-1', estado: 'disponible', notas: null }),
  update: jest.fn().mockResolvedValue(true),
  destroy: jest.fn().mockResolvedValue(true),
  ...overrides,
});

describe('Ejemplar.controller unit tests', () => {
  beforeEach(() => { jest.resetAllMocks(); });

  // ===========================================================================
  // BLOQUE A - crearEjemplar
  // Responsabilidad: crear un ejemplar para un libro, auto-generando el codigo
  //                 como {isbn}-{correlativo}; registra auditoria
  // ===========================================================================
  describe('crearEjemplar', () => {

    // -------------------------------------------------------------------------
    // TEST A1 - Libro no encontrado: retorna 404
    // -------------------------------------------------------------------------
    test('A1: retorna 404 si el libro no existe', async () => {
      // ARRANGE
      const req = { params: { libro_id: '99' }, body: {} };
      const res = createMockRes();
      Libro.findByPk.mockResolvedValue(null);

      // ACT
      await crearEjemplar(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Libro no encontrado' });
    });

    // -------------------------------------------------------------------------
    // TEST A2 - Happy path: crea el ejemplar con codigo auto-generado y responde 201
    // -------------------------------------------------------------------------
    test('A2: crea el ejemplar y responde 201 con el objeto creado', async () => {
      // ARRANGE
      const libroMock = { id: 10, isbn: 'ISBN01' };
      const ejemplarCreado = makeEjemplarInstance({ codigo: 'ISBN01-4' });
      const req = { params: { libro_id: '10' }, body: { notas: 'nuevo' }, user: { id: 1 } };
      const res = createMockRes();
      Libro.findByPk.mockResolvedValue(libroMock);
      Ejemplar.count.mockResolvedValue(3);         // total existentes = 3 → codigo sera isbn-4
      Ejemplar.create.mockResolvedValue(ejemplarCreado);

      // ACT
      await crearEjemplar(req, res);

      // ASSERT
      expect(Ejemplar.create).toHaveBeenCalledWith({ libro_id: '10', codigo: 'ISBN01-4', notas: 'nuevo' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(ejemplarCreado);
    });

    // -------------------------------------------------------------------------
    // TEST A3 - Error: retorna 500 si falla la BD
    // -------------------------------------------------------------------------
    test('A3: retorna 500 si falla la BD', async () => {
      // ARRANGE
      const req = { params: { libro_id: '10' }, body: {} };
      const res = createMockRes();
      Libro.findByPk.mockRejectedValue(new Error('db error'));

      // ACT
      await crearEjemplar(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al crear ejemplar', details: 'db error' });
    });
  });

  // ===========================================================================
  // BLOQUE B - cambiarEstado
  // Responsabilidad: actualizar el estado y/o notas de un ejemplar;
  //                 valida estados validos y que se envie al menos un campo
  // ===========================================================================
  describe('cambiarEstado', () => {

    // -------------------------------------------------------------------------
    // TEST B1 - Validacion: retorna 400 si el estado no es valido
    // -------------------------------------------------------------------------
    test('B1: retorna 400 si el estado enviado no es valido', async () => {
      // ARRANGE
      const req = { params: { id: '1' }, body: { estado: 'destruido' } };
      const res = createMockRes();

      // ACT
      await cambiarEstado(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('Estado inv\u00e1lido') })
      );
    });

    // -------------------------------------------------------------------------
    // TEST B2 - Validacion: retorna 400 si no se envia estado ni notas
    // -------------------------------------------------------------------------
    test('B2: retorna 400 si no se envia estado ni notas', async () => {
      // ARRANGE
      const req = { params: { id: '1' }, body: {} };
      const res = createMockRes();

      // ACT
      await cambiarEstado(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Debes enviar al menos estado o notas' });
    });

    // -------------------------------------------------------------------------
    // TEST B3 - Ejemplar no encontrado: retorna 404
    // -------------------------------------------------------------------------
    test('B3: retorna 404 si el ejemplar no existe', async () => {
      // ARRANGE
      const req = { params: { id: '99' }, body: { estado: 'disponible' } };
      const res = createMockRes();
      Ejemplar.findByPk.mockResolvedValue(null);

      // ACT
      await cambiarEstado(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Ejemplar no encontrado' });
    });

    // -------------------------------------------------------------------------
    // TEST B4 - Happy path: actualiza estado y responde con mensaje de exito
    // -------------------------------------------------------------------------
    test('B4: actualiza el ejemplar y responde con mensaje de exito', async () => {
      // ARRANGE
      const ejemplarMock = makeEjemplarInstance();
      const req = { params: { id: '1' }, body: { estado: 'mantenimiento' }, user: { id: 1 } };
      const res = createMockRes();
      Ejemplar.findByPk.mockResolvedValue(ejemplarMock);

      // ACT
      await cambiarEstado(req, res);

      // ASSERT
      expect(ejemplarMock.update).toHaveBeenCalledWith({ estado: 'mantenimiento' });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Ejemplar actualizado' })
      );
    });

    // -------------------------------------------------------------------------
    // TEST B5 - Error: retorna 500 si falla la BD
    // -------------------------------------------------------------------------
    test('B5: retorna 500 si falla la BD', async () => {
      // ARRANGE
      const req = { params: { id: '1' }, body: { estado: 'disponible' } };
      const res = createMockRes();
      Ejemplar.findByPk.mockRejectedValue(new Error('db error'));

      // ACT
      await cambiarEstado(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al actualizar ejemplar', details: 'db error' });
    });
  });

  // ===========================================================================
  // BLOQUE C - getEjemplaresPorLibro
  // Responsabilidad: retornar todos los ejemplares de un libro, enriquecidos
  //                 con la fecha estimada de devolucion segun prestamos activos
  // ===========================================================================
  describe('getEjemplaresPorLibro', () => {

    // -------------------------------------------------------------------------
    // TEST C1 - Happy path con prestamo activo: incluye fecha_devolucion_estimada
    // -------------------------------------------------------------------------
    test('C1: retorna ejemplares con fecha estimada si hay prestamo activo', async () => {
      // ARRANGE
      const req = { params: { libro_id: '10' } };
      const res = createMockRes();
      const ejemplarJson = { id: 1, libro_id: 10, codigo: 'ISBN01-1', estado: 'prestado' };
      const ejemplarMock = { ...ejemplarJson, toJSON: jest.fn().mockReturnValue(ejemplarJson) };
      Ejemplar.findAll.mockResolvedValue([ejemplarMock]);
      Prestamo.findAll.mockResolvedValue([
        { ejemplar_id: 1, fecha_vencimiento: '2026-05-01' },
      ]);

      // ACT
      await getEjemplaresPorLibro(req, res);

      // ASSERT
      expect(res.json).toHaveBeenCalledWith([
        { ...ejemplarJson, fecha_devolucion_estimada: '2026-05-01' },
      ]);
    });

    // -------------------------------------------------------------------------
    // TEST C2 - Sin prestamos activos: fecha_devolucion_estimada es null
    // -------------------------------------------------------------------------
    test('C2: fecha_devolucion_estimada es null si no hay prestamos activos', async () => {
      // ARRANGE
      const req = { params: { libro_id: '10' } };
      const res = createMockRes();
      const ejemplarJson = { id: 2, libro_id: 10, codigo: 'ISBN01-2', estado: 'disponible' };
      const ejemplarMock = { ...ejemplarJson, toJSON: jest.fn().mockReturnValue(ejemplarJson) };
      Ejemplar.findAll.mockResolvedValue([ejemplarMock]);
      Prestamo.findAll.mockResolvedValue([]);

      // ACT
      await getEjemplaresPorLibro(req, res);

      // ASSERT
      expect(res.json).toHaveBeenCalledWith([
        { ...ejemplarJson, fecha_devolucion_estimada: null },
      ]);
    });

    // -------------------------------------------------------------------------
    // TEST C3 - Sin ejemplares: no consulta prestamos y retorna array vacio
    // -------------------------------------------------------------------------
    test('C3: retorna array vacio si el libro no tiene ejemplares', async () => {
      // ARRANGE
      const req = { params: { libro_id: '10' } };
      const res = createMockRes();
      Ejemplar.findAll.mockResolvedValue([]);

      // ACT
      await getEjemplaresPorLibro(req, res);

      // ASSERT
      expect(Prestamo.findAll).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([]);
    });

    // -------------------------------------------------------------------------
    // TEST C4 - Error: retorna 500 si falla la BD
    // -------------------------------------------------------------------------
    test('C4: retorna 500 si falla la consulta', async () => {
      // ARRANGE
      const req = { params: { libro_id: '10' } };
      const res = createMockRes();
      Ejemplar.findAll.mockRejectedValue(new Error('db error'));

      // ACT
      await getEjemplaresPorLibro(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al obtener ejemplares' });
    });
  });

  // ===========================================================================
  // BLOQUE D - eliminarEjemplar
  // Responsabilidad: eliminar un ejemplar solo si esta en estado 'disponible';
  //                 registra auditoria al completarse
  // ===========================================================================
  describe('eliminarEjemplar', () => {

    // -------------------------------------------------------------------------
    // TEST D1 - Ejemplar no encontrado: retorna 404
    // -------------------------------------------------------------------------
    test('D1: retorna 404 si el ejemplar no existe', async () => {
      // ARRANGE
      const req = { params: { id: '99' } };
      const res = createMockRes();
      Ejemplar.findByPk.mockResolvedValue(null);

      // ACT
      await eliminarEjemplar(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Ejemplar no encontrado' });
    });

    // -------------------------------------------------------------------------
    // TEST D2 - Regla de negocio: retorna 400 si el ejemplar no esta disponible
    // -------------------------------------------------------------------------
    test('D2: retorna 400 si el ejemplar no esta en estado disponible', async () => {
      // ARRANGE
      const ejemplarMock = makeEjemplarInstance({ estado: 'prestado' });
      ejemplarMock.toJSON = jest.fn().mockReturnValue({ id: 1, estado: 'prestado' });
      const req = { params: { id: '1' } };
      const res = createMockRes();
      Ejemplar.findByPk.mockResolvedValue(ejemplarMock);

      // ACT
      await eliminarEjemplar(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Solo se pueden eliminar ejemplares disponibles' });
    });

    // -------------------------------------------------------------------------
    // TEST D3 - Happy path: elimina el ejemplar y responde con mensaje de exito
    // -------------------------------------------------------------------------
    test('D3: elimina el ejemplar disponible y responde con mensaje de exito', async () => {
      // ARRANGE
      const ejemplarMock = makeEjemplarInstance({ estado: 'disponible' });
      const req = { params: { id: '1' }, user: { id: 1 } };
      const res = createMockRes();
      Ejemplar.findByPk.mockResolvedValue(ejemplarMock);

      // ACT
      await eliminarEjemplar(req, res);

      // ASSERT
      expect(ejemplarMock.destroy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Ejemplar eliminado correctamente' });
    });

    // -------------------------------------------------------------------------
    // TEST D4 - Error: retorna 500 si falla la BD
    // -------------------------------------------------------------------------
    test('D4: retorna 500 si falla la BD', async () => {
      // ARRANGE
      const req = { params: { id: '1' } };
      const res = createMockRes();
      Ejemplar.findByPk.mockRejectedValue(new Error('db error'));

      // ACT
      await eliminarEjemplar(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al eliminar ejemplar', details: 'db error' });
    });
  });
});
