import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { colores } from "@/lib/colores";

it("la paleta de TypeScript coincide con la de globals.css", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  const enCss = Object.fromEntries(
    [...css.matchAll(/--color-(\w+):\s*(#[0-9a-f]{6});/gi)].map(([, nombre, hex]) => [nombre, hex.toLowerCase()]),
  );
  for (const [nombre, hex] of Object.entries(colores)) expect(enCss[nombre], nombre).toBe(hex);
});
