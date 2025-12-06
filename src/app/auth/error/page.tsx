type ErrorPageProps = {
  searchParams: { error?: string };
};

export default function AuthErrorPage({ searchParams }: ErrorPageProps) {
  const message =
    searchParams.error === 'AccessDenied'
      ? 'You are not allowed to sign in with this email.'
      : 'Something went wrong during sign-in. Please try again.';

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-slate-200 dark:bg-slate-900/70 dark:ring-slate-800">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Sign-in error
        </h1>
        <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{message}</p>
      </div>
    </div>
  );
}
