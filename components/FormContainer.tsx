import React from "react";

interface FormContainerProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

/**
 * Provides a shared card layout, heading, and description for form-based pages.
 */
export default function FormContainer({ title, description, children }: FormContainerProps) {
  return (
    <section className="post-form-card mx-auto w-full max-w-4xl rounded-3xl border p-5 shadow-sm sm:p-8 lg:p-10">
      <div className="post-form-card-header mb-7 border-b pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Post a deal</p>
        <div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
