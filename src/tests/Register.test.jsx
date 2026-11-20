import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Register from "../pages/Register";
import { instalarApiFalsa, quitarApiFalsa } from "./apiFalsa";

let api

function renderRegister() {
    return render(
        <MemoryRouter initialEntries={['/ingreso']}>
            <Routes>
                <Route path="/ingreso" element={<Register />} />
                <Route path="/login" element={<h1>Pantalla de login</h1>} />
            </Routes>
        </MemoryRouter>
    )
}

beforeEach(() => {
    localStorage.clear()
    api = instalarApiFalsa()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
})

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    quitarApiFalsa()
})

test('Crea la cuenta, la guarda en el servidor y lleva al login', async () => {

    //renderizado del componente
    renderRegister()

    //interaccion del usuario
    await userEvent.type(screen.getByPlaceholderText('INGRESE USUARIO'), 'Ana')
    await userEvent.type(screen.getByPlaceholderText('INGRESE CONTRASEÑA'), 'abc')
    await userEvent.click(screen.getByText('Crear usuario', { selector: 'button' }))

    //resultados
    expect(await screen.findByText('Pantalla de login')).toBeInTheDocument()
    expect(window.alert).toHaveBeenCalledWith('Cuenta creada. Ya puedes iniciar sesión.')
    expect(api.usuarios.some((u) => u.usuario === 'Ana' && u.contrasena === 'abc' && u.rol === 'USER')).toBe(true)
})

test('Avisa cuando faltan el usuario o la contraseña', async () => {

    //renderizado del componente
    renderRegister()

    //interaccion del usuario
    await userEvent.click(screen.getByText('Crear usuario', { selector: 'button' }))

    //resultados
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Completa usuario y contraseña.'))
    expect(screen.queryByText('Pantalla de login')).not.toBeInTheDocument()
    expect(api.llamadas).toHaveLength(0)
})

test('CP-03: Rechaza crear un usuario que ya existe', async () => {

    //renderizado del componente
    renderRegister()

    //interaccion del usuario
    await userEvent.type(screen.getByPlaceholderText('INGRESE USUARIO'), 'Mauricio')
    await userEvent.type(screen.getByPlaceholderText('INGRESE CONTRASEÑA'), 'otra')
    await userEvent.click(screen.getByText('Crear usuario', { selector: 'button' }))

    //resultados
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Ese usuario ya existe, elige otro.'))
    expect(api.usuarios).toHaveLength(2)
    expect(screen.queryByText('Pantalla de login')).not.toBeInTheDocument()
})
