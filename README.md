# Ferretech (frontend)

Tienda online de ferretería hecha con React (Vite) y JSX. Es el **frontend** de Ferretech: catálogo con buscador, carrito, registro e inicio de sesión, recuperación de contraseña con código y panel de administrador para gestionar el catálogo.

Antes funcionaba solo en el navegador (con `localStorage`). Ahora consume una **API REST** (Spring Boot, PostgreSQL y JWT) que vive en su propio repositorio, `ferretech-backend`, y se despliega en AWS EC2. Este repositorio incluye además una suite de pruebas automatizadas con Vitest y Testing Library que **se ejecutan en local, sin necesitar el backend**.

## Tecnologías

| Herramienta | Uso |
| --- | --- |
| React 19 | Interfaz (componentes funcionales y hooks) |
| React Router 7 | Navegación entre páginas sin recargar el sitio |
| Vite 7 | Servidor de desarrollo y compilación |
| SweetAlert2 | Aviso emergente al agregar un producto al carrito |
| Vitest 5, Testing Library y jsdom | Pruebas de componentes, páginas y servicios |

## Requisitos

- Node.js 20.19+ o 22.12+
- npm
- Para ver datos reales en desarrollo: el backend corriendo (ver el README de `ferretech-backend`) en tu PC o en la EC2

## Ejecutar

```bash
npm install
npm run dev
```

Abre la dirección que muestra Vite (normalmente `http://localhost:5173`). El archivo `.env.development` ya apunta la API a `http://localhost:8080/api`.

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga automática |
| `npm run build` | Compilación de producción en `dist/` |
| `npm run preview` | Sirve la compilación de producción para comprobarla |
| `npm run test` | Ejecuta las pruebas en modo observación (se vuelven a correr al guardar cambios) |
| `npm run test -- --run` | Ejecuta las pruebas una sola vez |
| `npm run test -- --run --coverage` | Ejecuta las pruebas una vez y genera el reporte de cobertura |

## Conexión con el backend

Todas las llamadas HTTP pasan por `src/services/api.js`:

| Entorno | Dirección de la API |
| --- | --- |
| Desarrollo local (`npm run dev`) | `VITE_API_BASE_URL` de `.env.development` (por defecto `http://localhost:8080/api`) |
| Desarrollo contra la EC2 | Crear `.env.development.local` con `VITE_API_BASE_URL=http://IP-O-DOMINIO/api` (no se sube a Git) |
| Producción (`npm run build`) | Sin variable: usa la ruta relativa `/api`. Caddy sirve el frontend y reenvía `/api` al backend desde el mismo dominio, así que no hay CORS ni contenido mixto |

La sesión (`usuarioActual` en `localStorage`) guarda `{ usuario, rol, token }`. El token es un JWT que `peticion()` envía en el header `Authorization: Bearer ...` en cada llamada. Si el servidor responde con un error, `peticion()` lanza un `ErrorApi` cuyo `message` es el texto en español que entrega el backend (y `estado` el código HTTP, con `0` si no hubo conexión).

| Servicio | Endpoints que usa |
| --- | --- |
| `services/auth.js` | `POST /auth/login`, `/auth/admin/login`, `/auth/registro`, `/auth/recuperar`, `/auth/restablecer` |
| `services/productos.js` | `GET /productos` (público), `POST`, `PUT /productos/{id}` y `DELETE /productos/{id}` (solo administrador) |
| `services/carrito.js` | `POST /pedidos` al finalizar la compra (exige sesión) |

## Despliegue en EC2

El frontend se compila aquí y se copia a la EC2; el repo del backend lo sirve con Caddy.

```powershell
# Windows (PowerShell)
.\scripts\desplegar.ps1 -Clave C:\ruta\mi-clave.pem -Ip IP_O_DOMINIO
```

```bash
# Linux / macOS / Git Bash
./scripts/desplegar.sh ruta/mi-clave.pem IP_O_DOMINIO
```

El script ejecuta `npm run build`, vacía `~/ferretech-backend/dist` en la EC2 y copia la nueva compilación. No hay que reiniciar contenedores. Usa `-Usuario ubuntu` (o el cuarto parámetro de `.sh`) si la instancia no es Amazon Linux, y `-Carpeta` si clonaste el backend con otro nombre. Los pasos para dejar la EC2 lista están en el README de `ferretech-backend`.

