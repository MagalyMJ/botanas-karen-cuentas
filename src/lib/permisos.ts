import type { RolUsuario } from "@/db/schema";

/** Pueden crear y modificar contactos, notas, pagos y correcciones. */
export function puedeEditar(rol: RolUsuario) {
  return rol === "administrador" || rol === "editor";
}

/**
 * Contacto al que se limita lo que ve el usuario, o `null` si ve todo.
 * Las consultas lo usan para filtrar en el servidor, no solo en la vista.
 */
export function contactoVisible(usuario: { rol: RolUsuario; contactoId: number | null }) {
  if (usuario.rol !== "contacto") return null;
  // El CHECK de la base ya lo impide; aun así, nunca caer en "ver todo".
  if (usuario.contactoId === null) throw new Error("Usuario sin contacto ligado");
  return usuario.contactoId;
}
