import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  archiveAdminProduct,
  createAdminProduct,
  getAdminProduct,
  listAdminCategories,
  restoreAdminProduct,
  updateAdminProduct,
  type AdminProductInput,
} from '../api/admin';
import { errorMessage } from '../api/client';
import type { AdminImage, AdminProduct } from '../api/types';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { AdminSelect, AdminTextInput, AdminTextarea, MoneyInput, MultiImageField } from './AdminInputs';
import { AdminIcon, AdminPageHeader } from './AdminUI';
import { Button, ButtonLink } from '../components/ui/Button';
import { Badge } from '../components/ui/Bits';
import { ErrorState, InlineNotice, Spinner } from '../components/ui/feedback';
import { formatDate } from '../lib/format';
import { cn } from '../lib/cn';

interface VariantForm {
  label: string;
  price: string;
  compareAtPrice: string;
  stockQuantity: string;
  sku: string;
}

interface ProductFormState {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  category: string;
  price: string;
  compareAtPrice: string;
  sku: string;
  stockQuantity: string;
  variants: VariantForm[];
  images: AdminImage[];
  ingredients: string;
  benefits: string[];
  directions: string;
  warnings: string;
  featured: boolean;
  bestseller: boolean;
  displayOrder: string;
  seoTitle: string;
  seoDescription: string;
  sampleData: boolean;
  adminNotes: string;
}

const EMPTY_FORM: ProductFormState = {
  name: '',
  slug: '',
  shortDescription: '',
  description: '',
  category: '',
  price: '0.00',
  compareAtPrice: '',
  sku: '',
  stockQuantity: '0',
  variants: [],
  images: [],
  ingredients: '',
  benefits: [''],
  directions: '',
  warnings: '',
  featured: false,
  bestseller: false,
  displayOrder: '0',
  seoTitle: '',
  seoDescription: '',
  sampleData: false,
  adminNotes: '',
};

function centsToInput(cents: number | null): string {
  if (cents === null || cents === undefined) return '';
  return (cents / 100).toFixed(2);
}

function inputToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const amount = Number.parseFloat(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

function toForm(product: AdminProduct): ProductFormState {
  return {
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription,
    description: product.description,
    category: product.categoryId,
    price: centsToInput(product.price),
    compareAtPrice: centsToInput(product.compareAtPrice),
    sku: product.sku ?? '',
    stockQuantity: String(product.stockQuantity),
    variants: product.variants.map((variant) => ({
      label: variant.label,
      price: centsToInput(variant.price),
      compareAtPrice: centsToInput(variant.compareAtPrice),
      stockQuantity: String(variant.stockQuantity),
      sku: variant.sku ?? '',
    })),
    images: product.images,
    ingredients: product.ingredients,
    benefits: product.benefits.length > 0 ? product.benefits : [''],
    directions: product.directions,
    warnings: product.warnings,
    featured: product.featured,
    bestseller: product.bestseller,
    displayOrder: String(product.displayOrder),
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    sampleData: product.sampleData,
    adminNotes: product.adminNotes,
  };
}

export function ProductForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const categories = useApi(() => listAdminCategories(), []);
  const existing = useApi(() => getAdminProduct(id ?? ''), [id], { enabled: isEdit });

  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  useEffect(() => {
    if (existing.data?.data) {
      setForm(toForm(existing.data.data));
      setLoadedOnce(true);
    }
  }, [existing.data]);

  useEffect(() => {
    if (!isEdit && !form.category && categories.data?.data.length) {
      setForm((current) => ({ ...current, category: categories.data?.data[0]?.id ?? '' }));
    }
  }, [categories.data, form.category, isEdit]);

  const update = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  };

  const updateVariant = (index: number, patch: Partial<VariantForm>) => {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, position) =>
        position === index ? { ...variant, ...patch } : variant,
      ),
    }));
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = 'Give the product a name.';
    if (!form.category) next.category = 'Choose a category.';
    const price = inputToCents(form.price);
    if (price === null) next.price = 'Enter a valid price.';
    const compareAt = form.compareAtPrice.trim() ? inputToCents(form.compareAtPrice) : null;
    if (form.compareAtPrice.trim() && compareAt === null) next.compareAtPrice = 'Enter a valid amount.';
    if (compareAt !== null && price !== null && compareAt <= price) {
      next.compareAtPrice = 'Compare-at price must be higher than the selling price.';
    }
    form.variants.forEach((variant, index) => {
      if (!variant.label.trim()) next[`variant-${index}-label`] = 'Add a size label.';
      const variantPrice = inputToCents(variant.price);
      if (variantPrice === null) next[`variant-${index}-price`] = 'Enter a valid price.';
      const variantCompare = variant.compareAtPrice.trim() ? inputToCents(variant.compareAtPrice) : null;
      if (variant.compareAtPrice.trim() && variantCompare === null) {
        next[`variant-${index}-compareAtPrice`] = 'Enter a valid amount.';
      }
      if (variantCompare !== null && variantPrice !== null && variantCompare <= variantPrice) {
        next[`variant-${index}-compareAtPrice`] = 'Must be higher than the selling price.';
      }
    });
    if (form.images.some((image) => !image.alt.trim())) {
      next.images = 'Every image needs alt text for accessibility.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildPayload = (): AdminProductInput => ({
    name: form.name.trim(),
    slug: form.slug.trim() || undefined,
    shortDescription: form.shortDescription.trim(),
    description: form.description.trim(),
    category: form.category,
    price: inputToCents(form.price) ?? 0,
    compareAtPrice: form.compareAtPrice.trim() ? inputToCents(form.compareAtPrice) : null,
    sku: form.sku.trim() || null,
    variants: form.variants.map((variant) => ({
      label: variant.label.trim(),
      price: inputToCents(variant.price) ?? 0,
      compareAtPrice: variant.compareAtPrice.trim() ? inputToCents(variant.compareAtPrice) : null,
      stockQuantity: Number.parseInt(variant.stockQuantity || '0', 10) || 0,
      sku: variant.sku.trim() || null,
    })),
    stockQuantity: Number.parseInt(form.stockQuantity || '0', 10) || 0,
    images: form.images.map((image) => ({
      url: image.url,
      publicId: image.publicId,
      alt: image.alt.trim(),
      width: image.width,
      height: image.height,
    })),
    ingredients: form.ingredients.trim(),
    benefits: form.benefits.map((benefit) => benefit.trim()).filter(Boolean),
    directions: form.directions.trim(),
    warnings: form.warnings.trim(),
    featured: form.featured,
    bestseller: form.bestseller,
    displayOrder: Number.parseInt(form.displayOrder || '0', 10) || 0,
    seoTitle: form.seoTitle.trim(),
    seoDescription: form.seoDescription.trim(),
    sampleData: form.sampleData,
    adminNotes: form.adminNotes,
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) {
      toast.error('Some fields need attention', 'Check the highlighted fields before saving.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setSaving(true);
    try {
      if (isEdit && id) {
        await updateAdminProduct(id, buildPayload());
        toast.success('Product saved');
      } else {
        await createAdminProduct(buildPayload());
        toast.success('Product created', 'It is now visible on the storefront unless archived.');
      }
      navigate('/admin/products');
    } catch (error) {
      toast.error('Could not save product', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const toggleArchive = async () => {
    if (!id || !existing.data?.data) return;
    setArchiving(true);
    try {
      if (existing.data.data.archivedAt) {
        await restoreAdminProduct(id);
        toast.success('Product restored');
      } else {
        await archiveAdminProduct(id);
        toast.success('Product archived');
      }
      existing.reload();
    } catch (error) {
      toast.error('Could not update product', errorMessage(error));
    } finally {
      setArchiving(false);
    }
  };

  if (isEdit && existing.loading && !loadedOnce) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  if (isEdit && existing.error) {
    return (
      <div>
        <AdminPageHeader title="Edit product" />
        <ErrorState className="mt-6" error={existing.error} onRetry={existing.reload} />
        <div className="mt-4">
          <ButtonLink to="/admin/products" variant="outline">
            Back to products
          </ButtonLink>
        </div>
      </div>
    );
  }

  const product = existing.data?.data;
  const errorCount = Object.keys(errors).length;

  return (
    <form onSubmit={submit} noValidate>
      <AdminPageHeader
        eyebrow="Catalogue"
        title={isEdit ? form.name || 'Edit product' : 'New product'}
        description={
          isEdit && product
            ? `Last saved ${formatDate(product.updatedAt)} · /${product.slug}`
            : 'Add a piece to the collection. You can keep it unfeatured until you are ready to publish.'
        }
        actions={
          <>
            <ButtonLink to="/admin/products" variant="outline" size="sm">
              Cancel
            </ButtonLink>
            <Button type="submit" size="sm" loading={saving}>
              {isEdit ? 'Save changes' : 'Create product'}
            </Button>
          </>
        }
      />

      {errorCount > 0 ? (
        <InlineNotice tone="error" className="mt-6">
          <span role="alert">{errorCount} field{errorCount === 1 ? '' : 's'} need attention. Review the form below.</span>
        </InlineNotice>
      ) : null}

      {isEdit && product?.archivedAt ? (
        <InlineNotice tone="warning" className="mt-6">
          This product is archived and hidden from the storefront. You can restore it at any time.
        </InlineNotice>
      ) : null}

      {form.sampleData ? (
        <InlineNotice tone="info" className="mt-6">
          This listing is marked as sample content and is labelled as such on the storefront.
        </InlineNotice>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-6">
          <section className="admin-card">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-[22px] text-forest-dark">Basics</h2>
              {product ? <Badge tone={product.inStock ? 'gold' : 'out'}>{product.inStock ? 'In stock' : 'Out of stock'}</Badge> : null}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <AdminTextInput
                label="Product name"
                required
                value={form.name}
                onChange={(event) => update('name', event.target.value)}
                error={errors.name}
                maxLength={140}
                className="sm:col-span-2"
              />
              <AdminTextInput
                label="Slug"
                value={form.slug}
                onChange={(event) => update('slug', event.target.value)}
                hint="Leave blank to generate from the name. Changing a live slug breaks existing links."
                placeholder="botanical-gel-cleanser"
              />
              <AdminSelect
                label="Category"
                required
                value={form.category}
                onChange={(event) => update('category', event.target.value)}
                error={errors.category}
              >
                <option value="">Choose a category</option>
                {(categories.data?.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </AdminSelect>
              <AdminTextInput
                label="Short description"
                value={form.shortDescription}
                onChange={(event) => update('shortDescription', event.target.value)}
                hint="One clear line, shown on cards and previews."
                maxLength={260}
                className="sm:col-span-2"
              />
              <AdminTextarea
                label="Full description"
                value={form.description}
                onChange={(event) => update('description', event.target.value)}
                rows={7}
                maxLength={5000}
                hint="Plain text. Separate paragraphs with a blank line."
                className="sm:col-span-2"
              />
            </div>
          </section>

          <section className="admin-card">
            <h2 className="font-serif text-[22px] text-forest-dark">Pricing &amp; stock</h2>
            <p className="mt-1 text-[11.5px] text-muted">
              Prices are stored in minor units. Compare-at prices only display when genuinely higher than the selling price.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <MoneyInput
                label="Price"
                required
                value={form.price}
                onChange={(value) => update('price', value)}
                error={errors.price}
              />
              <MoneyInput
                label="Compare-at price"
                value={form.compareAtPrice}
                onChange={(value) => update('compareAtPrice', value)}
                hint="Optional. Only use this if the piece was genuinely offered at a higher price."
                error={errors.compareAtPrice}
              />
              <AdminTextInput
                label="SKU"
                value={form.sku}
                onChange={(event) => update('sku', event.target.value)}
                hint="Optional internal reference."
                maxLength={64}
              />
              <AdminTextInput
                label="Stock quantity"
                type="number"
                min="0"
                step="1"
                value={form.stockQuantity}
                onChange={(event) => update('stockQuantity', event.target.value)}
                hint="Used when the product has no sizes. With sizes, stock is tracked per size."
              />
            </div>

            <div className="mt-6 border-t border-forest/10 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-forest/80">Sizes &amp; variants</h3>
                  <p className="mt-1 text-[11px] text-muted">Optional. When added, shoppers must choose a size.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    update('variants', [
                      ...form.variants,
                      {
                        label: '',
                        price: form.price,
                        compareAtPrice: '',
                        stockQuantity: '0',
                        sku: '',
                      },
                    ])
                  }
                  disabled={form.variants.length >= 10}
                >
                  <AdminIcon name="plus" className="h-3 w-3" /> Add size
                </Button>
              </div>

              {form.variants.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {form.variants.map((variant, index) => (
                    <div key={index} className="rounded-[3px] border border-forest/10 bg-ivory/40 p-3">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <AdminTextInput
                          label="Label"
                          value={variant.label}
                          onChange={(event) => updateVariant(index, { label: event.target.value })}
                          placeholder="30 ml"
                          error={errors[`variant-${index}-label`]}
                          maxLength={60}
                        />
                        <MoneyInput
                          label="Price"
                          value={variant.price}
                          onChange={(value) => updateVariant(index, { price: value })}
                          error={errors[`variant-${index}-price`]}
                        />
                        <AdminTextInput
                          label="Stock"
                          type="number"
                          min="0"
                          step="1"
                          value={variant.stockQuantity}
                          onChange={(event) => updateVariant(index, { stockQuantity: event.target.value })}
                        />
                        <div className="flex items-end gap-2">
                          <AdminTextInput
                            label="SKU"
                            value={variant.sku}
                            onChange={(event) => updateVariant(index, { sku: event.target.value })}
                            maxLength={64}
                            className="flex-1"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              update(
                                'variants',
                                form.variants.filter((_, position) => position !== index),
                              )
                            }
                            className="mb-1 p-2 text-forest/50 hover:text-red-800"
                            aria-label={`Remove size ${index + 1}`}
                          >
                            <AdminIcon name="trash" className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {errors[`variant-${index}-compareAtPrice`] ? (
                        <p className="mt-1 text-[11px] text-red-800">{errors[`variant-${index}-compareAtPrice`]}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-[11px] text-muted">This product is sold in a single size using the stock quantity above.</p>
              )}
            </div>
          </section>

          <section className="admin-card">
            <h2 className="font-serif text-[22px] text-forest-dark">Imagery</h2>
            <p className="mt-1 text-[11.5px] text-muted">
              Uploads are validated on the server and stored in Cloudinary (or the explicit local development fallback).
              The first image is the card image.
            </p>
            <div className="mt-4">
              <MultiImageField
                images={form.images}
                onChange={(images) => update('images', images)}
                defaultAlt={form.name || 'Herb & Hue product'}
                error={errors.images}
              />
            </div>
          </section>

          <section className="admin-card">
            <h2 className="font-serif text-[22px] text-forest-dark">Product details</h2>
            <div className="mt-4 space-y-4">
              <AdminTextarea
                label="Ingredients"
                value={form.ingredients}
                onChange={(event) => update('ingredients', event.target.value)}
                rows={4}
                maxLength={5000}
                hint="Use the approved INCI list. Do not publish a placeholder as real ingredient information."
              />
              <div>
                <div className="flex items-center justify-between">
                  <label className="admin-label">Benefits</label>
                  <button
                    type="button"
                    onClick={() => update('benefits', [...form.benefits, ''])}
                    disabled={form.benefits.length >= 8}
                    className="text-[10px] font-medium uppercase tracking-[0.1em] text-forest hover:text-gold-dark disabled:opacity-40"
                  >
                    + Add benefit
                  </button>
                </div>
                <div className="space-y-2">
                  {form.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        value={benefit}
                        onChange={(event) =>
                          update(
                            'benefits',
                            form.benefits.map((entry, position) => (position === index ? event.target.value : entry)),
                          )
                        }
                        className="admin-field"
                        maxLength={160}
                        placeholder="A texture or experience detail — not an efficacy claim"
                      />
                      <button
                        type="button"
                        onClick={() => update('benefits', form.benefits.filter((_, position) => position !== index))}
                        className="p-2 text-forest/50 hover:text-red-800"
                        aria-label={`Remove benefit ${index + 1}`}
                      >
                        <AdminIcon name="trash" className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <AdminTextarea
                label="Directions for use"
                value={form.directions}
                onChange={(event) => update('directions', event.target.value)}
                rows={3}
                maxLength={2000}
              />
              <AdminTextarea
                label="Warnings & care"
                value={form.warnings}
                onChange={(event) => update('warnings', event.target.value)}
                rows={3}
                maxLength={2000}
                hint="Include external-use guidance, patch-testing advice and any cautions."
              />
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="admin-card">
            <h2 className="font-serif text-[22px] text-forest-dark">Presentation</h2>
            <div className="mt-4 space-y-4">
              <label className="flex items-start gap-3 text-[12.5px]">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(event) => update('featured', event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-forest"
                />
                <span>
                  <span className="font-medium text-forest">Featured</span>
                  <span className="mt-0.5 block text-[11px] text-muted">Shown in the homepage featured edit.</span>
                </span>
              </label>
              <label className="flex items-start gap-3 text-[12.5px]">
                <input
                  type="checkbox"
                  checked={form.bestseller}
                  onChange={(event) => update('bestseller', event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-forest"
                />
                <span>
                  <span className="font-medium text-forest">Bestseller</span>
                  <span className="mt-0.5 block text-[11px] text-muted">Only tick this if it reflects real sales.</span>
                </span>
              </label>
              <AdminTextInput
                label="Display order"
                type="number"
                min="0"
                step="1"
                value={form.displayOrder}
                onChange={(event) => update('displayOrder', event.target.value)}
                hint="Lower numbers appear first."
              />
              <label className="flex items-start gap-3 border-t border-forest/10 pt-4 text-[12.5px]">
                <input
                  type="checkbox"
                  checked={form.sampleData}
                  onChange={(event) => update('sampleData', event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-forest"
                />
                <span>
                  <span className="font-medium text-forest">Sample content</span>
                  <span className="mt-0.5 block text-[11px] text-muted">
                    Labels the listing as sample data on the storefront. Untick once content is real.
                  </span>
                </span>
              </label>
              <AdminTextarea
                label="Internal notes"
                value={form.adminNotes}
                onChange={(event) => update('adminNotes', event.target.value)}
                rows={3}
                hint="Never shown on the storefront."
              />
            </div>
          </section>

          <section className="admin-card">
            <h2 className="font-serif text-[22px] text-forest-dark">SEO</h2>
            <div className="mt-4 space-y-4">
              <AdminTextInput
                label="SEO title"
                value={form.seoTitle}
                onChange={(event) => update('seoTitle', event.target.value)}
                maxLength={70}
                hint={`${form.seoTitle.length}/70 characters. Defaults to the product name.`}
              />
              <AdminTextarea
                label="SEO description"
                value={form.seoDescription}
                onChange={(event) => update('seoDescription', event.target.value)}
                rows={3}
                maxLength={320}
                hint={`${form.seoDescription.length}/320 characters.`}
              />
            </div>
          </section>

          {isEdit && product ? (
            <section className="admin-card">
              <h2 className="font-serif text-[22px] text-forest-dark">Danger zone</h2>
              <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
                Archiving hides the product from the storefront while preserving reviews and media references. It can be
                undone.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                loading={archiving}
                onClick={toggleArchive}
              >
                {product.archivedAt ? 'Restore product' : 'Archive product'}
              </Button>
            </section>
          ) : null}

          <section className="admin-card">
            <h2 className="font-serif text-[22px] text-forest-dark">Save</h2>
            <p className="mt-1 text-[11.5px] text-muted">
              Changes are validated on the server. Products without images still work, but a card without imagery will
              look unfinished.
            </p>
            <Button type="submit" loading={saving} className={cn('mt-4 w-full', errorCount > 0 && 'opacity-80')}>
              {isEdit ? 'Save changes' : 'Create product'}
            </Button>
            {isEdit && product ? (
              <LinkPreview slug={product.slug} archived={Boolean(product.archivedAt)} />
            ) : null}
          </section>
        </div>
      </div>
    </form>
  );
}

function LinkPreview({ slug, archived }: { slug: string; archived: boolean }) {
  return (
    <a
      href={`/product/${slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 flex items-center justify-center gap-2 text-[10px] font-medium uppercase tracking-[0.12em] text-forest hover:text-gold-dark"
    >
      <AdminIcon name="external" className="h-3.5 w-3.5" />
      {archived ? 'Preview (archived — not public)' : 'Preview on storefront'}
    </a>
  );
}