## Rutas

| Ruta | Página | Equivale a |
| --- | --- | --- |
| `/` | `Home` | `index.html` |
| `/admin` | `AdminHome` | `index_admin.html` |
| `/carrito` | `Cart` | `carrito.html` |
| `/login` | `Login` | `login.html` |
| `/ingreso` | `Register` | `ingreso.html` |
| `/ingreso-admin` | `AdminLogin` | `ingreso_admin.html` |
| `/restablecer` | `ResetPassword` | `restablecer.html` |

Cualquier otra ruta redirige al inicio. Las rutas `/`, `/admin` y `/carrito` muestran el menú completo (cuenta y carrito); las páginas de acceso muestran el header solo con la marca.

## Estructura

```text
index.html                  Documento base de Vite (carga las fuentes desde Google Fonts)
vite.config.js              Plugin de React y configuración de Vitest (entorno jsdom)
.env.development            Dirección de la API para "npm run dev"
scripts/                    desplegar.ps1 y desplegar.sh (compilar y subir a la EC2)
public/img/                 Imágenes de productos y el ícono del carrito
src/
├── main.jsx                Punto de entrada (BrowserRouter)
├── App.jsx                 Rutas de la aplicación
├── styles.css              Estilos de la tienda (paleta grafito, concreto y amarillo)
├── components/             Piezas reutilizables
├── pages/                  Una página por cada HTML original
├── context/                Estado compartido de catálogo y carrito
├── services/               Cliente HTTP (api.js) y servicios que hablan con la API
└── tests/                  Pruebas con Vitest y Testing Library (+ apiFalsa.js)
```

Las tipografías (Oswald, Inter y JetBrains Mono) se cargan desde Google Fonts. Sin conexión a internet se usan las de respaldo definidas en `styles.css` (Arial Narrow, Arial y Courier New).

## Componentes y comportamientos

| Componente | Qué hace |
| --- | --- |
| `Layout` | Envuelve las páginas con `Header` y `Footer`. Con `showNav` muestra "Mi cuenta" y el carrito. |
| `Header` | Marca con eslogan, enlace a la cuenta y carrito con contador de unidades. |
| `Footer` | Horario, marca y ubicación. |
| `Hero` | Banner de bienvenida del catálogo. |
| `Catalog` | Buscador por nombre y grilla de productos. Muestra "Cargando productos..." mientras llega el catálogo y el error de conexión si la API no responde. Con `admin` cambia las acciones de cada tarjeta: "Editar" pide el nuevo precio y stock, y "Dar de baja" pide confirmación antes de quitar el producto. |
| `ProductCard` | Muestra imagen, estado de stock, detalles y precio. Permite agregar al carrito (deshabilitado sin stock) o, en modo admin, editar y dar de baja. |
| `AdminProductForm` | Botón "+ Agregar producto" que despliega el formulario de alta. Si se deja la foto vacía usa `img/descarga.png`, y si se deja la descripción vacía usa "Sin descripción.". El formulario solo se cierra si el servidor acepta el producto. |
| `CartItem` | Fila del carrito con cantidad (+ / −), subtotal y botón para quitar. |
| `TiendaProvider` | Carga el catálogo desde la API y mantiene el carrito en memoria, sincronizado con `localStorage`. Se usa con `useTienda()`. |

### Estado de stock

Cada tarjeta muestra el estado según las unidades disponibles:

| Stock | Etiqueta |
| --- | --- |
| 0 | Agotado |
| 1 a 9 | Pocas unidades |
| 10 o más | En stock |

### Stock y carrito

**Cambió respecto a la versión sin backend.** El carrito vive en el navegador, pero el stock real está en el servidor y solo se descuenta al **finalizar la compra**. Así un carrito abandonado no bloquea unidades y dos clientes no pueden comprar la misma última unidad (el servidor lo valida y lo hace de forma atómica).

| Acción | Efecto |
| --- | --- |
| Agregar al carrito (o botón +) | Suma 1 unidad al carrito. No deja superar el stock que muestra el catálogo; el stock del catálogo no cambia. |
| Botón − | Resta 1 unidad. Si era la última, el producto sale del carrito. |
| Quitar | Saca el producto del carrito. |
| Vaciar carrito | Deja el carrito vacío. |
| Finalizar compra | Exige haber iniciado sesión. Envía el pedido a `POST /pedidos`: si hay stock suficiente de todo, descuenta el stock, vacía el carrito y avisa "¡Compra simulada con éxito!" (el pago es simulado). Si no, avisa el motivo y conserva el carrito. En ambos casos recarga el catálogo para mostrar el stock real. Con el carrito vacío solo avisa. |

