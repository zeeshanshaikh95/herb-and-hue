import { useState, type FormEvent } from 'react';
import {
  createAdminGalleryItem,
  deleteAdminGalleryItem,
  listAdminGallery,
  updateAdminGalleryItem,
} from '../api/admin';
import { errorMessage } from '../api/client';
import type { AdminGalleryItem, AdminImage } from '../api/types';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { AdminEmpty, AdminIcon, AdminPageHeader, ConfirmDialog } from './AdminUI';
import { AdminTextInput, AdminTextarea, SingleImageField } from './AdminInputs';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ErrorState, SkeletonBlock } from '../components/ui/feedback';
import { imageUrl } from '../lib/images';

interface GalleryFormState {
  title: string;
  caption: string;
  image: AdminImage | null;
  linkUrl: string;
  displayOrder: string;
  isActive: boolean;
  sampleData: boolean;
}

const EMPTY: GalleryFormState = {
  title: '',
  caption: '',
  image: null,
  linkUrl: '',
  displayOrder: '0',
  isActive: true,
  sampleData: false,
};

export function AdminGallery() {
  const toast = useToast();
  const gallery = useApi(() => listAdminGallery(), []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminGalleryItem | null>(null);
  const [form, setForm] = useState<GalleryFormState>(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminGalleryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const items = gallery.data?.data ?? [];

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY, displayOrder: String(items.length) });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (item: AdminGalleryItem) => {
    setEditing(item);
    setForm({
      title: item.title,
      caption: item.caption,
      image: item.image,
      linkUrl: item.linkUrl,
      displayOrder: String(item.displayOrder),
      isActive: item.isActive,
      sampleData: item.sampleData,
    });
    setError('');
    setModalOpen(true);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (form.title.trim().length === 0) {
      setError('Add a title for this image.');
      return;
    }
    if (!form.image) {
      setError('Upload an image first.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title.trim(),
        caption: form.caption.trim(),
        image: {
          url: form.image.url,
          publicId: form.image.publicId,
          alt: form.image.alt.trim(),
        },
        linkUrl: form.linkUrl.trim(),
        displayOrder: Number.parseInt(form.displayOrder || '0', 10) || 0,
        isActive: form.isActive,
        sampleData: form.sampleData,
      };
      if (editing) {
        await updateAdminGalleryItem(editing.id, payload);
        toast.success('Gallery item updated');
      } else {
        await createAdminGalleryItem(payload);
        toast.success('Gallery item added');
      }
      setModalOpen(false);
      gallery.reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: AdminGalleryItem) => {
    try {
      await updateAdminGalleryItem(item.id, { isActive: !item.isActive });
      gallery.reload();
    } catch (caught) {
      toast.error('Could not update image', errorMessage(caught));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminGalleryItem(deleteTarget.id);
      toast.success('Gallery item deleted');
      setDeleteTarget(null);
      gallery.reload();
    } catch (caught) {
      toast.error('Could not delete image', errorMessage(caught));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        eyebrow="Journal"
        title="Gallery"
        description="Images shown on the homepage and journal page. Alt text is required so the gallery remains accessible."
        actions={
          <Button size="sm" onClick={openCreate}>
            <AdminIcon name="plus" className="h-3.5 w-3.5" /> Add image
          </Button>
        }
      />

      {gallery.error ? (
        <ErrorState className="mt-6" error={gallery.error} onRetry={gallery.reload} />
      ) : gallery.loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonBlock key={index} className="aspect-square w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6">
          <AdminEmpty
            title="The journal is empty"
            body="Add still-life or studio images to build the visual journal."
            action={<Button onClick={openCreate}>Add the first image</Button>}
          />
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.id} className="overflow-hidden rounded-[4px] border border-forest/10 bg-white">
              <div className="relative aspect-square bg-sage/30">
                <img src={imageUrl(item.image.url, 600)} alt="" className="h-full w-full object-cover" />
                <div className="absolute left-2 top-2 flex gap-1.5">
                  {!item.isActive ? <span className="badge badge-out bg-ivory/90">Hidden</span> : null}
                  {item.sampleData ? <span className="badge badge-muted bg-ivory/90">Sample</span> : null}
                </div>
              </div>
              <div className="p-4">
                <h2 className="font-serif text-[20px] leading-tight text-forest-dark">{item.title}</h2>
                <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-muted">
                  {item.caption || 'No caption.'}
                </p>
                <p className="mt-1.5 text-[10px] uppercase tracking-[0.1em] text-muted">Order {item.displayOrder}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="border border-forest/20 px-2.5 py-1.5 text-[9px] font-medium uppercase tracking-[0.1em] text-forest hover:border-forest hover:bg-forest hover:text-ivory"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(item)}
                    className="text-[9px] font-medium uppercase tracking-[0.1em] text-muted hover:text-forest"
                  >
                    {item.isActive ? 'Hide' : 'Publish'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(item)}
                    className="ml-auto p-1.5 text-forest/40 hover:text-red-800"
                    aria-label={`Delete ${item.title}`}
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
        title={editing ? 'Edit gallery image' : 'Add gallery image'}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} loading={saving}>
              {editing ? 'Save changes' : 'Add image'}
            </Button>
          </>
        }
      >
        <form onSubmit={save} className="space-y-4">
          {error ? <p className="text-[12px] font-medium text-red-800" role="alert">{error}</p> : null}
          <AdminTextInput
            label="Title"
            required
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            maxLength={120}
          />
          <AdminTextarea
            label="Caption"
            value={form.caption}
            onChange={(event) => setForm({ ...form, caption: event.target.value })}
            rows={2}
            maxLength={400}
          />
          <SingleImageField
            image={form.image}
            onChange={(image) => setForm({ ...form, image })}
            defaultAlt={`${form.title || 'Herb & Hue'} journal image`}
            label="Image"
            error={!form.image ? error ?? undefined : undefined}
          />
          <AdminTextInput
            label="Link URL"
            value={form.linkUrl}
            onChange={(event) => setForm({ ...form, linkUrl: event.target.value })}
            hint="Optional. A full https:// link or an in-app path such as /shop."
            maxLength={2048}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminTextInput
              label="Display order"
              type="number"
              min="0"
              value={form.displayOrder}
              onChange={(event) => setForm({ ...form, displayOrder: event.target.value })}
            />
            <div className="space-y-2 pt-6">
              <label className="flex items-center gap-2 text-[12px]">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                  className="h-4 w-4 accent-forest"
                />
                Visible on storefront
              </label>
              <label className="flex items-center gap-2 text-[12px]">
                <input
                  type="checkbox"
                  checked={form.sampleData}
                  onChange={(event) => setForm({ ...form, sampleData: event.target.checked })}
                  className="h-4 w-4 accent-forest"
                />
                Sample imagery
              </label>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this image?"
        description="The gallery item will be removed. If nothing else references the underlying image, it is deleted from storage as well."
        confirmLabel="Delete image"
        destructive
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
