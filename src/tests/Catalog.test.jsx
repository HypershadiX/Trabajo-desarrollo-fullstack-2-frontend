import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TiendaProvider } from "../context/TiendaContext";
import Catalog from "../components/Catalog";
import { instalarApiFalsa, quitarApiFalsa, sesionDe } from "./apiFalsa";

vi.mock("sweetalert2", () => ({ default: { fire: vi.fn() } }))

let api

// `sesion` es la sesión guardada al ingresar. Por defecto el modo administrador usa la del
// administrador; se puede indicar otra para probar qué pasa sin los permisos.
function renderCatalog(admin = false, sesion = admin ? sesionDe('Admin', 'ADMIN') : null) {
    if (sesion) {
        localStorage.setItem('usuarioActual', JSON.stringify(sesion))
    }

    return render(
        <TiendaProvider>
            <Catalog admin={admin} />
        </TiendaProvider>
    )
}

beforeEach(() => {
    localStorage.clear()
    api = instalarApiFalsa()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.spyOn(window, 'confirm').mockImplementation(() => true)
    vi.spyOn(window, 'prompt').mockImplementation(() => null)
})

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    quitarApiFalsa()
})

test('Muestra todos los productos del catálogo', async () => {

    //renderizado del componente
    renderCatalog()

    //resultados (el catálogo llega desde la API)
    expect(screen.getByText('Catálogo de productos')).toBeInTheDocument()
    expect(await screen.findByText('Brocha')).toBeInTheDocument()
    expect(screen.getByText('Tarro de pintura')).toBeInTheDocument()
    expect(screen.getByText('Bolsa de clavos')).toBeInTheDocument()
})

test('Muestra "Cargando productos..." mientras llega el catálogo', async () => {

    //renderizado del componente
    renderCatalog()

    //resultados
    expect(screen.getByText('Cargando productos...')).toBeInTheDocument()
    expect(await screen.findByText('Brocha')).toBeInTheDocument()
    expect(screen.queryByText('Cargando productos...')).not.toBeInTheDocument()
})

test('Avisa cuando no se puede cargar el catálogo por falta de conexión', async () => {

    //preconfiguracion (el servidor no responde)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    //renderizado del componente
    renderCatalog()

    //resultados
    expect(await screen.findByText('No se pudo conectar con el servidor. Inténtalo más tarde.')).toBeInTheDocument()
    expect(screen.queryByText('Brocha')).not.toBeInTheDocument()
})

test('El buscador filtra los productos según lo que se escribe', async () => {

    //renderizado del componente
    renderCatalog()
    await screen.findByText('Brocha')

    //interaccion del usuario
    await userEvent.type(screen.getByPlaceholderText('Buscar producto...'), 'broch')

    //resultados
    expect(screen.getByText('Brocha')).toBeInTheDocument()
    expect(screen.queryByText('Tarro de pintura')).not.toBeInTheDocument()
    expect(screen.queryByText('Bolsa de clavos')).not.toBeInTheDocument()
})

test('Muestra un mensaje cuando la búsqueda no tiene resultados', async () => {

    //renderizado del componente
    renderCatalog()
    await screen.findByText('Brocha')

    //interaccion del usuario
    await userEvent.type(screen.getByPlaceholderText('Buscar producto...'), 'zzz')

    //resultados
    expect(screen.getByText('No se encontraron productos.')).toBeInTheDocument()
})

test('Agregar al carrito guarda el producto en el carrito sin tocar el stock del catálogo', async () => {

    //renderizado del componente
    renderCatalog()

    //interaccion del usuario (el primer botón es el de la Brocha)
    const botones = await screen.findAllByText('Agregar al carrito', { selector: 'button' })
    await userEvent.click(botones[0])

    //resultados (el stock real solo baja al finalizar la compra)
    expect(screen.getByText('En stock (12)')).toBeInTheDocument()
    expect(api.productos[0].stock).toBe(12)
    expect(JSON.parse(localStorage.getItem('carrito'))[0].cantidad).toBe(1)
})

