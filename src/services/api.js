// Cliente HTTP común. Todos los servicios hablan con el backend a través de `peticion`.
//
// - En desarrollo: VITE_API_BASE_URL apunta a la API (ver .env.development).
// - En producción: no se define y se usa '/api', porque Caddy sirve el frontend y reenvía
//   /api al backend desde el mismo dominio.
export const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'

const CLAVE_SESION = 'usuarioActual'
const MENSAJE_SIN_CONEXION = 'No se pudo conectar con el servidor. Inténtalo más tarde.'

// Error de una petición. `estado` es el código HTTP (0 si no hubo conexión) y `message`
// el texto en español que entrega el backend, listo para mostrárselo al usuario.
export class ErrorApi extends Error {
  constructor(estado, mensaje) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.estado = estado
  }
}

function tokenActual() {
  try {
    const sesion = JSON.parse(localStorage.getItem(CLAVE_SESION))
    return sesion?.token ?? null
  } catch {
    return null
  }
}

// `conToken: false` evita enviar el JWT (ingreso, registro y lectura pública del catálogo).
export async function peticion(ruta, { metodo = 'GET', cuerpo, conToken = true } = {}) {
  const headers = {}
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json'

  if (conToken) {
    const token = tokenActual()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let respuesta
  try {
    respuesta = await fetch(`${apiBase}${ruta}`, {
      method: metodo,
      headers,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    })
  } catch {
    throw new ErrorApi(0, MENSAJE_SIN_CONEXION)
  }

  const datos = respuesta.status === 204 ? null : await respuesta.json().catch(() => null)

  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, datos?.mensaje || `Error ${respuesta.status}`)
  }

  return datos
}
