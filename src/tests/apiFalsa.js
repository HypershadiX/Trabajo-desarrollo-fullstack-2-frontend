// API falsa en memoria para los tests del frontend.
//
// Reemplaza `fetch` por una función que responde como lo hace el backend de Ferretech
// (mismas rutas, mismos códigos HTTP y mismos mensajes), pero sin servidor ni red. Así los
// tests siguen corriendo en local, rápido y sin depender de EC2.
//
// Uso:
//   const api = instalarApiFalsa()   // en beforeEach
//   quitarApiFalsa()                 // en afterEach
//   api.productos / api.usuarios / api.pedidos  -> estado "del servidor" para hacer asserts
//   api.llamadas                                -> todas las peticiones recibidas
import { vi } from 'vitest'

export const productosDePrueba = [
    {
        id: 1, nombre: 'Brocha', precio: 5990, stock: 12,
        imagen: 'img/images.jpg',
        detalles: 'Brocha de cerdas sintéticas de 2 pulgadas. Ideal para pintura al agua y esmalte, mango de madera ergonómico y virola resistente a la corrosión.',
    },
    {
        id: 2, nombre: 'Tarro de pintura', precio: 45990, stock: 5,
        imagen: 'img/images (1).jpg',
        detalles: 'Pintura látex interior/exterior, tarro de 1 galón. Alto poder cubritivo, secado al tacto en 4 horas y bajo olor.',
    },
    {
        id: 3, nombre: 'Bolsa de clavos', precio: 6990, stock: 30,
        imagen: 'img/images (2).jpg',
        detalles: 'Bolsa de 1 kg de clavos de acero galvanizado de 2 pulgadas, resistentes a la corrosión, ideales para estructuras de madera.',
    },
]

// Código de recuperación que entrega siempre la API falsa (así los tests son predecibles).
export const CODIGO_FALSO = '100000'

export function tokenDe(usuario, rol) {
    return `token-${usuario}-${rol}`
}

// Sesión tal como la guarda la app al ingresar: { usuario, rol, token }.
export function sesionDe(usuario, rol) {
    return { usuario, rol, token: tokenDe(usuario, rol) }
}

const copiar = (valor) => JSON.parse(JSON.stringify(valor))
const responder = (estado, cuerpo = null) => ({ estado, cuerpo })
const fallar = (estado, mensaje) => responder(estado, { mensaje })

function sesionDelHeader(autorizacion) {
    const coincidencia = /^Bearer token-(.+)-(USER|ADMIN)$/.exec(autorizacion || '')
    return coincidencia ? { usuario: coincidencia[1], rol: coincidencia[2] } : null
}

// Verifica la sesión como el backend: 401 si no hay sesión y 403 si no alcanza el rol.
function exigirRol(sesion, rol) {
    if (!sesion) return fallar(401, 'Debes iniciar sesión.')
    if (rol && sesion.rol !== rol) return fallar(403, 'No tienes permisos para esta acción.')
    return null
}

function ingresar(estado, cuerpo, rolEsperado) {
    const usuario = (cuerpo?.usuario || '').trim()
    const contrasena = (cuerpo?.contrasena || '').trim()
    const cuenta = estado.usuarios.find((u) => u.usuario === usuario)

    if (!cuenta || cuenta.rol !== rolEsperado || cuenta.contrasena !== contrasena) {
        return fallar(401, 'Usuario o contraseña incorrectos.')
    }
    return responder(200, { token: tokenDe(cuenta.usuario, cuenta.rol), usuario: cuenta.usuario, rol: cuenta.rol })
}

function registrar(estado, cuerpo) {
    const usuario = (cuerpo?.usuario || '').trim()
    const contrasena = (cuerpo?.contrasena || '').trim()

    if (!usuario || !contrasena) return fallar(400, 'Completa usuario y contraseña.')
    if (estado.usuarios.some((u) => u.usuario === usuario)) return fallar(409, 'Ese usuario ya existe, elige otro.')

    estado.usuarios.push({ usuario, contrasena, rol: 'USER' })
    return responder(201, { mensaje: 'Cuenta creada. Ya puedes iniciar sesión.' })
}

