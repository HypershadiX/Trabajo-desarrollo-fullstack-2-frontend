import { afterEach, beforeEach, expect, test } from "vitest";
import { iniciarSesion } from "../services/auth";
import {
    agregarAlCarrito,
    calcularTotal,
    contarItems,
    eliminarDelCarrito,
    finalizarCompra,
    obtenerCarrito,
    quitarDelCarrito,
    vaciarCarrito,
} from "../services/carrito";
import { instalarApiFalsa, productosDePrueba, quitarApiFalsa, sesionDe } from "./apiFalsa";

const brocha = productosDePrueba[0]
const tarro = productosDePrueba[1]

let api

beforeEach(() => {
    localStorage.clear()
    api = instalarApiFalsa()
})

afterEach(() => {
    quitarApiFalsa()
})

test('calcular total del carrito', () => {

    //preconfiguracion
    const carrito = [
        { precio: 1000, cantidad: 3 },
        { precio: 500, cantidad: 2 },
    ]

    //resultados
    expect(calcularTotal([{ precio: 1000, cantidad: 3 }])).toBe(3000)
    expect(calcularTotal(carrito)).toBe(4000)
    expect(calcularTotal([])).toBe(0)
})

test('contar las unidades del carrito', () => {

    //preconfiguracion
    const carrito = [{ cantidad: 2 }, { cantidad: 3 }]

    //resultados
    expect(contarItems(carrito)).toBe(5)
    expect(contarItems([])).toBe(0)
})

test('el carrito parte vacío', () => {

    //resultados
    expect(obtenerCarrito()).toEqual([])
})

test('agregar un producto lo guarda con cantidad 1', () => {

    //interaccion
    const agregado = agregarAlCarrito(brocha)

    //resultados
    expect(agregado).toBe(true)
    expect(obtenerCarrito()).toHaveLength(1)
    expect(obtenerCarrito()[0].cantidad).toBe(1)
})

test('agregar el mismo producto otra vez suma la cantidad', () => {

    //interaccion
    agregarAlCarrito(brocha)
    agregarAlCarrito(brocha)

    //resultados
    expect(obtenerCarrito()).toHaveLength(1)
    expect(obtenerCarrito()[0].cantidad).toBe(2)
})

test('el carrito es local: agregar, quitar o vaciar no llama al servidor ni cambia el stock', () => {

    //interaccion
    agregarAlCarrito(tarro)
    agregarAlCarrito(tarro)
    quitarDelCarrito(tarro)
    vaciarCarrito()

    //resultados
    expect(api.llamadas).toHaveLength(0)
    expect(api.productos[1].stock).toBe(5)
})

test('no agrega un producto sin stock', () => {

    //interaccion
    const agregado = agregarAlCarrito({ ...brocha, stock: 0 })

    //resultados
    expect(agregado).toBe(false)
    expect(obtenerCarrito()).toEqual([])
})

test('no agrega más unidades de las que hay en stock', () => {

    //interaccion (el tarro tiene 5 unidades)
    const resultados = [1, 2, 3, 4, 5, 6].map(() => agregarAlCarrito(tarro))

    //resultados
    expect(resultados).toEqual([true, true, true, true, true, false])
    expect(obtenerCarrito()[0].cantidad).toBe(5)
})

test('quitar una unidad mantiene el producto si quedan unidades', () => {

    //preconfiguracion
    agregarAlCarrito(tarro)
    agregarAlCarrito(tarro)

    //interaccion
    quitarDelCarrito(tarro)

    //resultados
    expect(obtenerCarrito()[0].cantidad).toBe(1)
})

test('quitar la última unidad elimina el producto del carrito', () => {

    //preconfiguracion
    agregarAlCarrito(tarro)

    //interaccion
    quitarDelCarrito(tarro)

    //resultados
    expect(obtenerCarrito()).toEqual([])
})

test('quitar un producto que no está en el carrito no cambia nada', () => {

    //interaccion
    quitarDelCarrito(brocha)

    //resultados
    expect(obtenerCarrito()).toEqual([])
})

test('eliminar un producto lo saca del carrito con todas sus unidades', () => {

    //preconfiguracion
    agregarAlCarrito(tarro)
    agregarAlCarrito(tarro)
    agregarAlCarrito(tarro)
    agregarAlCarrito(brocha)

    //interaccion
    eliminarDelCarrito(2)

    //resultados
    expect(obtenerCarrito().map((item) => item.id)).toEqual([1])
})

test('vaciar el carrito deja el carrito vacío', () => {

    //preconfiguracion
    agregarAlCarrito(brocha)
    agregarAlCarrito(tarro)
    agregarAlCarrito(tarro)

    //interaccion
    vaciarCarrito()

    //resultados
    expect(obtenerCarrito()).toEqual([])
})

test('finalizar la compra registra el pedido, vacía el carrito y descuenta el stock en el servidor', async () => {

    //preconfiguracion
    iniciarSesion(sesionDe('Mauricio', 'USER'))
    agregarAlCarrito(tarro)
    agregarAlCarrito(tarro)

    //interaccion
    const resultado = await finalizarCompra()

    //resultados
    expect(resultado.ok).toBe(true)
    expect(resultado.mensaje).toBe('¡Compra simulada con éxito!')
    expect(obtenerCarrito()).toEqual([])
    expect(api.productos[1].stock).toBe(3)
    expect(api.pedidos).toHaveLength(1)
    expect(api.pedidos[0]).toMatchObject({ usuario: 'Mauricio', total: 91980 })
})

test('finalizar la compra envía solo el id y la cantidad de cada producto, con el token de la sesión', async () => {

    //preconfiguracion
    iniciarSesion(sesionDe('Mauricio', 'USER'))
    agregarAlCarrito(tarro)
    agregarAlCarrito(tarro)

    //interaccion
    await finalizarCompra()

    //resultados
    expect(api.llamadas).toHaveLength(1)
    expect(api.llamadas[0].cuerpo).toEqual({ items: [{ productoId: 2, cantidad: 2 }] })
    expect(api.llamadas[0].autorizacion).toBe('Bearer token-Mauricio-USER')
})

test('finalizar la compra con el carrito vacío avisa y no llama al servidor', async () => {

    //interaccion
    const resultado = await finalizarCompra()

    //resultados
    expect(resultado).toEqual({
        ok: false,
        mensaje: 'Tu carrito está vacío. Agrega productos antes de finalizar la compra.',
    })
    expect(api.llamadas).toHaveLength(0)
})

test('finalizar la compra sin sesión pide iniciar sesión y conserva el carrito', async () => {

    //preconfiguracion
    agregarAlCarrito(tarro)

    //interaccion
    const resultado = await finalizarCompra()

    //resultados
    expect(resultado).toEqual({ ok: false, mensaje: 'Debes iniciar sesión para finalizar la compra.' })
    expect(obtenerCarrito()).toHaveLength(1)
    expect(api.productos[1].stock).toBe(5)
})

test('si el servidor rechaza la compra por falta de stock, conserva el carrito y avisa', async () => {

    //preconfiguracion
    iniciarSesion(sesionDe('Mauricio', 'USER'))
    agregarAlCarrito(tarro)
    agregarAlCarrito(tarro)
    api.productos[1].stock = 1

    //interaccion
    const resultado = await finalizarCompra()

    //resultados
    expect(resultado).toEqual({ ok: false, mensaje: 'Stock insuficiente para "Tarro de pintura".' })
    expect(obtenerCarrito()[0].cantidad).toBe(2)
    expect(api.pedidos).toHaveLength(0)
})
