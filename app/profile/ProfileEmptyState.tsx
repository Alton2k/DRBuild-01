export default function ProfileEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="deal-check-card !min-h-0 rounded-3xl border px-5 py-8 text-center shadow-sm">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-[#dc115e]/20 bg-[#dc115e]/10 text-base font-black text-[#dc115e]">
        0
      </div>
      <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-5 text-slate-600">{description}</p>
    </div>
  );
}
