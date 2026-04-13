
CREATE DATABASE IF NOT EXISTS biblioteca_xyz
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE biblioteca_xyz;


CREATE TABLE roles (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre      ENUM('administrador', 'bibliotecario', 'estudiante') NOT NULL UNIQUE,
  descripcion VARCHAR(255),
  createdAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;


CREATE TABLE usuarios (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(150) NOT NULL,
  apellido        VARCHAR(150) NOT NULL,
  correo          VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  matricula       VARCHAR(50) UNIQUE,
  rol_id          INT UNSIGNED NOT NULL,
  token           VARCHAR(512) UNIQUE,
  max_prestamos   TINYINT UNSIGNED NOT NULL DEFAULT 3,
  createdAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuarios_rol FOREIGN KEY (rol_id) REFERENCES roles(id)
) ENGINE=InnoDB;

CREATE TABLE categorias (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL UNIQUE,
  descripcion VARCHAR(255),
  createdAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;


CREATE TABLE libros (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titulo       VARCHAR(300) NOT NULL,
  autor        VARCHAR(200) NOT NULL,
  editorial    VARCHAR(150),
  isbn         VARCHAR(20) UNIQUE,
  anio         SMALLINT,
  categoria_id INT UNSIGNED,
  descripcion  TEXT,
  palabras_clave VARCHAR(500),
  imagen_url   VARCHAR(500),
  ejemplares   INT,
  createdAt    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_libros_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE ejemplares (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  libro_id  INT UNSIGNED NOT NULL,
  codigo    VARCHAR(50) NOT NULL UNIQUE,
  estado    ENUM('disponible','prestado','reservado','mantenimiento') NOT NULL DEFAULT 'disponible',
  notas     VARCHAR(255),
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ejemplares_libro FOREIGN KEY (libro_id) REFERENCES libros(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE prestamos (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ejemplar_id        INT UNSIGNED NOT NULL,
  usuario_id          INT UNSIGNED NOT NULL,
  bibliotecario_id    INT UNSIGNED,           
  fecha_inicio        DATE NOT NULL,
  fecha_vencimiento   DATE NOT NULL,
  fecha_devolucion    DATE,                   
  estado              ENUM('activo','renovado','devuelto','vencido') NOT NULL DEFAULT 'activo',
  renovaciones        TINYINT UNSIGNED NOT NULL DEFAULT 0,
  observaciones       TEXT,
  createdAt           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_prestamos_ejemplar      FOREIGN KEY (ejemplar_id)      REFERENCES ejemplares(id),
  CONSTRAINT fk_prestamos_usuario       FOREIGN KEY (usuario_id)       REFERENCES usuarios(id),
  CONSTRAINT fk_prestamos_bibliotecario FOREIGN KEY (bibliotecario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;


CREATE TABLE reservas (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  libro_id        INT UNSIGNED NOT NULL,      
  usuario_id      INT UNSIGNED NOT NULL,
  ejemplar_id      INT UNSIGNED,
  fecha_reserva   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_expiracion DATETIME,                  
  estado          ENUM('pendiente','disponible','cancelada','completada') NOT NULL DEFAULT 'pendiente',
  notificado      TINYINT(1) NOT NULL DEFAULT 0,
  createdAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_reservas_libro    FOREIGN KEY (libro_id)    REFERENCES libros(id),
  CONSTRAINT fk_reservas_usuario  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)
    CONSTRAINT fk_reservas_ejemplar FOREIGN KEY (ejemplar_id) REFERENCES ejemplares(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;


CREATE TABLE multas (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  prestamo_id     INT UNSIGNED NOT NULL UNIQUE,
  usuario_id      INT UNSIGNED NOT NULL,
  dias_retraso    INT UNSIGNED NOT NULL DEFAULT 0,
  monto           DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  estado          ENUM('pendiente','pagada','condonada') NOT NULL DEFAULT 'pendiente',
  fecha_pago      DATE,
  createdAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_multas_prestamo FOREIGN KEY (prestamo_id) REFERENCES prestamos(id),
  CONSTRAINT fk_multas_usuario  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE notificaciones (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT UNSIGNED NOT NULL,
  tipo        ENUM('reserva_disponible','vencimiento_proximo','multa_pendiente','devolucion_confirmada') NOT NULL,
  mensaje     TEXT NOT NULL,
  leida       TINYINT(1) NOT NULL DEFAULT 0,
  referencia_id   INT UNSIGNED,              
  referencia_tipo VARCHAR(20),               
  createdAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_notificaciones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;


CREATE TABLE auditoria (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id      INT UNSIGNED,              
  accion          VARCHAR(100) NOT NULL,     
  entidad         VARCHAR(50) NOT NULL,      
  entidad_id      INT UNSIGNED,
  detalle         JSON,                      
  createdAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;


INSERT INTO roles (nombre, descripcion) VALUES
  ('administrador', 'Control total del sistema, reportes y configuración'),
  ('bibliotecario', 'Gestión de préstamos, devoluciones y reservas'),
  ('estudiante',    'Consulta de catálogo, reservas y préstamos');

INSERT INTO categorias (nombre) VALUES
  ('Ciencias exactas'),
  ('Literatura'),
  ('Historia'),
  ('Tecnología'),
  ('Ciencias sociales'),
  ('Derecho'),
  ('Medicina'),
  ('Arte y diseño');