## Datos y persistencia

Los datos del negocio (productos, usuarios y pedidos) viven en la base de datos del backend. En el navegador solo quedan:

| Clave (`localStorage`) | Contenido |
| --- | --- |
| `carrito` | Productos agregados con su cantidad |
| `usuarioActual` | Sesión iniciada: `{ usuario, rol, token }` |

El código de recuperación de contraseña ya no se guarda en el navegador: lo genera y valida el servidor (6 dígitos, vale 10 minutos, sirve una sola vez y se invalida tras 5 intentos fallidos). La pantalla de recuperación solo recuerda el nombre de usuario entre el paso 1 y el paso 2.

Cuentas de prueba (las crea el backend al iniciar por primera vez): cliente `Mauricio` / `1234` y administrador `Admin` / `1234`.

Las imágenes con ruta relativa (por ejemplo `img/images.jpg`) se resuelven con `rutaImagen()`, que antepone la base de Vite; las URLs absolutas (`https:`, `data:`, `blob:` o que empiecen con `/`) se usan tal cual. Los archivos de imagen siguen en `public/img/` y el backend solo guarda su ruta.

## Pruebas

Hay 128 casos de prueba repartidos en 15 archivos dentro de `src/tests/`:

| Archivo | Casos | Qué verifica |
| --- | --- | --- |
| `auth.test.js` | 18 | Login de cliente y administrador, sesión, creación de cuentas, código de recuperación, cambio de contraseña y falta de conexión |
| `carrito.test.js` | 18 | Total y conteo del carrito, agregar con tope de stock, quitar, eliminar, vaciar, y finalizar compra (éxito, carrito vacío, sin sesión y sin stock) |
| `productos.test.js` | 11 | Estado de stock, formato de precio, lectura pública del catálogo, alta, edición y baja con permisos de administrador, y `rutaImagen` |
| `api.test.js` | 8 | Dirección base, header `Authorization`, cuerpo JSON, errores del servidor, respuestas 204 y falta de conexión |
| `Catalog.test.jsx` | 14 | Carga y error de conexión, búsqueda, agregar al carrito y acciones de administrador (con y sin permisos) |
| `App.test.jsx` | 11 | Cada ruta muestra su página, redirección de rutas desconocidas y flujos entre páginas |
| `Cart.test.jsx` | 11 | Carrito vacío, totales, +, −, quitar, vaciar y finalizar compra (con sesión, sin sesión y sin stock) |
| `Login.test.jsx` | 6 | Campos vacíos, credenciales válidas e inválidas y falta de conexión |
| `ResetPassword.test.jsx` | 6 | Recuperación en dos pasos: usuario y código |
| `Header.test.jsx` | 5 | Marca, menú con y sin `showNav`, contador y navegación |
| `ProductCard.test.jsx` | 5 | Datos del producto, estado de stock y modo administrador |
| `AdminProductForm.test.jsx` | 5 | Abrir y cancelar el formulario, valores por defecto, validación y rechazo del servidor |
| `CartItem.test.jsx` | 4 | Datos de la fila y avisos de +, − y quitar |
| `Register.test.jsx` | 3 | Alta de cuenta, campos vacíos y usuario repetido |
| `AdminLogin.test.jsx` | 3 | Ingreso de administrador, credenciales inválidas y cliente sin permisos |

Algunos casos conservan el identificador de su plan de pruebas en el título: `CP-01` a `CP-05` (login y registro) y `NAV-01`, `NAV-02`, `NAV-03` y `NAV-05` (navegación).

### Cómo se prueban sin el backend

Las pruebas **no necesitan el backend, Docker ni conexión a AWS**. `src/tests/apiFalsa.js` reemplaza `fetch` por una API falsa en memoria que responde como el backend real (mismas rutas, mismos códigos HTTP y mismos mensajes):

```js
const api = instalarApiFalsa()   // en beforeEach
quitarApiFalsa()                 // en afterEach

api.productos / api.usuarios / api.pedidos   // estado "del servidor" para hacer asserts
api.llamadas                                  // todas las peticiones recibidas
```

