// --- Mocks de dependencias externas ---
jest.mock('../../../models', () => ({
  Usuario: { count: jest.fn() },
  Libro: { count: jest.fn() },
  Ejemplar: { count: jest.fn() },
  Prestamo: { count: jest.fn(), findAll: jest.fn() },
  Reserva: { count: jest.fn() },
  Multa: { count: jest.fn() },
  Rol: { findAll: jest.fn(), create: jest.fn() },
  Categoria: { findAll: jest.fn(), create: jest.fn() },
  Auditoria: { findAll: jest.fn() },
  sequelize: {
    fn: jest.fn().mockReturnValue('fn_result'),
    col: jest.fn().mockReturnValue('col_result'),
    literal: jest.fn().mockReturnValue('literal_result'),
    query: jest.fn(),
  },
}));

jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => ({
    fontSize: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    moveDown: jest.fn().mockReturnThis(),
    addPage: jest.fn().mockReturnThis(),
    pipe: jest.fn(),
    end: jest.fn(),
    y: 100,
  }));
});

jest.mock('xlsx', () => ({
  utils: {
    book_new: jest.fn().mockReturnValue({}),
    json_to_sheet: jest.fn().mockReturnValue({}),
    book_append_sheet: jest.fn(),
  },
  write: jest.fn().mockReturnValue(Buffer.from('excel_data')),
}));

const {
  Usuario, Libro, Ejemplar, Prestamo, Reserva, Multa,
  Rol, Categoria, Auditoria, sequelize,
} = require('../../../models');

const {
  obtenerResumenAdmin,
  obtenerResumenAdminSummary,
  listarRoles,
  crearRol,
  listarCategorias,
  crearCategoria,
  obtenerUsuariosMasPrestamos,
  obtenerLibrosMasPrestados,
  obtenerReportes,
  exportUsuariosMasPrestamos,
  obtenerAuditoria,
} = require('../../../controllers/admin.controller');



// Helper: res con status/json (endpoints JSON)
const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  return res;
};

// Helper: res con setHeader/send ademas de status/json (endpoints de exportacion)
const createMockResExport = () => {
  const res = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  res.setHeader = jest.fn().mockReturnThis();
  res.send = jest.fn().mockReturnThis();
  return res;
};

// Mock reutilizable de un item de Prestamo.findAll para getTopUsersReport
const makePrestamoConUsuario = (usuarioId, cantPrestamos) => ({
  usuario_id: usuarioId,
  get: jest.fn().mockReturnValue(String(cantPrestamos)),
  usuario: { nombre: 'Ana', apellido: 'Lopez', correo: 'ana@test.com', matricula: 'MAT001' },
});

// Mock reutilizable de un item de Prestamo.findAll para getLoansByStatusReport
const makePrestamoActivo = (id) => ({
  id,
  estado: 'activo',
  fecha_vencimiento: '2030-12-31',
  fecha_inicio: '2026-01-01',
  fecha_devolucion: null,
  usuario: { nombre: 'Juan', apellido: 'Perez', correo: 'j@t.com', matricula: 'M01' },
  ejemplar: { codigo: 'E01', libro: { titulo: 'Libro Test' } },
});

const adminUser = { id: 1, rol: { nombre: 'administrador' } };

