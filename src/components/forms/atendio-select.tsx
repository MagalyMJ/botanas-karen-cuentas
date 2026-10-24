import { Field } from "./field";

export type Empleado = { id: number; nombre: string };

/** Selector de quién atendió: el usuario actual ("") o un empleado registrado. */
export function AtendioSelect({
  empleados,
  usuarioNombre,
  errors,
}: {
  empleados: Empleado[];
  usuarioNombre: string;
  errors?: string[];
}) {
  return (
    <Field label="Atendió" htmlFor="atendidoPorId" errors={errors}>
      <select
        id="atendidoPorId"
        name="atendidoPorId"
        defaultValue=""
        className="h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
      >
        <option value="">Yo ({usuarioNombre})</option>
        {empleados.map((e) => (
          <option key={e.id} value={e.id}>
            {e.nombre}
          </option>
        ))}
      </select>
    </Field>
  );
}
