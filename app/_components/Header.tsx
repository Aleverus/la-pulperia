import Link from "next/link";
import { IconChristmasTreeFilled } from "@tabler/icons-react";
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
        <Link href="/" className="mark">
          <IconChristmasTreeFilled aria-hidden="true" size={42} stroke={1.7} />
          <span>
            <strong>La Pulpería</strong>
            <small>Siguatepeque</small>
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
