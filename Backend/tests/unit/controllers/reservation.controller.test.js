// Jest mock para los modelos usados en reservation.controllerjs,
//  y para el módulo de auditoría
jest.mock('../../../models', () => ({
  Reserva: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn(), count: jest.fn() },
  Usuario: { findByPk: jest.fn() },
  Libro: { findByPk: jest.fn() },
  Ejemplar: { findByPk: jest.fn(), findOne: jest.fn(), count: jest.fn() },
  Prestamo: { count: jest.fn(), create: jest.fn() },
}));
// El mock de auditoría solo necesita que createAudit
//  sea una función mockeada
jest.mock('../../../utils/audit', () => ({
  createAudit: jest.fn().mockResolvedValue(undefined),
}));
// Importamos los modelos y la función de auditoría (mockeados)
const { Reserva, Usuario, Libro, Ejemplar, Prestamo } = require('../../../models');
const { createAudit } = require('../../../utils/audit');
const {
  listarReservas, listarReservasPendientes, listarReservasPorUsuario,
  obtenerReserva, crearReserva, actualizarReserva, eliminarReserva,
} = require('../../../controllers/reservation.controller');
// Función auxiliar para crear un objeto res con métodos mockeados
const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
// Usuario admin común para los tests que requieren autenticación
const adminUser = { id: 1, rol: { nombre: 'administrador' } };
// Estructura general de los tests: 
// describe por cada función del controller,
describe('reservation.controller unit tests', () => {
  // resetAllMocks limpia tambien las colas de mockResolvedValueOnce
  beforeEach(() => { jest.resetAllMocks(); });

  // BLOQUE A - listarReservas
  describe('listarReservas', () => {
    test('A1: retorna lista de reservas', async () => {
      const req = { user: adminUser };
      const res = createMockRes();
      Reserva.findAll.mockResolvedValue([{ id: 1 }]);
      await listarReservas(req, res);
      expect(Reserva.findAll).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
    });
    test('A2: retorna 500 si falla findAll', async () => {
      const req = { user: adminUser };
      const res = createMockRes();
      Reserva.findAll.mockRejectedValue(new Error('db error'));
      await listarReservas(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudieron obtener las reservas' });
    });
  });

  // BLOQUE B - listarReservasPendientes
  describe('listarReservasPendientes', () => {
    test('B1: retorna solo reservas pendientes', async () => {
      const req = { user: adminUser };
      const res = createMockRes();
      Reserva.findAll.mockResolvedValue([{ id: 3, estado: 'pendiente' }]);
      await listarReservasPendientes(req, res);
      expect(Reserva.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { estado: 'pendiente' } }));
      expect(res.json).toHaveBeenCalledWith([{ id: 3, estado: 'pendiente' }]);
    });
    test('B2: retorna 500 en error', async () => {
      const req = { user: adminUser };
      const res = createMockRes();
      Reserva.findAll.mockRejectedValue(new Error('db error'));
      await listarReservasPendientes(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudieron obtener las reservas pendientes' });
    });
  });

  // BLOQUE C - listarReservasPorUsuario
  describe('listarReservasPorUsuario', () => {
    test('C1: retorna reservas del usuario indicado', async () => {
      const req = { params: { usuarioId: 5 }, user: adminUser };
      const res = createMockRes();
      Reserva.findAll.mockResolvedValue([{ id: 10, usuario_id: 5 }]);
      await listarReservasPorUsuario(req, res);
      expect(Reserva.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { usuario_id: 5 } }));
      expect(res.json).toHaveBeenCalledWith([{ id: 10, usuario_id: 5 }]);
    });
    test('C2: retorna 500 en error', async () => {
      const req = { params: { usuarioId: 5 }, user: adminUser };
      const res = createMockRes();
      Reserva.findAll.mockRejectedValue(new Error('db error'));
      await listarReservasPorUsuario(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudieron obtener las reservas del usuario' });
    });
  });

  // BLOQUE D - obtenerReserva
  describe('obtenerReserva', () => {
    test('D1: retorna reserva por id', async () => {
      const req = { params: { id: 7 }, user: adminUser };
      const res = createMockRes();
      Reserva.findByPk.mockResolvedValue({ id: 7 });
      await obtenerReserva(req, res);
      expect(Reserva.findByPk).toHaveBeenCalledWith(7, expect.any(Object));
      expect(res.json).toHaveBeenCalledWith({ id: 7 });
    });
    test('D2: retorna 404 si no existe', async () => {
      const req = { params: { id: 999 }, user: adminUser };
      const res = createMockRes();
      Reserva.findByPk.mockResolvedValue(null);
      await obtenerReserva(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Reserva no encontrada' });
    });
    test('D3: retorna 500 si falla', async () => {
      const req = { params: { id: 1 }, user: adminUser };
      const res = createMockRes();
      Reserva.findByPk.mockRejectedValue(new Error('db error'));
      await obtenerReserva(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudo obtener la reserva' });
    });
  });

  // BLOQUE E - crearReserva
  // Orden de llamadas en crearReserva:
  //   1. Libro.findByPk
  //   2. Usuario.findByPk
  //   3. Prestamo.count (activeLoans)
  //   4. Ejemplar.count (disponibles)
  //   5. [si disponibles>0 && !solicitar_prestamo] => 400 "ejemplares disponibles"
  //   6. Ejemplar.count (totales)
  //   7. [si totales===0] => 400 "no hay ejemplares"
  //   8. Reserva.count (reservaExistente)
  //   9. [si >0] => 400 "ya existe reserva"
  //  10. [si disponibles>0 && solicitar_prestamo] => Ejemplar.findOne
  describe('crearReserva', () => {
    test('E1: retorna 400 si faltan libro_id o usuario_id', async () => {
      const req = { body: { libro_id: 1 }, user: adminUser };
      const res = createMockRes();
      await crearReserva(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'libro_id y usuario_id son requeridos' });
    });
    test('E2: retorna 404 si libro no existe', async () => {
      const req = { body: { libro_id: 1, usuario_id: 2 }, user: adminUser };
      const res = createMockRes();
      Libro.findByPk.mockResolvedValue(null);
      await crearReserva(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Libro no encontrado' });
    });
    test('E3: retorna 404 si usuario no existe', async () => {
      const req = { body: { libro_id: 1, usuario_id: 2 }, user: adminUser };
      const res = createMockRes();
      Libro.findByPk.mockResolvedValue({ id: 1 });
      Usuario.findByPk.mockResolvedValue(null);
      await crearReserva(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Usuario no encontrado' });
    });
    test('E4: retorna 400 si usuario alcanzo max_prestamos', async () => {
      const req = { body: { libro_id: 1, usuario_id: 2 }, user: adminUser };
      const res = createMockRes();
      Libro.findByPk.mockResolvedValue({ id: 1 });
      Usuario.findByPk.mockResolvedValue({ id: 2, max_prestamos: 3 });
      Prestamo.count.mockResolvedValue(3);
      await crearReserva(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'El usuario alcanz\u00f3 el m\u00e1ximo de pr\u00e9stamos activos' });
    });
    test('E5: retorna 400 si hay ejemplares disponibles y no solicitar_prestamo', async () => {
      const req = { body: { libro_id: 1, usuario_id: 2, solicitar_prestamo: false }, user: adminUser };
      const res = createMockRes();
      Libro.findByPk.mockResolvedValue({ id: 1 });
      Usuario.findByPk.mockResolvedValue({ id: 2, max_prestamos: 3 });
      Prestamo.count.mockResolvedValue(0);
      // disponibles=2 => entra en la validacion "no es necesario reservarlo"
      Ejemplar.count.mockResolvedValueOnce(2);
      await crearReserva(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'El libro tiene ejemplares disponibles; no es necesario reservarlo' });
    });
    test('E6: retorna 400 si no hay ejemplares registrados', async () => {
      const req = { body: { libro_id: 1, usuario_id: 2 }, user: adminUser };
      const res = createMockRes();
      Libro.findByPk.mockResolvedValue({ id: 1 });
      Usuario.findByPk.mockResolvedValue({ id: 2, max_prestamos: 3 });
      Prestamo.count.mockResolvedValue(0);
      // disponibles=0 (no entra en "no es necesario"), totales=0 => "no hay ejemplares"
      Ejemplar.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      await crearReserva(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'No hay ejemplares registrados para este libro' });
    });
    test('E7: retorna 400 si ya existe reserva activa del usuario', async () => {
      const req = { body: { libro_id: 1, usuario_id: 2 }, user: adminUser };
      const res = createMockRes();
      Libro.findByPk.mockResolvedValue({ id: 1 });
      Usuario.findByPk.mockResolvedValue({ id: 2, max_prestamos: 3 });
      Prestamo.count.mockResolvedValue(0);
      // disponibles=0, totales=2 => pasa ambas validaciones de ejemplares
      Ejemplar.count.mockResolvedValueOnce(0).mockResolvedValueOnce(2);
      Reserva.count.mockResolvedValue(1);
      await crearReserva(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Ya existe una reserva activa para este libro por este usuario' });
    });
    test('E8: crea reserva pendiente y responde 201', async () => {
      const req = { body: { libro_id: 1, usuario_id: 2 }, user: adminUser };
      const res = createMockRes();
      const reservaMock = { id: 20, toJSON: () => ({ id: 20 }) };
      Libro.findByPk.mockResolvedValue({ id: 1 });
      Usuario.findByPk.mockResolvedValue({ id: 2, max_prestamos: 3 });
      Prestamo.count.mockResolvedValue(0);
      // disponibles=0, totales=2
      Ejemplar.count.mockResolvedValueOnce(0).mockResolvedValueOnce(2);
      Reserva.count.mockResolvedValue(0);
      Reserva.create.mockResolvedValue(reservaMock);
      await crearReserva(req, res);
      expect(Reserva.create).toHaveBeenCalledWith(expect.objectContaining({ libro_id: 1, usuario_id: 2, estado: 'pendiente' }));
      expect(createAudit).toHaveBeenCalledWith(expect.objectContaining({ accion: 'crear_reserva' }));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(reservaMock);
    });
    test('E9: solicitud online con ejemplar_id valido crea reserva disponible (201)', async () => {
      const updateFn = jest.fn().mockResolvedValue(undefined);
      const ejemplarMock = {
        id: 5, estado: 'disponible',
        update: updateFn,
        toJSON: () => ({ id: 5, estado: 'disponible' }),
      };
      const reservaMock = { id: 21, toJSON: () => ({ id: 21 }) };
      const req = {
        body: { libro_id: 1, usuario_id: 2, solicitar_prestamo: true, ejemplar_id: 5 },
        user: adminUser,
      };
      const res = createMockRes();
      Libro.findByPk.mockResolvedValue({ id: 1 });
      Usuario.findByPk.mockResolvedValue({ id: 2, max_prestamos: 3 });
      Prestamo.count.mockResolvedValue(0);
      // disponibles=1 => pasa la primera validacion (solicitar_prestamo=true)
      // totales=1 => pasa la segunda validacion
      Ejemplar.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
      Reserva.count.mockResolvedValue(0);
      Ejemplar.findOne.mockResolvedValue(ejemplarMock);
      Reserva.create.mockResolvedValue(reservaMock);
      await crearReserva(req, res);
      expect(updateFn).toHaveBeenCalledWith({ estado: 'reservado' });
      expect(Reserva.create).toHaveBeenCalledWith(expect.objectContaining({ estado: 'disponible', notificado: true }));
      expect(createAudit).toHaveBeenCalledWith(expect.objectContaining({ accion: 'solicitar_prestamo_online' }));
      expect(res.status).toHaveBeenCalledWith(201);
    });
    test('E10: retorna 400 si ejemplar_id no pertenece al libro', async () => {
      const req = { body: { libro_id: 1, usuario_id: 2, solicitar_prestamo: true, ejemplar_id: 99 }, user: adminUser };
      const res = createMockRes();
      Libro.findByPk.mockResolvedValue({ id: 1 });
      Usuario.findByPk.mockResolvedValue({ id: 2, max_prestamos: 3 });
      Prestamo.count.mockResolvedValue(0);
      Ejemplar.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
      Reserva.count.mockResolvedValue(0);
      Ejemplar.findOne.mockResolvedValue(null);
      await crearReserva(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'El ejemplar seleccionado no pertenece al libro' });
    });
    test('E11: retorna 400 si ejemplar seleccionado no esta disponible', async () => {
      const req = { body: { libro_id: 1, usuario_id: 2, solicitar_prestamo: true, ejemplar_id: 5 }, user: adminUser };
      const res = createMockRes();
      const ejemplarOcupado = { id: 5, estado: 'prestado', toJSON: () => ({}) };
      Libro.findByPk.mockResolvedValue({ id: 1 });
      Usuario.findByPk.mockResolvedValue({ id: 2, max_prestamos: 3 });
      Prestamo.count.mockResolvedValue(0);
      Ejemplar.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
      Reserva.count.mockResolvedValue(0);
      Ejemplar.findOne.mockResolvedValue(ejemplarOcupado);
      await crearReserva(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'El ejemplar seleccionado ya no est\u00e1 disponible' });
    });
    test('E12: retorna 500 si falla operacion interna', async () => {
      const req = { body: { libro_id: 1, usuario_id: 2 }, user: adminUser };
      const res = createMockRes();
      Libro.findByPk.mockRejectedValue(new Error('db crash'));
      await crearReserva(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudo crear la reserva' });
    });
  });

  // BLOQUE F - actualizarReserva
  describe('actualizarReserva', () => {
    test('F1: 404 si reserva no existe', async () => {
      const req = { params: { id: 99 }, body: {}, user: adminUser };
      const res = createMockRes();
      Reserva.findByPk.mockResolvedValue(null);
      await actualizarReserva(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Reserva no encontrada' });
    });
    test('F2: estudiante no puede modificar reserva ajena (403)', async () => {
      const reservaMock = { id: 1, usuario_id: 99, toJSON: () => ({}), update: jest.fn() };
      const req = { params: { id: 1 }, body: { estado: 'cancelada' }, user: { id: 5, rol: { nombre: 'estudiante' } } };
      const res = createMockRes();
      Reserva.findByPk.mockResolvedValue(reservaMock);
      await actualizarReserva(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'No puedes modificar reservas de otro usuario' });
    });
    test('F3: estudiante solo puede cancelar su reserva (403 si pide otro estado)', async () => {
      const reservaMock = { id: 1, usuario_id: 5, toJSON: () => ({}), update: jest.fn() };
      const req = { params: { id: 1 }, body: { estado: 'completada' }, user: { id: 5, rol: { nombre: 'estudiante' } } };
      const res = createMockRes();
      Reserva.findByPk.mockResolvedValue(reservaMock);
      await actualizarReserva(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Solo puedes cancelar tu reserva' });
    });
    test('F4: actualiza campos permitidos y responde la reserva', async () => {
      const update = jest.fn().mockResolvedValue(undefined);
      const reservaMock = { id: 1, usuario_id: 2, ejemplar_id: null, toJSON: () => ({ id: 1 }), update };
      const req = { params: { id: 1 }, body: { notificado: true }, user: adminUser };
      const res = createMockRes();
      Reserva.findByPk.mockResolvedValue(reservaMock);
      await actualizarReserva(req, res);
      expect(update).toHaveBeenCalledWith(expect.objectContaining({ notificado: true }));
      expect(createAudit).toHaveBeenCalledWith(expect.objectContaining({ accion: 'actualizar_reserva' }));
      expect(res.json).toHaveBeenCalledWith(reservaMock);
    });
    test('F5: estado disponible + ejemplar_id marca ejemplar como reservado', async () => {
      const updateReserva = jest.fn().mockResolvedValue(undefined);
      const updateEjemplar = jest.fn().mockResolvedValue(undefined);
      const reservaMock = { id: 1, usuario_id: 2, ejemplar_id: null, toJSON: () => ({ id: 1 }), update: updateReserva };
      const ejemplarMock = { id: 3, toJSON: () => ({ id: 3 }), update: updateEjemplar };
      const req = { params: { id: 1 }, body: { estado: 'disponible', ejemplar_id: 3 }, user: adminUser };
      const res = createMockRes();
      Reserva.findByPk.mockResolvedValue(reservaMock);
      Ejemplar.findByPk.mockResolvedValue(ejemplarMock);
      await actualizarReserva(req, res);
      expect(updateEjemplar).toHaveBeenCalledWith({ estado: 'reservado' });
      expect(createAudit).toHaveBeenCalledWith(expect.objectContaining({ accion: 'reservar_ejemplar' }));
    });
    test('F6: estado completada sin ejemplar asignado => 400', async () => {
      const update = jest.fn().mockResolvedValue(undefined);
      const reservaMock = { id: 1, usuario_id: 2, ejemplar_id: null, toJSON: () => ({ id: 1 }), update };
      const req = { params: { id: 1 }, body: { estado: 'completada' }, user: adminUser };
      const res = createMockRes();
      Reserva.findByPk.mockResolvedValue(reservaMock);
      await actualizarReserva(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'La reserva no tiene ejemplar asignado para completar el pr\u00e9stamo' });
    });
    test('F7: estado completada crea prestamo y pone ejemplar en prestado', async () => {
      const updateReserva = jest.fn().mockResolvedValue(undefined);
      const updateEjemplar = jest.fn().mockResolvedValue(undefined);
      const prestamoMock = { id: 55, toJSON: () => ({ id: 55 }) };
      const reservaMock = { id: 1, usuario_id: 2, ejemplar_id: 4, toJSON: () => ({ id: 1 }), update: updateReserva };
      const ejemplarMock = { id: 4, toJSON: () => ({ id: 4 }), update: updateEjemplar };
      const req = { params: { id: 1 }, body: { estado: 'completada' }, user: adminUser };
      const res = createMockRes();
      Reserva.findByPk.mockResolvedValue(reservaMock);
      Ejemplar.findByPk.mockResolvedValue(ejemplarMock);
      Usuario.findByPk.mockResolvedValue({ id: 2, max_prestamos: 3 });
      Prestamo.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      Prestamo.create.mockResolvedValue(prestamoMock);
      await actualizarReserva(req, res);
      expect(updateEjemplar).toHaveBeenCalledWith({ estado: 'prestado' });
      expect(Prestamo.create).toHaveBeenCalledWith(expect.objectContaining({ estado: 'activo', renovaciones: 0 }));
      expect(createAudit).toHaveBeenCalledWith(expect.objectContaining({ accion: 'completar_reserva' }));
      expect(createAudit).toHaveBeenCalledWith(expect.objectContaining({ accion: 'crear_prestamo_desde_reserva' }));
    });
    test('F8: estado cancelada libera ejemplar reservado', async () => {
      const updateReserva = jest.fn().mockResolvedValue(undefined);
      const updateEjemplar = jest.fn().mockResolvedValue(undefined);
      const reservaMock = { id: 1, usuario_id: 5, ejemplar_id: 3, toJSON: () => ({ id: 1 }), update: updateReserva };
      const ejemplarMock = { id: 3, estado: 'reservado', toJSON: () => ({ id: 3 }), update: updateEjemplar };
      const req = { params: { id: 1 }, body: { estado: 'cancelada' }, user: { id: 5, rol: { nombre: 'estudiante' } } };
      const res = createMockRes();
      Reserva.findByPk.mockResolvedValue(reservaMock);
      Ejemplar.findByPk.mockResolvedValue(ejemplarMock);
      await actualizarReserva(req, res);
      expect(updateEjemplar).toHaveBeenCalledWith({ estado: 'disponible' });
      expect(createAudit).toHaveBeenCalledWith(expect.objectContaining({ accion: 'liberar_ejemplar_reserva_cancelada' }));
    });
    test('F9: retorna 500 si falla internamente', async () => {
      const req = { params: { id: 1 }, body: {}, user: adminUser };
      const res = createMockRes();
      Reserva.findByPk.mockRejectedValue(new Error('db crash'));
      await actualizarReserva(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudo actualizar la reserva' });
    });
  });

  // BLOQUE G - eliminarReserva
  describe('eliminarReserva', () => {
    test('G1: 404 si reserva no existe', async () => {
      const req = { params: { id: 99 }, user: adminUser };
      const res = createMockRes();
      Reserva.findByPk.mockResolvedValue(null);
      await eliminarReserva(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Reserva no encontrada' });
    });
    test('G2: elimina reserva sin ejemplar y responde mensaje ok', async () => {
      const destroy = jest.fn().mockResolvedValue(undefined);
      const reservaMock = { id: 2, ejemplar_id: null, toJSON: () => ({ id: 2 }), destroy };
      const req = { params: { id: 2 }, user: adminUser };
      const res = createMockRes();
      Reserva.findByPk.mockResolvedValue(reservaMock);
      await eliminarReserva(req, res);
      expect(destroy).toHaveBeenCalled();
      expect(createAudit).toHaveBeenCalledWith(expect.objectContaining({ accion: 'eliminar_reserva' }));
      expect(res.json).toHaveBeenCalledWith({ message: 'Reserva eliminada correctamente' });
    });
    test('G3: libera ejemplar reservado antes de eliminar', async () => {
      const destroy = jest.fn().mockResolvedValue(undefined);
      const updateEjemplar = jest.fn().mockResolvedValue(undefined);
      const reservaMock = { id: 3, ejemplar_id: 7, toJSON: () => ({ id: 3 }), destroy };
      const ejemplarMock = { id: 7, estado: 'reservado', toJSON: () => ({ id: 7 }), update: updateEjemplar };
      const req = { params: { id: 3 }, user: adminUser };
      const res = createMockRes();
      Reserva.findByPk.mockResolvedValue(reservaMock);
      Ejemplar.findByPk.mockResolvedValue(ejemplarMock);
      await eliminarReserva(req, res);
      expect(updateEjemplar).toHaveBeenCalledWith({ estado: 'disponible' });
      expect(createAudit).toHaveBeenCalledWith(expect.objectContaining({ accion: 'liberar_ejemplar_reserva_eliminada' }));
      expect(destroy).toHaveBeenCalled();
    });
    test('G4: retorna 500 si falla eliminacion', async () => {
      const req = { params: { id: 1 }, user: adminUser };
      const res = createMockRes();
      Reserva.findByPk.mockRejectedValue(new Error('db crash'));
      await eliminarReserva(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudo eliminar la reserva' });
    });
  });
});
