import type { Metadata } from "next";
import { signInAction, signUpAction } from "@/app/actions";
import { localTestAuthEnabled } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Ingresar",
  robots: { index: false, follow: false },
};

export default async function IngresarPage({
  searchParams,
}: PageProps<"/ingresar">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/carrito";
  const errored = params.error === "1";
  const signupFailed = params.error === "signup";
  const testAuthEnabled = localTestAuthEnabled();

  return (
    <main>
      <h1>Ingresar</h1>
      {testAuthEnabled ? (
        <>
          <p>
            Auth de prueba local. Esta superficie sólo existe contra Supabase
            en loopback y con el gate explícito habilitado.
          </p>
          {errored ? <p>No se pudo ingresar con esos datos.</p> : null}
          {signupFailed ? <p>No se pudo crear la cuenta de prueba.</p> : null}
          <form action={signInAction} className="stack">
            <input type="hidden" name="next" value={next} />
            <label htmlFor="email">Correo</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
            />
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
            <button type="submit">Ingresar</button>
          </form>
          <h2>Crear cuenta de prueba</h2>
          <form action={signUpAction} className="stack">
            <input type="hidden" name="next" value={next} />
            <label htmlFor="display_name">Nombre visible</label>
            <input id="display_name" name="display_name" required maxLength={80} />
            <label htmlFor="signup-email">Correo para la cuenta nueva</label>
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="off"
              required
            />
            <label htmlFor="signup-password">
              Contraseña para la cuenta nueva
            </label>
            <input
              id="signup-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
            />
            <button type="submit">Crear cuenta de prueba</button>
          </form>
          <p>Comprador: comprador@local.test / pulperia-local</p>
          <p>Vendedora física: elpino@local.test / pulperia-local</p>
        </>
      ) : (
        <p role="status">
          El acceso público todavía no tiene un proveedor autorizado. La alta y
          las credenciales locales están deshabilitadas en este entorno.
        </p>
      )}
    </main>
  );
}
