import Link from "next/link";

type InfoSection = {
  title: string;
  body: string[];
};

type InfoPageProps = {
  title: string;
  eyebrow: string;
  intro: string;
  sections: InfoSection[];
};

const infoLinks = [
  { href: "/about", label: "About" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/community-rules", label: "Community Rules" },
  { href: "/affiliate-disclosure", label: "Affiliate Disclosure" },
  { href: "/contact", label: "Contact" },
];

export default function InfoPage({ title, eyebrow, intro, sections }: InfoPageProps) {
  return (
    <main className="info-page flex-1 bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#dc115e]">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            {intro}
          </p>

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
            <strong>Draft for review before launch.</strong> This page is practical product copy for Deal Rakyat and is not legal advice. A Malaysia-qualified lawyer should review it before public launch.
          </div>

          <div className="mt-8 space-y-8">
            {sections.map((section) => (
              <section key={section.title} className="border-t border-slate-200 pt-6">
                <h2 className="text-xl font-bold tracking-tight text-slate-950">
                  {section.title}
                </h2>
                <div className="mt-3 space-y-3 text-sm leading-7 text-slate-700 sm:text-base">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <nav className="rounded-3xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
            <p className="px-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              Site Info
            </p>
            <div className="mt-3 grid gap-1">
              {infoLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-2xl px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        </aside>
      </div>
    </main>
  );
}
