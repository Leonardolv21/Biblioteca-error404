jest.mock('../../../models/Libro', () => ({
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
}));

jest.mock('../../../models/Categoria', () => ({}));
jest.mock('../../../models/Ejemplar', () => ({}));

jest.mock('fs', () => ({
    existsSync: jest.fn(),
    unlinkSync: jest.fn(),
    renameSync: jest.fn(),
}));

const Libro = require('../../../models/Libro');
const fs = require('fs');
const {
    getLibros,
    getLibroPorId,
    crearLibro,
    actualizarLibro,
    eliminarLibro,
} = require('../../../controllers/libro.controller');

const createMockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('libro.controller unit tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getLibros', () => {
        test('retorna lista de libros', async () => {
            const req = { query: {} };
            const res = createMockRes();
            const librosMock = [{ id: 1, titulo: 'Clean Code' }];
            Libro.findAll.mockResolvedValue(librosMock);

            await getLibros(req, res);

            expect(Libro.findAll).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(librosMock);
        });
    });

    describe('getLibroPorId', () => {
        test('retorna 404 si no existe libro', async () => {
            const req = { params: { id: 999 } };
            const res = createMockRes();
            Libro.findByPk.mockResolvedValue(null);

            await getLibroPorId(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Libro no encontrado' });
        });
    });

    describe('crearLibro', () => {
        test('crea libro y retorna 201', async () => {
            const req = {
                body: {
                    titulo: 'Node.js Design Patterns',
                    autor: 'Mario Casciaro',
                    editorial: 'Packt',
                    isbn: '9781839214110',
                    anio: 2020,
                    categoria_id: 1,
                    descripcion: 'Libro de Node.js',
                    ejemplares: 3,
                },
                file: { filename: '9781839214110.jpg' },
            };
            const res = createMockRes();
            const libroCreado = { id: 3, ...req.body, imagen_url: '9781839214110.jpg' };
            Libro.create.mockResolvedValue(libroCreado);

            await crearLibro(req, res);

            expect(Libro.create).toHaveBeenCalledWith({
                titulo: 'Node.js Design Patterns',
                autor: 'Mario Casciaro',
                editorial: 'Packt',
                isbn: '9781839214110',
                anio: 2020,
                categoria_id: 1,
                descripcion: 'Libro de Node.js',
                imagen_url: '9781839214110.jpg',
                ejemplares: 3,
            });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(libroCreado);
        });
    });

    describe('actualizarLibro', () => {
        test('retorna 404 si no existe el libro', async () => {
            const req = { params: { id: 99 }, body: {} };
            const res = createMockRes();
            Libro.findByPk.mockResolvedValue(null);

            await actualizarLibro(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Libro no encontrado' });
        });

        test('actualiza libro y renombra imagen si llega archivo', async () => {
            const update = jest.fn().mockResolvedValue(undefined);
            const libroMock = { id: 5, isbn: '9780000000', imagen_url: 'anterior.jpg', update };
            const req = {
                params: { id: 5 },
                body: { titulo: 'Nuevo titulo' },
                file: { filename: 'temporal.webp' },
            };
            const res = createMockRes();
            Libro.findByPk.mockResolvedValue(libroMock);
            fs.existsSync.mockReturnValue(true);

            await actualizarLibro(req, res);

            expect(fs.unlinkSync).toHaveBeenCalled();
            expect(fs.renameSync).toHaveBeenCalled();
            expect(update).toHaveBeenCalledWith({
                titulo: 'Nuevo titulo',
                imagen_url: '9780000000.webp',
            });
            expect(res.json).toHaveBeenCalledWith({
                message: 'Libro actualizado correctamente',
                libro: libroMock,
            });
        });
    });

    describe('eliminarLibro', () => {
        test('elimina libro y su imagen', async () => {
            const destroy = jest.fn().mockResolvedValue(undefined);
            const libroMock = { id: 7, imagen_url: 'portada.png', destroy };
            const req = { params: { id: 7 } };
            const res = createMockRes();
            Libro.findByPk.mockResolvedValue(libroMock);
            fs.existsSync.mockReturnValue(true);

            await eliminarLibro(req, res);

            expect(fs.unlinkSync).toHaveBeenCalled();
            expect(destroy).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({ message: 'Libro eliminado correctamente' });
        });
    });
});
