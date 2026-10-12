export default function Loading() {
  return (
    <div className="animate-pulse space-y-7" aria-label="Carregando">
      <div className="h-24 max-w-xl rounded-2xl bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-36 rounded-2xl bg-slate-200" />
        ))}
      </div>
      <div className="h-72 rounded-2xl bg-slate-200" />
    </div>
  );
}
