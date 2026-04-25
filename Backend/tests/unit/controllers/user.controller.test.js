
// --- Mocks de dependencias externas ---
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
}));

jest.mock('../../../utils/matricula', () => jest.fn().mockReturnValue('MAT-TEST-001'));

jest.mock('../../../models', () => ({
  Usuario: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
  Rol: { findByPk: jest.fn() },
  Prestamo: {},
  Reserva: {},
  Multa: {},
  Notificacion: {},
}));

const { Usuario, Rol } = require('../../../models');
const generarMatricula = require('../../../utils/matricula');
const bcrypt = require('bcryptjs');

const {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  hacerAdmin,
  hacerBibliotecario,
} = require('../../../controllers/user.controller');

// Helper: res estandar
const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Mock de instancia de usuario con metodos de instancia
const makeUsuarioInstance = (overrides = {}) => ({
  id: 1, nombre: 'Ana', apellido: 'Lopez', correo: 'ana@test.com',
  matricula: 'MAT-TEST-001', rol_id: 3, password_hash: 'old_hash', max_prestamos: 3,
  rol: { nombre: 'estudiante' },
  update: jest.fn().mockResolvedValue(true),
  destroy: jest.fn().mockResolvedValue(true),
  ...overrides,
});

describe('user.controller unit tests', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // Restaurar implementaciones estaticas que resetAllMocks() borra
    generarMatricula.mockReturnValue('MAT-TEST-001');
    bcrypt.hash.mockResolvedValue('hashed_password');
  });


  describe('listarUsuarios', () => {

    // -------------------------------------------------------------------------
    // TEST A1 - Happy path: retorna lista de usuarios
    // -------------------------------------------------------------------------
    test('A1: retorna lista de usuarios', async () => {
      // ARRANGE
      const req = {};
      const res = createMockRes();
      Usuario.findAll.mockResolvedValue([makeUsuarioInstance()]);

      // ACT
      await listarUsuarios(req, res);

      // ASSERT
      expect(Usuario.findAll).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([expect.objectContaining({ id: 1 })]);
    });

    // -------------------------------------------------------------------------
    // TEST A2 - Error: retorna 500 si falla la BD
    // -------------------------------------------------------------------------
    test('A2: retorna 500 si falla la BD', async () => {
      // ARRANGE
      const req = {};
      const res = createMockRes();
      Usuario.findAll.mockRejectedValue(new Error('db error'));

      // ACT
      await listarUsuarios(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudieron obtener los usuarios' });
    });
  });


  describe('obtenerUsuario', () => {


    test('B1: retorna 404 si el usuario no existe', async () => {
      // ARRANGE
      const req = { params: { id: '99' } };
      const res = createMockRes();
      Usuario.findByPk.mockResolvedValue(null);

      // ACT
      await obtenerUsuario(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Usuario no encontrado' });
    });


    test('B2: retorna el usuario encontrado', async () => {
      // ARRANGE
      const usuarioMock = makeUsuarioInstance();
      const req = { params: { id: '1' } };
      const res = createMockRes();
      Usuario.findByPk.mockResolvedValue(usuarioMock);

      // ACT
      await obtenerUsuario(req, res);

      // ASSERT
      expect(res.json).toHaveBeenCalledWith(usuarioMock);
    });


    test('B3: retorna 500 si falla la BD', async () => {
      // ARRANGE
      const req = { params: { id: '1' } };
      const res = createMockRes();
      Usuario.findByPk.mockRejectedValue(new Error('db error'));

      // ACT
      await obtenerUsuario(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudo obtener el usuario' });
    });
  });


  describe('crearUsuario', () => {


    test('C1: retorna 400 si faltan campos requeridos', async () => {
      // ARRANGE
      const req = { body: { nombre: 'Ana' } };
      const res = createMockRes();

      // ACT
      await crearUsuario(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('requeridos') })
      );
    });


    test('C2: retorna 404 si el rol no existe', async () => {
      // ARRANGE
      const req = { body: { nombre: 'Ana', apellido: 'Lopez', correo: 'ana@t.com', password: '123', rol_id: 99 } };
      const res = createMockRes();
      Rol.findByPk.mockResolvedValue(null);

      // ACT
      await crearUsuario(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Rol no encontrado' });
    });

    test('C3: crea el usuario con password hasheada y responde 201', async () => {
      // ARRANGE
      const rolMock = { id: 3, nombre: 'estudiante' };
      const nuevoUser = makeUsuarioInstance({ correo: 'ana@t.com' });
      const req = {
        body: { nombre: 'Ana', apellido: 'Lopez', correo: 'ana@t.com', password: '123', rol_id: 3 },
      };
      const res = createMockRes();
      Rol.findByPk.mockResolvedValue(rolMock);
      Usuario.create.mockResolvedValue(nuevoUser);

      // ACT
      await crearUsuario(req, res);

      // ASSERT
      expect(bcrypt.hash).toHaveBeenCalledWith('123', 10);
      expect(generarMatricula).toHaveBeenCalledWith('Ana', 'Lopez', 'estudiante');
      expect(Usuario.create).toHaveBeenCalledWith(
        expect.objectContaining({ password_hash: 'hashed_password', matricula: 'MAT-TEST-001' })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(nuevoUser);
    });


    test('C4: retorna 500 si falla la BD', async () => {
      // ARRANGE
      const req = {
        body: { nombre: 'Ana', apellido: 'Lopez', correo: 'ana@t.com', password: '123', rol_id: 3 },
      };
      const res = createMockRes();
      Rol.findByPk.mockResolvedValue({ id: 3, nombre: 'estudiante' });
      Usuario.create.mockRejectedValue(new Error('db error'));

      // ACT
      await crearUsuario(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudo crear el usuario' });
    });
  });


  describe('actualizarUsuario', () => {


    test('D1: retorna 404 si el usuario no existe', async () => {
      // ARRANGE
      const req = { params: { id: '99' }, body: { nombre: 'Nuevo' } };
      const res = createMockRes();
      Usuario.findByPk.mockResolvedValue(null);

      // ACT
      await actualizarUsuario(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Usuario no encontrado' });
    });

    test('D2: actualiza el usuario y regenera la matricula', async () => {
      // ARRANGE
      const usuarioMock = makeUsuarioInstance();
      const req = { params: { id: '1' }, body: { nombre: 'NuevoNombre' } };
      const res = createMockRes();
      Usuario.findByPk.mockResolvedValue(usuarioMock);

      // ACT
      await actualizarUsuario(req, res);

      // ASSERT
      expect(generarMatricula).toHaveBeenCalledWith('NuevoNombre', 'Lopez', 'estudiante');
      expect(usuarioMock.update).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: 'NuevoNombre', matricula: 'MAT-TEST-001' })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Usuario actualizado correctamente' })
      );
    });


    test('D3: retorna 500 si falla la BD', async () => {
      // ARRANGE
      const req = { params: { id: '1' }, body: { nombre: 'Test' } };
      const res = createMockRes();
      Usuario.findByPk.mockRejectedValue(new Error('db error'));

      // ACT
      await actualizarUsuario(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudo actualizar el usuario' });
    });
  });


  describe('eliminarUsuario', () => {


    test('E1: retorna 404 si el usuario no existe', async () => {
      // ARRANGE
      const req = { params: { id: '99' } };
      const res = createMockRes();
      Usuario.findByPk.mockResolvedValue(null);

      // ACT
      await eliminarUsuario(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Usuario no encontrado' });
    });


    test('E2: elimina el usuario y responde con mensaje de exito', async () => {
      // ARRANGE
      const usuarioMock = makeUsuarioInstance();
      const req = { params: { id: '1' } };
      const res = createMockRes();
      Usuario.findByPk.mockResolvedValue(usuarioMock);

      // ACT
      await eliminarUsuario(req, res);

      // ASSERT
      expect(usuarioMock.destroy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Usuario eliminado correctamente' });
    });

    test('E3: retorna 500 si falla la BD', async () => {
      // ARRANGE
      const req = { params: { id: '1' } };
      const res = createMockRes();
      Usuario.findByPk.mockRejectedValue(new Error('db error'));

      // ACT
      await eliminarUsuario(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudo eliminar el usuario' });
    });
  });


  describe('hacerAdmin', () => {


    test('F1: retorna 404 si el usuario no existe', async () => {
      // ARRANGE
      const req = { params: { id: '99' } };
      const res = createMockRes();
      Usuario.findByPk.mockResolvedValue(null);

      // ACT
      await hacerAdmin(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Usuario no encontrado' });
    });


    test('F2: retorna 400 si el usuario ya es administrador', async () => {
      // ARRANGE
      const usuarioMock = makeUsuarioInstance({ rol_id: 1 });
      const req = { params: { id: '1' } };
      const res = createMockRes();
      Usuario.findByPk.mockResolvedValue(usuarioMock);

      // ACT
      await hacerAdmin(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'El usuario ya es administrador' });
    });


    test('F3: actualiza el rol a administrador y responde con el usuario', async () => {
      // ARRANGE
      const usuarioMock = makeUsuarioInstance({ rol_id: 3 });
      const req = { params: { id: '1' } };
      const res = createMockRes();
      Usuario.findByPk.mockResolvedValue(usuarioMock);

      // ACT
      await hacerAdmin(req, res);

      // ASSERT
      expect(usuarioMock.update).toHaveBeenCalledWith({ rol_id: 1, max_prestamos: 0 });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Usuario actualizado a administrador' })
      );
    });

    test('F4: retorna 500 si falla la BD', async () => {
      // ARRANGE
      const req = { params: { id: '1' } };
      const res = createMockRes();
      Usuario.findByPk.mockRejectedValue(new Error('db error'));

      // ACT
      await hacerAdmin(req, res);

      //el princio SOLID significa :
      //S: Single Responsibility Principle (Principio de Responsabilidad Única)
      //un ejemplo de
      //O: Open/Closed Principle (Principio de Abierto/Cerrado)
      //L: Liskov Substitution Principle (Principio de Sustitución de Liskov)
      //I: Interface Segregation Principle (Principio de Segregación de Interfaces)
      //D: Dependency Inversion Principle (Principio de Inversión de Dependencias)

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudo actualizar el rol' });
    });
  });


  describe('hacerBibliotecario', () => {

    // -------------------------------------------------------------------------
    // TEST G1 - Usuario no encontrado: retorna 404
    // -------------------------------------------------------------------------
    test('G1: retorna 404 si el usuario no existe', async () => {
      // ARRANGE
      const req = { params: { id: '99' } };
      const res = createMockRes();
      Usuario.findByPk.mockResolvedValue(null);

      // ACT
      await hacerBibliotecario(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Usuario no encontrado' });
    });

    // -------------------------------------------------------------------------
    // TEST G2 - Ya es bibliotecario: retorna 400 con mensaje informativo
    // -------------------------------------------------------------------------
    test('G2: retorna 400 si el usuario ya es bibliotecario', async () => {
      // ARRANGE
      const usuarioMock = makeUsuarioInstance({ rol_id: 2 });
      const req = { params: { id: '1' } };
      const res = createMockRes();
      Usuario.findByPk.mockResolvedValue(usuarioMock);

      // ACT
      await hacerBibliotecario(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'El usuario ya es bibliotecario' });
    });

    // -------------------------------------------------------------------------
    // TEST G3 - Happy path: cambia el rol a bibliotecario y regenera matricula
    // -------------------------------------------------------------------------
    test('G3: actualiza el rol a bibliotecario con nueva matricula', async () => {
      // ARRANGE
      const usuarioMock = makeUsuarioInstance({ rol_id: 3 });
      const req = { params: { id: '1' } };
      const res = createMockRes();
      Usuario.findByPk.mockResolvedValue(usuarioMock);

      // ACT
      await hacerBibliotecario(req, res);

      // ASSERT
      expect(generarMatricula).toHaveBeenCalledWith('Ana', 'Lopez', 'bibliotecario');
      expect(usuarioMock.update).toHaveBeenCalledWith({ rol_id: 2, matricula: 'MAT-TEST-001', max_prestamos: 0 });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Usuario actualizado a bibliotecario' })
      );
    });

    // -------------------------------------------------------------------------
    // TEST G4 - Error: retorna 500 si falla la BD
    // -------------------------------------------------------------------------
    test('G4: retorna 500 si falla la BD', async () => {
      // ARRANGE
      const req = { params: { id: '1' } };
      const res = createMockRes();
      Usuario.findByPk.mockRejectedValue(new Error('db error'));

      // ACT
      await hacerBibliotecario(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudo actualizar el rol' });
    });
  });
});
