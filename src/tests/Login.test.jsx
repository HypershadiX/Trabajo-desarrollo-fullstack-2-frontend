import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Login from "../pages/Login";
import { instalarApiFalsa, quitarApiFalsa } from "./apiFalsa";

const MENSAJE_ERROR = 'Usuario o contraseña incorrectos.'

function renderLogin() {
    return render(
        <MemoryRouter initialEntries={['/login']}>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<h1>Pantalla de inicio</h1>} />
            </Routes>
        </MemoryRouter>
    )
}

beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    instalarApiFalsa()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
})

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    quitarApiFalsa()
})

test('Muestra el formulario de ingreso con sus campos y enlaces', () => {

    //renderizado del componente
    renderLogin()

    //resultados
    expect(screen.getByText('INGRESE SU USUARIO')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('INGRESE USUARIO')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('INGRESE CONTRASEÑA')).toBeInTheDocument()
    expect(screen.getByText('Ingresar', { selector: 'button' })).toBeInTheDocument()
    expect(screen.getByText('Crear cuenta')).toBeInTheDocument()
})

test('CP-01: Rechaza el ingreso con el usuario vacío', async () => {

    //renderizado del componente
    renderLogin()

    //interaccion del usuario
    await userEvent.type(screen.getByPlaceholderText('INGRESE CONTRASEÑA'), '1234')
    await userEvent.click(screen.getByText('Ingresar', { selector: 'button' }))

    //resultados
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith(MENSAJE_ERROR))
    expect(screen.getByText('INGRESE SU USUARIO')).toBeInTheDocument()
})

test('CP-02: Rechaza el ingreso con la contraseña vacía', async () => {

    //renderizado del componente
    renderLogin()

    //interaccion del usuario
    await userEvent.type(screen.getByPlaceholderText('INGRESE USUARIO'), 'Mauricio')
    await userEvent.click(screen.getByText('Ingresar', { selector: 'button' }))

    //resultados
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith(MENSAJE_ERROR))
    expect(screen.getByText('INGRESE SU USUARIO')).toBeInTheDocument()
})

test('CP-04: Permite ingresar con credenciales válidas y guarda la sesión', async () => {

    //renderizado del componente
    renderLogin()

    //interaccion del usuario
    await userEvent.type(screen.getByPlaceholderText('INGRESE USUARIO'), 'Mauricio')
    await userEvent.type(screen.getByPlaceholderText('INGRESE CONTRASEÑA'), '1234')
    await userEvent.click(screen.getByText('Ingresar', { selector: 'button' }))

    //resultados
    expect(await screen.findByText('Pantalla de inicio')).toBeInTheDocument()
    const sesion = JSON.parse(localStorage.getItem('usuarioActual'))
    expect(sesion.usuario).toBe('Mauricio')
    expect(sesion.rol).toBe('USER')
    expect(sesion.token).toBeTruthy()
    expect(window.alert).not.toHaveBeenCalled()
})

test('CP-05: Muestra error con credenciales inválidas', async () => {

    //renderizado del componente
    renderLogin()

    //interaccion del usuario
    await userEvent.type(screen.getByPlaceholderText('INGRESE USUARIO'), 'Mauricio')
    await userEvent.type(screen.getByPlaceholderText('INGRESE CONTRASEÑA'), 'incorrecta')
    await userEvent.click(screen.getByText('Ingresar', { selector: 'button' }))

    //resultados
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith(MENSAJE_ERROR))
    expect(localStorage.getItem('usuarioActual')).toBeNull()
})

test('Avisa cuando no hay conexión con el servidor y no inicia sesión', async () => {

    //preconfiguracion (el servidor no responde)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    //renderizado del componente
    renderLogin()

    //interaccion del usuario
    await userEvent.type(screen.getByPlaceholderText('INGRESE USUARIO'), 'Mauricio')
    await userEvent.type(screen.getByPlaceholderText('INGRESE CONTRASEÑA'), '1234')
    await userEvent.click(screen.getByText('Ingresar', { selector: 'button' }))

    //resultados
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith(
        'No se pudo conectar con el servidor. Inténtalo más tarde.'
    ))
    expect(localStorage.getItem('usuarioActual')).toBeNull()
    expect(screen.getByText('INGRESE SU USUARIO')).toBeInTheDocument()
})