Además:

- `localStorage` y `sessionStorage` se limpian entre casos para que cada prueba parta desde cero.
- `window.alert`, `window.confirm` y `window.prompt` se reemplazan con espías de Vitest para comprobar los mensajes y simular las respuestas del usuario.
- `sweetalert2` se simula con un mock. La API falsa siempre entrega el código de recuperación `100000`, así no hace falta fijar `Math.random`.
- Las esperas a datos que llegan de la API usan `findBy...` y `waitFor` de Testing Library.
- Las páginas se renderizan dentro de `MemoryRouter`, con `TiendaProvider` cuando usan el carrito o el catálogo.
- `src/tests/configTest.js` carga los matchers de `@testing-library/jest-dom`.

La API falsa duplica a propósito las reglas del backend. Si cambias un endpoint o un mensaje en `ferretech-backend`, actualízalo también en `apiFalsa.js`. Las pruebas del backend (`./mvnw test`) verifican el comportamiento real contra una base de datos.

### Cobertura

`npm run test -- --run --coverage` genera el reporte en `coverage/` (carpeta ignorada por git); abre `coverage/index.html` para verlo.

## Equivalencias con el proyecto original

| Original | React |
| --- | --- |
| `js/productos.js` | `services/productos.js` (llamadas a la API y utilidades de precio, stock e imagen) |
| `js/carrito.js` | `services/carrito.js`, `context/TiendaContext.jsx` y `components/CartItem.jsx` |
| `js/login.js` y `js/login_admin.js` | `services/auth.js` |
| `js/catalogo.js` | `components/Catalog.jsx`, `ProductCard.jsx` y `AdminProductForm.jsx` |
| Header, footer y hero repetidos en cada HTML | `components/Header.jsx`, `Footer.jsx`, `Hero.jsx` y `Layout.jsx` |
| `styles/styles.css` | `src/styles.css` |
| `img/` | `public/img/` |
| SweetAlert2 desde CDN | paquete npm `sweetalert2` |

Los nombres de las funciones de `services/` (`obtenerProductos`, `agregarAlCarrito`, `validarLogin`…) se mantienen; ahora las que hablan con el servidor devuelven promesas. SweetAlert2 se usa solo para el aviso al agregar al carrito; el resto de los avisos usan `window.alert`, `window.confirm` y `window.prompt`.

## Diferencias con la versión sin backend

- **Datos en el servidor:** productos, usuarios y pedidos están en PostgreSQL. Ya no se pierden al cambiar de navegador y todos los clientes ven el mismo catálogo.
- **Stock al finalizar la compra:** ya no se descuenta al agregar al carrito (ver "Stock y carrito").
- **Comprar exige sesión:** el pedido se asocia a un usuario. Sin sesión, "Finalizar compra" pide iniciar sesión y conserva el carrito.
- **Permisos reales:** crear, editar y dar de baja productos solo funciona con el JWT de un administrador; el servidor responde 401 o 403 en otro caso y la interfaz muestra ese mensaje.
- **Recuperación de contraseña:** la cuenta de administrador no se puede recuperar por este medio, y el servidor limita los intentos del código.
- **Funciones asíncronas:** los servicios que consultan al servidor devuelven promesas, y las pantallas esperan la respuesta (con avisos si no hay conexión).

## Limitaciones conocidas

Es un proyecto de curso que simula una tienda; no está pensado para producción sin más ajustes.

- **Sin bloqueo visual de `/admin`:** la ruta se abre escribiendo la dirección, aunque no se haya iniciado sesión. Los datos sí están protegidos (el servidor rechaza las operaciones sin el JWT de un administrador), pero la pantalla en sí no se oculta. Tampoco hay botón para cerrar sesión (`cerrarSesion` existe en `services/auth.js`, pero la interfaz no lo usa).
- **Token en `localStorage`:** el JWT dura 8 horas y se guarda en el navegador, como es habitual en proyectos de curso. Cuando vence, las operaciones protegidas responden 401 y hay que volver a ingresar.
- **Recuperación de contraseña simulada:** el código se muestra en pantalla en lugar de enviarse por correo.
- **Pago simulado:** "Finalizar compra" registra el pedido y descuenta stock, pero no hay una pasarela de pago.
