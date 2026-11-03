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
