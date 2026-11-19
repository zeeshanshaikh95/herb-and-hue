import { useRef, useState, type ReactNode } from 'react';
import { errorMessage } from '../api/client';
import { uploadAdminImages } from '../api/admin';
import type { AdminImage } from '../api/types';
import { useToast } from '../context/ToastContext';
import { cn } from '../lib/cn';
import { imageUrl } from '../lib/images';
import { Spinner } from '../components/ui/feedback';
import { AdminIcon } from './AdminUI';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

export function AdminField({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="admin-label" htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-1 text-gold-dark">*</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="mt-1.5 text-[11px] leading-snug text-muted">{hint}</p> : null}
      {error ? (
        <p className="mt-1.5 text-[11px] font-medium text-red-800" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AdminTextInput({
  label,
  hint,
  error,
  className,
  id,
  required,
  ...rest
}: {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <AdminField label={label} htmlFor={id} hint={hint} error={error} required={required} className={className}>
      <input
        id={id}
        className={cn('admin-field', error && 'border-red-700/60')}
        aria-invalid={error ? true : undefined}
        required={required}
        {...rest}
      />
    </AdminField>
  );
}

export function AdminTextarea({
  label,
  hint,
  error,
  className,
  id,
  required,
  rows = 5,
  ...rest
}: {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <AdminField label={label} htmlFor={id} hint={hint} error={error} required={required} className={className}>
      <textarea
        id={id}
        rows={rows}
        className={cn('admin-field resize-y', error && 'border-red-700/60')}
        aria-invalid={error ? true : undefined}
        required={required}
        {...rest}
      />
    </AdminField>
  );
}

export function AdminSelect({
  label,
  hint,
  error,
  className,
  id,
  required,
  children,
  ...rest
}: {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <AdminField label={label} htmlFor={id} hint={hint} error={error} required={required} className={className}>
      <select
        id={id}
        className={cn('admin-field', error && 'border-red-700/60')}
        aria-invalid={error ? true : undefined}
        required={required}
        {...rest}
      >
        {children}
      </select>
    </AdminField>
  );
}

export function MoneyInput({
  label,
  value,
  onChange,
  hint,
  error,
  required,
  id,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  required?: boolean;
  id?: string;
}) {
  return (
    <AdminField label={label} htmlFor={id} hint={hint} error={error} required={required}>
      <div className="flex items-center border border-forest/20 bg-white focus-within:border-forest">
        {/* Amounts are entered in rupees; the API stores integer paise. */}
        <span
          aria-hidden="true"
          className="border-r border-forest/15 px-3 py-2.5 text-[13px] font-medium text-muted"
        >
          ₹
        </span>
        <input
          id={id}
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent px-3 py-2.5 text-[14px] text-charcoal outline-none"
          required={required}
        />
      </div>
    </AdminField>
  );
}

function validateFiles(files: File[]): { valid: File[]; message: string | null } {
  const valid: File[] = [];
  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { valid: [], message: `“${file.name}” is not a JPG, PNG or WebP image.` };
    }
    if (file.size > MAX_BYTES) {
      return { valid: [], message: `“${file.name}” is larger than 5 MB.` };
    }
    valid.push(file);
  }
  return { valid, message: null };
}

function UploadDropzone({
  onFiles,
  uploading,
  label,
  hint,
  multiple,
}: {
  onFiles: (files: File[]) => void;
  uploading: boolean;
  label: string;
  hint?: string;
  multiple?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        onFiles(Array.from(event.dataTransfer.files));
      }}
      className={cn(
        'flex flex-col items-center justify-center border border-dashed px-4 py-7 text-center transition-colors',
        dragging ? 'border-forest bg-forest/5' : 'border-forest/25 bg-ivory/40',
      )}
    >
      {uploading ? (
        <Spinner className="h-5 w-5" />
      ) : (
        <AdminIcon name="image" className="h-6 w-6 text-forest/45" />
      )}
      <p className="mt-2 text-[12px] font-medium text-forest">{label}</p>
      <p className="mt-1 text-[10.5px] text-muted">{hint ?? 'JPG, PNG or WebP · up to 5 MB each'}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        className="sr-only"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length > 0) onFiles(files);
          event.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="mt-3 border border-forest/25 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-forest transition-colors hover:border-forest hover:bg-forest hover:text-ivory disabled:opacity-50"
      >
        Choose file{multiple ? 's' : ''}
      </button>
    </div>
  );
}

interface MultiImageFieldProps {
  images: AdminImage[];
  onChange: (images: AdminImage[]) => void;
  defaultAlt: string;
  error?: string;
}

