import { ErrorApi, peticion } from './api.js'

// El carrito vive en el navegador (localStorage). El stock real solo se descuenta en el
// servidor cuando se finaliza la compra, así un carrito abandonado no bloquea unidades.

const CLAVE_CARRITO = 'carrito'

export function guardarCarrito(carrito) {
  localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito))
}

export function obtenerCarrito() {
  const datos = localStorage.getItem(CLAVE_CARRITO)
  return datos ? JSON.parse(datos) : []
}

export function calcularTotal(carrito) {
  return carrito.reduce((total, item) => total + item.precio * item.cantidad, 0)
}

export function contarItems(carrito) {
  return carrito.reduce((total, item) => total + item.cantidad, 0)
}

// Devuelve false si no quedan unidades disponibles: el producto está agotado o el carrito
// ya contiene todo el stock que muestra el catálogo.
export function agregarAlCarrito(producto) {
  const carrito = obtenerCarrito()
  const existente = carrito.find((item) => item.id === producto.id)
  const enCarrito = existente ? existente.cantidad : 0

  if (!(producto.stock > enCarrito)) {
    return false
  }

  if (existente) {
    existente.cantidad += 1
    existente.stock = producto.stock
  } else {
    carrito.push({ ...producto, cantidad: 1 })
  }

  guardarCarrito(carrito)
  return true
}

export function quitarDelCarrito(producto) {
  const carrito = obtenerCarrito()
  const existente = carrito.find((item) => item.id === producto.id)

  if (!existente) return

  existente.cantidad -= 1

  const actualizado = existente.cantidad <= 0
    ? carrito.filter((item) => item.id !== producto.id)
    : carrito

  guardarCarrito(actualizado)
}

export function eliminarDelCarrito(id) {
  guardarCarrito(obtenerCarrito().filter((item) => item.id !== id))
}

export function vaciarCarrito() {
  guardarCarrito([])
}

// Registra el pedido en el servidor (valida y descuenta el stock) y vacía el carrito.
// Siempre devuelve { ok, mensaje }; si el servidor rechaza la compra el carrito se conserva.
export async function finalizarCompra() {
  const carrito = obtenerCarrito()

  if (carrito.length === 0) {
    return { ok: false, mensaje: 'Tu carrito está vacío. Agrega productos antes de finalizar la compra.' }
  }

  try {
    const pedido = await peticion('/pedidos', {
      metodo: 'POST',
      cuerpo: { items: carrito.map((item) => ({ productoId: item.id, cantidad: item.cantidad })) },
    })
    guardarCarrito([])
    return { ok: true, mensaje: '¡Compra simulada con éxito!', pedido }
  } catch (error) {
    if (!(error instanceof ErrorApi)) throw error

    if (error.estado === 401) {
      return { ok: false, mensaje: 'Debes iniciar sesión para finalizar la compra.' }
    }
    return { ok: false, mensaje: error.message }
  }
}
