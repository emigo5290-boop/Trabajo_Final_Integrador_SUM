# TP3 — Refactor y code review

**Proyecto:** Sistema de reservas del SUM Municipal de Bella Vista.

**Integrantes:** Emilia Gomez y Esmeralda Marquez.

**Fecha:** 3 de noviembre de 2026.

**Rama:** `refactor/tp3-informe-reservas-solid`.

**Pull Request:** pendiente de publicación.

**Registro de revisión:** [TP3_REVISION.md](TP3_REVISION.md).

## Qué porción elegimos y por qué

Elegimos la función `generarInforme()` de `src/infrastructure/pdf.js`, que se usa desde Administración para descargar los informes de reservas. Trabajamos sobre una función del módulo de reservas y sus colaboradores inmediatos, siguiendo la organización que ya tiene nuestro proyecto.

Antes de elegirla revisamos los servicios, las reglas del sistema, las vistas, los componentes y sus conexiones. Comparamos estas posibilidades:

| Parte revisada | Qué encontramos y qué decidimos |
| --- | --- |
| Reservas y sus estados | En nuestra rama ya existe el patrón State. Rehacerlo no era la mejora más necesaria para este trabajo. |
| Autenticación | Reúne varias operaciones, pero separarlas ampliaría el alcance a distintos recorridos de acceso y recuperación. |
| Contenido, profesores y clases | Hay oportunidades para separar validaciones; corresponden a otras funciones del sistema. |
| Pantallas y componentes | En general, llaman a los servicios y muestran sus resultados. |
| Informe de reservas | Una misma función seleccionaba los datos, consultaba la fecha y dibujaba el PDF. Elegimos este caso porque mezcla responsabilidades concretas y podemos comprobar su resultado antes y después. |

## Diagnóstico y correcciones

| Antes | Después | Principio o criterio |
| --- | --- | --- |
| `generarInforme()` decidía qué reservas incluir y también definía títulos, columnas y saltos de página. Un cambio de reglas o de presentación afectaba al mismo bloque. | `prepareReservationReport()` prepara el período y los datos; `renderReservationReportPdf()` se ocupa de dibujarlos. | **SRP: responsabilidad única.** Separamos motivos de cambio distintos. |
| Para probar la preparación del informe había que ejecutar una función que construía directamente un objeto de jsPDF y consultaba la fecha del equipo. | `createReservationReportService()` recibe `render` y `clock`. En la aplicación real conectamos el dibujado del PDF; en las pruebas usamos una función sencilla y una fecha conocida. | **DIP: inversión de dependencias.** El caso de uso depende de funciones con un contrato definido, sin importar jsPDF. |
| Nombres como `rg`, `g`, `act` y `cabTabla` exigían leer más código para entender su contenido. | Usamos `range`, `generatedAt`, `activityLines`, `rowHeight` y `drawTableHeader`. | **Código limpio:** nombres que explican su propósito. |

La función pública `generarInforme(periodo, fecha, reservations)` sigue existiendo y devuelve `{ doc, nombre }`. También conservamos la exportación de `rangoPeriodo` desde su ubicación anterior. Así, la pantalla que descarga los informes sigue llamando a las mismas operaciones.

## Cómo quedó organizado

1. **Dominio — `src/domain/reservation-report.js`:** calcula el período, selecciona las reservas y las ordena.
2. **Aplicación — `src/application/reservation-report.js`:** coordina la preparación y llama al generador recibido por parámetro.
3. **PDF — `src/infrastructure/pdf.js`:** conecta el servicio con jsPDF y conserva el dibujo y la descarga del documento.

Aplicamos SRP y DIP porque encontramos problemas concretos relacionados con ellos. La separación también facilita cambiar el generador sin editar la selección de reservas, en línea con **OCP**. No agregamos subclases para intentar demostrar **LSP**, ni interfaces extensas para justificar **ISP**: este fragmento no las necesita.

Respecto de **DRY**, reutilizamos el ordenamiento y las funciones de fechas existentes; no copiamos esas reglas. Con **YAGNI**, evitamos crear exportadores adicionales, clases base o un sistema de plugins. Conservamos incluso el comportamiento anterior de tratar un período no reconocido como mensual: agregar una validación nueva habría cambiado el funcionamiento, y este trabajo pide refactorizar.

## Cómo comprobamos que sigue funcionando igual

Agregamos siete pruebas en [reservation-report.test.js](../tests/reservation-report.test.js). Cubren los límites de los períodos, semanas que cruzan de año, febrero bisiesto, exclusión de rechazadas, orden de las reservas, conservación de los datos originales, uso del generador recibido, propagación de errores, informes vacíos, textos largos y paginación.

Además, comparamos seis PDFs antes y después: informe vacío, combinación de estados, semana, mes, 80 filas y actividad larga. Fijamos la fecha y los metadatos variables del PDF para poder comparar sus bytes; en los seis casos coincidieron. Conservamos el nombre del archivo, los textos, el orden y la distribución de las páginas.

