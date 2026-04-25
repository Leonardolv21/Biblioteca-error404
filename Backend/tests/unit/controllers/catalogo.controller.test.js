
// --- Mocks de dependencias externas ---
jest.mock('../../../models', () => ({
  sequelize: {
    literal: jest.fn().mockReturnValue('literal_result'),
  },
}));

jest.mock('../../../models/Categoria', () => ({}));
jest.mock('../../../models/Ejemplar', () => ({}));

jest.mock('../../../models/Libro', () => ({
  findAll: jest.fn(),
}));

const Libro = require('../../../models/Libro');
const { getMasSolicitados } = require('../../../controllers/catalogo.controller');

// Helper: res estandar
const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('catalogo.controller unit tests', () => {
  beforeEach(() => { jest.resetAllMocks(); });

  // ===========================================================================
  // BLOQUE A - getMasSolicitados
  // Responsabilidad: retornar todos los libros ordenados por demanda (prestados
  //                 + reservados), incluyendo categoria y ejemplares
  // ===========================================================================
  describe('getMasSolicitados', () => {

    // -------------------------------------------------------------------------
    // TEST A1 - Happy path: retorna lista de libros con sus relaciones
    // -------------------------------------------------------------------------
    test('A1: retorna lista de libros mas solicitados', async () => {
      // ARRANGE
      const req = {};
      const res = createMockRes();
      const librosMock = [
        {
          id: 1, titulo: 'Cien a\u00f1os de soledad',
          categoria: { id: 2, nombre: 'Literatura' },
          copias: [{ id: 10, codigo: 'E010', estado: 'prestado' }],
        },
      ];
      Libro.findAll.mockResolvedValue(librosMock);

      // ACT
      await getMasSolicitados(req, res);

      // ASSERT
      expect(Libro.findAll).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(librosMock);
    });

    // -------------------------------------------------------------------------
    // TEST A2 - Lista vacia: retorna array vacio si no hay libros
    // -------------------------------------------------------------------------
    test('A2: retorna array vacio si no hay libros', async () => {
      // ARRANGE
      const req = {};
      const res = createMockRes();
      Libro.findAll.mockResolvedValue([]);

      // ACT
      await getMasSolicitados(req, res);

      // ASSERT
      expect(res.json).toHaveBeenCalledWith([]);
    });

    // -------------------------------------------------------------------------
    // TEST A3 - Error: retorna 500 con mensaje si falla la consulta
    // -------------------------------------------------------------------------
    test('A3: retorna 500 si falla la consulta a la BD', async () => {
      // ARRANGE
      const req = {};
      const res = createMockRes();
      Libro.findAll.mockRejectedValue(new Error('db timeout'));

      // ACT
      await getMasSolicitados(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Error al obtener libros m\u00e1s solicitados',
        details: 'db timeout',
      });
    });
  });
});
