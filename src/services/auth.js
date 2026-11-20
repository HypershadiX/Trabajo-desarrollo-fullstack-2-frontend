import { ErrorApi, peticion } from './api.js'

const CLAVE_SESION = 'usuarioActual'

// --- Sesión ---
// Se guarda lo que devuelve el backend al ingresar: { usuario, rol, token }.
// El token (JWT) lo adjunta automáticamente `peticion` en cada llamada.

export function iniciarSesion(usuario) {
  localStorage.setItem(CLAVE_SESION, JSON.stringify(usuario))
}

export function obtenerUsuarioActual() {
  const datos = localStorage.getItem(CLAVE_SESION)
  return datos ? JSON.parse(datos) : null
}

export function cerrarSesion() {
  localStorage.removeItem(CLAVE_SESION)
}

// --- Ingreso ---
// Devuelve { usuario, rol, token } si las credenciales son correctas y undefined si no.
// Si no hay conexión con el servidor lanza un ErrorApi para que la pantalla lo informe.

async function ingresar(ruta, usuario, contrasena) {
  if (usuario === '' || contrasena === '') return undefined

  try {
    return await peticion(ruta, { metodo: 'POST', cuerpo: { usuario, contrasena }, conToken: false })
  } catch (error) {
    if (error instanceof ErrorApi && error.estado === 401) return undefined
    throw error
  }
}

export function validarLogin(usuario, contrasena) {
  return ingresar('/auth/login', usuario, contrasena)
}

export function validarLoginAdmin(usuario, contrasena) {
  return ingresar('/auth/admin/login', usuario, contrasena)
}

// --- Acciones con respuesta { ok, mensaje } (registro y recuperación) ---

async function enviarAccion(ruta, cuerpo) {
  try {
    const datos = await peticion(ruta, { metodo: 'POST', cuerpo, conToken: false })
    return { ok: true, mensaje: datos.mensaje }
  } catch (error) {
    if (error instanceof ErrorApi) return { ok: false, mensaje: error.message }
    throw error
  }
}

export async function crearUsuario(usuario, contrasena) {
  if (usuario === '' || contrasena === '') {
    return { ok: false, mensaje: 'Completa usuario y contraseña.' }
  }

  return enviarAccion('/auth/registro', { usuario, contrasena })
}

// --- Recuperar contraseña ---

export async function enviarCodigoRecuperacion(usuario) {
  if (usuario === '') {
    return { ok: false, mensaje: 'Ingresa tu nombre de usuario.' }
  }

  return enviarAccion('/auth/recuperar', { usuario })
}

// El servidor recuerda qué código se emitió para `usuario`, por eso ahora hay que indicarlo.
export async function restablecerContrasena(usuario, codigoIngresado, nuevaContrasena) {
  if (codigoIngresado === '') {
    return { ok: false, mensaje: 'Ingresa el código que enviamos a tu correo.' }
  }

  if (nuevaContrasena === '') {
    return { ok: false, mensaje: 'Ingresa tu nueva contraseña.' }
  }

  return enviarAccion('/auth/restablecer', { usuario, codigo: codigoIngresado, nuevaContrasena })
}
