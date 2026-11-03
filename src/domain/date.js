export const p2 = (n) => String(n).padStart(2, "0");
export const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
export const DIAS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];
export const iso = (d) =>
  `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; // Date -> 'AAAA-MM-DD'
export const deISO = (s) => {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const ahoraLocal = (d = new Date()) => {
  return `${iso(d)}T${p2(d.getHours())}:${p2(d.getMinutes())}`;
};
export const fechaLarga = (s) => {
  const d = deISO(s);
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
};
export const fechaCorta = (s) => {
  const [y, m, d] = s.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};
export const diaMes = (s) => {
  const d = deISO(s);
  return `${d.getDate()} de ${MESES[d.getMonth()]}`;
};
export const diaSemana = (s) => DIAS[deISO(s).getDay()];
export const mins = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}; // 'HH:MM' -> minutos
export const hh = (h) => `${p2(h)}:00`;
export const solapa = (a1, a2, b1, b2) => a1 < b2 && b1 < a2; // ¿se superponen dos rangos?
export const norm = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
export const titulo = (s) =>
  String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/(^|[\s'’-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const minutosAhora = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};
