export default function ProfileLoadError({ message, retryHref }: { message: string; retryHref: string }) {
  return (
    <div className="theme-alert theme-alert-warning mb-4 flex flex-wrap items-center justify-between gap-3 p-4 text-sm font-semibold" role="alert">
      <span>{message}</span>
      <a href={retryHref} className="inline-flex h-10 items-center justify-center rounded-full border border-current px-4 text-xs font-bold focus-visible:outline-none focus-visible:ring-4">Try again</a>
    </div>
  );
}
