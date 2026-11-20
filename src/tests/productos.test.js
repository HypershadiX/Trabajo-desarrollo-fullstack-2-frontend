import { afterEach, beforeEach, expect, test } from "vitest";
import {
    actualizarProducto,
    crearProducto,
    eliminarProducto,
    estadoStock,
    formatearPrecio,
    obtenerProductos,
    rutaImagen,
} from "../services/productos";
import { iniciarSesion } from "../services/auth";
import { instalarApiFalsa, productosDePrueba, quitarApiFalsa, sesionDe } from "./apiFalsa";

let api

function ingresarComoAdmin() {
    iniciarSesion(sesionDe('Admin', 'ADMIN'))
}

beforeEach(() => {
    localStorage.clear()
    api = instalarApiFalsa()
})

afterEach(() => {
    quitarApiFalsa()
})

test('estadoStock distingue agotado, pocas unidades y en stock', () => {

    //resultados
    expect(estadoStock(0)).toEqual({ texto: 'Agotado', clase: 'stock--agotado' })
    expect(estadoStock(5)).toEqual({ texto: 'Pocas unidades', clase: 'stock--bajo' })
    expect(estadoStock(9).texto).toBe('Pocas unidades')
    expect(estadoStock(10)).toEqual({ texto: 'En stock', clase: 'stock--ok' })
})

test('formatearPrecio usa el formato chileno con punto de miles', () => {

    //resultados
    expect(formatearPrecio(5990)).toBe('5.990')
    expect(formatearPrecio(1000000)).toBe('1.000.000')
})

test('obtenerProductos trae el catálogo desde el servidor', async () => {

    //interaccion
    const productos = await obtenerProductos()

    //resultados
    expect(productos).toEqual(productosDePrueba)
    expect(api.llamadas).toHaveLength(1)
    expect(api.llamadas[0]).toMatchObject({ metodo: 'GET', ruta: '/productos' })
})

test('obtenerProductos no envía el token porque el catálogo es público', async () => {

    //preconfiguracion
    ingresarComoAdmin()

    //interaccion
    await obtenerProductos()

    //resultados
    expect(api.llamadas[0].autorizacion).toBeUndefined()
})

test('crearProducto envía los datos con la sesión del administrador y devuelve el producto con su id', async () => {

    //preconfiguracion
    ingresarComoAdmin()

    //interaccion
    const nuevo = await crearProducto({ nombre: 'Taladro', precio: 39990, stock: 8, imagen: 'img/a.jpg', detalles: 'Potente' })

    //resultados
    expect(nuevo).toMatchObject({ id: 4, nombre: 'Taladro', precio: 39990, stock: 8 })
    expect(api.productos).toHaveLength(4)
    expect(api.llamadas[0].autorizacion).toBe('Bearer token-Admin-ADMIN')
})

test('crearProducto sin sesión es rechazado por el servidor', async () => {

    //resultados
    await expect(crearProducto({ nombre: 'Taladro', precio: 1, stock: 1 })).rejects.toMatchObject({
        estado: 401,
        message: 'Debes iniciar sesión.',
    })
    expect(api.productos).toHaveLength(3)
})

test('crearProducto con la sesión de un cliente es rechazado por falta de permisos', async () => {

    //preconfiguracion
    iniciarSesion(sesionDe('Mauricio', 'USER'))

    //resultados
    await expect(crearProducto({ nombre: 'Taladro', precio: 1, stock: 1 })).rejects.toMatchObject({
        estado: 403,
        message: 'No tienes permisos para esta acción.',
    })
})

test('actualizarProducto cambia solo los campos indicados', async () => {

    //preconfiguracion
    ingresarComoAdmin()

    //interaccion
    const actualizado = await actualizarProducto(1, { precio: 1000 })

    //resultados
    expect(actualizado.precio).toBe(1000)
    expect(actualizado.nombre).toBe('Brocha')
    expect(actualizado.stock).toBe(12)
    expect(api.productos[0].precio).toBe(1000)
})

test('actualizarProducto es rechazado si el producto no existe', async () => {

    //preconfiguracion
    ingresarComoAdmin()

    //resultados
    await expect(actualizarProducto(999, { precio: 1 })).rejects.toMatchObject({
        estado: 404,
        message: 'Producto no encontrado.',
    })
})

test('eliminarProducto quita el producto del catálogo', async () => {

    //preconfiguracion
    ingresarComoAdmin()

    //interaccion
    const resultado = await eliminarProducto(2)

    //resultados
    expect(resultado).toBeNull()
    expect(api.productos.map((p) => p.id)).toEqual([1, 3])
})

test('rutaImagen resuelve rutas relativas y respeta URLs absolutas', () => {

    //resultados
    expect(rutaImagen('')).toBe('')
    expect(rutaImagen('img/a.jpg')).toBe('/img/a.jpg')
    expect(rutaImagen('/img/a.jpg')).toBe('/img/a.jpg')
    expect(rutaImagen('https://sitio.cl/a.jpg')).toBe('https://sitio.cl/a.jpg')
    expect(rutaImagen('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA')
})
