import type { Metadata } from "next";
import Link from "next/link";
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
  const sellerEntry = next === "/vender" || next.startsWith("/mi-pulperia");
  const errored = params.error === "1";
  const signupFailed = params.error === "signup";
  const oauthFailed = params.error === "oauth";
  const testAuthEnabled = localTestAuthEnabled();

  return (
    <main className="detail-page auth-page">
      <p className="eyebrow">
        {sellerEntry ? "Tu oferta sigue privada" : "Acceso seguro"}
      </p>
      <h1>{sellerEntry ? "Ingresá para empezar a ofrecer" : "Ingresar"}</h1>
      {sellerEntry ? (
        <p>
          Después volvés a tu primera oferta. El negocio, cómo atendés y el
          WhatsApp verificado se completan antes de publicar, no para mirar la
          vitrina ni para empezar el borrador.
        </p>
      ) : null}
      {testAuthEnabled ? (
        <>
          <p>
            Auth de prueba local. Esta superficie sólo existe contra Supabase
            en loopback y con el gate explícito habilitado.
          </p>
          {errored ? (
            <p className="field-hint is-error" role="alert">
              No se pudo ingresar con esos datos.
            </p>
          ) : null}
          {signupFailed ? (
            <p className="field-hint is-error" role="alert">
              No se pudo crear la cuenta de prueba.
            </p>
          ) : null}
          <div className="auth-grid">
            <section>
              <h2>Ya tengo cuenta</h2>
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
            </section>
            <section>
              <h2>Crear cuenta de prueba</h2>
              <form action={signUpAction} className="stack">
                <input type="hidden" name="next" value={next} />
                <label htmlFor="display_name">Nombre visible</label>
                <input
                  id="display_name"
                  name="display_name"
                  required
                  maxLength={80}
                />
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
            </section>
          </div>
          <details className="test-fixtures">
            <summary>Credenciales locales de prueba</summary>
            <p>Comprador: comprador@local.test / pulperia-local</p>
            <p>Vendedora física: elpino@local.test / pulperia-local</p>
          </details>
        </>
      ) : (
        <div className="auth-grid">
          <section>
            <h2>Continuar con Google</h2>
            <p>
              Usá tu cuenta de Google para guardar el carrito, revisar pedidos
              o iniciar y mantener ofertas con la misma identidad.
            </p>
            {oauthFailed ? (
              <p className="field-hint is-error" role="alert">
                No pudimos completar el ingreso con Google. Intentá de nuevo.
              </p>
            ) : null}
            <Link
              className="primary-action"
              href={`/auth/google?next=${encodeURIComponent(next)}`}
            >
              Continuar con Google
            </Link>
            <p className="field-hint">
              Google comparte sólo tu identidad básica. La contraseña nunca
              pasa por La Pulpería.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
