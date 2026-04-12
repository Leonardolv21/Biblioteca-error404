const generarMatricula = (nombre, apellido, rolNombre) => {
  const ahora         = new Date();
  const anio          = ahora.getFullYear();
  const horas         = String(ahora.getHours()).padStart(2, '0');
  const minutos       = String(ahora.getMinutes()).padStart(2, '0');
  const segundos      = String(ahora.getSeconds()).padStart(2, '0');
  const hora          = `${horas}${minutos}${segundos}`;

  const parteNombre   = nombre.substring(0, 3).toUpperCase();
  const parteApellido = apellido.substring(0, Math.min(3, apellido.length)).toUpperCase();
  const parteRol      = rolNombre.substring(0, 3).toUpperCase();

  return `${parteNombre}-${parteApellido}-${parteRol}-${anio}-${hora}`;
};

module.exports = generarMatricula;