test('No deja agregar más unidades que el stock disponible', async () => {

    //preconfiguracion (queda 1 sola unidad de la Brocha)
    api.productos[0].stock = 1

    //renderizado del componente
    renderCatalog()

    //interaccion del usuario
    const botones = await screen.findAllByText('Agregar al carrito', { selector: 'button' })
    await userEvent.click(botones[0])
    await userEvent.click(botones[0])

    //resultados
    expect(window.alert).toHaveBeenCalledWith('"Brocha" no tiene stock disponible en este momento.')
    expect(JSON.parse(localStorage.getItem('carrito'))[0].cantidad).toBe(1)
})

test('En modo administrador no se muestra el botón Agregar al carrito', async () => {

    //renderizado del componente
    renderCatalog(true)

    //resultados
    expect(await screen.findAllByText('Editar', { selector: 'button' })).toHaveLength(3)
    expect(screen.queryByText('Agregar al carrito')).not.toBeInTheDocument()
})

test('El administrador da de baja un producto si lo confirma', async () => {

    //renderizado del componente
    renderCatalog(true)

    //interaccion del usuario
    const botones = await screen.findAllByText('Dar de baja', { selector: 'button' })
    await userEvent.click(botones[0])

    //resultados
    expect(window.confirm).toHaveBeenCalledOnce()
    await waitFor(() => expect(screen.queryByText('Brocha')).not.toBeInTheDocument())
    expect(screen.getByText('Tarro de pintura')).toBeInTheDocument()
    expect(api.productos.map((p) => p.id)).toEqual([2, 3])
})

test('El administrador no da de baja el producto si cancela la confirmación', async () => {

    //preconfiguracion
    window.confirm.mockReturnValue(false)

    //renderizado del componente
    renderCatalog(true)

    //interaccion del usuario
    const botones = await screen.findAllByText('Dar de baja', { selector: 'button' })
    await userEvent.click(botones[0])

    //resultados
    expect(screen.getByText('Brocha')).toBeInTheDocument()
    expect(api.productos).toHaveLength(3)
})

test('Si el servidor rechaza dar de baja (sin permisos) avisa y el producto sigue en el catálogo', async () => {

    //renderizado del componente (la sesión es de un cliente, no de un administrador)
    renderCatalog(true, sesionDe('Mauricio', 'USER'))

    //interaccion del usuario
    const botones = await screen.findAllByText('Dar de baja', { selector: 'button' })
    await userEvent.click(botones[0])

    //resultados
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('No tienes permisos para esta acción.'))
    expect(screen.getByText('Brocha')).toBeInTheDocument()
    expect(api.productos).toHaveLength(3)
})

test('El administrador edita el precio y el stock de un producto', async () => {

    //preconfiguracion
    window.prompt.mockReturnValueOnce('1000').mockReturnValueOnce('50')

    //renderizado del componente
    renderCatalog(true)

    //interaccion del usuario
    const botones = await screen.findAllByText('Editar', { selector: 'button' })
    await userEvent.click(botones[0])

    //resultados
    expect(await screen.findByText('En stock (50)')).toBeInTheDocument()
    expect(api.productos[0].precio).toBe(1000)
    expect(api.productos[0].stock).toBe(50)
})

test('Avisa si el precio o el stock editados no son números válidos', async () => {

    //preconfiguracion
    window.prompt.mockReturnValueOnce('abc').mockReturnValueOnce('5')

    //renderizado del componente
    renderCatalog(true)

    //interaccion del usuario
    const botones = await screen.findAllByText('Editar', { selector: 'button' })
    await userEvent.click(botones[0])

    //resultados
    expect(window.alert).toHaveBeenCalledWith('Precio y stock deben ser números válidos (0 o mayores).')
    expect(api.productos[0].precio).toBe(5990)
})

test('No cambia nada si el administrador cancela la edición', async () => {

    //renderizado del componente (prompt devuelve null = cancelar)
    renderCatalog(true)

    //interaccion del usuario
    const botones = await screen.findAllByText('Editar', { selector: 'button' })
    await userEvent.click(botones[0])

    //resultados
    expect(api.productos[0].precio).toBe(5990)
    expect(api.productos[0].stock).toBe(12)
    expect(api.llamadas.filter((l) => l.metodo === 'PUT')).toHaveLength(0)
})
