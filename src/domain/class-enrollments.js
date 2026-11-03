export function enrollmentErrors(data) {
  const errors = {};
  for (const field of ["nombre", "apellido"])
    if (!/^[\p{L}][\p{L}\p{M}'’\- ]{1,79}$/u.test((data[field] || "").trim()))
      errors[field] = "Ingresá entre 2 y 80 caracteres.";
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((data.email || "").trim()) ||
    data.email.length > 150
  )
    errors.email = "Ingresá un correo válido.";
  const phone = (data.telefono || "").trim();
  if (
    !/^[+\d() .-]+$/.test(phone) ||
    phone.length > 30 ||
    phone.replace(/\D/g, "").length < 8 ||
    phone.replace(/\D/g, "").length > 15
  )
    errors.telefono = "Ingresá un teléfono válido con código de área.";
  if ((data.observaciones || "").length > 300)
    errors.observaciones = "Usá hasta 300 caracteres.";
  if (data.consentimiento !== true)
    errors.consentimiento =
      "Aceptá el uso de estos datos para gestionar la inscripción.";
  return errors;
}

export const scheduleLabel = (schedule) =>
  `${schedule.dia} · ${schedule.inicio} – ${schedule.fin}`;
