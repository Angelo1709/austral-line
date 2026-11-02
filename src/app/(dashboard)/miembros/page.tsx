// CORE (profe): alta de miembros. Crea la persona con su rol y su login.
import { Suspense } from "react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRol } from "@/lib/auth";
import { roles, type Rol } from "@/lib/secciones";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

async function sumarMiembro(formData: FormData) {
  "use server";
  await requireRol();
  const nombre = String(formData.get("nombre")).trim();
  const email = String(formData.get("email")).trim().toLowerCase();
  const rol = String(formData.get("rol")) as Rol;
  const password = String(formData.get("password"));
  if (!(rol in roles)) redirect("/miembros?error=Rol inválido");

  const admin = createAdminClient();
  const { data: creado, error: errorLogin } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (errorLogin) redirect(`/miembros?error=${encodeURIComponent(`No se pudo crear el login: ${errorLogin.message}`)}`);

  const supabase = await createClient();
  const { error } = await supabase.from("personas").insert({ nombre, email, rol });
  if (error) {
    await admin.auth.admin.deleteUser(creado.user.id); // no dejar logins sin persona
    redirect(`/miembros?error=${encodeURIComponent(error.code === "23505" ? "Ese email ya es miembro" : error.message)}`);
  }
  revalidatePath("/miembros");
  redirect("/miembros");
}

async function MensajeError({ searchParams }: Pick<PageProps<"/miembros">, "searchParams">) {
  const { error } = await searchParams;
  return error && <p className="text-sm text-destructive">{error}</p>;
}

export default async function Miembros({ searchParams }: PageProps<"/miembros">) {
  await requireRol();
  const supabase = await createClient();
  const { data: personas, error } = await supabase.from("personas_contacto").select("*").order("rol").order("nombre");
  if (error) throw error;

  return (
    <>
      <h1 className="mb-6 font-serif text-2xl">Miembros</h1>

      <form action={sumarMiembro} className="mb-10 grid gap-4 border bg-card p-6 md:grid-cols-[1fr_1fr_auto_auto_auto] md:items-end">
        <div className="grid gap-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" name="nombre" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="rol">Rol</Label>
          <select id="rol" name="rol" required className="h-8 border bg-background px-2 text-sm">
            {Object.entries(roles).map(([valor, label]) => <option key={valor} value={valor}>{label}</option>)}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Contraseña inicial</Label>
          <Input id="password" name="password" type="text" minLength={8} required />
        </div>
        <Button type="submit">Sumar</Button>
        <div className="md:col-span-5"><Suspense><MensajeError searchParams={searchParams} /></Suspense></div>
      </form>

      <Table>
        <TableHeader>
          <TableRow><TableHead>Nombre</TableHead><TableHead>Email</TableHead><TableHead>Rol</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {personas.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.nombre}</TableCell>
              <TableCell>{p.email}</TableCell>
              <TableCell><Badge variant="outline">{roles[p.rol]}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