| Copia comprobada | Resultado |
| --- | --- |
| Nuestra copia de trabajo, con los cambios previos de State | 67 pruebas aprobadas de 67. |
| `main` antes del refactor (`8904593`) | 52 aprobadas de 53; falla una prueba de contraste de colores. |
| Rama del TP3 creada desde ese `main` | 59 aprobadas de 60; permanece únicamente el mismo fallo de contraste. Las siete pruebas nuevas pasan. |
| Compilación de la rama del TP3 | `npm run build` finalizó correctamente. |

El fallo previo corresponde a `reservada/reservada-soft`: contraste 2,07 frente al mínimo 4,5. Nuestra copia ya tiene una corrección de colores que todavía no está en `main`. La dejamos fuera de este PR para mantener el alcance en el informe de reservas.

## Entrega y revisión pendiente

Preparamos una rama desde `main` para que el PR contenga únicamente este trabajo. El archivo original de informes es igual en esa base y en la copia desde la que hicimos el diagnóstico.

La revisión de Esmeralda (`esmeKSJ`) debe quedar registrada en GitHub antes de integrar el PR. Después corresponde responder sus observaciones, aplicar las correcciones aceptadas y justificar en el PR cualquier sugerencia que no adoptemos. El registro siguiente diferencia esa revisión pendiente de las comprobaciones que ya realizamos.

## Código antes y después

El código completo de la porción seleccionada se conserva a continuación en el mismo registro. El resto de la generación de notas de solicitud queda fuera de este refactor.

<details>
<summary>Antes: cálculo del período y función generarInforme</summary>

Código original presente en main, commit `8904593`.

```js
export function rangoPeriodo(periodo, fecha) {
  const d = deISO(fecha);
  if (periodo === "dia")
    return { desde: fecha, hasta: fecha, texto: `Día ${fechaCorta(fecha)}` };
  if (periodo === "semana") {
    const lun = new Date(d);
    lun.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const dom = new Date(lun);
    dom.setDate(lun.getDate() + 6);
    return {
      desde: iso(lun),
      hasta: iso(dom),
      texto: `Semana del ${fechaCorta(iso(lun))} al ${fechaCorta(iso(dom))}`,
    };
  }
  const p = new Date(d.getFullYear(), d.getMonth(), 1),
    u = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return {
    desde: iso(p),
    hasta: iso(u),
    texto: `${cap(MESES[d.getMonth()])} de ${d.getFullYear()}`,
  };
}
export function generarInforme(periodo, fecha, reservations) {
  const rg = rangoPeriodo(periodo, fecha);
  // Se incluyen reservas aprobadas, pendientes y canceladas del período (las rechazadas no llegan a ser reservas)
  const lista = ordenar(
    reservations.filter(
      (r) =>
        r.estado !== "rechazada" && r.fecha >= rg.desde && r.fecha <= rg.hasta,
    ),
  );
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const mx = 20,
    cols = [
      { t: "Fecha", w: 28 },
      { t: "Horario", w: 34 },
      { t: "Actividad", w: 80 },
      { t: "Estado", w: 28 },
    ];
  let y = 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("INFORME DE RESERVAS", mx, y);
  y += 8;
  doc.setFontSize(11);
  doc.text(CONFIG.NOMBRE_SUM, mx, y);
  y += 5.5;
  doc.setFont("helvetica", "normal");
  doc.text(CONFIG.MUNICIPALIDAD, mx, y);
  y += 8;
  doc.text("Período: " + rg.texto, mx, y);
  y += 5.5;
  const g = new Date();
  doc.text(
    `Fecha de generación: ${fechaCorta(iso(g))} ${p2(g.getHours())}:${p2(g.getMinutes())} hs`,
    mx,
    y,
  );
  y += 5.5;
  doc.setFont("helvetica", "bold");
  doc.text("Cantidad de reservas: " + lista.length, mx, y);
  y += 9;
  const cabTabla = () => {
    doc.setFillColor(230, 235, 232);
    doc.rect(mx, y - 5, 170, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    let x = mx + 2;
    cols.forEach((c) => {
      doc.text(c.t, x, y);
      x += c.w;
    });
    y += 7;
    doc.setFont("helvetica", "normal");
  };
  cabTabla();
  if (!lista.length) {
    doc.text("No hay reservas en el período seleccionado.", mx + 2, y + 2);
  }
  lista.forEach((r) => {
    const act = doc.splitTextToSize(r.actividad, cols[2].w - 4),
      alto = Math.max(1, act.length) * 5 + 3;
    if (y + alto > 280) {
      doc.addPage();
      y = 22;
      cabTabla();
    }
    let x = mx + 2;
    doc.text(fechaCorta(r.fecha), x, y);
    x += cols[0].w;
    doc.text(`${r.inicio} - ${r.fin} hs`, x, y);
    x += cols[1].w;
    doc.text(act, x, y);
    x += cols[2].w;
    doc.text(ETIQ_SOL[r.estado], x, y);
    doc.setDrawColor(210);
    doc.line(mx, y + alto - 4, mx + 170, y + alto - 4);
    y += alto;
  });
  return { doc, nombre: `informe-reservas-${periodo}-${fecha}.pdf` };
}
```

</details>

<details>
<summary>Después: misma operación con responsabilidades separadas</summary>

