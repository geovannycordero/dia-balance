export default function VerifyRequestPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-slate-200 dark:bg-slate-900/70 dark:ring-slate-800">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Check your email
        </h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          If your email is approved, we&apos;ve sent you a sign-in link or code. You can close this
          tab and follow the instructions in your inbox.
        </p>
      </div>
    </div>
  );
}
