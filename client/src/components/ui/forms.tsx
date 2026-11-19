import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}

function FieldShell({ label, hint, error, required, htmlFor, children, className }: FieldShellProps) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="field-label">
        {label}
        {required ? <span className="ml-1 text-gold-dark" aria-hidden="true">*</span> : null}
        {required ? <span className="sr-only">(required)</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <span id={hintId} className="field-hint">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className="field-error-text" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

type BaseFieldProps = {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
};

export function TextInput({
  label,
  hint,
  error,
  className,
  id,
  required,
  ...rest
}: BaseFieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} htmlFor={fieldId} className={className}>
      <input
        id={fieldId}
        className={cn('field', error && 'field-error')}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        required={required}
        {...rest}
      />
    </FieldShell>
  );
}

export function Textarea({
  label,
  hint,
  error,
  className,
  id,
  required,
  rows = 5,
  ...rest
}: BaseFieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} htmlFor={fieldId} className={className}>
      <textarea
        id={fieldId}
        rows={rows}
        className={cn('field resize-y', error && 'field-error')}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        required={required}
        {...rest}
      />
    </FieldShell>
  );
}

export function Select({
  label,
  hint,
  error,
  className,
  id,
  required,
  children,
  ...rest
}: BaseFieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} htmlFor={fieldId} className={className}>
      <select
        id={fieldId}
        className={cn('field appearance-none bg-white pr-10', error && 'field-error')}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        required={required}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  );
}

export function Checkbox({
  label,
  hint,
  className,
  id,
  ...rest
}: { label: string; hint?: string; className?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input
        id={fieldId}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded-[2px] border-forest/30 text-forest accent-forest focus:outline-none focus:ring-2 focus:ring-gold/60"
        {...rest}
      />
      <div>
        <label htmlFor={fieldId} className="cursor-pointer text-[13px] font-medium text-charcoal">
          {label}
        </label>
        {hint ? <p className="mt-0.5 text-[12px] leading-snug text-muted">{hint}</p> : null}
      </div>
    </div>
  );
}