function recuperar(estado, cuerpo) {
    const usuario = (cuerpo?.usuario || '').trim()
    if (!usuario) return fallar(400, 'Ingresa tu nombre de usuario.')

    const cuenta = estado.usuarios.find((u) => u.usuario === usuario && u.rol === 'USER')
    if (!cuenta) return fallar(404, 'Ese usuario no existe.')

    estado.codigos[usuario] = CODIGO_FALSO
    return responder(200, {
        mensaje: `[Simulación de correo]\n\nHemos enviado un código de verificación al correo asociado a "${usuario}".\n\nTu código es: ${CODIGO_FALSO}`,
    })
}

function restablecer(estado, cuerpo) {
    const usuario = (cuerpo?.usuario || '').trim()
    const codigo = (cuerpo?.codigo || '').trim()
    const nueva = (cuerpo?.nuevaContrasena || '').trim()

    if (!usuario) return fallar(400, 'Ingresa tu nombre de usuario.')
    if (!codigo) return fallar(400, 'Ingresa el código que enviamos a tu correo.')
    if (!nueva) return fallar(400, 'Ingresa tu nueva contraseña.')

    if (!estado.codigos[usuario]) return fallar(400, 'Primero solicita un código de verificación.')
    if (estado.codigos[usuario] !== codigo) return fallar(400, 'El código ingresado no es correcto.')

    const cuenta = estado.usuarios.find((u) => u.usuario === usuario)
    if (!cuenta) return fallar(404, 'Ese usuario ya no existe.')

    cuenta.contrasena = nueva
    delete estado.codigos[usuario]
    return responder(200, { mensaje: 'Contraseña actualizada. Ya puedes iniciar sesión.' })
}

function crearProducto(estado, cuerpo) {
    const nombre = (cuerpo?.nombre || '').trim()
    if (!nombre) return fallar(400, 'El nombre es obligatorio.')
    if (typeof cuerpo.precio !== 'number') return fallar(400, 'El precio es obligatorio.')
    if (cuerpo.precio < 0) return fallar(400, 'El precio no puede ser negativo.')
    if (typeof cuerpo.stock !== 'number') return fallar(400, 'El stock es obligatorio.')
    if (cuerpo.stock < 0) return fallar(400, 'El stock no puede ser negativo.')

    const producto = {
        id: estado.productos.reduce((mayor, p) => Math.max(mayor, p.id), 0) + 1,
        nombre,
        precio: cuerpo.precio,
        stock: cuerpo.stock,
        imagen: (cuerpo.imagen || '').trim() || 'img/descarga.png',
        detalles: (cuerpo.detalles || '').trim() || 'Sin descripción.',
    }
    estado.productos.push(producto)
    return responder(201, producto)
}

function actualizarProducto(estado, id, cuerpo) {
    const producto = estado.productos.find((p) => p.id === id)
    if (!producto) return fallar(404, 'Producto no encontrado.')

    for (const campo of ['nombre', 'precio', 'stock', 'imagen', 'detalles']) {
        if (cuerpo?.[campo] !== undefined && cuerpo[campo] !== null) producto[campo] = cuerpo[campo]
    }
    return responder(200, producto)
}

function eliminarProducto(estado, id) {
    if (!estado.productos.some((p) => p.id === id)) return fallar(404, 'Producto no encontrado.')

    estado.productos = estado.productos.filter((p) => p.id !== id)
    return responder(204)
}

