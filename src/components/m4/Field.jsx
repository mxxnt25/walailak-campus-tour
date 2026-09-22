import { useId } from "react";
export default function Field({ label, error, id: suppliedId, ...props }) {
  const generated = useId();
  const id = suppliedId || generated;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm text-textSecondary">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className="rounded-input border border-border px-3 py-2 bg-surface text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary"
        {...props}
      />
      {error && (
        <span id={`${id}-error`} className="text-danger text-sm">
          {error}
        </span>
      )}
    </div>
  );
}
