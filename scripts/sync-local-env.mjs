import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const raw = execFileSync("pnpm", ["exec", "supabase", "status", "-o", "env"], {
  encoding: "utf8",
  shell: true,
});

const values = Object.fromEntries(
  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      const key = line.slice(0, index);
      const value = line.slice(index + 1).replace(/^"(.*)"$/, "$1");
      return [key, value];
    }),
);

const anon = values.PUBLISHABLE_KEY ?? values.ANON_KEY ?? "";
const env = [
  `NEXT_PUBLIC_SUPABASE_URL=${values.API_URL ?? "http://127.0.0.1:54321"}`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=${values.ANON_KEY ?? anon}`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${anon}`,
  `SUPABASE_SERVICE_ROLE_KEY=${values.SERVICE_ROLE_KEY ?? ""}`,
  "PULPERIA_LOCAL_TEST_AUTH=true",
  "",
].join("\n");

writeFileSync(".env.local", env);
console.log("Wrote .env.local from supabase status");
