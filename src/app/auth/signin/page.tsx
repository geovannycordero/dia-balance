'use client';

import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [codeAttempts, setCodeAttempts] = useState(0);
  const [isCodeExpired, setIsCodeExpired] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Email is required');
      return;
    }
    if (!normalizedEmail.includes('@') || !normalizedEmail.includes('.')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');
    setCodeAttempts(0);
    setIsCodeExpired(false);

    try {
      const result = await signIn('email', {
        email: normalizedEmail,
        redirect: false,
      });

      if (result?.error) {
        console.error('Error requesting code', result.error);
        setError('Unable to send verification code. Please check your email and try again.');
      } else {
        setSuccess('Verification code sent. Please check your email and enter the 6-digit code.');
        setStep('code');
        setTimeout(
          () => {
            setIsCodeExpired(true);
          },
          8 * 60 * 1000,
        );
      }
    } catch (err) {
      console.error('Unexpected error requesting code', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!code) {
      setError('Please enter the verification code');
      return;
    }
    if (code.length !== 6) {
      setError('Verification code must be 6 digits');
      return;
    }
    if (codeAttempts >= 3) {
      setError('Too many attempts. Please request a new code.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await signIn('email-code', {
        email: normalizedEmail,
        code,
        redirect: false,
      });

      if (result?.error) {
        console.error('Error verifying code', result.error);
        setCodeAttempts((prev) => prev + 1);

        if (result.error.includes('CredentialsSignin')) {
          setError('Invalid or expired code. Please try again.');
          setIsCodeExpired(true);
        } else {
          setError('Authentication error. Please try again.');
        }
      } else if (result?.ok) {
        setSuccess('Login successful. Redirecting...');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 500);
      } else {
        setError('Unexpected error during sign-in. Please try again.');
      }
    } catch (err) {
      console.error('Unexpected error verifying code', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setCode('');
    setError('');
    setSuccess('');
    setCodeAttempts(0);
    setIsCodeExpired(false);
  };

  const handleResendCode = async () => {
    if (!email) return;

    const normalizedEmail = email.trim().toLowerCase();

    setIsLoading(true);
    setError('');
    setSuccess('');
    setCodeAttempts(0);
    setIsCodeExpired(false);

    try {
      const result = await signIn('email', {
        email: normalizedEmail,
        redirect: false,
      });

      if (result?.error) {
        setError('Unable to resend verification code. Please try again.');
      } else {
        setSuccess('New verification code sent.');
        setTimeout(
          () => {
            setIsCodeExpired(true);
          },
          8 * 60 * 1000,
        );
      }
    } catch (err) {
      console.error('Unexpected error resending code', err);
      setError('Unable to resend code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900/70 dark:ring-slate-800">
        <header className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400">
            Dia Balance
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Sign in with a magic code
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Enter your email to receive a one-time login code.
          </p>
        </header>

        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500/60 focus:border-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-slate-600 dark:text-slate-500">
                Only pre-approved email addresses can sign in.
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-200">
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-200">
                <CheckCircle className="h-4 w-4" />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-400 dark:hover:bg-sky-400 dark:disabled:bg-slate-700"
              disabled={isLoading || !email.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending code…
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Send verification code
                </>
              )}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="code"
                className="block text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                Verification code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className={`w-full rounded-xl border bg-white px-3 py-2 text-center text-2xl tracking-[0.35em] text-slate-900 outline-none ring-sky-500/60 focus:ring-2 dark:bg-slate-900 dark:text-slate-100 ${
                  isCodeExpired
                    ? 'border-rose-500'
                    : 'border-slate-300 focus:border-sky-500 dark:border-slate-700'
                }`}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                disabled={isLoading || codeAttempts >= 3}
              />
              <div className="space-y-1 text-center text-xs text-slate-600 dark:text-slate-400">
                <p>
                  Enter the 6-digit code sent to{' '}
                  <span className="font-medium text-slate-900 dark:text-slate-100">{email}</span>.
                </p>
                {isCodeExpired && (
                  <p className="font-medium text-rose-600 dark:text-rose-300">
                    Code expired. Please request a new one.
                  </p>
                )}
                {codeAttempts > 0 && codeAttempts < 3 && (
                  <p className="text-amber-600 dark:text-amber-300">
                    {3 - codeAttempts} attempts remaining.
                  </p>
                )}
                {codeAttempts >= 3 && (
                  <p className="font-medium text-rose-600 dark:text-rose-300">
                    Too many failed attempts. Please request a new code.
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-200">
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-200">
                <CheckCircle className="h-4 w-4" />
                <span>{success}</span>
              </div>
            )}

            <div className="space-y-3">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-400 dark:hover:bg-sky-400 dark:disabled:bg-slate-700"
                disabled={isLoading || code.length !== 6 || codeAttempts >= 3}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  'Verify code'
                )}
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleBackToEmail}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  disabled={isLoading}
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleResendCode}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-transparent px-3 py-2 text-xs font-medium text-slate-600 hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-300"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                  Resend code
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
