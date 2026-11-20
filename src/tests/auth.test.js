import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
    cerrarSesion,
    crearUsuario,
    enviarCodigoRecuperacion,
    iniciarSesion,
    obtenerUsuarioActual,
    restablecerContrasena,
    validarLogin,
    validarLoginAdmin,
} from "../services/auth";
import { instalarApiFalsa, quitarApiFalsa, tokenDe } from "./apiFalsa";

let api

beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    api = instalarApiFalsa()
})

afterEach(() => {
    quitarApiFalsa()
})

test('existe un usuario cliente y un administrador por defecto', async () => {

    //resultados
    expect(await validarLogin('Mauricio', '1234')).toMatchObject({ usuario: 'Mauricio', rol: 'USER' })
    expect(await validarLoginAdmin('Admin', '1234')).toMatchObject({ usuario: 'Admin', rol: 'ADMIN' })
})

test('validarLogin acepta credenciales correctas y entrega el token de sesión', async () => {

    //resultados
    expect(await validarLogin('Mauricio', '1234')).toEqual({
        usuario: 'Mauricio',
        rol: 'USER',
        token: tokenDe('Mauricio', 'USER'),
    })
})

test('validarLogin rechaza contraseña incorrecta o usuario inexistente', async () => {

    //resultados
    expect(await validarLogin('Mauricio', 'mala')).toBeUndefined()
    expect(await validarLogin('Nadie', '1234')).toBeUndefined()
})

test('validarLogin no consulta al servidor cuando faltan datos', async () => {

    //resultados
    expect(await validarLogin('', '')).toBeUndefined()
    expect(await validarLogin('Mauricio', '')).toBeUndefined()
    expect(api.llamadas).toHaveLength(0)
})

test('validarLoginAdmin solo acepta administradores', async () => {

    //resultados
    expect(await validarLoginAdmin('Admin', '1234')).toBeDefined()
    expect(await validarLoginAdmin('Admin', 'mala')).toBeUndefined()
    expect(await validarLoginAdmin('Mauricio', '1234')).toBeUndefined()
})

test('un administrador no puede ingresar como cliente', async () => {

    //resultados
    expect(await validarLogin('Admin', '1234')).toBeUndefined()
})

test('la sesión se guarda, se consulta y se cierra', () => {

    //preconfiguracion
    expect(obtenerUsuarioActual()).toBeNull()

    //interaccion
    iniciarSesion({ usuario: 'Mauricio', rol: 'USER', token: 'abc' })

    //resultados
    expect(obtenerUsuarioActual()).toEqual({ usuario: 'Mauricio', rol: 'USER', token: 'abc' })

    //interaccion
    cerrarSesion()

    //resultados
    expect(obtenerUsuarioActual()).toBeNull()
})

test('crearUsuario guarda una cuenta nueva', async () => {

    //interaccion
    const resultado = await crearUsuario('Ana', 'abc')

    //resultados
    expect(resultado).toEqual({ ok: true, mensaje: 'Cuenta creada. Ya puedes iniciar sesión.' })
    expect(await validarLogin('Ana', 'abc')).toBeDefined()
})

test('crearUsuario exige usuario y contraseña', async () => {

    //resultados
    expect(await crearUsuario('', 'abc')).toEqual({ ok: false, mensaje: 'Completa usuario y contraseña.' })
    expect(await crearUsuario('Ana', '')).toEqual({ ok: false, mensaje: 'Completa usuario y contraseña.' })
    expect(api.llamadas).toHaveLength(0)
})

test('crearUsuario rechaza un usuario repetido', async () => {

    //resultados
    expect(await crearUsuario('Mauricio', 'otra')).toEqual({ ok: false, mensaje: 'Ese usuario ya existe, elige otro.' })
    expect(api.usuarios).toHaveLength(2)
})

test('enviarCodigoRecuperacion valida el usuario', async () => {

    //resultados
    expect(await enviarCodigoRecuperacion('')).toEqual({ ok: false, mensaje: 'Ingresa tu nombre de usuario.' })
    expect(await enviarCodigoRecuperacion('Nadie')).toEqual({ ok: false, mensaje: 'Ese usuario no existe.' })
})

test('enviarCodigoRecuperacion entrega un código de 6 dígitos', async () => {

    //interaccion
    const resultado = await enviarCodigoRecuperacion('Mauricio')

    //resultados
    expect(resultado.ok).toBe(true)
    expect(resultado.mensaje).toContain('Tu código es: 100000')
})

test('restablecerContrasena exige haber pedido un código antes', async () => {

    //resultados
    expect(await restablecerContrasena('Mauricio', '100000', 'nueva')).toEqual({
        ok: false,
        mensaje: 'Primero solicita un código de verificación.',
    })
})

test('restablecerContrasena valida código y contraseña', async () => {

    //preconfiguracion
    await enviarCodigoRecuperacion('Mauricio')

    //resultados
    expect((await restablecerContrasena('Mauricio', '', 'nueva')).mensaje).toBe('Ingresa el código que enviamos a tu correo.')
    expect((await restablecerContrasena('Mauricio', '999999', 'nueva')).mensaje).toBe('El código ingresado no es correcto.')
    expect((await restablecerContrasena('Mauricio', '100000', '')).mensaje).toBe('Ingresa tu nueva contraseña.')
})

test('restablecerContrasena cambia la contraseña con el código correcto', async () => {

    //preconfiguracion
    await enviarCodigoRecuperacion('Mauricio')

    //interaccion
    const resultado = await restablecerContrasena('Mauricio', '100000', 'nueva')

    //resultados
    expect(resultado.ok).toBe(true)
    expect(await validarLogin('Mauricio', 'nueva')).toBeDefined()
    expect(await validarLogin('Mauricio', '1234')).toBeUndefined()
})

test('el código solo sirve una vez', async () => {

    //preconfiguracion
    await enviarCodigoRecuperacion('Mauricio')
    await restablecerContrasena('Mauricio', '100000', 'nueva')

    //resultados
    expect((await restablecerContrasena('Mauricio', '100000', 'otra')).mensaje).toBe('Primero solicita un código de verificación.')
})

test('restablecerContrasena avisa si el usuario ya no existe', async () => {

    //preconfiguracion
    await enviarCodigoRecuperacion('Mauricio')
    api.usuarios = api.usuarios.filter((u) => u.usuario !== 'Mauricio')

    //resultados
    expect(await restablecerContrasena('Mauricio', '100000', 'nueva')).toEqual({ ok: false, mensaje: 'Ese usuario ya no existe.' })
})

test('las acciones devuelven un aviso si no hay conexión con el servidor', async () => {

    //preconfiguracion
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    //resultados
    expect(await crearUsuario('Ana', 'abc')).toEqual({
        ok: false,
        mensaje: 'No se pudo conectar con el servidor. Inténtalo más tarde.',
    })
    await expect(validarLogin('Mauricio', '1234')).rejects.toThrow('No se pudo conectar con el servidor')
})
