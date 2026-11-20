import { peticion } from './api.js'

// --- Catálogo (API) ---
// Leer el catálogo es público. Crear, editar y eliminar exigen la sesión de un administrador:
// el backend lo verifica con el JWT y responde 401/403 si no corresponde.

export function obtenerProductos() {
  return peticion('/productos', { conToken: false })
}

export function crearProducto({ nombre, precio, stock, imagen, detalles }) {
  return peticion('/productos', {
    metodo: 'POST',
    cuerpo: { nombre, precio, stock, imagen, detalles },
  })
}

export function actualizarProducto(idProducto, cambios) {
  return peticion(`/productos/${idProducto}`, { metodo: 'PUT', cuerpo: cambios })
}

export function eliminarProducto(idProducto) {
  return peticion(`/productos/${idProducto}`, { metodo: 'DELETE' })
}

// --- Utilidades de presentación ---

export function estadoStock(stock) {
  if (stock <= 0) {
    return { texto: 'Agotado', clase: 'stock--agotado' }
  }
  if (stock < 10) {
    return { texto: 'Pocas unidades', clase: 'stock--bajo' }
  }
  return { texto: 'En stock', clase: 'stock--ok' }
}

export function formatearPrecio(precio) {
  return precio.toLocaleString('es-CL')
}

export function rutaImagen(ruta) {
  if (!ruta) return ''
  if (/^(https?:|data:|blob:|\/)/i.test(ruta)) return ruta
  return `${import.meta.env.BASE_URL}${ruta}`
}
