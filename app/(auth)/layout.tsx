export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-5 py-10">
      <div className="flex flex-col gap-2">
        <p className="text-[15px] font-semibold text-vert">Cahier Commerce</p>
        <p className="text-sourdine">Vos ventes, votre Lebalma et votre stock, dans votre téléphone.</p>
      </div>
      {children}
    </main>
  );
}
