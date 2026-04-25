jest.mock('../../../controllers/user.controller', () => ({
    crearUsuario: jest.fn(),
}));

jest.mock('../../../models', () => ({
    Usuario: {
        findOne: jest.fn(),
    },
    Rol: {},
}));

jest.mock('bcryptjs', () => ({
    compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn(),
}));

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Usuario } = require('../../../models');
const { crearUsuario } = require('../../../controllers/user.controller');
const { login, register } = require('../../../controllers/auth.controller');

const createMockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('auth.controller unit tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('login', () => {
        test('retorna 400 si faltan correo o password', async () => {
            const req = { body: { correo: 'demo@mail.com' } };
            const res = createMockRes();

            await login(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Correo y password son requeridos' });
        });

        test('retorna 401 si el usuario no existe', async () => {
            const req = { body: { correo: 'noexiste@mail.com', password: '123456' } };
            const res = createMockRes();
            Usuario.findOne.mockResolvedValue(null);

            await login(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Credenciales inválidas' });
        });

        test('retorna 200 y token si las credenciales son válidas', async () => {
            const req = { body: { correo: 'ok@mail.com', password: '123456' } };
            const res = createMockRes();
            const update = jest.fn().mockResolvedValue(undefined);
            const usuarioMock = {
                id: 10,
                nombre: 'Ana',
                apellido: 'Perez',
                correo: 'ok@mail.com',
                matricula: 'ANA-PER-EST-2026-101010',
                rol_id: 3,
                max_prestamos: 3,
                password_hash: 'hash_db',
                rol: { nombre: 'estudiante' },
                update,
            };

            Usuario.findOne.mockResolvedValue(usuarioMock);
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('token-falso');

            //Act
            await login(req, res);
            //Assert
            expect(jwt.sign).toHaveBeenCalled();
            expect(update).toHaveBeenCalledWith({ token: 'token-falso' });
            expect(res.json).toHaveBeenCalledWith({
                token: 'token-falso',
                user: {
                    id: 10,
                    nombre: 'Ana',
                    apellido: 'Perez',
                    correo: 'ok@mail.com',
                    matricula: 'ANA-PER-EST-2026-101010',
                    rol_id: 3,
                    rol: 'estudiante',
                    max_prestamos: 3,
                },
            });
        });
    });

    describe('register', () => {
        test('retorna 400 si faltan campos requeridos', async () => {
            const req = { body: { nombre: 'Ana' } };
            const res = createMockRes();

            await register(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'nombre, apellido, correo y password son requeridos',
            });
        });

        test('inyecta rol_id y max_prestamos y delega en crearUsuario', async () => {
            const req = {
                body: {
                    nombre: 'Ana',
                    apellido: 'Perez',
                    correo: 'ana@mail.com',
                    password: '123456',
                },
            };
            const res = createMockRes();
            crearUsuario.mockResolvedValue(undefined);

            await register(req, res);

            expect(req.body.rol_id).toBe(3);
            expect(req.body.max_prestamos).toBe(3);
            expect(crearUsuario).toHaveBeenCalledWith(req, res);
        });
    });
});