# SUM Municipal — migración a Vue

Migración de `tfi.rar` a Vue 3 con Composition API, componentes `.vue`, Vue Router y Vite. Una aplicación, un build y un despliegue: monolito modular de frontend. El archivo original no contiene backend ni base de datos; esta entrega conserva su funcionamiento de demostración en el navegador.

## Ejecutar

Requiere Node.js 22.12 o posterior (verificado con Node 24).

```bash
npm ci
npm run dev
```

Abrir la URL que muestra Vite. No abrir `index.html` directamente con doble clic.

```bash
npm test
npm run build
npm run preview
```

`dist/` contiene la aplicación compilada. Se puede servir desde un hosting estático mediante HTTP/HTTPS. Las rutas usan `#` para que la recarga no necesite reglas especiales del servidor. No se publicó ningún sitio ni se modificó un repositorio remoto.

## Credenciales de demostración

| Perfil | Usuario | Contraseña |
| --- | --- | --- |
| Administración | `Admin sum` | `admin123` |
| Prensa | `prensa` | `prensa123` |
| Cliente | Crear cuenta y verificar el código mostrado | La elegida al registrarse |

Administración puede cambiar el acceso de Prensa. Las credenciales iniciales ya existían en el original y son exclusivamente de prueba.

## Funciones migradas

- Consulta pública: estado de cancha, calendario mensual, disponibilidad por hora, actividades, flyers e información.
- Clases: la página principal muestra Básquet, Vóley, Handball, Taekwondo, Gimnasia artística y Gimnasia en tela, inicialmente con horarios a confirmar. En Administración → Clases se pueden agregar, editar y eliminar clases, con descripción opcional y varios horarios semanales. Los horarios son informativos y no generan reservas ni bloqueos del calendario.
- El botón «Clases» junto a «Ingresar» abre `/#/clases`, con fotos, descripciones y acceso a `/#/clases/:id/inscripcion`. La inscripción es directa, sin cuenta, con nombre, apellido, correo y teléfono de contacto; permite elegir un horario publicado o inscribirse con horario a confirmar. Administración → Clases → Ver inscripciones permite consultar los registros. No envía correos ni confirma cupos automáticamente.
- Acceso: registro, verificación, reenvío, ingreso por correo/DNI/nombre y apellido, recuperación y nueva contraseña.
- Cliente: solicitud con validación, borrador durante la sesión, vista previa de nota, confirmación, descarga PDF, reservas próximas y perfil.
- Administración: resumen, calendario y detalles, solicitudes por estado, aprobación, rechazo, cancelación, informes PDF diarios/semanales/mensuales, estado de cancha y credenciales de Prensa.
- Prensa: una única pantalla sin menú lateral para crear, editar y eliminar eventos y avisos. Los eventos se muestran en tarjetas con fecha y flyer opcional; los avisos usan un globo con megáfono y permanecen publicados hasta su eliminación. El botón «Añadir evento» permite elegir el tipo de publicación.
- Interfaz adaptable, modo oscuro del sistema, etiquetas de formularios, navegación por teclado y diálogos nativos con gestión de foco.

## Organización

```text
src/
  config.js            Configuración institucional y modo de demostración
  domain/              Fechas, validaciones, disponibilidad y datos de la nota
  application/         Casos de uso, permisos, coordinación y contexto reactivo
  infrastructure/      localStorage, contraseñas, PDF, imágenes y datos iniciales
  components/          Calendario, formularios, marcador, notas y diálogos
  views/               Pantallas por caso de uso y perfil
  router/              Rutas, menús y guardas de navegación
  styles/              Estilos conservados del proyecto original
  main.js              Composición e inyección de dependencias
 tests/                Pruebas de reglas, servicios, persistencia y PDF
 docs/                 Arquitectura y alcance de la migración
```

## Datos existentes

Las clases se guardan en `sumbv_clases` con nombre, descripción y horarios por día de la semana. Las seis clases iniciales se usan solo cuando esa clave todavía no existe; editar o eliminar clases, incluso todas, se conserva al recargar. Comparten el almacenamiento local del resto de la aplicación.

Las inscripciones usan `sumbv_inscripciones_clases` y conservan una copia del nombre de la clase y horario elegido. También son locales al navegador: para recibir inscripciones desde otros dispositivos hace falta conectar un backend. Las fotos ilustrativas se incluyen en `public/img/clases`, con créditos y licencias en `src/domain/class-photos.json` y visibles en las tarjetas. Son miniaturas de Wikimedia Commons, mostradas con encuadre CSS; las imágenes conservan las licencias indicadas. Administración puede reemplazarlas por fotos propias. Las clases guardadas antes de incorporar fotos reciben los detalles iniciales solo si conservan su identidad original; los textos personalizados y las clases eliminadas se respetan.

