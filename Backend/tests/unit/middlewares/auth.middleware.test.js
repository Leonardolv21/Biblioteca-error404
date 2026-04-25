
// --- Mocks de dependencias externas ---
jest.mock('jsonwebtoken');
jest.mock('../../../models', () => ({
  Usuario: { findByPk: jest.fn() },
}));
jest.mock('../../../models/Rol', () => ({}));

const jwt = require('jsonwebtoken');
const { Usuario } = require('../../../models');
const { authenticate, authorize } = require('../../../middlewares/auth.middleware');

// Helper: crea un objeto res con status y json espiados
const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// =============================================================================
// BLOQUE 1 - authenticate
// Responsabilidad: extraer el token, verificarlo con JWT y adjuntar el usuario
//                 al objeto req antes de llamar a next()
// =============================================================================
describe('authenticate', () => {
  // Limpiar todos los mocks antes de cada test para evitar contaminacion
  beforeEach(() => { jest.resetAllMocks(); });

  // ---------------------------------------------------------------------------
  // TEST 1 - Sin token en header ni en query => 401
  // ---------------------------------------------------------------------------
  test('retorna 401 si no se envia token', async () => {
    // ARRANGE - peticion sin Authorization header ni query.token
    const req = { headers: {}, query: {} };
    const res = createMockRes();
    const next = jest.fn();

    // ACT
    await authenticate(req, res, next);

    // ASSERT
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token de autenticaci\u00f3n requerido' });
    expect(next).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // TEST 2 - Token en header Authorization: Bearer <token> valido
  // ---------------------------------------------------------------------------
  test('extrae token del header Bearer y llama next con req.user cargado', async () => {
    // ARRANGE
    const usuarioMock = { id: 7, nombre: 'Ana', rol: { nombre: 'estudiante' } };
    jwt.verify.mockReturnValue({ id: 7 });
    Usuario.findByPk.mockResolvedValue(usuarioMock);

    const req = { headers: { authorization: 'Bearer token_valido' }, query: {} };
    const res = createMockRes();
    const next = jest.fn();

    // ACT
    await authenticate(req, res, next);

    // ASSERT
    expect(jwt.verify).toHaveBeenCalledWith('token_valido', expect.any(String));
    expect(Usuario.findByPk).toHaveBeenCalledWith(7, expect.any(Object));
    expect(req.user).toBe(usuarioMock);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // TEST 3 - Token en query string (?token=...) valido
  // ---------------------------------------------------------------------------
  test('extrae token del query string y llama next con req.user cargado', async () => {
    // ARRANGE
    const usuarioMock = { id: 3, nombre: 'Carlos', rol: { nombre: 'bibliotecario' } };
    jwt.verify.mockReturnValue({ id: 3 });
    Usuario.findByPk.mockResolvedValue(usuarioMock);

    const req = { headers: {}, query: { token: 'token_query' } };
    const res = createMockRes();
    const next = jest.fn();

    // ACT
    await authenticate(req, res, next);

    // ASSERT
    expect(jwt.verify).toHaveBeenCalledWith('token_query', expect.any(String));
    expect(req.user).toBe(usuarioMock);
    expect(next).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // TEST 4 - Token valido pero el usuario ya no existe en la BD => 401
  // ---------------------------------------------------------------------------
  test('retorna 401 si el usuario del token no existe en la BD', async () => {
    // ARRANGE
    jwt.verify.mockReturnValue({ id: 999 });
    Usuario.findByPk.mockResolvedValue(null);

    const req = { headers: { authorization: 'Bearer token_valido' }, query: {} };
    const res = createMockRes();
    const next = jest.fn();

    // ACT
    await authenticate(req, res, next);

    // ASSERT
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Usuario no encontrado' });
    expect(next).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // TEST 5 - Token invalido / expirado (jwt.verify lanza excepcion) => 401
  // ---------------------------------------------------------------------------
  test('retorna 401 si el token es invalido o esta expirado', async () => {
    // ARRANGE
    jwt.verify.mockImplementation(() => { throw new Error('jwt expired'); });

    const req = { headers: { authorization: 'Bearer token_malo' }, query: {} };
    const res = createMockRes();
    const next = jest.fn();

    // ACT
    await authenticate(req, res, next);

    // ASSERT
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token inv\u00e1lido' });
    expect(next).not.toHaveBeenCalled();
  });
});

// =============================================================================
// BLOQUE 2 - authorize
// Responsabilidad: verificar que req.user exista y que su rol este en la lista
//                 de roles permitidos; si no, bloquear con 401 o 403
// =============================================================================
describe('authorize', () => {
  beforeEach(() => { jest.resetAllMocks(); });

  // ---------------------------------------------------------------------------
  // TEST 6 - req.user ausente (authenticate no se ejecuto antes) => 401
  // ---------------------------------------------------------------------------
  test('retorna 401 si req.user no esta definido', () => {
    // ARRANGE
    const middleware = authorize('administrador');
    const req = {};                 // sin user
    const res = createMockRes();
    const next = jest.fn();

    // ACT
    middleware(req, res, next);

    // ASSERT
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Usuario no autenticado' });
    expect(next).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // TEST 7 - Rol del usuario NO esta en la lista de roles permitidos => 403
  // ---------------------------------------------------------------------------
  test('retorna 403 si el rol del usuario no tiene permiso', () => {
    // ARRANGE
    const middleware = authorize('administrador', 'bibliotecario');
    const req = { user: { rol: { nombre: 'estudiante' } } };
    const res = createMockRes();
    const next = jest.fn();

    // ACT
    middleware(req, res, next);

    // ASSERT
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Acceso denegado. Rol requerido: administrador o bibliotecario',
    });
    expect(next).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // TEST 8 - Rol del usuario SI esta en la lista => llama next()
  // ---------------------------------------------------------------------------
  test('llama next si el rol del usuario esta permitido', () => {
    // ARRANGE
    const middleware = authorize('administrador', 'bibliotecario');
    const req = { user: { rol: { nombre: 'bibliotecario' } } };
    const res = createMockRes();
    const next = jest.fn();

    // ACT
    middleware(req, res, next);

    // ASSERT
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // TEST 9 - Un solo rol permitido y el usuario tiene ese rol exacto => next()
  // ---------------------------------------------------------------------------
  test('llama next si hay un solo rol permitido y el usuario lo tiene', () => {
    // ARRANGE
    const middleware = authorize('administrador');
    const req = { user: { rol: { nombre: 'administrador' } } };
    const res = createMockRes();
    const next = jest.fn();

    // ACT
    middleware(req, res, next);

    // ASSERT
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
