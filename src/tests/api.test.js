import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { ErrorApi, peticion } from "../services/api";
import { iniciarSesion } from "../services/auth";
import { instalarApiFalsa, quitarApiFalsa, sesionDe } from "./apiFalsa";

beforeEach(() => {
    localStorage.clear()
})

afterEach(() => {
    quitarApiFalsa()
})

test('usa /api como dirección base cuando no hay VITE_API_BASE_URL', async () => {

    //preconfiguracion
    instalarApiFalsa()

    //interaccion
    await peticion('/productos')

    //resultados
    expect(fetch.mock.calls[0][0]).toBe('/api/productos')
})

test('adjunta el token de la sesión en el header Authorization', async () => {

    //preconfiguracion
    const api = instalarApiFalsa()
    iniciarSesion(sesionDe('Mauricio', 'USER'))

    //interaccion
    await peticion('/productos')

    //resultados
    expect(api.llamadas[0].autorizacion).toBe('Bearer token-Mauricio-USER')
})

test('no adjunta Authorization si no hay sesión o si se pide conToken: false', async () => {

    //preconfiguracion
    const api = instalarApiFalsa()

    //interaccion
    await peticion('/productos')
    iniciarSesion(sesionDe('Mauricio', 'USER'))
    await peticion('/productos', { conToken: false })

    //resultados
    expect(api.llamadas[0].autorizacion).toBeUndefined()
    expect(api.llamadas[1].autorizacion).toBeUndefined()
})

test('envía el cuerpo como JSON con su Content-Type', async () => {

    //preconfiguracion
    instalarApiFalsa()

    //interaccion
    await peticion('/auth/login', { metodo: 'POST', cuerpo: { usuario: 'Mauricio', contrasena: '1234' }, conToken: false })

    //resultados
    const [, opciones] = fetch.mock.calls[0]
    expect(opciones.method).toBe('POST')
    expect(opciones.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(opciones.body)).toEqual({ usuario: 'Mauricio', contrasena: '1234' })
})

test('una respuesta con error lanza un ErrorApi con el código y el mensaje del servidor', async () => {

    //preconfiguracion
    instalarApiFalsa()

    //interaccion
    const intento = peticion('/auth/login', { metodo: 'POST', cuerpo: { usuario: 'Mauricio', contrasena: 'mala' }, conToken: false })

    //resultados
    await expect(intento).rejects.toBeInstanceOf(ErrorApi)
    await expect(intento).rejects.toMatchObject({ estado: 401, message: 'Usuario o contraseña incorrectos.' })
})

test('si la respuesta de error no trae un mensaje usa uno genérico', async () => {

    //preconfiguracion
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
            throw new Error('no es JSON')
        },
    }))

    //resultados
    await expect(peticion('/productos')).rejects.toMatchObject({ estado: 500, message: 'Error 500' })
})

test('una respuesta 204 devuelve null', async () => {

    //preconfiguracion
    instalarApiFalsa()
    iniciarSesion(sesionDe('Admin', 'ADMIN'))

    //resultados
    expect(await peticion('/productos/1', { metodo: 'DELETE' })).toBeNull()
})

test('si no hay conexión lanza un ErrorApi con estado 0 y un mensaje claro', async () => {

    //preconfiguracion
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    //resultados
    await expect(peticion('/productos')).rejects.toMatchObject({
        estado: 0,
        message: 'No se pudo conectar con el servidor. Inténtalo más tarde.',
    })
})
