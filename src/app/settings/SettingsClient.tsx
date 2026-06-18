'use client';

import { Settings } from 'lucide-react';
import { useState } from 'react';

import type { UserPreferences } from '@/lib/user-preferences';

import { ActionType, ACTION_TYPE_VALUES } from '@/app/constants/action-types';
import { Navigation } from '@/components/Navigation';
import { useToast } from '@/components/ToastProvider';

type SettingsClientProps = {
  initialName: string;
  initialEmail: string;
  initialPreferences: UserPreferences;
};

const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  [ActionType.BLOOD_GLUCOSE]: 'Blood Glucose',
  [ActionType.INSULIN]: 'Insulin',
  [ActionType.MEDICATION]: 'Medication',
  [ActionType.FOOD]: 'Food',
  [ActionType.EXERCISE]: 'Exercise',
  [ActionType.SLEEP]: 'Sleep',
  [ActionType.SYMPTOMS]: 'Symptoms',
  [ActionType.WEIGHT]: 'Weight',
  [ActionType.HYDRATION]: 'Hydration',
  [ActionType.BLOOD_PRESSURE]: 'Blood Pressure',
};

const ANALYTICS_LABELS = {
  bloodGlucoseTrend: 'Blood Glucose Trend',
  dailyGlucoseSummary: 'Daily Glucose Summary',
  insulinVsGlucose: 'Insulin vs Glucose',
  exerciseHydration: 'Exercise Impact & Hydration',
  sleepGlucose: 'Sleep & Glucose Stability',
  weightTrend: 'Weight Trend',
  bloodPressureTrend: 'Blood Pressure Trend',
  dailyBloodPressureSummary: 'Daily Blood Pressure Summary',
  bpVsGlucose: 'Blood Pressure vs Glucose',
  correlationAnalysis: 'Correlation Analysis',
} as const;

export function SettingsClient({
  initialName,
  initialEmail,
  initialPreferences,
}: SettingsClientProps) {
  const [name, setName] = useState(initialName);
  const [preferences, setPreferences] = useState<UserPreferences>(initialPreferences);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim() || null,
          preferences,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to save settings');
      }

      addToast('Settings saved successfully', 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save settings';
      setError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActionType = (actionType: ActionType) => {
    setPreferences((prev) => {
      const isEnabled = prev.enabledActionTypes.includes(actionType);
      return {
        ...prev,
        enabledActionTypes: isEnabled
          ? prev.enabledActionTypes.filter((t) => t !== actionType)
          : [...prev.enabledActionTypes, actionType],
      };
    });
  };

  const toggleAnalytics = (key: keyof typeof ANALYTICS_LABELS) => {
    setPreferences((prev) => ({
      ...prev,
      enabledAnalytics: {
        ...prev.enabledAnalytics,
        [key]: !prev.enabledAnalytics[key],
      },
    }));
  };

  const allActionTypes = ACTION_TYPE_VALUES as readonly ActionType[];

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-white px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          <header className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Manage your profile and preferences
              </p>
            </div>
          </header>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/60">
            <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Profile Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Email
                </label>
                <input
                  type="email"
                  value={initialEmail}
                  disabled
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                  Email cannot be changed
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500/60 focus:border-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="Your name"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/60">
            <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Action Types
            </h2>
            <p className="mb-4 text-xs text-slate-600 dark:text-slate-400">
              Select which action types you want to track in the dashboard
            </p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {allActionTypes.map((actionType) => {
                const isEnabled = preferences.enabledActionTypes.includes(actionType);
                return (
                  <label
                    key={actionType}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white p-3 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                  >
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => toggleActionType(actionType)}
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-2 focus:ring-sky-500 dark:border-slate-600"
                    />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {ACTION_TYPE_LABELS[actionType]}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/60">
            <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Analytics Sections
            </h2>
            <p className="mb-4 text-xs text-slate-600 dark:text-slate-400">
              Choose which analytics sections to display
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(Object.keys(ANALYTICS_LABELS) as Array<keyof typeof ANALYTICS_LABELS>).map(
                (key) => {
                  const isEnabled = preferences.enabledAnalytics[key];
                  return (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white p-3 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                    >
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => toggleAnalytics(key)}
                        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-2 focus:ring-sky-500 dark:border-slate-600"
                      />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {ANALYTICS_LABELS[key]}
                      </span>
                    </label>
                  );
                },
              )}
            </div>
          </section>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-400">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-xl bg-sky-500 px-6 py-2 text-sm font-medium text-white shadow-md shadow-sky-500/30 transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-400 dark:hover:bg-sky-400 dark:disabled:bg-slate-700"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