describe('admin.controller unit tests', () => {
  beforeEach(() => { jest.resetAllMocks(); });


  describe('obtenerResumenAdmin', () => {

    // -------------------------------------------------------------------------
    // TEST A1 - Happy path: retorna todos los conteos correctamente
    // -------------------------------------------------------------------------
    test('A1: retorna resumen con todos los conteos', async () => {
      // ARRANGE
      const req = { user: adminUser };
      const res = createMockRes();
      Usuario.count.mockResolvedValue(10);
      Libro.count.mockResolvedValue(20);
      Ejemplar.count.mockResolvedValue(50);
      Prestamo.count.mockResolvedValue(5);
      Reserva.count.mockResolvedValue(3);
      Multa.count.mockResolvedValue(2);

      // ACT
      await obtenerResumenAdmin(req, res);

      // ASSERT
      expect(res.json).toHaveBeenCalledWith({
        usuarios: 10, libros: 20, ejemplares: 50,
        prestamosActivos: 5, reservasPendientes: 3, multasPendientes: 2,
      });
    });

    // -------------------------------------------------------------------------
    // TEST A2 - Error: retorna 500 si falla alguna consulta
    // -------------------------------------------------------------------------
    test('A2: retorna 500 si falla una consulta', async () => {
      // ARRANGE
      const req = { user: adminUser };
      const res = createMockRes();
      Usuario.count.mockRejectedValue(new Error('db error'));

      // ACT
      await obtenerResumenAdmin(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudo obtener el resumen administrativo' });
    });
  });

  // ===========================================================================
  // BLOQUE B - obtenerResumenAdminSummary
  // Responsabilidad: identica a obtenerResumenAdmin (misma logica, mismo endpoint)
  // ===========================================================================
  describe('obtenerResumenAdminSummary', () => {

    // -------------------------------------------------------------------------
    // TEST B1 - Happy path: retorna el mismo resumen
    // -------------------------------------------------------------------------
    test('B1: retorna el resumen administrativo', async () => {
      // ARRANGE
      const req = { user: adminUser };
      const res = createMockRes();
      Usuario.count.mockResolvedValue(5);
      Libro.count.mockResolvedValue(8);
      Ejemplar.count.mockResolvedValue(15);
      Prestamo.count.mockResolvedValue(2);
      Reserva.count.mockResolvedValue(1);
      Multa.count.mockResolvedValue(0);

      // ACT
      await obtenerResumenAdminSummary(req, res);

      // ASSERT
      expect(res.json).toHaveBeenCalledWith({
        usuarios: 5, libros: 8, ejemplares: 15,
        prestamosActivos: 2, reservasPendientes: 1, multasPendientes: 0,
      });
    });
  });

  // ===========================================================================
  // BLOQUE C - listarRoles
  // Responsabilidad: devolver todos los roles del sistema
  // ===========================================================================
  describe('listarRoles', () => {

    // -------------------------------------------------------------------------
    // TEST C1 - Happy path: retorna lista de roles
    // -------------------------------------------------------------------------
    test('C1: retorna lista de roles', async () => {
      // ARRANGE
      const req = { user: adminUser };
      const res = createMockRes();
      Rol.findAll.mockResolvedValue([{ id: 1, nombre: 'administrador' }]);

      // ACT
      await listarRoles(req, res);

      // ASSERT
      expect(Rol.findAll).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([{ id: 1, nombre: 'administrador' }]);
    });

    // -------------------------------------------------------------------------
    // TEST C2 - Error: retorna 500 si falla la BD
    // -------------------------------------------------------------------------
    test('C2: retorna 500 si falla', async () => {
      // ARRANGE
      const req = { user: adminUser };
      const res = createMockRes();
      Rol.findAll.mockRejectedValue(new Error('db error'));

      // ACT
      await listarRoles(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudieron obtener los roles' });
    });
  });

  // ===========================================================================
  // BLOQUE D - crearRol
  // Responsabilidad: crear un nuevo rol; valida que el nombre sea requerido
  // ===========================================================================
  describe('crearRol', () => {

    // -------------------------------------------------------------------------
    // TEST D1 - Validacion: retorna 400 si no se envia el nombre
    // -------------------------------------------------------------------------
    test('D1: retorna 400 si falta el nombre', async () => {
      // ARRANGE
      const req = { body: {}, user: adminUser };
      const res = createMockRes();

      // ACT
      await crearRol(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'El nombre del rol es requerido' });
    });

    // -------------------------------------------------------------------------
    // TEST D2 - Happy path: crea el rol y responde 201
    // -------------------------------------------------------------------------
    test('D2: crea el rol y responde 201', async () => {
      // ARRANGE
      const rolMock = { id: 4, nombre: 'supervisor' };
      const req = { body: { nombre: 'supervisor', descripcion: 'desc' }, user: adminUser };
      const res = createMockRes();
      Rol.create.mockResolvedValue(rolMock);

      // ACT
      await crearRol(req, res);

      // ASSERT
      expect(Rol.create).toHaveBeenCalledWith({ nombre: 'supervisor', descripcion: 'desc' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(rolMock);
    });

    // -------------------------------------------------------------------------
    // TEST D3 - Error: retorna 500 si falla la BD
    // -------------------------------------------------------------------------
    test('D3: retorna 500 si falla la BD', async () => {
      // ARRANGE
      const req = { body: { nombre: 'nuevo' }, user: adminUser };
      const res = createMockRes();
      Rol.create.mockRejectedValue(new Error('db error'));

      // ACT
      await crearRol(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudo crear el rol' });
    });
  });

  // ===========================================================================
  // BLOQUE E - listarCategorias
  // Responsabilidad: devolver todas las categorias de libros
  // ===========================================================================
  describe('listarCategorias', () => {

    // -------------------------------------------------------------------------
    // TEST E1 - Happy path: retorna lista de categorias
    // -------------------------------------------------------------------------
    test('E1: retorna lista de categorias', async () => {
      // ARRANGE
      const req = { user: adminUser };
      const res = createMockRes();
      Categoria.findAll.mockResolvedValue([{ id: 1, nombre: 'Ciencia' }]);

      // ACT
      await listarCategorias(req, res);

      // ASSERT
      expect(Categoria.findAll).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([{ id: 1, nombre: 'Ciencia' }]);
    });

    // -------------------------------------------------------------------------
    // TEST E2 - Error: retorna 500 si falla la BD
    // -------------------------------------------------------------------------
    test('E2: retorna 500 si falla', async () => {
      // ARRANGE
      const req = { user: adminUser };
      const res = createMockRes();
      Categoria.findAll.mockRejectedValue(new Error('db error'));

      // ACT
      await listarCategorias(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudieron obtener las categor\u00edas' });
    });
  });

  // ===========================================================================
  // BLOQUE F - crearCategoria
  // Responsabilidad: crear una nueva categoria; valida que el nombre sea requerido
  // ===========================================================================
  describe('crearCategoria', () => {

    // -------------------------------------------------------------------------
    // TEST F1 - Validacion: retorna 400 si no se envia el nombre
    // -------------------------------------------------------------------------
    test('F1: retorna 400 si falta el nombre', async () => {
      // ARRANGE
      const req = { body: {}, user: adminUser };
      const res = createMockRes();

      // ACT
      await crearCategoria(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'El nombre de la categor\u00eda es requerido' });
    });

    // -------------------------------------------------------------------------
    // TEST F2 - Happy path: crea la categoria y responde 201
    // -------------------------------------------------------------------------
    test('F2: crea la categoria y responde 201', async () => {
      // ARRANGE
      const catMock = { id: 5, nombre: 'Historia' };
      const req = { body: { nombre: 'Historia', descripcion: 'libros de historia' }, user: adminUser };
      const res = createMockRes();
      Categoria.create.mockResolvedValue(catMock);

      // ACT
      await crearCategoria(req, res);

      // ASSERT
      expect(Categoria.create).toHaveBeenCalledWith({ nombre: 'Historia', descripcion: 'libros de historia' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(catMock);
    });

    // -------------------------------------------------------------------------
    // TEST F3 - Error: retorna 500 si falla la BD
    // -------------------------------------------------------------------------
    test('F3: retorna 500 si falla la BD', async () => {
      // ARRANGE
      const req = { body: { nombre: 'Arte' }, user: adminUser };
      const res = createMockRes();
      Categoria.create.mockRejectedValue(new Error('db error'));

      // ACT
      await crearCategoria(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudo crear la categor\u00eda' });
    });
  });

  // ===========================================================================
  // BLOQUE G - obtenerUsuariosMasPrestamos
  // Responsabilidad: retornar ranking de usuarios con mas prestamos realizados
  // ===========================================================================
  describe('obtenerUsuariosMasPrestamos', () => {

    // -------------------------------------------------------------------------
    // TEST G1 - Happy path: retorna el ranking de usuarios
    // -------------------------------------------------------------------------
    test('G1: retorna el ranking de usuarios con mas prestamos', async () => {
      // ARRANGE
      const req = { user: adminUser };
      const res = createMockRes();
      Prestamo.findAll.mockResolvedValue([makePrestamoConUsuario(1, 5)]);

      // ACT
      await obtenerUsuariosMasPrestamos(req, res);

      // ASSERT
      expect(Prestamo.findAll).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ usuario_id: 1, cant_prestamos: 5 })])
      );
    });

    // -------------------------------------------------------------------------
    // TEST G2 - Error: retorna 500 si falla la consulta
    // -------------------------------------------------------------------------
    test('G2: retorna 500 si falla', async () => {
      // ARRANGE
      const req = { user: adminUser };
      const res = createMockRes();
      Prestamo.findAll.mockRejectedValue(new Error('db error'));

      // ACT
      await obtenerUsuariosMasPrestamos(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudo obtener el ranking de usuarios con m\u00e1s pr\u00e9stamos' });
    });
  });

  // ===========================================================================
  // BLOQUE H - obtenerLibrosMasPrestados
  // Responsabilidad: retornar ranking de libros mas prestados via SQL directo
  // ===========================================================================
  describe('obtenerLibrosMasPrestados', () => {

    // -------------------------------------------------------------------------
    // TEST H1 - Happy path: retorna el ranking de libros
    // -------------------------------------------------------------------------
    test('H1: retorna el ranking de libros mas prestados', async () => {
      // ARRANGE
      const req = { user: adminUser };
      const res = createMockRes();
      sequelize.query.mockResolvedValue([
        { libro_id: 1, titulo: 'El Quijote', autor: 'Cervantes', cant_prestamos: '12' },
      ]);

      // ACT
      await obtenerLibrosMasPrestados(req, res);

      // ASSERT
      expect(sequelize.query).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ libro_id: 1, cant_prestamos: 12 })])
      );
    });

    // -------------------------------------------------------------------------
    // TEST H2 - Error: retorna 500 si falla la consulta SQL
    // -------------------------------------------------------------------------
    test('H2: retorna 500 si falla', async () => {
      // ARRANGE
      const req = { user: adminUser };
      const res = createMockRes();
      sequelize.query.mockRejectedValue(new Error('db error'));

      // ACT
      await obtenerLibrosMasPrestados(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudo obtener el ranking de libros con m\u00e1s pr\u00e9stamos' });
    });
  });

  // ===========================================================================
  // BLOQUE I - obtenerReportes
  // Responsabilidad: consolidar prestamos por estado, top usuarios y top libros
  //                 en un solo objeto de respuesta
  // ===========================================================================
  describe('obtenerReportes', () => {

    // -------------------------------------------------------------------------
    // TEST I1 - Happy path: retorna el objeto con los tres bloques de reporte
    // -------------------------------------------------------------------------
    test('I1: retorna objeto con prestamos, usuarios y libros', async () => {
      // ARRANGE
      const req = { user: adminUser };
      const res = createMockRes();

      // getLoansByStatusReport usa Prestamo.findAll (primera llamada)
      Prestamo.findAll.mockResolvedValueOnce([makePrestamoActivo(1)]);
      // getTopUsersReport usa Prestamo.findAll (segunda llamada)
      Prestamo.findAll.mockResolvedValueOnce([makePrestamoConUsuario(1, 3)]);
      // getTopBooksReport usa sequelize.query
      sequelize.query.mockResolvedValue([
        { libro_id: 1, titulo: 'Libro A', autor: 'Autor A', cant_prestamos: '3' },
      ]);

      // ACT
      await obtenerReportes(req, res);

      // ASSERT
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          prestamos: expect.objectContaining({ resumen: expect.any(Object) }),
          usuarios: expect.any(Array),
          libros: expect.any(Array),
        })
      );
    });

    // -------------------------------------------------------------------------
    // TEST I2 - Error: retorna 500 si falla alguna sub-consulta
    // -------------------------------------------------------------------------
    test('I2: retorna 500 si falla', async () => {
      // ARRANGE
      const req = { user: adminUser };
      const res = createMockRes();
      Prestamo.findAll.mockRejectedValue(new Error('db error'));

      // ACT
      await obtenerReportes(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudieron generar los reportes administrativos' });
    });
  });

  // ===========================================================================
  // BLOQUE J - obtenerAuditoria
  // Responsabilidad: retornar registros de auditoria; admite filtro por usuario_id
  // ===========================================================================
  describe('obtenerAuditoria', () => {

    // -------------------------------------------------------------------------
    // TEST J1 - Happy path sin filtro: retorna toda la auditoria
    // -------------------------------------------------------------------------
    test('J1: retorna toda la auditoria sin filtros', async () => {
      // ARRANGE
      const req = { query: {}, user: adminUser };
      const res = createMockRes();
      Auditoria.findAll.mockResolvedValue([{ id: 1, accion: 'crear_prestamo' }]);

      // ACT
      await obtenerAuditoria(req, res);

      // ASSERT
      expect(Auditoria.findAll).toHaveBeenCalledWith({ where: {} });
      expect(res.json).toHaveBeenCalledWith([{ id: 1, accion: 'crear_prestamo' }]);
    });

    // -------------------------------------------------------------------------
    // TEST J2 - Happy path con filtro: filtra por usuario_id del query
    // -------------------------------------------------------------------------
    test('J2: filtra la auditoria por usuario_id si viene en la query', async () => {
      // ARRANGE
      const req = { query: { usuario_id: '3' }, user: adminUser };
      const res = createMockRes();
      Auditoria.findAll.mockResolvedValue([{ id: 2, usuario_id: 3, accion: 'eliminar_reserva' }]);

      // ACT
      await obtenerAuditoria(req, res);

      // ASSERT
      expect(Auditoria.findAll).toHaveBeenCalledWith({ where: { usuario_id: '3' } });
      expect(res.json).toHaveBeenCalledWith([{ id: 2, usuario_id: 3, accion: 'eliminar_reserva' }]);
    });

    // -------------------------------------------------------------------------
    // TEST J3 - Error: retorna 500 si falla la BD
    // -------------------------------------------------------------------------
    test('J3: retorna 500 si falla', async () => {
      // ARRANGE
      const req = { query: {}, user: adminUser };
      const res = createMockRes();
      Auditoria.findAll.mockRejectedValue(new Error('db error'));

      // ACT
      await obtenerAuditoria(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudo obtener la auditor\u00eda' });
    });
  });

  // ===========================================================================
  // BLOQUE K - exportUsuariosMasPrestamos (CSV)
  // Responsabilidad: generar y enviar un archivo CSV con el ranking de usuarios
  // ===========================================================================
  describe('exportUsuariosMasPrestamos', () => {

    // -------------------------------------------------------------------------
    // TEST K1 - Happy path: envia CSV con los headers correctos
    // -------------------------------------------------------------------------
    test('K1: genera y envia el CSV con Content-Disposition correcto', async () => {
      // ARRANGE
      const req = { user: adminUser };
      const res = createMockResExport();
      Prestamo.findAll.mockResolvedValue([makePrestamoConUsuario(1, 4)]);

      // ACT
      await exportUsuariosMasPrestamos(req, res);

      // ASSERT
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="usuarios-mas-prestamos.csv"'
      );
      expect(res.send).toHaveBeenCalled();
      // El CSV enviado debe contener la cabecera
      const csvEnviado = res.send.mock.calls[0][0];
      expect(csvEnviado).toContain('Usuario ID');
      expect(csvEnviado).toContain('Pr\u00e9stamos');
    });

    // -------------------------------------------------------------------------
    // TEST K2 - Error: retorna 500 si falla la generacion del CSV
    // -------------------------------------------------------------------------
    test('K2: retorna 500 si falla la consulta', async () => {
      // ARRANGE
      const req = { user: adminUser };
      const res = createMockResExport();
      Prestamo.findAll.mockRejectedValue(new Error('db error'));

      // ACT
      await exportUsuariosMasPrestamos(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'No se pudo exportar el ranking de usuarios con m\u00e1s pr\u00e9stamos',
      });
    });
  });
});
