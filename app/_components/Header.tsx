import Image from "next/image";
import Link from "next/link";
import { HeaderNavigation } from "@/app/_components/HeaderNavigation";
import { hasPublicSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function Header() {
  let email: string | null = null;
  let isOperator = false;
  let hasSellerPresence = false;
  if (hasPublicSupabaseEnv()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    email =
      typeof data?.claims?.email === "string" ? data.claims.email : null;
    if (email) {
      const [operatorResult, presenceResult] = await Promise.all([
        supabase.rpc("is_operator"),
        supabase.rpc("get_my_presences"),
      ]);
      isOperator = operatorResult.data === true;
      hasSellerPresence =
        Array.isArray(presenceResult.data) && presenceResult.data.length > 0;
    }
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="mark" aria-label="La Pulpería, inicio">
          <Image
            className="mark__monogram"
            src="/brand/la-pulperia-monogram-inverse-accent.png"
            alt=""
            aria-hidden="true"
            width={112}
            height={112}
            priority
          />
          <span className="mark__identity">
            <Image
              className="mark__wordmark"
              src="/brand/la-pulperia-wordmark-inverse.png"
              alt="La Pulpería"
              width={328}
              height={160}
              priority
            />
          </span>
        </Link>

        <HeaderNavigation
          email={email}
          hasSellerPresence={hasSellerPresence}
          isOperator={isOperator}
        />
      </div>
    </header>
  );
}
