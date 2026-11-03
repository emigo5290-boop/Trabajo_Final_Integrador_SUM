# Arquitectura y decisiones de migración

## Monolito modular

La aplicación tiene un único punto de entrada (`main.js`) y genera un único sitio. Las carpetas delimitan responsabilidades dentro del mismo proceso y despliegue. No hay microservicios. Los archivos de JavaScript generados por Vite son recursos de una sola aplicación.

Flujo principal: vista Vue → servicio de aplicación → reglas de dominio y repositorio inyectado. El contexto reactivo notifica a Vue después de cada escritura; las pantallas no acceden directamente a localStorage ni generan HTML como cadenas. Las dependencias concretas se seleccionan en `main.js` y llegan a los componentes mediante provide/inject.

## Aplicación de SOLID

| Principio | Aplicación concreta |
| --- | --- |
| Responsabilidad única | Calendario, campos, diálogos y notas son componentes específicos. Disponibilidad, autenticación, reservas y contenido tienen módulos propios. PDF y almacenamiento viven fuera de las vistas. |
| Abierto/cerrado | Es posible sustituir almacenamiento, cálculo de hash, reloj, generación de identificadores o adaptador de PDF desde la composición, sin reescribir las reglas puras. |
| Sustitución de Liskov | El almacenamiento de navegador y el almacenamiento de prueba respetan el mismo contrato síncrono `read(key, fallback)` / `write(key, value)`. No se simula una jerarquía innecesaria. |
| Segregación de interfaces | Los servicios reciben los puertos que necesitan. Las vistas invocan operaciones específicas (`request`, `decide`, `saveCourt`, etc.), sin manipular directamente el repositorio. |
| Inversión de dependencias | Los casos de uso no importan Vue, localStorage ni jsPDF. Reciben repositorio, sesión, usuario, reloj o contraseñas como dependencias. El dominio no conoce la interfaz. |

El repositorio local es síncrono. Un backend HTTP necesitará una adaptación explícita de los casos de uso a promesas y manejo de carga/error; no basta con reemplazar una función síncrona por `fetch`. Esta distinción evita prometer una sustitución que no respeta el contrato.

## Pantallas

| Original | Ruta Vue |
| --- | --- |
| `index.html` | `/#/` |
| `html/login/login.html` | `/#/login` |
| `html/registro/registro.html` | `/#/registro` |
| `html/verificacion/verificacion.html` | `/#/verificacion` |
| `html/recuperacion/recuperar-clave.html` | `/#/recuperar` |
| `html/recuperacion/nueva-clave.html` | `/#/nueva-clave` |
| `html/cliente/inicio.html` | `/#/cliente` |
| `html/cliente/reservar.html` | `/#/cliente/reservar` |
| `html/cliente/mis-reservas.html` | `/#/cliente/reservas` |
| `html/cliente/perfil.html` | `/#/cliente/perfil` |
| `html/administracion/inicio.html` | `/#/administracion` |
| `html/administracion/calendario.html` | `/#/administracion/calendario` |
| `html/administracion/reservas.html` | `/#/administracion/reservas` |
| `html/administracion/solicitudes.html` | `/#/administracion/solicitudes` |
| `html/administracion/cancha.html` | `/#/administracion/cancha` |
| `html/administracion/prensa.html` | `/#/administracion/prensa` |
| `html/prensa/inicio.html` | `/#/prensa` |
| `html/prensa/actividades.html` | `/#/prensa` (el enlace anterior redirige) |
| `html/prensa/informacion.html` | `/#/prensa` (el enlace anterior redirige) |

Prensa utiliza una sola vista, `PressView.vue`, sin menú lateral ni listado de reservas. `ActivityEditor.vue` permite elegir evento o aviso; `ActivityCard.vue` presenta los eventos como tarjetas y los avisos como globos con megáfono, reutilizando la misma presentación en el sitio público. `domain/publications.js` concentra validación, orden y visibilidad; `application/content.js` mantiene los permisos y la persistencia. Se conserva la clave de almacenamiento `actividades`; los registros sin `tipo` se consideran eventos. El contenido institucional ya guardado continúa visible en la página pública.

Los HTML antiguos se sustituyen por rutas; los enlaces antiguos no se redirigen automáticamente. Las reservas administrativas se presentan como tarjetas reutilizando los mismos datos y acciones. La verificación usa un campo de cuatro dígitos que permite pegar el código completo. Las actividades públicas se muestran también cuando no tienen flyer.

## Mejoras sobre el código original

- No hay `innerHTML`, manejadores globales por `data-accion` ni variables globales compartidas.
- Validación de fechas reales, formato horario y transiciones de estado en los servicios.
- Verificación de duplicados pendientes al confirmar y revalidación de disponibilidad al aprobar.
- Un código válido se consume; la autorización temporal de recuperación vence y se borra tras usarla.
- La selección del calendario no descarta los datos escritos en el formulario.
- Persistencia con respaldo en memoria y aviso cuando no se puede guardar durablemente.
- Actualización del estado al recibir eventos de almacenamiento de otras pestañas y cada 30 segundos.
- Dependencias empaquetadas mediante npm, sin cargar jsPDF desde un CDN.
- El PDF de la nota admite saltos de página y texto largo.

## Comprobaciones automatizadas

`npm test` ejecuta pruebas de fechas, intervalos contiguos, solapamientos, cierre de cancha, duplicados, permisos, transiciones, almacenamiento bloqueado, registro, verificación de un uso, vencimiento, recuperación e informes PDF. `npm run build` compila los componentes Vue para producción.

Fuentes técnicas utilizadas: documentación oficial de [componentes Vue](https://vuejs.org/guide/essentials/component-basics) y [provide/inject](https://vuejs.org/guide/components/provide-inject).
