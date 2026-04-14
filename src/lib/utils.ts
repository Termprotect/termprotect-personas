import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Valida formato de DNI español: 8 dígitos + 1 letra
export function isValidDNI(dni: string): boolean {
  const dniRegex = /^[0-9]{8}[A-Z]$/;
  if (!dniRegex.test(dni.toUpperCase())) return false;
  const letters = "TRWAGMYFPDXBNJZSQVHLCKE";
  const number = parseInt(dni.substring(0, 8));
  return dni[8].toUpperCase() === letters[number % 23];
}

// Valida formato de NIE/TIE: X/Y/Z + 7 dígitos + 1 letra
export function isValidTIE(nie: string): boolean {
  const nieRegex = /^[XYZ][0-9]{7}[A-Z]$/;
  return nieRegex.test(nie.toUpperCase());
}

// Formatea fecha a formato español (dd/mm/yyyy)
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Calcula días laborables entre dos fechas (excluyendo fines de semana)
export function workingDaysBetween(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

// Calcula días naturales entre dos fechas
export function naturalDaysBetween(start: Date, end: Date): number {
  const diff = end.getTime() - start.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
}