**src/domain/reservation-report.js**

```js
import { iso, deISO, fechaCorta, cap, MESES } from "./date.js";
import { sortReservations } from "./availability.js";

export function rangoPeriodo(periodo, fecha) {
  const date = deISO(fecha);
  if (periodo === "dia")
    return { desde: fecha, hasta: fecha, texto: `Día ${fechaCorta(fecha)}` };
  if (periodo === "semana") {
    const monday = new Date(date);
    monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      desde: iso(monday),
      hasta: iso(sunday),
      texto: `Semana del ${fechaCorta(iso(monday))} al ${fechaCorta(iso(sunday))}`,
    };
  }
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    desde: iso(firstDay),
    hasta: iso(lastDay),
    texto: `${cap(MESES[date.getMonth()])} de ${date.getFullYear()}`,
  };
}

export function prepareReservationReport(period, date, reservations) {
  const range = rangoPeriodo(period, date);
  // Conservamos pendientes y canceladas; las rechazadas no integran el informe.
  const records = sortReservations(
    reservations.filter(
      (reservation) =>
        reservation.estado !== "rechazada" &&
        reservation.fecha >= range.desde &&
        reservation.fecha <= range.hasta,
    ),
  );
  return {
    range,
    reservations: records,
    fileName: `informe-reservas-${period}-${date}.pdf`,
  };
}
```

**src/application/reservation-report.js**

```js
import { prepareReservationReport } from "../domain/reservation-report.js";

/** render(report) devuelve el documento de forma síncrona; clock() devuelve un Date. */
export function createReservationReportService({ render, clock }) {
  return {
    generate(period, date, reservations) {
      const report = prepareReservationReport(period, date, reservations);
      const doc = render({ ...report, generatedAt: clock() });
      return { doc, nombre: report.fileName };
    },
  };
}
```

**src/infrastructure/pdf.js**

```js
import { jsPDF } from "jspdf";
import { CONFIG } from "../config.js";
import { iso, fechaCorta, p2 } from "../domain/date.js";
import { datosNota } from "../domain/note.js";
import { createReservationReportService } from "../application/reservation-report.js";

// Conservamos el acceso existente para quienes importaban esta función desde PDF.
export { rangoPeriodo } from "../domain/reservation-report.js";
const ETIQ_SOL = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  cancelada: "Cancelada",
};
function renderReservationReportPdf({ range, reservations, generatedAt }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const mx = 20,
    cols = [
      { t: "Fecha", w: 28 },
      { t: "Horario", w: 34 },
      { t: "Actividad", w: 80 },
      { t: "Estado", w: 28 },
    ];
  let y = 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("INFORME DE RESERVAS", mx, y);
  y += 8;
  doc.setFontSize(11);
  doc.text(CONFIG.NOMBRE_SUM, mx, y);
  y += 5.5;
  doc.setFont("helvetica", "normal");
  doc.text(CONFIG.MUNICIPALIDAD, mx, y);
  y += 8;
  doc.text("Período: " + range.texto, mx, y);
  y += 5.5;
  doc.text(
    `Fecha de generación: ${fechaCorta(iso(generatedAt))} ${p2(generatedAt.getHours())}:${p2(generatedAt.getMinutes())} hs`,
    mx,
    y,
  );
  y += 5.5;
  doc.setFont("helvetica", "bold");
  doc.text("Cantidad de reservas: " + reservations.length, mx, y);
  y += 9;
  const drawTableHeader = () => {
    doc.setFillColor(230, 235, 232);
    doc.rect(mx, y - 5, 170, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    let x = mx + 2;
    cols.forEach((c) => {
      doc.text(c.t, x, y);
      x += c.w;
    });
    y += 7;
    doc.setFont("helvetica", "normal");
  };
  drawTableHeader();
  if (!reservations.length) {
    doc.text("No hay reservas en el período seleccionado.", mx + 2, y + 2);
  }
  reservations.forEach((reservation) => {
    const activityLines = doc.splitTextToSize(
      reservation.actividad,
      cols[2].w - 4,
    );
    const rowHeight = Math.max(1, activityLines.length) * 5 + 3;
    if (y + rowHeight > 280) {
      doc.addPage();
      y = 22;
      drawTableHeader();
    }
    let x = mx + 2;
    doc.text(fechaCorta(reservation.fecha), x, y);
    x += cols[0].w;
    doc.text(`${reservation.inicio} - ${reservation.fin} hs`, x, y);
    x += cols[1].w;
    doc.text(activityLines, x, y);
    x += cols[2].w;
    doc.text(ETIQ_SOL[reservation.estado], x, y);
    doc.setDrawColor(210);
    doc.line(mx, y + rowHeight - 4, mx + 170, y + rowHeight - 4);
    y += rowHeight;
  });
  return doc;
}

const reservationReportService = createReservationReportService({
  render: renderReservationReportPdf,
  clock: () => new Date(),
});

export function generarInforme(periodo, fecha, reservations) {
  return reservationReportService.generate(periodo, fecha, reservations);
}
```

La función de descarga `createPdfService().report()` conserva su implementación anterior.

</details>
