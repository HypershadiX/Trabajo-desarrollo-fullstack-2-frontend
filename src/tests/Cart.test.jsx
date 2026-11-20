import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { agregarAlCarrito } from "../services/carrito";
import { TiendaProvider } from "../context/TiendaContext";
import Cart from "../pages/Cart";
import { instalarApiFalsa, productosDePrueba, quitarApiFalsa, sesionDe } from "./apiFalsa";

vi.mock("sweetalert2", () => ({ default: { fire: vi.fn() } }))

let api

function renderCarrito() {
    return render(
        <TiendaProvider>
            <Cart />
        </TiendaProvider>
    )
}

function cargarTarroEnElCarrito(cantidad) {
    for (let i = 0; i < cantidad; i++) {
        agregarAlCarrito(productosDePrueba[1])
    }
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

test('Muestra un mensaje cuando el carrito está vacío', () => {

    //renderizado del componente
    renderCarrito()

    //resultados
    expect(screen.getByText('Tu carrito está vacío.')).toBeInTheDocument()
    expect(screen.getByText('$0', { selector: '#carrito-total' })).toBeInTheDocument()
})

test('Muestra los productos del carrito y el total a pagar', () => {

    //preconfiguracion
    cargarTarroEnElCarrito(2)

    //renderizado del componente
    renderCarrito()

    //resultados
    expect(screen.getByText('Tarro de pintura')).toBeInTheDocument()
    expect(screen.getByText('$91.980', { selector: '#carrito-total' })).toBeInTheDocument()
})

test('El botón + suma una unidad sin tocar el stock del catálogo', async () => {

    //preconfiguracion
    cargarTarroEnElCarrito(2)

    //renderizado del componente
    renderCarrito()

    //interaccion del usuario
    await userEvent.click(screen.getByText('+', { selector: 'button' }))

    //resultados
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(api.productos[1].stock).toBe(5)
})

test('El botón + no suma más unidades de las que hay en stock', async () => {

    //preconfiguracion (el tarro tiene 5 unidades y ya están todas en el carrito)
    cargarTarroEnElCarrito(5)

    //renderizado del componente
    renderCarrito()

    //interaccion del usuario
    await userEvent.click(screen.getByText('+', { selector: 'button' }))

    //resultados
    expect(window.alert).toHaveBeenCalledWith('"Tarro de pintura" no tiene stock disponible en este momento.')
    expect(screen.getByText('5')).toBeInTheDocument()
})

test('El botón − resta una unidad', async () => {

    //preconfiguracion
    cargarTarroEnElCarrito(2)

    //renderizado del componente
    renderCarrito()

    //interaccion del usuario
    await userEvent.click(screen.getByText('−', { selector: 'button' }))

    //resultados
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(api.productos[1].stock).toBe(5)
})

test('Quitar elimina el producto del carrito', async () => {

    //preconfiguracion
    cargarTarroEnElCarrito(2)

    //renderizado del componente
    renderCarrito()

    //interaccion del usuario
    await userEvent.click(screen.getByText('Quitar', { selector: 'button' }))

    //resultados
    expect(screen.getByText('Tu carrito está vacío.')).toBeInTheDocument()
    expect(api.productos[1].stock).toBe(5)
})

test('Vaciar carrito deja el carrito vacío', async () => {

    //preconfiguracion
    cargarTarroEnElCarrito(2)

    //renderizado del componente
    renderCarrito()

    //interaccion del usuario
    await userEvent.click(screen.getByText('Vaciar carrito', { selector: 'button' }))

    //resultados
    expect(screen.getByText('Tu carrito está vacío.')).toBeInTheDocument()
    expect(api.productos[1].stock).toBe(5)
})

test('Finalizar compra vacía el carrito y deja el stock descontado en el servidor', async () => {

    //preconfiguracion
    localStorage.setItem('usuarioActual', JSON.stringify(sesionDe('Mauricio', 'USER')))
    cargarTarroEnElCarrito(2)

    //renderizado del componente
    renderCarrito()

    //interaccion del usuario
    await userEvent.click(screen.getByText('Finalizar compra', { selector: 'button' }))

    //resultados
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('¡Compra simulada con éxito!'))
    expect(await screen.findByText('Tu carrito está vacío.')).toBeInTheDocument()
    expect(api.productos[1].stock).toBe(3)
    expect(api.pedidos).toHaveLength(1)
})

test('Finalizar compra sin iniciar sesión pide ingresar y conserva el carrito', async () => {

    //preconfiguracion
    cargarTarroEnElCarrito(2)

    //renderizado del componente
    renderCarrito()

    //interaccion del usuario
    await userEvent.click(screen.getByText('Finalizar compra', { selector: 'button' }))

    //resultados
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Debes iniciar sesión para finalizar la compra.'))
    expect(screen.getByText('Tarro de pintura')).toBeInTheDocument()
    expect(api.productos[1].stock).toBe(5)
    expect(api.pedidos).toHaveLength(0)
})

test('Finalizar compra con el carrito vacío solo avisa', async () => {

    //renderizado del componente
    renderCarrito()

    //interaccion del usuario
    await userEvent.click(screen.getByText('Finalizar compra', { selector: 'button' }))

    //resultados
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith(
        'Tu carrito está vacío. Agrega productos antes de finalizar la compra.'
    ))
    expect(api.pedidos).toHaveLength(0)
})

test('Si no alcanza el stock en el servidor, avisa y conserva el carrito', async () => {

    //preconfiguracion (otro cliente compró antes y quedó 1 sola unidad)
    localStorage.setItem('usuarioActual', JSON.stringify(sesionDe('Mauricio', 'USER')))
    cargarTarroEnElCarrito(2)
    api.productos[1].stock = 1

    //renderizado del componente
    renderCarrito()

    //interaccion del usuario
    await userEvent.click(screen.getByText('Finalizar compra', { selector: 'button' }))

    //resultados
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Stock insuficiente para "Tarro de pintura".'))
    expect(screen.getByText('Tarro de pintura')).toBeInTheDocument()
    expect(api.pedidos).toHaveLength(0)
})
