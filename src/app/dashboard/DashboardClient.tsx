'use client';

import { useEffect, useMemo, useState } from 'react';

import { ActionType } from '@/app/constants/action-types';
import { Navigation } from '@/components/Navigation';
import { useToast } from '@/components/ToastProvider';
import {
  ActionTypeSchema,
  type ActionType as ActionTypeSchemaType,
  type CreateActionInput,
} from '@/lib/action-schemas';
import { getCurrentLocalDateTime, localToUTC, utcToLocal } from '@/lib/date-utils';
import { useOnlineStatus } from '@/lib/use-online-status';

import type { UserPreferences } from '@/lib/user-preferences';
import type { Action } from '@prisma/client';

type DashboardClientProps = {
  initialActions: Action[];
  userName: string;
  userPreferences: UserPreferences;
};

type FormState = {
  type: ActionTypeSchemaType;
  timestamp: string;
  notes: string;
  // Common numeric / text fields reused per type
  bloodGlucose?: string;
  glucoseContext?: string;
  insulinType?: string;
  insulinUnits?: string;
  medicationName?: string;
  medicationDose?: string;
  foodDescription?: string;
  exerciseType?: string;
  exerciseDuration?: string;
  exerciseIntensity?: string;
  sleepHours?: string;
  sleepQuality?: string;
  symptomDesc?: string;
  symptomSeverity?: string;
  weightValue?: string;
  weightUnit?: string;
  hydrationAmount?: string;
  bloodPressureSystolic?: string;
  bloodPressureDiastolic?: string;
};

const defaultFormState = (enabledActionTypes: ActionType[]): FormState => ({
  type: (enabledActionTypes[0] ?? ActionType.BLOOD_GLUCOSE) as ActionTypeSchemaType,
  timestamp: getCurrentLocalDateTime(),
  notes: '',
});

type QueuedAction = CreateActionInput & { queuedAt: string };

const PENDING_KEY = 'dia-balance-pending-actions';

