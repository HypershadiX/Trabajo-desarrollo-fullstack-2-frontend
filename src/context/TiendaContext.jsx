import { createContext, useContext, useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import {
  actualizarProducto,
  crearProducto,
  eliminarProducto,
  obtenerProductos,
} from '../services/productos.js'
import {
  agregarAlCarrito,
  calcularTotal,
  contarItems,
  eliminarDelCarrito,
  finalizarCompra,
  obtenerCarrito,
  quitarDelCarrito,
  vaciarCarrito,
} from '../services/carrito.js'

const TiendaContext = createContext(null)

export function TiendaProvider({ children }) {
  // El catálogo viene de la API; el carrito sigue en el navegador.
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [carrito, setCarrito] = useState(obtenerCarrito)

  async function cargarProductos() {
    try {
      setProductos(await obtenerProductos())
      setErrorCarga('')
    } catch (error) {
      setErrorCarga(error.message)
    } finally {
      setCargando(false)
    }
  }

  function sincronizarCarrito() {
    setCarrito(obtenerCarrito())
  }

  useEffect(() => {
    cargarProductos()
  }, [])

  // Si el carrito cambia en otra pestaña, esta se actualiza.
  useEffect(() => {
    function alCambiarAlmacenamiento(evento) {
      if (evento.key === null || evento.key === 'carrito') {
        sincronizarCarrito()
      }
    }

    window.addEventListener('storage', alCambiarAlmacenamiento)
    return () => window.removeEventListener('storage', alCambiarAlmacenamiento)
  }, [])

  function agregar(producto) {
    const agregado = agregarAlCarrito(producto)
    sincronizarCarrito()

    if (!agregado) {
      window.alert(`"${producto.nombre}" no tiene stock disponible en este momento.`)
      return
    }

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `"${producto.nombre}" agregado al carrito`,
      showConfirmButton: false,
      timer: 1800,
      timerProgressBar: true,
    })
  }

  function quitar(producto) {
    quitarDelCarrito(producto)
    sincronizarCarrito()
  }

  function eliminar(id) {
    eliminarDelCarrito(id)
    sincronizarCarrito()
  }

  function vaciar() {
    vaciarCarrito()
    sincronizarCarrito()
  }

  // Finaliza la compra en el servidor. Haya salido bien o mal, se vuelve a cargar el
  // catálogo para mostrar el stock real.
  async function comprar() {
    try {
      const resultado = await finalizarCompra()
      window.alert(resultado.mensaje)
    } catch (error) {
      window.alert(error.message)
    }

    sincronizarCarrito()
    await cargarProductos()
  }

  // Operaciones del administrador: si el servidor las rechaza (sesión vencida, sin permisos,
  // datos inválidos) se avisa con su mensaje y devuelven false.
  async function ejecutarComoAdmin(operacion) {
    try {
      await operacion()
    } catch (error) {
      window.alert(error.message)
      return false
    }

    await cargarProductos()
    return true
  }

  function agregarProducto(datos) {
    return ejecutarComoAdmin(() => crearProducto(datos))
  }

  function editarProducto(id, cambios) {
    return ejecutarComoAdmin(() => actualizarProducto(id, cambios))
  }

  function darDeBajaProducto(id) {
    return ejecutarComoAdmin(() => eliminarProducto(id))
  }

  const value = {
    productos,
    cargando,
    errorCarga,
    carrito,
    totalItems: contarItems(carrito),
    total: calcularTotal(carrito),
    agregar,
    quitar,
    eliminar,
    vaciar,
    comprar,
    agregarProducto,
    editarProducto,
    darDeBajaProducto,
  }

  return <TiendaContext.Provider value={value}>{children}</TiendaContext.Provider>
}

export function useTienda() {
  const contexto = useContext(TiendaContext)
  if (!contexto) {
    throw new Error('useTienda debe usarse dentro de <TiendaProvider>')
  }
  return contexto
}
