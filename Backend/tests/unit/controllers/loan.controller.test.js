jest.mock('../../../models', () => ({
  Prestamo:     { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn(), count: jest.fn() },
  Ejemplar:     { findByPk: jest.fn() },
  Usuario:      { findByPk: jest.fn() },
  Libro:        {},
  Reserva:      { findOne: jest.fn(), count: jest.fn() },
  Notificacion: { create: jest.fn(), findOrCreate: jest.fn() },
  Multa:        { findAll: jest.fn(), findOrCreate: jest.fn() },
}));

jest.mock('../../../utils/audit', () => ({
  createAudit: jest.fn().mockResolvedValue(undefined),
}));

// Op se usa en listarPrestamosVencidos - mockear sequelize
jest.mock('sequelize', () => {
  const actual = jest.requireActual('sequelize');
  return { ...actual, Op: actual.Op };
});

const { Prestamo, Ejemplar, Usuario, Reserva, Notificacion, Multa } = require('../../../models');
const { createAudit } = require('../../../utils/audit');
const {
  listarPrestamos, obtenerPrestamo, listarPrestamosPorUsuario,
  listarPrestamosVencidos, listarMultasPorUsuario, notificarVencimientosYRetrasos,
  crearPrestamo, actualizarPrestamo, renovarPrestamo, eliminarPrestamo,
} = require('../../../controllers/loan.controller');

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

const adminUser = { id: 1, rol: { nombre: 'administrador' } };

