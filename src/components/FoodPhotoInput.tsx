'use client';

import { useRef } from 'react';

type FoodPhotoInputProps = {
  previewUrl: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
};

export function FoodPhotoInput({ previewUrl, onChange, onRemove }: FoodPhotoInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mt-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onChange}
        className="hidden"
      />
      {previewUrl ? (
        <div className="flex items-center gap-3">
          <div className="relative h-16 w-16 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Food preview"
              className="h-16 w-16 rounded-lg object-cover"
            />
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white shadow">
              ✓
            </span>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
          >
            Remove photo
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-sky-400 px-4 py-3 text-sm font-medium text-sky-600 transition hover:border-sky-500 hover:bg-sky-50 dark:border-sky-600 dark:text-sky-400 dark:hover:bg-sky-950/40"
        >
          📷 Add Photo
        </button>
      )}
    </div>
  );
}
