export default function ProfileEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="px-5 py-8 text-center">
      <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-5 text-slate-600">{description}</p>
    </div>
  );
}