export function DashboardClient({
  initialActions,
  userName,
  userPreferences,
}: DashboardClientProps) {
  const [actions, setActions] = useState<Action[]>(initialActions);
  const [isLogging, setIsLogging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(defaultFormState(userPreferences.enabledActionTypes));
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [deletingActionId, setDeletingActionId] = useState<string | null>(null);
  const isOnline = useOnlineStatus();
  const { addToast } = useToast();

  useEffect(() => {
    setActions(initialActions);
  }, [initialActions]);

  // Sync any pending actions when we come back online
  useEffect(() => {
    if (!isOnline) return;

    const pendingRaw =
      typeof window === 'undefined' ? null : window.localStorage.getItem(PENDING_KEY);
    if (!pendingRaw) return;

    const pending: QueuedAction[] = JSON.parse(pendingRaw);
    if (!pending.length) return;

    void (async () => {
      try {
        setIsSyncing(true);
        const successful: QueuedAction[] = [];
        const failed: QueuedAction[] = [];

        for (const item of pending) {
          try {
            const res = await fetch('/api/actions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(item),
            });

            if (res.ok) {
              successful.push(item);
            } else {
              failed.push(item);
              console.error('Failed to sync action:', item, 'Status:', res.status);
            }
          } catch (error) {
            failed.push(item);
            console.error('Error syncing action:', item, error);
          }
        }

        // Only remove successfully synced items from localStorage
        if (successful.length > 0) {
          if (failed.length > 0) {
            // Update queue with only failed items
            window.localStorage.setItem(PENDING_KEY, JSON.stringify(failed));
          } else {
            // All items succeeded, clear the queue
            window.localStorage.removeItem(PENDING_KEY);
          }

          // Refresh actions from server
          const res = await fetch('/api/actions', { cache: 'no-store' });
          if (res.ok) {
            const refreshed = (await res.json()) as Action[];
            setActions(refreshed);
            addToast(
              `Synced ${successful.length} queued action${successful.length > 1 ? 's' : ''}`,
              'success',
            );
          }
        }

        // Show error if some items failed
        if (failed.length > 0) {
          addToast(
            `Failed to sync ${failed.length} action${failed.length > 1 ? 's' : ''}. They will be retried later.`,
            'error',
          );
        }
      } catch (error) {
        console.error('Unexpected error during sync:', error);
        addToast('Failed to sync actions', 'error');
      } finally {
        setIsSyncing(false);
      }
    })();
  }, [isOnline, addToast]);

  const sortedActions = useMemo(
    () =>
      [...actions].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ),
    [actions],
  );

  const populateFormFromAction = (action: Action) => {
    // Convert UTC timestamp from database to local datetime-local format
    const localTimestamp = utcToLocal(action.timestamp);

    const formState: FormState = {
      type: action.type as ActionTypeSchemaType,
      timestamp: localTimestamp,
      notes: action.notes ?? '',
    };

    switch (action.type) {
      case ActionType.BLOOD_GLUCOSE:
        formState.bloodGlucose = action.bloodGlucose?.toString() ?? '';
        formState.glucoseContext = action.glucoseContext ?? '';
        break;
      case ActionType.INSULIN:
        formState.insulinType = action.insulinType ?? '';
        formState.insulinUnits = action.insulinUnits?.toString() ?? '';
        break;
      case ActionType.MEDICATION:
        formState.medicationName = action.medicationName ?? '';
        formState.medicationDose = action.medicationDose ?? '';
        break;
      case ActionType.FOOD:
        formState.foodDescription = action.foodDescription ?? '';
        break;
      case ActionType.EXERCISE:
        formState.exerciseType = action.exerciseType ?? '';
        formState.exerciseDuration = action.exerciseDuration?.toString() ?? '';
        formState.exerciseIntensity = action.exerciseIntensity ?? '';
        break;
      case ActionType.SLEEP:
        formState.sleepHours = action.sleepHours?.toString() ?? '';
        formState.sleepQuality = action.sleepQuality?.toString() ?? '';
        break;
      case ActionType.SYMPTOMS:
        formState.symptomDesc = action.symptomDesc ?? '';
        formState.symptomSeverity = action.symptomSeverity?.toString() ?? '';
        break;
      case ActionType.WEIGHT:
        formState.weightValue = action.weightValue?.toString() ?? '';
        formState.weightUnit = action.weightUnit ?? '';
        break;
      case ActionType.HYDRATION:
        formState.hydrationAmount = action.hydrationAmount?.toString() ?? '';
        break;
      case ActionType.BLOOD_PRESSURE:
        formState.bloodPressureSystolic = action.bloodPressureSystolic?.toString() ?? '';
        formState.bloodPressureDiastolic = action.bloodPressureDiastolic?.toString() ?? '';
        break;
    }

    return formState;
  };

  const handleOpenLogger = () => {
    setForm(defaultFormState(userPreferences.enabledActionTypes));
    setError(null);
    setEditingActionId(null);
    setIsLogging(true);
  };

  const handleEditAction = (action: Action) => {
    setForm(populateFormFromAction(action));
    setError(null);
    setEditingActionId(action.id);
    setIsLogging(true);
  };

  const handleCloseLogger = () => {
    setIsLogging(false);
    setEditingActionId(null);
  };

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const buildPayload = (): CreateActionInput => {
    // Convert datetime-local input (local time) to UTC ISO string
    const base = {
      type: form.type,
      timestamp: localToUTC(form.timestamp),
      notes: form.notes || undefined,
    } as CreateActionInput;

    switch (form.type) {
      case ActionType.BLOOD_GLUCOSE:
        return {
          ...base,
          type: ActionType.BLOOD_GLUCOSE,
          bloodGlucose: Number(form.bloodGlucose),
          glucoseContext:
            form.glucoseContext &&
            ['fasting', 'pre-meal', 'post-meal', 'bedtime'].includes(form.glucoseContext)
              ? (form.glucoseContext as 'fasting' | 'pre-meal' | 'post-meal' | 'bedtime')
              : undefined,
        };
      case ActionType.INSULIN:
        return {
          ...base,
          type: ActionType.INSULIN,
          insulinType: form.insulinType || 'Rapid',
          insulinUnits: Number(form.insulinUnits),
        };
      case ActionType.MEDICATION:
        return {
          ...base,
          type: ActionType.MEDICATION,
          medicationName: form.medicationName || '',
          medicationDose: form.medicationDose || '',
        };
      case ActionType.FOOD:
        return {
          ...base,
          type: ActionType.FOOD,
          foodDescription: form.foodDescription || '',
        };
      case ActionType.EXERCISE:
        return {
          ...base,
          type: ActionType.EXERCISE,
          exerciseType: form.exerciseType || 'cardio',
          exerciseDuration: Number(form.exerciseDuration),
          exerciseIntensity: form.exerciseIntensity || '3',
        };
      case ActionType.SLEEP:
        return {
          ...base,
          type: ActionType.SLEEP,
          sleepHours: Number(form.sleepHours),
          sleepQuality: Number(form.sleepQuality),
        };
      case ActionType.SYMPTOMS:
        return {
          ...base,
          type: ActionType.SYMPTOMS,
          symptomDesc: form.symptomDesc || '',
          symptomSeverity: Number(form.symptomSeverity),
        };
      case ActionType.WEIGHT:
        return {
          ...base,
          type: ActionType.WEIGHT,
          weightValue: Number(form.weightValue),
          weightUnit: form.weightUnit || 'kg',
        };
      case ActionType.HYDRATION:
        return {
          ...base,
          type: ActionType.HYDRATION,
          hydrationAmount: Number(form.hydrationAmount),
        };
      case ActionType.BLOOD_PRESSURE:
        return {
          ...base,
          type: ActionType.BLOOD_PRESSURE,
          bloodPressureSystolic: Number(form.bloodPressureSystolic),
          bloodPressureDiastolic: Number(form.bloodPressureDiastolic),
        };
      default:
        return base;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      setError(null);

      const payload = buildPayload();

      if (!isOnline) {
        // Queue locally
        const raw = typeof window === 'undefined' ? null : window.localStorage.getItem(PENDING_KEY);
        const queue: QueuedAction[] = raw ? JSON.parse(raw) : [];
        queue.push({ ...payload, queuedAt: new Date().toISOString() });
        window.localStorage.setItem(PENDING_KEY, JSON.stringify(queue));
        setIsLogging(false);
        addToast('Action queued for sync when online', 'info');
        return;
      }

      if (editingActionId) {
        // Update existing action
        const res = await fetch(`/api/actions/${editingActionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to update action');
        }

        const updated = (await res.json()) as Action;
        setActions((prev) => prev.map((a) => (a.id === editingActionId ? updated : a)));
        setIsLogging(false);
        setEditingActionId(null);
        addToast('Action updated successfully', 'success');
      } else {
        // Create new action
        const res = await fetch('/api/actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to create action');
        }

        const created = (await res.json()) as Action;
        setActions((prev) => [created, ...prev]);
        setIsLogging(false);
        addToast('Action saved successfully', 'success');
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save action';
      setError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleDeleteClick = (id: string) => {
    setDeletingActionId(id);
  };

  const handleDeleteCancel = () => {
    setDeletingActionId(null);
  };

  const handleDelete = async (id: string) => {
    setDeletingActionId(null);
    const previous = actions;
    setActions((prev) => prev.filter((a) => a.id !== id));

    try {
      const res = await fetch(`/api/actions/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Failed to delete');
      }
      addToast('Action deleted successfully', 'success');
    } catch {
      // Rollback on error
      setActions(previous);
      addToast('Failed to delete action', 'error');
    }
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-white px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400">
                Dia Balance
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Dashboard</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Recent health actions for{' '}
                <span className="font-medium text-slate-900 dark:text-slate-100">{userName}</span>
              </p>
            </div>
          </header>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 pb-16 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span
                suppressHydrationWarning
                className={
                  isOnline
                    ? 'rounded-full bg-emerald-500/10 px-3 py-1 font-medium text-emerald-700 dark:text-emerald-300'
                    : 'rounded-full bg-amber-500/10 px-3 py-1 font-medium text-amber-700 dark:text-amber-300'
                }
              >
                {isOnline ? 'Online' : 'Offline – new entries will sync when back online'}
              </span>
              {isSyncing && (
                <span className="text-[11px] text-slate-600 dark:text-slate-400">
                  Syncing queued actions…
                </span>
              )}
            </div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Recent actions
              </h2>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                {sortedActions.length === 0 ? 'No actions yet' : `${sortedActions.length} entries`}
              </span>
            </div>

            {sortedActions.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                You don&apos;t have any logged actions yet. Use the + button to log your first
                reading, meal, insulin dose, or other event.
              </p>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                {sortedActions.map((action) => (
                  <li key={action.id} className="py-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {formatActionTitle(action)}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                          {formatActionDetails(action)}
                        </p>
                        {action.notes && (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                            Notes: {action.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <p className="text-xs text-slate-500 dark:text-slate-500">
                          {new Date(action.timestamp).toLocaleString()}
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="text-xs text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                            onClick={() => handleEditAction(action)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                            onClick={() => handleDeleteClick(action.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Floating action button */}
          <button
            type="button"
            onClick={handleOpenLogger}
            className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-sky-500 text-2xl font-medium text-slate-950 shadow-xl shadow-sky-500/40 transition hover:bg-sky-400 md:bottom-8 md:right-8"
          >
            +
          </button>

          {isLogging && (
            <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 px-4 py-6">
              <div className="relative w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {editingActionId ? 'Edit action' : 'Log an action'}
                  </h2>
                  <button
                    type="button"
                    className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                    onClick={handleCloseLogger}
                  >
                    Close
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                        Type
                      </label>
                      <select
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 outline-none ring-sky-500/60 focus:border-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        value={form.type}
                        onChange={(e) =>
                          updateField('type', e.target.value as ActionTypeSchemaType)
                        }
                      >
                        {ActionTypeSchema.options
                          .filter((option) => userPreferences.enabledActionTypes.includes(option))
                          .map((option) => (
                            <option key={option} value={option}>
                              {formatActionTypeLabel(option)}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                        Time
                      </label>
                      <input
                        type="datetime-local"
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 outline-none ring-sky-500/60 focus:border-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        value={form.timestamp}
                        onChange={(e) => updateField('timestamp', e.target.value)}
                      />
                    </div>
                  </div>

                  {renderTypeSpecificFields(form, updateField)}

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Notes (optional)
                    </label>
                    <textarea
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 outline-none ring-sky-500/60 focus:border-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      rows={2}
                      value={form.notes}
                      onChange={(e) => updateField('notes', e.target.value)}
                    />
                  </div>

                  {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-1 inline-flex w-full items-center justify-center rounded-xl bg-sky-500 px-4 py-2 text-xs font-medium text-white shadow-md shadow-sky-500/30 transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-400 dark:hover:bg-sky-400 dark:disabled:bg-slate-700"
                  >
                    {isSubmitting
                      ? editingActionId
                        ? 'Updating…'
                        : 'Saving…'
                      : editingActionId
                        ? 'Update action'
                        : 'Save action'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Delete confirmation modal */}
          {deletingActionId && (
            <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 px-4 py-6">
              <div className="relative w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Confirm deletion
                  </h2>
                </div>
                <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                  Are you sure you want to delete this action? This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleDeleteCancel}
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(deletingActionId)}
                    className="flex-1 rounded-xl bg-rose-500 px-4 py-2 text-xs font-medium text-white shadow-md shadow-rose-500/30 transition hover:bg-rose-600 dark:hover:bg-rose-400"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function formatActionTypeLabel(type: ActionTypeSchemaType) {
  switch (type) {
    case ActionType.BLOOD_GLUCOSE:
      return 'Blood glucose';
    case ActionType.INSULIN:
      return 'Insulin';
    case ActionType.MEDICATION:
      return 'Medication';
    case ActionType.FOOD:
      return 'Food';
    case ActionType.EXERCISE:
      return 'Exercise';
    case ActionType.SLEEP:
      return 'Sleep';
    case ActionType.SYMPTOMS:
      return 'Symptoms';
    case ActionType.WEIGHT:
      return 'Weight';
    case ActionType.HYDRATION:
      return 'Hydration';
    case ActionType.BLOOD_PRESSURE:
      return 'Blood pressure';
  }
}

function formatActionTitle(action: Action) {
  switch (action.type) {
    case ActionType.BLOOD_GLUCOSE:
      return action.bloodGlucose ? `Glucose ${action.bloodGlucose} mg/dL` : 'Blood glucose';
    case ActionType.INSULIN:
      return action.insulinUnits ? `Insulin ${action.insulinUnits} units` : 'Insulin';
    case ActionType.MEDICATION:
      return action.medicationName ?? 'Medication';
    case ActionType.FOOD:
      return action.foodDescription ?? 'Food';
    case ActionType.EXERCISE:
      return action.exerciseType ?? 'Exercise';
    case ActionType.SLEEP:
      return action.sleepHours ? `Sleep ${action.sleepHours} h` : 'Sleep';
    case ActionType.SYMPTOMS:
      return 'Symptoms';
    case ActionType.WEIGHT:
      return action.weightValue ? `Weight ${action.weightValue}` : 'Weight';
    case ActionType.HYDRATION:
      return action.hydrationAmount ? `Hydration ${action.hydrationAmount}` : 'Hydration';
    case ActionType.BLOOD_PRESSURE:
      return action.bloodPressureSystolic && action.bloodPressureDiastolic
        ? `BP ${action.bloodPressureSystolic}/${action.bloodPressureDiastolic} mm Hg`
        : 'Blood pressure';
    default:
      return action.type;
  }
}

function formatActionDetails(action: Action) {
  switch (action.type) {
    case ActionType.BLOOD_GLUCOSE:
      return action.glucoseContext ? `Context: ${action.glucoseContext}` : 'Blood glucose reading';
    case ActionType.INSULIN:
      return `${action.insulinType ?? 'Insulin'} ${action.insulinUnits ?? ''}`.trim();
    case ActionType.MEDICATION:
      return `${action.medicationName ?? ''} ${action.medicationDose ?? ''}`.trim();
    case ActionType.FOOD:
      return action.foodDescription ?? '';
    case ActionType.EXERCISE:
      return `${action.exerciseType ?? ''} ${
        action.exerciseDuration ? `· ${action.exerciseDuration} min` : ''
      }`.trim();
    case ActionType.SLEEP:
      return action.sleepQuality ? `Quality ${action.sleepQuality}/5` : 'Sleep log';
    case ActionType.SYMPTOMS:
      return action.symptomDesc
        ? `${action.symptomDesc} (${action.symptomSeverity ?? '-'}/10)`
        : 'Symptoms / feelings';
    case ActionType.WEIGHT:
      return action.weightUnit ? `${action.weightValue ?? ''} ${action.weightUnit}` : '';
    case ActionType.HYDRATION:
      return action.hydrationAmount ? `${action.hydrationAmount} (preferred units)` : '';
    case ActionType.BLOOD_PRESSURE:
      if (action.bloodPressureSystolic && action.bloodPressureDiastolic) {
        const category = getBloodPressureCategory(
          action.bloodPressureSystolic,
          action.bloodPressureDiastolic,
        );
        const categoryLabel =
          category === 'normal'
            ? 'Normal'
            : category === 'elevated'
              ? 'Elevated'
              : category === 'hypertension-stage-1'
                ? 'Hypertension Stage 1'
                : category === 'hypertension-stage-2'
                  ? 'Hypertension Stage 2'
                  : 'Hypertensive Crisis';
        return categoryLabel;
      }
      return '';
    default:
      return '';
  }
}

function getBloodPressureCategory(
  systolic: number,
  diastolic: number,
): 'normal' | 'elevated' | 'hypertension-stage-1' | 'hypertension-stage-2' | 'crisis' {
  if (systolic > 180 || diastolic > 120) {
    return 'crisis';
  }
  if (systolic >= 140 || diastolic >= 90) {
    return 'hypertension-stage-2';
  }
  if (systolic >= 130 || diastolic >= 80) {
    return 'hypertension-stage-1';
  }
  if (systolic >= 120) {
    return 'elevated';
  }
  return 'normal';
}

function renderTypeSpecificFields(
  form: FormState,
  updateField: (field: keyof FormState, value: string) => void,
) {
  switch (form.type) {
    case ActionType.BLOOD_GLUCOSE:
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Reading (mg/dL)
            </label>
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 outline-none ring-sky-500/60 focus:border-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={form.bloodGlucose ?? ''}
              onChange={(e) => updateField('bloodGlucose', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Context
            </label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 outline-none ring-sky-500/60 focus:border-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={form.glucoseContext ?? ''}
              onChange={(e) => updateField('glucoseContext', e.target.value)}
            >
              <option value="">Select</option>
              <option value="fasting">Fasting</option>
              <option value="pre-meal">Pre-meal</option>
              <option value="post-meal">Post-meal</option>
              <option value="bedtime">Bedtime</option>
            </select>
          </div>
        </div>
      );
    case ActionType.INSULIN:
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Insulin type
            </label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 outline-none ring-sky-500/60 focus:border-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={form.insulinType ?? 'Rapid'}
              onChange={(e) => updateField('insulinType', e.target.value)}
            >
              <option value="Rapid">Rapid / simple</option>
              <option value="NPH">NPH</option>
              <option value="Glargine">Glargine</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Units
            </label>
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 outline-none ring-sky-500/60 focus:border-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={form.insulinUnits ?? ''}
              onChange={(e) => updateField('insulinUnits', e.target.value)}
            />
          </div>
        </div>
      );
    case ActionType.MEDICATION:
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Medication
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 outline-none ring-sky-500/60 focus:border-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={form.medicationName ?? ''}
              onChange={(e) => updateField('medicationName', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Dose
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 outline-none ring-sky-500/60 focus:border-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={form.medicationDose ?? ''}
              onChange={(e) => updateField('medicationDose', e.target.value)}
            />
          </div>
        </div>
      );
    case ActionType.FOOD:
      return (
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            Description
          </label>
          <input
            type="text"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 outline-none ring-sky-500/60 focus:border-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            value={form.foodDescription ?? ''}
            onChange={(e) => updateField('foodDescription', e.target.value)}
          />
        </div>
      );
    case ActionType.EXERCISE:
      return (
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Type
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 outline-none ring-sky-500/60 focus:border-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={form.exerciseType ?? ''}
              onChange={(e) => updateField('exerciseType', e.target.value)}
              placeholder="e.g. cardio, strength"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Minutes
            </label>
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 outline-none ring-sky-500/60 focus:border-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={form.exerciseDuration ?? ''}
              onChange={(e) => updateField('exerciseDuration', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Intensity (1-5)
            </label>
            <input
              type="number"
              min={1}
              max={5}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 outline-none ring-sky-500/60 focus:border-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={form.exerciseIntensity ?? ''}
              onChange={(e) => updateField('exerciseIntensity', e.target.value)}
            />
          </div>
        </div>
      );
    case ActionType.SLEEP:
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Hours slept
            </label>
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 outline-none ring-sky-500/60 focus:border-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={form.sleepHours ?? ''}
              onChange={(e) => updateField('sleepHours', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Quality (1-5)
            </label>
            <input
              type="number"
              min={1}
              max={5}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 outline-none ring-sky-500/60 focus:border-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={form.sleepQuality ?? ''}
              onChange={(e) => updateField('sleepQuality', e.target.value)}
            />
          </div>
        </div>
      );
    case ActionType.SYMPTOMS:
      return (
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Description
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 outline-none ring-sky-500/60 focus:border-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={form.symptomDesc ?? ''}
              onChange={(e) => updateField('symptomDesc', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Severity (1-10)
            </label>
            <input
              type="number"
              min={1}
              max={10}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 outline-none ring-sky-500/60 focus:border-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={form.symptomSeverity ?? ''}
              onChange={(e) => updateField('symptomSeverity', e.target.value)}
            />
          </div>
        </div>
      );
    case ActionType.WEIGHT:
      return (
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Weight
            </label>
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 outline-none ring-sky-500/60 focus:border-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={form.weightValue ?? ''}
              onChange={(e) => updateField('weightValue', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Unit
            </label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 outline-none ring-sky-500/60 focus:border-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={form.weightUnit ?? 'kg'}
              onChange={(e) => updateField('weightUnit', e.target.value)}
            >
              <option value="kg">kg</option>
              <option value="lb">lb</option>
            </select>
          </div>
        </div>
      );
    case ActionType.HYDRATION:
      return (
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            Amount (preferred units)
          </label>
          <input
            type="number"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 outline-none ring-sky-500/60 focus:border-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            value={form.hydrationAmount ?? ''}
            onChange={(e) => updateField('hydrationAmount', e.target.value)}
          />
        </div>
      );
    case ActionType.BLOOD_PRESSURE:
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Systolic (mm Hg)
            </label>
            <input
              type="number"
              min={50}
              max={300}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 outline-none ring-sky-500/60 focus:border-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={form.bloodPressureSystolic ?? ''}
              onChange={(e) => updateField('bloodPressureSystolic', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Diastolic (mm Hg)
            </label>
            <input
              type="number"
              min={30}
              max={200}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 outline-none ring-sky-500/60 focus:border-sky-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={form.bloodPressureDiastolic ?? ''}
              onChange={(e) => updateField('bloodPressureDiastolic', e.target.value)}
            />
          </div>
        </div>
      );
    default:
      return null;
  }
}
