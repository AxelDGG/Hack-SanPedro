import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { LoginForm } from "@/components/auth/LoginForm";
import { DemoLogin } from "@/components/auth/DemoLogin";

export const metadata = { title: "Entrar" };

export default function LoginPage() {
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 py-10">
      <Link href="/" className="self-start">
        <Logo />
      </Link>
      <div>
        <h1 className="font-display text-3xl font-semibold">Únete a la red</h1>
        <p className="mt-2 text-tinta-suave">
          Reporta animales en la calle, ayuda a que los rescaten y gana huellas por cada caso resuelto.
        </p>
      </div>

      <Suspense>
        <LoginForm />
      </Suspense>

      {demo && <DemoLogin />}
    </main>
  );
}
