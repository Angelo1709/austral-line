import type { Database as Generada } from "@/lib/database.types";

// Postgres marca todas las columnas de una vista como nullable. En personas_contacto solo `email` puede venir
// en null (cuando no lo podés ver); el resto sale de personas, que es not null.
type Vistas = Generada["public"]["Views"];
type Contacto = Vistas["personas_contacto"];
type Fila = { id: string; nombre: string; rol: Generada["public"]["Enums"]["rol"]; email: string | null };

export type Database = Omit<Generada, "public"> & {
  public: Omit<Generada["public"], "Views"> & {
    Views: Omit<Vistas, "personas_contacto"> & { personas_contacto: Omit<Contacto, "Row"> & { Row: Fila } };
  };
};

// Para listas de destinatarios: deja solo a quienes tienen el mail visible. `personas.filter(conMail)`
export const conMail = <T extends { email: string | null }>(p: T): p is T & { email: string } => !!p.email;