describe('loan.controller unit tests', () => {
  beforeEach(() => { jest.resetAllMocks(); });

  // BLOQUE A - listarPrestamos
  describe('listarPrestamos', () => {
    test('A1: retorna lista de prestamos', async () => {
      const req = { user: adminUser };
      const res = createMockRes();
      Prestamo.findAll.mockResolvedValue([{ id: 1 }]);
      await listarPrestamos(req, res);
      expect(Prestamo.findAll).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
    });
    test('A2: retorna 500 si falla', async () => {
      const req = { user: adminUser };
      const res = createMockRes();
      Prestamo.findAll.mockRejectedValue(new Error('db error'));
      await listarPrestamos(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudieron obtener los pr\u00e9stamos' });
    });
  });

  // BLOQUE B - obtenerPrestamo
  describe('obtenerPrestamo', () => {
    test('B1: retorna prestamo por id', async () => {
      const req = { params: { id: 5 }, user: adminUser };
      const res = createMockRes();
      Prestamo.findByPk.mockResolvedValue({ id: 5 });
      await obtenerPrestamo(req, res);
      expect(Prestamo.findByPk).toHaveBeenCalledWith(5, expect.any(Object));
      expect(res.json).toHaveBeenCalledWith({ id: 5 });
    });
    test('B2: retorna 404 si no existe', async () => {
      const req = { params: { id: 999 }, user: adminUser };
      const res = createMockRes();
      Prestamo.findByPk.mockResolvedValue(null);
      await obtenerPrestamo(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Pr\u00e9stamo no encontrado' });
    });
    test('B3: retorna 500 si falla', async () => {
      const req = { params: { id: 1 }, user: adminUser };
      const res = createMockRes();
      Prestamo.findByPk.mockRejectedValue(new Error('db error'));
      await obtenerPrestamo(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudo obtener el pr\u00e9stamo' });
    });
  });

  // BLOQUE C - listarPrestamosPorUsuario
  describe('listarPrestamosPorUsuario', () => {
    test('C1: retorna prestamos del usuario', async () => {
      const req = { params: { usuarioId: 3 }, user: adminUser };
      const res = createMockRes();
      Prestamo.findAll.mockResolvedValue([{ id: 10, usuario_id: 3 }]);
      await listarPrestamosPorUsuario(req, res);
      expect(Prestamo.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { usuario_id: 3 } }));
      expect(res.json).toHaveBeenCalledWith([{ id: 10, usuario_id: 3 }]);
    });
    test('C2: retorna 500 si falla', async () => {
      const req = { params: { usuarioId: 3 }, user: adminUser };
      const res = createMockRes();
      Prestamo.findAll.mockRejectedValue(new Error('db error'));
      await listarPrestamosPorUsuario(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudieron obtener los pr\u00e9stamos del usuario' });
    });
  });

  // BLOQUE D - listarPrestamosVencidos
  describe('listarPrestamosVencidos', () => {
    test('D1: retorna lista de prestamos vencidos', async () => {
      const req = { user: adminUser };
      const res = createMockRes();
      Prestamo.findAll.mockResolvedValue([{ id: 2, estado: 'activo' }]);
      await listarPrestamosVencidos(req, res);
      expect(Prestamo.findAll).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([{ id: 2, estado: 'activo' }]);
    });
    test('D2: retorna 500 si falla', async () => {
      const req = { user: adminUser };
      const res = createMockRes();
      Prestamo.findAll.mockRejectedValue(new Error('db error'));
      await listarPrestamosVencidos(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudieron obtener los pr\u00e9stamos vencidos' });
    });
  });

  // BLOQUE E - listarMultasPorUsuario
  describe('listarMultasPorUsuario', () => {
    test('E1: retorna multas del usuario', async () => {
      const req = { params: { usuarioId: 4 }, user: adminUser };
      const res = createMockRes();
      Multa.findAll.mockResolvedValue([{ id: 1, monto: 5 }]);
      await listarMultasPorUsuario(req, res);
      expect(Multa.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { usuario_id: 4 } }));
      expect(res.json).toHaveBeenCalledWith([{ id: 1, monto: 5 }]);
    });
    test('E2: retorna 500 si falla', async () => {
      const req = { params: { usuarioId: 4 }, user: adminUser };
      const res = createMockRes();
      Multa.findAll.mockRejectedValue(new Error('db error'));
      await listarMultasPorUsuario(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudieron obtener las multas del usuario' });
    });
  });

  // BLOQUE F - notificarVencimientosYRetrasos
  describe('notificarVencimientosYRetrasos', () => {
    test('F1: procesa prestamos y crea notificaciones de vencimiento proximo', async () => {
      const req = { user: adminUser };
      const res = createMockRes();
      const manana = new Date();
      manana.setDate(manana.getDate() + 1);
      const fechaManana = manana.toISOString().split('T')[0];
      const prestamoMock = { id: 7, usuario_id: 2, fecha_vencimiento: fechaManana };
      Prestamo.findAll.mockResolvedValue([prestamoMock]);
      const notifMock = { id: 99 };
      Notificacion.findOrCreate.mockResolvedValue([notifMock]);
      await notificarVencimientosYRetrasos(req, res);
      expect(Notificacion.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tipo: 'vencimiento_proximo' }) }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ cantidad: 1 }));
    });
    test('F2: crea notificacion multa_pendiente para prestamos vencidos', async () => {
      const req = { user: adminUser };
      const res = createMockRes();
      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 1);
      const fechaAyer = ayer.toISOString().split('T')[0];
      const prestamoMock = { id: 8, usuario_id: 3, fecha_vencimiento: fechaAyer };
      Prestamo.findAll.mockResolvedValue([prestamoMock]);
      const notifMock = { id: 100 };
      Notificacion.findOrCreate.mockResolvedValue([notifMock]);
      await notificarVencimientosYRetrasos(req, res);
      expect(Notificacion.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tipo: 'multa_pendiente' }) }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ cantidad: 1 }));
    });
    test('F3: retorna 500 si falla', async () => {
      const req = { user: adminUser };
      const res = createMockRes();
      Prestamo.findAll.mockRejectedValue(new Error('db error'));
      await notificarVencimientosYRetrasos(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudieron crear las notificaciones' });
    });
  });

  // BLOQUE G - crearPrestamo
  // Orden de validaciones:
  //   1. ejemplar_id + usuario_id requeridos
  //   2. Ejemplar.findByPk => 404
  //   3. ejemplar.estado !== 'disponible' => 400
  //   4. Usuario.findByPk => 404
  //   5. Prestamo.count (activeLoans) >= max_prestamos => 400
  //   6. Reserva.findOne (reserva existente del usuario)
  //   7. Prestamo.create + ejemplar.update => 201
  describe('crearPrestamo', () => {
    test('G1: 400 si faltan ejemplar_id o usuario_id', async () => {
      const req = { body: { ejemplar_id: 1 }, user: adminUser };
      const res = createMockRes();
      await crearPrestamo(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'ejemplar_id y usuario_id son requeridos' });
    });
    test('G2: 404 si ejemplar no existe', async () => {
      const req = { body: { ejemplar_id: 1, usuario_id: 2 }, user: adminUser };
      const res = createMockRes();
      Ejemplar.findByPk.mockResolvedValue(null);
      await crearPrestamo(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Ejemplar no encontrado' });
    });
    test('G3: 400 si ejemplar no esta disponible', async () => {
      const req = { body: { ejemplar_id: 1, usuario_id: 2 }, user: adminUser };
      const res = createMockRes();
      Ejemplar.findByPk.mockResolvedValue({ id: 1, estado: 'prestado', libro_id: 5, libro: { id: 5 } });
      await crearPrestamo(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'El ejemplar no est\u00e1 disponible para pr\u00e9stamo' });
    });
    test('G4: 404 si usuario no existe', async () => {
      const req = { body: { ejemplar_id: 1, usuario_id: 2 }, user: adminUser };
      const res = createMockRes();
      Ejemplar.findByPk.mockResolvedValue({ id: 1, estado: 'disponible', libro_id: 5, libro: { id: 5 } });
      Usuario.findByPk.mockResolvedValue(null);
      await crearPrestamo(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Usuario no encontrado' });
    });
    test('G5: 400 si usuario alcanzo max_prestamos', async () => {
      const req = { body: { ejemplar_id: 1, usuario_id: 2 }, user: adminUser };
      const res = createMockRes();
      Ejemplar.findByPk.mockResolvedValue({ id: 1, estado: 'disponible', libro_id: 5, libro: { id: 5 } });
      Usuario.findByPk.mockResolvedValue({ id: 2, max_prestamos: 3 });
      Prestamo.count.mockResolvedValue(3);
      await crearPrestamo(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'El usuario alcanz\u00f3 el m\u00e1ximo de pr\u00e9stamos activos' });
    });
    test('G6: crea prestamo y responde 201', async () => {
      const updateEjemplar = jest.fn().mockResolvedValue(undefined);
      const ejemplarMock = { id: 1, estado: 'disponible', libro_id: 5, libro: { id: 5 }, update: updateEjemplar, toJSON: () => ({ id: 1 }) };
      const prestamoMock = { id: 30, toJSON: () => ({ id: 30 }) };
      const req = { body: { ejemplar_id: 1, usuario_id: 2 }, user: adminUser };
      const res = createMockRes();
      Ejemplar.findByPk.mockResolvedValue(ejemplarMock);
      Usuario.findByPk.mockResolvedValue({ id: 2, max_prestamos: 3 });
      Prestamo.count.mockResolvedValue(0);
      Reserva.findOne.mockResolvedValue(null);
      Prestamo.create.mockResolvedValue(prestamoMock);
      await crearPrestamo(req, res);
      expect(Prestamo.create).toHaveBeenCalledWith(expect.objectContaining({ estado: 'activo', ejemplar_id: 1, usuario_id: 2 }));
      expect(updateEjemplar).toHaveBeenCalledWith({ estado: 'prestado' });
      expect(createAudit).toHaveBeenCalledWith(expect.objectContaining({ accion: 'crear_prestamo' }));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(prestamoMock);
    });
    test('G7: si existe reserva activa del usuario la completa', async () => {
      const updateEjemplar = jest.fn().mockResolvedValue(undefined);
      const updateReserva  = jest.fn().mockResolvedValue(undefined);
      const ejemplarMock = { id: 1, estado: 'disponible', libro_id: 5, libro: { id: 5 }, update: updateEjemplar, toJSON: () => ({ id: 1 }) };
      const prestamoMock = { id: 31, toJSON: () => ({ id: 31 }) };
      const reservaMock  = { id: 10, toJSON: () => ({ id: 10 }), update: updateReserva };
      const req = { body: { ejemplar_id: 1, usuario_id: 2 }, user: adminUser };
      const res = createMockRes();
      Ejemplar.findByPk.mockResolvedValue(ejemplarMock);
      Usuario.findByPk.mockResolvedValue({ id: 2, max_prestamos: 3 });
      Prestamo.count.mockResolvedValue(0);
      Reserva.findOne.mockResolvedValue(reservaMock);
      Prestamo.create.mockResolvedValue(prestamoMock);
      await crearPrestamo(req, res);
      expect(updateReserva).toHaveBeenCalledWith(expect.objectContaining({ estado: 'completada' }));
      expect(createAudit).toHaveBeenCalledWith(expect.objectContaining({ accion: 'completar_reserva' }));
      expect(res.status).toHaveBeenCalledWith(201);
    });
    test('G8: retorna 500 si falla internamente', async () => {
      const req = { body: { ejemplar_id: 1, usuario_id: 2 }, user: adminUser };
      const res = createMockRes();
      Ejemplar.findByPk.mockRejectedValue(new Error('db crash'));
      await crearPrestamo(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudo crear el pr\u00e9stamo' });
    });
  });

  // BLOQUE H - actualizarPrestamo
  describe('actualizarPrestamo', () => {
    test('H1: 404 si prestamo no existe', async () => {
      const req = { params: { id: 99 }, body: {}, user: adminUser };
      const res = createMockRes();
      Prestamo.findByPk.mockResolvedValue(null);
      await actualizarPrestamo(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Pr\u00e9stamo no encontrado' });
    });
    test('H2: actualiza observaciones y retorna prestamo', async () => {
      const update = jest.fn().mockResolvedValue(undefined);
      const prestamoMock = { id: 1, renovaciones: 0, toJSON: () => ({ id: 1 }), update };
      const req = { params: { id: 1 }, body: { observaciones: 'nota' }, user: adminUser };
      const res = createMockRes();
      Prestamo.findByPk.mockResolvedValue(prestamoMock);
      await actualizarPrestamo(req, res);
      expect(update).toHaveBeenCalledWith(expect.objectContaining({ observaciones: 'nota' }));
      expect(createAudit).toHaveBeenCalledWith(expect.objectContaining({ accion: 'actualizar_prestamo' }));
      expect(res.json).toHaveBeenCalledWith(prestamoMock);
    });
    test('H3: estado renovado con renovaciones < 2 extiende fecha', async () => {
      const update = jest.fn().mockResolvedValue(undefined);
      const prestamoMock = { id: 1, renovaciones: 0, fecha_vencimiento: '2026-04-20', toJSON: () => ({ id: 1 }), update };
      const req = { params: { id: 1 }, body: { estado: 'renovado' }, user: adminUser };
      const res = createMockRes();
      Prestamo.findByPk.mockResolvedValue(prestamoMock);
      await actualizarPrestamo(req, res);
      expect(update).toHaveBeenCalledWith(expect.objectContaining({ estado: 'renovado', renovaciones: 1 }));
    });
    test('H4: estado renovado con renovaciones >= 2 retorna 400', async () => {
      const update = jest.fn().mockResolvedValue(undefined);
      const prestamoMock = { id: 1, renovaciones: 2, toJSON: () => ({ id: 1 }), update };
      const req = { params: { id: 1 }, body: { estado: 'renovado' }, user: adminUser };
      const res = createMockRes();
      Prestamo.findByPk.mockResolvedValue(prestamoMock);
      await actualizarPrestamo(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se puede renovar este pr\u00e9stamo nuevamente' });
    });
    test('H5: estado devuelto crea notificacion y libera ejemplar', async () => {
      const update = jest.fn().mockResolvedValue(undefined);
      const updateEjemplar = jest.fn().mockResolvedValue(undefined);
      const prestamoMock = {
        id: 1, usuario_id: 2, ejemplar_id: 3, renovaciones: 0,
        fecha_vencimiento: '2030-12-31', fecha_devolucion: null,
        toJSON: () => ({ id: 1, usuario_id: 2, ejemplar_id: 3 }),
        update,
      };
      const ejemplarMock = { id: 3, libro_id: 5, toJSON: () => ({ id: 3 }), update: updateEjemplar };
      const req = { params: { id: 1 }, body: { estado: 'devuelto' }, user: adminUser };
      const res = createMockRes();
      Prestamo.findByPk.mockResolvedValue(prestamoMock);
      Ejemplar.findByPk.mockResolvedValue(ejemplarMock);
      // asignarSiguienteReserva => Reserva.findOne => null (no hay reservas pendientes)
      Reserva.findOne.mockResolvedValue(null);
      Notificacion.create.mockResolvedValue({ id: 50 });
      // crearMultaPorRetraso => Multa.findOrCreate => no hay retraso (fecha futura)
      // No se creara multa porque la fecha de vencimiento es 2030
      Multa.findOrCreate.mockResolvedValue([{ id: 1, isNewRecord: false }]);
      await actualizarPrestamo(req, res);
      expect(updateEjemplar).toHaveBeenCalledWith({ estado: 'disponible' });
      expect(Notificacion.create).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'devolucion_confirmada' }));
      expect(res.json).toHaveBeenCalledWith(prestamoMock);
    });
    test('H6: devolucion con retraso crea multa y retorna {prestamo, multa}', async () => {
      const update = jest.fn().mockResolvedValue(undefined);
      const updateEjemplar = jest.fn().mockResolvedValue(undefined);
      const prestamoMock = {
        id: 2, usuario_id: 3, ejemplar_id: 4, renovaciones: 0,
        fecha_vencimiento: '2026-04-01', fecha_devolucion: null,
        toJSON: () => ({ id: 2, usuario_id: 3 }),
        update,
      };
      const ejemplarMock = { id: 4, libro_id: 6, toJSON: () => ({ id: 4 }), update: updateEjemplar };
      const multaMock = { id: 77, monto: 52.5, isNewRecord: true };
      const req = { params: { id: 2 }, body: { estado: 'devuelto', fecha_devolucion: '2026-04-22' }, user: adminUser };
      const res = createMockRes();
      Prestamo.findByPk.mockResolvedValue(prestamoMock);
      Ejemplar.findByPk.mockResolvedValue(ejemplarMock);
      Reserva.findOne.mockResolvedValue(null);
      Notificacion.create.mockResolvedValue({ id: 51 });
      Multa.findOrCreate.mockResolvedValue([multaMock, true]);
      await actualizarPrestamo(req, res);
      expect(Multa.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({
        where: { prestamo_id: 2 },
        defaults: expect.objectContaining({ dias_retraso: 21, monto: 52.5 }),
      }));
      expect(res.json).toHaveBeenCalledWith({ prestamo: prestamoMock, multa: multaMock });
    });
    test('H7: retorna 500 si falla', async () => {
      const req = { params: { id: 1 }, body: {}, user: adminUser };
      const res = createMockRes();
      Prestamo.findByPk.mockRejectedValue(new Error('db crash'));
      await actualizarPrestamo(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudo actualizar el pr\u00e9stamo' });
    });
  });

  // BLOQUE I - renovarPrestamo
  describe('renovarPrestamo', () => {
    test('I1: 404 si prestamo no existe', async () => {
      const req = { params: { id: 99 }, user: adminUser };
      const res = createMockRes();
      Prestamo.findByPk.mockResolvedValue(null);
      await renovarPrestamo(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Pr\u00e9stamo no encontrado' });
    });
    test('I2: 400 si prestamo ya fue devuelto', async () => {
      const req = { params: { id: 1 }, user: adminUser };
      const res = createMockRes();
      const prestamoMock = { id: 1, estado: 'devuelto', renovaciones: 0, toJSON: () => ({ id: 1 }), save: jest.fn() };
      Prestamo.findByPk.mockResolvedValue(prestamoMock);
      await renovarPrestamo(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se puede renovar un pr\u00e9stamo devuelto' });
    });
    test('I3: 400 si renovaciones >= 2', async () => {
      const req = { params: { id: 1 }, user: adminUser };
      const res = createMockRes();
      const prestamoMock = { id: 1, estado: 'activo', renovaciones: 2, toJSON: () => ({ id: 1 }), save: jest.fn(), ejemplar_id: 3 };
      Prestamo.findByPk.mockResolvedValue(prestamoMock);
      await renovarPrestamo(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Se alcanz\u00f3 el l\u00edmite de renovaciones' });
    });
    test('I4: 400 si hay reservas pendientes para el libro', async () => {
      const req = { params: { id: 1 }, user: adminUser };
      const res = createMockRes();
      const prestamoMock = { id: 1, estado: 'activo', renovaciones: 0, ejemplar_id: 3, toJSON: () => ({ id: 1 }), save: jest.fn() };
      const ejemplarMock = { id: 3, libro_id: 5, toJSON: () => ({ id: 3 }) };
      Prestamo.findByPk.mockResolvedValue(prestamoMock);
      Ejemplar.findByPk.mockResolvedValue(ejemplarMock);
      Reserva.count.mockResolvedValue(1);
      await renovarPrestamo(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se puede renovar el pr\u00e9stamo porque existe una reserva pendiente para el libro' });
    });
    test('I5: renueva correctamente y extiende fecha 7 dias', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const prestamoMock = {
        id: 1, estado: 'activo', renovaciones: 0, ejemplar_id: 3,
        fecha_vencimiento: '2026-04-22',
        toJSON: () => ({ id: 1 }),
        save,
      };
      const ejemplarMock = { id: 3, libro_id: 5 };
      const req = { params: { id: 1 }, user: adminUser };
      const res = createMockRes();
      Prestamo.findByPk.mockResolvedValue(prestamoMock);
      Ejemplar.findByPk.mockResolvedValue(ejemplarMock);
      Reserva.count.mockResolvedValue(0);
      await renovarPrestamo(req, res);
      expect(save).toHaveBeenCalled();
      expect(prestamoMock.renovaciones).toBe(1);
      expect(prestamoMock.estado).toBe('renovado');
      expect(createAudit).toHaveBeenCalledWith(expect.objectContaining({ accion: 'renovar_prestamo' }));
      expect(res.json).toHaveBeenCalledWith(prestamoMock);
    });
    test('I6: retorna 500 si falla', async () => {
      const req = { params: { id: 1 }, user: adminUser };
      const res = createMockRes();
      Prestamo.findByPk.mockRejectedValue(new Error('db crash'));
      await renovarPrestamo(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudo renovar el pr\u00e9stamo' });
    });
  });

  // BLOQUE J - eliminarPrestamo
  describe('eliminarPrestamo', () => {
    test('J1: 404 si prestamo no existe', async () => {
      const req = { params: { id: 99 }, user: adminUser };
      const res = createMockRes();
      Prestamo.findByPk.mockResolvedValue(null);
      await eliminarPrestamo(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Pr\u00e9stamo no encontrado' });
    });
    test('J2: elimina prestamo devuelto sin liberar ejemplar', async () => {
      const destroy = jest.fn().mockResolvedValue(undefined);
      const prestamoMock = { id: 2, estado: 'devuelto', ejemplar_id: 5, toJSON: () => ({ id: 2 }), destroy };
      const req = { params: { id: 2 }, user: adminUser };
      const res = createMockRes();
      Prestamo.findByPk.mockResolvedValue(prestamoMock);
      await eliminarPrestamo(req, res);
      expect(Ejemplar.findByPk).not.toHaveBeenCalled();
      expect(destroy).toHaveBeenCalled();
      expect(createAudit).toHaveBeenCalledWith(expect.objectContaining({ accion: 'eliminar_prestamo' }));
      expect(res.json).toHaveBeenCalledWith({ message: 'Pr\u00e9stamo eliminado correctamente' });
    });
    test('J3: elimina prestamo activo y libera ejemplar', async () => {
      const destroy = jest.fn().mockResolvedValue(undefined);
      const updateEjemplar = jest.fn().mockResolvedValue(undefined);
      const prestamoMock = { id: 3, estado: 'activo', ejemplar_id: 6, toJSON: () => ({ id: 3 }), destroy };
      const ejemplarMock = { id: 6, toJSON: () => ({ id: 6 }), update: updateEjemplar };
      const req = { params: { id: 3 }, user: adminUser };
      const res = createMockRes();
      Prestamo.findByPk.mockResolvedValue(prestamoMock);
      Ejemplar.findByPk.mockResolvedValue(ejemplarMock);
      await eliminarPrestamo(req, res);
      expect(updateEjemplar).toHaveBeenCalledWith({ estado: 'disponible' });
      expect(destroy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Pr\u00e9stamo eliminado correctamente' });
    });
    test('J4: retorna 500 si falla', async () => {
      const req = { params: { id: 1 }, user: adminUser };
      const res = createMockRes();
      Prestamo.findByPk.mockRejectedValue(new Error('db crash'));
      await eliminarPrestamo(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudo eliminar el pr\u00e9stamo' });
    });
  });
});
