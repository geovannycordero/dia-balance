export default function VerifyRequestPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-slate-50">
      <div className="w-full max-w-md rounded-3xl bg-slate-900/70 p-8 text-center shadow-xl ring-1 ring-slate-800">
        <h1 className="text-2xl font-semibold tracking-tight">
          Check your email
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          If your email is approved, we&apos;ve sent you a sign-in link or
          code. You can close this tab and follow the instructions in your
          inbox.
        </p>
      </div>
    </div>
  );
}

