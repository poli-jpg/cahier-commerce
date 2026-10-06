// Affiché instantanément pendant le chargement d'une page :
// la commerçante voit tout de suite que son appui a été pris en compte.
export default function Chargement() {
  return (
    <div role="status" aria-label="Chargement" className="flex animate-pulse flex-col gap-5 px-5 py-6">
      <div className="h-8 w-1/2 rounded-xl bg-trait" />
      <div className="h-40 rounded-3xl bg-trait" />
      <div className="h-16 rounded-2xl bg-trait" />
      <div className="h-24 rounded-3xl bg-trait" />
      <div className="h-24 rounded-3xl bg-trait" />
    </div>
  );
}