export function MultiImageField({ images, onChange, defaultAlt, error }: MultiImageFieldProps) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: File[]) => {
    if (images.length + files.length > 8) {
      toast.error('Too many images', 'A product can hold up to 8 images.');
      return;
    }
    const { valid, message } = validateFiles(files);
    if (message) {
      toast.error('Image not accepted', message);
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadAdminImages(valid, defaultAlt || 'Herb & Hue product');
      onChange([...images, ...uploaded]);
      toast.success('Image uploaded', 'Add alt text so the image is accessible.');
    } catch (caught) {
      toast.error('Upload failed', errorMessage(caught));
    } finally {
      setUploading(false);
    }
  };

  const updateAlt = (index: number, alt: string) => {
    onChange(images.map((image, position) => (position === index ? { ...image, alt } : image)));
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="admin-label">Product images</label>
        <span className="text-[10px] text-muted">{images.length}/8</span>
      </div>
      {error ? <p className="mb-2 text-[11px] font-medium text-red-800">{error}</p> : null}
      <UploadDropzone
        onFiles={handleFiles}
        uploading={uploading}
        label="Drag images here or choose files"
        hint="JPG, PNG or WebP · up to 5 MB each · 8 images max"
        multiple
      />
      {images.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {images.map((image, index) => (
            <li key={`${image.publicId ?? image.url}-${index}`} className="flex gap-3 border border-forest/10 bg-white p-3">
              <img
                src={imageUrl(image.url, 200)}
                alt=""
                className="h-20 w-16 shrink-0 border border-forest/10 object-cover"
              />
              <div className="min-w-0 flex-1">
                <input
                  value={image.alt}
                  onChange={(event) => updateAlt(index, event.target.value)}
                  className="admin-field py-1.5 text-[12px]"
                  placeholder="Describe the image for screen readers"
                  aria-label={`Alt text for image ${index + 1}`}
                  maxLength={200}
                />
                <p className="mt-1 truncate text-[10px] text-muted">{image.url}</p>
                <div className="mt-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="p-1.5 text-forest/60 hover:text-forest disabled:opacity-25"
                    aria-label="Move image up"
                  >
                    <AdminIcon name="arrowUp" className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === images.length - 1}
                    className="p-1.5 text-forest/60 hover:text-forest disabled:opacity-25"
                    aria-label="Move image down"
                  >
                    <AdminIcon name="arrowDown" className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(images.filter((_, position) => position !== index))}
                    className="ml-auto flex items-center gap-1 p-1.5 text-[10px] uppercase tracking-[0.1em] text-red-800 hover:text-red-900"
                  >
                    <AdminIcon name="trash" className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

interface SingleImageFieldProps {
  image: AdminImage | null;
  onChange: (image: AdminImage | null) => void;
  defaultAlt: string;
  label?: string;
  error?: string;
}

export function SingleImageField({
  image,
  onChange,
  defaultAlt,
  label = 'Image',
  error,
}: SingleImageFieldProps) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: File[]) => {
    const { valid, message } = validateFiles(files.slice(0, 1));
    if (message) {
      toast.error('Image not accepted', message);
      return;
    }
    setUploading(true);
    try {
      const [uploaded] = await uploadAdminImages(valid, defaultAlt || 'Herb & Hue');
      if (uploaded) {
        onChange({ ...uploaded, alt: defaultAlt || uploaded.alt });
        toast.success('Image uploaded');
      }
    } catch (caught) {
      toast.error('Upload failed', errorMessage(caught));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="admin-label">{label}</label>
      {error ? <p className="mb-2 text-[11px] font-medium text-red-800">{error}</p> : null}
      {image ? (
        <div className="flex gap-3 border border-forest/10 bg-white p-3">
          <img src={imageUrl(image.url, 300)} alt="" className="h-24 w-20 border border-forest/10 object-cover" />
          <div className="min-w-0 flex-1">
            <input
              value={image.alt}
              onChange={(event) => onChange({ ...image, alt: event.target.value })}
              className="admin-field py-1.5 text-[12px]"
              placeholder="Describe the image"
              maxLength={200}
              aria-label="Alt text"
            />
            <div className="mt-2 flex items-center gap-3">
              <label className="cursor-pointer text-[10px] font-medium uppercase tracking-[0.1em] text-forest hover:text-gold-dark">
                Replace
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    if (files.length) void handleFiles(files);
                    event.target.value = '';
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="text-[10px] font-medium uppercase tracking-[0.1em] text-red-800 hover:text-red-900"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <UploadDropzone onFiles={handleFiles} uploading={uploading} label="Upload an image" />
      )}
    </div>
  );
}

/** Single image URL for settings records (no publicId column). */
export function UrlImageField({
  label,
  url,
  alt,
  onChangeUrl,
  onChangeAlt,
  hint,
}: {
  label: string;
  url: string;
  alt?: string;
  onChangeUrl: (url: string) => void;
  onChangeAlt?: (alt: string) => void;
  hint?: string;
}) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <label className="admin-label">{label}</label>
      {hint ? <p className="mb-2 text-[11px] leading-snug text-muted">{hint}</p> : null}
      <div className="flex gap-3">
        {url ? (
          <img src={imageUrl(url, 300)} alt="" className="h-20 w-16 shrink-0 border border-forest/10 object-cover" />
        ) : (
          <div className="flex h-20 w-16 shrink-0 items-center justify-center border border-dashed border-forest/20 text-[9px] uppercase text-muted">
            None
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="border border-forest/25 px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-forest hover:border-forest hover:bg-forest hover:text-ivory disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : url ? 'Replace image' : 'Upload image'}
            </button>
            {url ? (
              <button
                type="button"
                onClick={() => onChangeUrl('')}
                className="text-[10px] font-medium uppercase tracking-[0.1em] text-red-800 hover:text-red-900"
              >
                Clear
              </button>
            ) : null}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={async (event) => {
                const files = Array.from(event.target.files ?? []);
                event.target.value = '';
                if (!files.length) return;
                const { valid, message } = validateFiles(files.slice(0, 1));
                if (message) {
                  toast.error('Image not accepted', message);
                  return;
                }
                setUploading(true);
                try {
                  const [uploaded] = await uploadAdminImages(valid, alt || 'Herb & Hue');
                  if (uploaded) onChangeUrl(uploaded.url);
                } catch (caught) {
                  toast.error('Upload failed', errorMessage(caught));
                } finally {
                  setUploading(false);
                }
              }}
            />
          </div>
          <input
            value={url}
            onChange={(event) => onChangeUrl(event.target.value)}
            className="admin-field py-1.5 text-[11px]"
            placeholder="/images/… or https://…"
            aria-label={`${label} URL`}
          />
          {onChangeAlt ? (
            <input
              value={alt ?? ''}
              onChange={(event) => onChangeAlt(event.target.value)}
              className="admin-field py-1.5 text-[11px]"
              placeholder="Alt text for accessibility"
              aria-label={`${label} alt text`}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function StringListEditor({
  label,
  values,
  onChange,
  placeholder,
  hint,
  max = 12,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  hint?: string;
  max?: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="admin-label">{label}</label>
        <button
          type="button"
          onClick={() => values.length < max && onChange([...values, ''])}
          className="text-[10px] font-medium uppercase tracking-[0.1em] text-forest hover:text-gold-dark"
        >
          + Add
        </button>
      </div>
      {hint ? <p className="mb-2 text-[11px] text-muted">{hint}</p> : null}
      <div className="space-y-2">
        {values.map((value, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              value={value}
              onChange={(event) =>
                onChange(values.map((entry, position) => (position === index ? event.target.value : entry)))
              }
              className="admin-field"
              placeholder={placeholder}
              maxLength={800}
            />
            <button
              type="button"
              onClick={() => onChange(values.filter((_, position) => position !== index))}
              className="p-2 text-forest/50 hover:text-red-800"
              aria-label={`Remove ${label} item ${index + 1}`}
            >
              <AdminIcon name="trash" className="h-4 w-4" />
            </button>
          </div>
        ))}
        {values.length === 0 ? <p className="text-[11px] text-muted">Nothing added yet.</p> : null}
      </div>
    </div>
  );
}

export function PairListEditor({
  label,
  values,
  onChange,
  max = 6,
}: {
  label: string;
  values: { title: string; body: string }[];
  onChange: (values: { title: string; body: string }[]) => void;
  max?: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="admin-label">{label}</label>
        <button
          type="button"
          onClick={() => values.length < max && onChange([...values, { title: '', body: '' }])}
          className="text-[10px] font-medium uppercase tracking-[0.1em] text-forest hover:text-gold-dark"
        >
          + Add
        </button>
      </div>
      <div className="mt-2 space-y-3">
        {values.map((item, index) => (
          <div key={index} className="rounded-[3px] border border-forest/10 bg-white p-3">
            <div className="flex items-center gap-2">
              <input
                value={item.title}
                onChange={(event) =>
                  onChange(values.map((entry, position) => (position === index ? { ...entry, title: event.target.value } : entry)))
                }
                className="admin-field"
                placeholder="Title"
                aria-label={`${label} ${index + 1} title`}
                maxLength={100}
              />
              <button
                type="button"
                onClick={() => onChange(values.filter((_, position) => position !== index))}
                className="p-2 text-forest/50 hover:text-red-800"
                aria-label={`Remove ${label} item ${index + 1}`}
              >
                <AdminIcon name="trash" className="h-4 w-4" />
              </button>
            </div>
            <textarea
              value={item.body}
              onChange={(event) =>
                onChange(values.map((entry, position) => (position === index ? { ...entry, body: event.target.value } : entry)))
              }
              className="admin-field mt-2 resize-y"
              rows={2}
              placeholder="Body copy"
              aria-label={`${label} ${index + 1} body`}
              maxLength={1200}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