function crearPedido(estado, cuerpo, sesion) {
    const items = cuerpo?.items || []
    if (items.length === 0) return fallar(400, 'El pedido no tiene productos.')

    // Se suman las cantidades de un mismo producto y se valida todo antes de descontar
    // (el backend hace lo mismo con una transacción que se deshace si algo falla).
    const cantidades = new Map()
    for (const item of items) {
        cantidades.set(item.productoId, (cantidades.get(item.productoId) || 0) + item.cantidad)
    }

    for (const [productoId, cantidad] of cantidades) {
        const producto = estado.productos.find((p) => p.id === productoId)
        if (!producto) return fallar(404, `Producto no encontrado: ${productoId}.`)
        if (producto.stock < cantidad) return fallar(409, `Stock insuficiente para "${producto.nombre}".`)
    }

    const lineas = []
    for (const [productoId, cantidad] of cantidades) {
        const producto = estado.productos.find((p) => p.id === productoId)
        producto.stock -= cantidad
        lineas.push({
            productoId,
            nombre: producto.nombre,
            precioUnitario: producto.precio,
            cantidad,
            subtotal: producto.precio * cantidad,
        })
    }

    const pedido = {
        id: estado.pedidos.length + 1,
        usuario: sesion.usuario,
        fecha: new Date().toISOString(),
        total: lineas.reduce((suma, linea) => suma + linea.subtotal, 0),
        items: lineas,
    }
    estado.pedidos.push(pedido)
    return responder(201, pedido)
}

function atender(estado, metodo, ruta, cuerpo, autorizacion) {
    const sesion = sesionDelHeader(autorizacion)
    const rutaProducto = /^\/productos\/(\d+)$/.exec(ruta)

    if (metodo === 'POST' && ruta === '/auth/login') return ingresar(estado, cuerpo, 'USER')
    if (metodo === 'POST' && ruta === '/auth/admin/login') return ingresar(estado, cuerpo, 'ADMIN')
    if (metodo === 'POST' && ruta === '/auth/registro') return registrar(estado, cuerpo)
    if (metodo === 'POST' && ruta === '/auth/recuperar') return recuperar(estado, cuerpo)
    if (metodo === 'POST' && ruta === '/auth/restablecer') return restablecer(estado, cuerpo)

    if (metodo === 'GET' && ruta === '/productos') return responder(200, estado.productos)

    if (metodo === 'POST' && ruta === '/productos') {
        return exigirRol(sesion, 'ADMIN') || crearProducto(estado, cuerpo)
    }
    if (metodo === 'PUT' && rutaProducto) {
        return exigirRol(sesion, 'ADMIN') || actualizarProducto(estado, Number(rutaProducto[1]), cuerpo)
    }
    if (metodo === 'DELETE' && rutaProducto) {
        return exigirRol(sesion, 'ADMIN') || eliminarProducto(estado, Number(rutaProducto[1]))
    }

    if (metodo === 'POST' && ruta === '/pedidos') {
        return exigirRol(sesion, null) || crearPedido(estado, cuerpo, sesion)
    }

    return fallar(404, 'Ruta no encontrada.')
}

export function instalarApiFalsa({ productos = productosDePrueba } = {}) {
    const estado = {
        productos: copiar(productos),
        usuarios: [
            { usuario: 'Mauricio', contrasena: '1234', rol: 'USER' },
            { usuario: 'Admin', contrasena: '1234', rol: 'ADMIN' },
        ],
        codigos: {},
        pedidos: [],
        llamadas: [],
    }

    const fetchFalso = vi.fn(async (url, opciones = {}) => {
        const metodo = opciones.method || 'GET'
        const ruta = String(url).replace(/^.*\/api/, '')
        const cuerpo = opciones.body ? JSON.parse(opciones.body) : undefined
        const autorizacion = opciones.headers?.Authorization

        estado.llamadas.push({ metodo, ruta, cuerpo, autorizacion })

        const { estado: codigo, cuerpo: respuesta } = atender(estado, metodo, ruta, cuerpo, autorizacion)
        return {
            ok: codigo >= 200 && codigo < 300,
            status: codigo,
            json: async () => copiar(respuesta),
        }
    })

    vi.stubGlobal('fetch', fetchFalso)
    return estado
}

export function quitarApiFalsa() {
    vi.unstubAllGlobals()
}
