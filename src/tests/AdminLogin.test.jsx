import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AdminLogin from "../pages/AdminLogin";
import { instalarApiFalsa, quitarApiFalsa } from "./apiFalsa";

function renderAdminLogin() {
    return render(
        <MemoryRouter initialEntries={['/ingreso-admin']}>
            <Routes>
                <Route path="/ingreso-admin" element={<AdminLogin />} />
                <Route path="/admin" element={<h1>Panel de administrador</h1>} />
            </Routes>
        </MemoryRouter>
    )
}

beforeEach(() => {
    localStorage.clear()
    instalarApiFalsa()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
})

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    quitarApiFalsa()
})

test('Permite ingresar con credenciales de administrador y va al panel', async () => {

    //renderizado del componente
    renderAdminLogin()

    //interaccion del usuario
    await userEvent.type(screen.getByPlaceholderText('INGRESE USUARIO'), 'Admin')
    await userEvent.type(screen.getByPlaceholderText('INGRESE CONTRASEÑA'), '1234')
    await userEvent.click(screen.getByText('Ingresar', { selector: 'button' }))

    //resultados
    expect(await screen.findByText('Panel de administrador')).toBeInTheDocument()
    const sesion = JSON.parse(localStorage.getItem('usuarioActual'))
    expect(sesion.usuario).toBe('Admin')
    expect(sesion.rol).toBe('ADMIN')
    expect(sesion.token).toBeTruthy()
})

test('Rechaza credenciales de administrador inválidas', async () => {

    //renderizado del componente
    renderAdminLogin()

    //interaccion del usuario
    await userEvent.type(screen.getByPlaceholderText('INGRESE USUARIO'), 'Admin')
    await userEvent.type(screen.getByPlaceholderText('INGRESE CONTRASEÑA'), 'incorrecta')
    await userEvent.click(screen.getByText('Ingresar', { selector: 'button' }))

    //resultados
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Usuario o contraseña incorrectos.'))
    expect(localStorage.getItem('usuarioActual')).toBeNull()
})

test('Un cliente no puede ingresar como administrador', async () => {

    //renderizado del componente
    renderAdminLogin()

    //interaccion del usuario
    await userEvent.type(screen.getByPlaceholderText('INGRESE USUARIO'), 'Mauricio')
    await userEvent.type(screen.getByPlaceholderText('INGRESE CONTRASEÑA'), '1234')
    await userEvent.click(screen.getByText('Ingresar', { selector: 'button' }))

    //resultados
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Usuario o contraseña incorrectos.'))
    expect(screen.queryByText('Panel de administrador')).not.toBeInTheDocument()
})