Las publicaciones conservan la clave `sumbv_actividades` y agregan `tipo` (`evento` o `aviso`). Los registros anteriores, sin ese campo, se interpretan como eventos. Los avisos requieren título y mensaje; no guardan fecha, horarios ni flyer. La vista pública muestra avisos y eventos de hoy en adelante; Prensa conserva el listado completo para administrarlo. Las antiguas rutas `/prensa/actividades` y `/prensa/informacion` redirigen a `/prensa`.

Se mantienen las claves `sumbv_usuarios`, `sumbv_reservas`, `sumbv_actividades`, `sumbv_info`, `sumbv_cancha`, `sumbv_prensa`, `sumbv_sesion`, `sumbv_contador` y `sumbv_codigos`. Si el proyecto se sirve bajo el mismo protocolo, dominio y puerto del original, puede leer esos datos. Un origen diferente tiene otro almacenamiento: los datos no se transfieren automáticamente. Los datos demo se generan solo cuando no existe la clave de reservas. Los borradores y verificaciones temporales anteriores no se importan; se inicia nuevamente ese proceso.

El logo original apuntaba a un archivo inexistente. Configurar `CONFIG.LOGO_RUTA` y colocar el logo en `public/`; mientras tanto se muestra la marca textual SUM. La dirección institucional conserva el texto pendiente de completar del original.

## Alcance y límites

Esta es una demostración local. Los datos no se comparten entre dispositivos, las cuentas no son autenticación de servidor, las guardas de Vue y los permisos de los servicios son controles de interfaz y no una frontera de seguridad. Las contraseñas SHA-256 mantienen compatibilidad con las cuentas anteriores; no sustituyen un esquema de autenticación de producción. Se necesita HTTPS o localhost para las operaciones criptográficas.

Los códigos se muestran en pantalla y **no se envían correos**. Cambiar `MODO_DEMO` no conecta un proveedor: el adaptador de autenticación sigue siendo local. Para producción debe sustituirse por servicios del backend, manteniendo si se desea un único servidor monolítico con módulos internos. También deben resolverse allí los conflictos concurrentes con transacciones, validación de permisos y persistencia central. La comprobación actual evita solapamientos en el estado local al confirmar y aprobar, pero no constituye bloqueo transaccional entre pestañas.

Los PDF se generan al descargarlos desde los datos de la reserva; no hay almacenamiento de documentos firmados. Se conservan las horas en punto y los intervalos de varias horas admitidos por el código original. El cierre manual fuera de servicio avisa de las reservas afectadas, sin cancelarlas automáticamente.

Ver [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) para las decisiones SOLID y la equivalencia de pantallas.

## Avisos de instalación en npm reciente

El paquete incluye jsPDF 4.2.1, comprobado con `npm audit`, pruebas y compilación. Si usás la primera entrega, actualizá con `npm install jspdf@4.2.1 --save-exact`. No es necesario ejecutar `npm audit fix --force`.

Si npm informa scripts pendientes de esbuild y core-js, podés aprobar el instalador de esbuild y denegar el mensaje opcional de core-js:

```bash
npm install-scripts approve esbuild
npm install-scripts deny core-js
npm rebuild esbuild
npm run dev
```

Estos comandos de aprobación corresponden a las versiones de npm que muestran ese aviso. No son necesarios en las versiones anteriores que no incluyen `install-scripts`.

## Temas visuales

La paleta se centraliza al inicio de `src/styles/general.css`: `:root` define el modo claro y `:root[data-theme="dark"]` el oscuro. Ajustar los tokens `--bg`, `--panel`, `--panel-2`, `--ink`, `--ink-2`, `--brand` y sus variantes de estados; `--control-line` distingue controles de los separadores decorativos (`--line`). Los tokens `--score-*` controlan el marcador de cancha. Mantener contraste de al menos 4.5:1 en texto normal y 3:1 en controles y foco; amarillo y lima se reservan para acentos, no texto sobre crema.

`ThemeSelector.vue` aparece en la cabecera pública y en todos los paneles, incluso con el menú móvil cerrado. `public/theme.js` aplica la preferencia antes de cargar la aplicación para evitar destellos. La hoja de estilos se carga en el encabezado de `index.html` para bloquear el primer pintado hasta que la paleta esté disponible. Guarda claro/oscuro en `localStorage` (`sumbv_theme`); Sistema elimina esa preferencia y sigue los cambios del sistema operativo. También sincroniza pestañas y tolera almacenamiento bloqueado. La nota formal sigue el tema de pantalla; la generación de PDF conserva su formato documental. El logo se muestra sin filtros ni recoloración.

Este proyecto incluye cliente, administración y prensa. No contiene rutas de superadmin ni pantalla de sistema suspendido; los componentes compartidos adoptarán la paleta cuando esas vistas se incorporen.

Validación: `npm test` incluye pruebas de preferencia guardada, sistema, sincronización, almacenamiento bloqueado y contraste. `npm run build` compila la aplicación. Se revisaron las 19 rutas existentes y la nota formal en Edge, con ambos temas y anchos de 1440, 768, 360 y 320 px. El tamaño del texto del marcador depende del ancho de su contenedor para evitar recortes.
