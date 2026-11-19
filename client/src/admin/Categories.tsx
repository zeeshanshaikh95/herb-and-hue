import { useState, type FormEvent } from 'react';
import {
  createAdminCategory,
  deleteAdminCategory,
  listAdminCategories,
  updateAdminCategory,
} from '../api/admin';
import { errorMessage } from '../api/client';
import type { AdminCategory, AdminImage } from '../api/types';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { AdminEmpty, AdminIcon, AdminPageHeader, ConfirmDialog } from './AdminUI';
import { AdminSelect, AdminTextInput, AdminTextarea, SingleImageField } from './AdminInputs';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ErrorState, SkeletonBlock } from '../components/ui/feedback';
import { imageUrl } from '../lib/images';
import { pluralize } from '../lib/format';

interface CategoryFormState {
  name: string;
  slug: string;
  description: string;
  image: AdminImage | null;
  displayOrder: string;
  isActive: boolean;
}

const EMPTY: CategoryFormState = {
  name: '',
  slug: '',
  description: '',
  image: null,
  displayOrder: '0',
  isActive: true,
};

export function AdminCategories() {
  const toast = useToast();
  const categories = useApi(() => listAdminCategories(), []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [form, setForm] = useState<CategoryFormState>(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const items = categories.data?.data ?? [];

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY, displayOrder: String(items.length) });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (category: AdminCategory) => {
    setEditing(category);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description,
      image: category.image,
      displayOrder: String(category.displayOrder),
      isActive: category.isActive,
    });
    setError('');
    setModalOpen(true);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (form.name.trim().length < 2) {
      setError('Give the category a name.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        description: form.description.trim(),
        image: form.image
          ? {
              url: form.image.url,
              publicId: form.image.publicId,
              alt: form.image.alt,
            }
          : null,
        displayOrder: Number.parseInt(form.displayOrder || '0', 10) || 0,
        isActive: form.isActive,
      };
      if (editing) {
        await updateAdminCategory(editing.id, payload);
        toast.success('Category updated');
      } else {
        await createAdminCategory(payload);
        toast.success('Category created');
      }
      setModalOpen(false);
      categories.reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminCategory(deleteTarget.id);
      toast.success('Category deleted');
      setDeleteTarget(null);
      categories.reload();
    } catch (caught) {
      toast.error('Could not delete category', errorMessage(caught));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (category: AdminCategory) => {
    try {
      await updateAdminCategory(category.id, { isActive: !category.isActive });
      toast.success(category.isActive ? 'Category hidden' : 'Category published');
      categories.reload();
    } catch (caught) {
      toast.error('Could not update category', errorMessage(caught));
    }
  };

  return (
    <div>
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Categories"
        description="Collections organise the catalogue and drive the storefront navigation tiles. Deactivate rather than delete if products still reference a category."
        actions={
          <Button size="sm" onClick={openCreate}>
            <AdminIcon name="plus" className="h-3.5 w-3.5" /> New category
          </Button>
        }
      />

      {categories.error ? (
        <ErrorState className="mt-6" error={categories.error} onRetry={categories.reload} />
      ) : categories.loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-36 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6">
          <AdminEmpty
            title="No categories yet"
            body="Create your first collection before adding products."
            action={<Button onClick={openCreate}>Create a category</Button>}
          />
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {items.map((category) => (
            <li key={category.id} className="flex gap-4 rounded-[4px] border border-forest/10 bg-white p-4">
              {category.image ? (
                <img
                  src={imageUrl(category.image.url, 200)}
                  alt=""
                  className="h-28 w-24 shrink-0 border border-forest/10 object-cover"
                />
              ) : (
                <div className="flex h-28 w-24 shrink-0 items-center justify-center border border-dashed border-forest/20 text-[9px] uppercase text-muted">
                  No image
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate font-serif text-[21px] leading-tight text-forest-dark">{category.name}</h2>
                    <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.1em] text-muted">/{category.slug}</p>
                  </div>
                  <span
                    className={`badge ${category.isActive ? 'badge-gold' : 'badge-out'}`}
                  >
                    {category.isActive ? 'Live' : 'Hidden'}
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-relaxed text-muted">
                  {category.description || 'No description yet.'}
                </p>
                <p className="mt-1.5 text-[11px] text-muted">
                  {pluralize(category.productCount, 'product')} · order {category.displayOrder}
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => openEdit(category)}
                    className="border border-forest/20 px-2.5 py-1.5 text-[9px] font-medium uppercase tracking-[0.1em] text-forest hover:border-forest hover:bg-forest hover:text-ivory"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(category)}
                    className="px-2 text-[9px] font-medium uppercase tracking-[0.1em] text-muted hover:text-forest"
                  >
                    {category.isActive ? 'Hide' : 'Publish'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(category)}
                    className="ml-auto p-1.5 text-forest/40 hover:text-red-800"
                    aria-label={`Delete ${category.name}`}
                  >
                    <AdminIcon name="trash" className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit category' : 'New category'}
        description="Shown on the home page and collection index."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} loading={saving}>
              {editing ? 'Save category' : 'Create category'}
            </Button>
          </>
        }
      >
        <form onSubmit={save} className="space-y-4">
          {error ? <p className="text-[12px] font-medium text-red-800" role="alert">{error}</p> : null}
          <AdminTextInput
            label="Name"
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            maxLength={80}
          />
          <AdminTextInput
            label="Slug"
            value={form.slug}
            onChange={(event) => setForm({ ...form, slug: event.target.value })}
            hint="Optional. Leave blank to generate from the name."
          />
          <AdminTextarea
            label="Description"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            rows={3}
            maxLength={1200}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminTextInput
              label="Display order"
              type="number"
              min="0"
              value={form.displayOrder}
              onChange={(event) => setForm({ ...form, displayOrder: event.target.value })}
            />
            <AdminSelect
              label="Visibility"
              value={form.isActive ? 'active' : 'hidden'}
              onChange={(event) => setForm({ ...form, isActive: event.target.value === 'active' })}
            >
              <option value="active">Published</option>
              <option value="hidden">Hidden</option>
            </AdminSelect>
          </div>
          <SingleImageField
            image={form.image}
            onChange={(image) => setForm({ ...form, image })}
            defaultAlt={`${form.name || 'Herb & Hue'} category image`}
            label="Category image"
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this category?"
        description={`“${deleteTarget?.name ?? ''}” will be removed. This only works if no products reference it; otherwise hide the category instead.`}
        confirmLabel="Delete category"
        destructive
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
