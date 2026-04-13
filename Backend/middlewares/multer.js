const multer = require('multer');
const path   = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'Media/uploads');  // carpeta donde se guardan
  },
filename: (req, file, cb) => {
  const ext  = path.extname(file.originalname);
  const isbn = req.body.isbn || Date.now(); // fallback si no viene isbn
  cb(null, `${isbn}${ext}`);  // ej: 978-0307474728.jpg
},
});

const fileFilter = (req, file, cb) => {
  const permitidos = ['image/jpeg', 'image/png', 'image/webp'];
  if (permitidos.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'));
  }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
