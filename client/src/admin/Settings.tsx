import { useEffect, useRef, useState, type FormEvent } from 'react';
import { getAdminSettings, updateAdminSettings } from '../api/admin';
import { errorMessage } from '../api/client';
import type { PublicSettings } from '../api/types';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { AdminPageHeader, AdminIcon } from './AdminUI';
import {
  AdminField,
  AdminSelect,
  AdminTextInput,
  AdminTextarea,
  PairListEditor,
  StringListEditor,
  UrlImageField,
} from './AdminInputs';
import { Button } from '../components/ui/Button';
import { ErrorState, InlineNotice, Spinner } from '../components/ui/feedback';
import { cn } from '../lib/cn';

const TABS = [
  { value: 'brand', label: 'Brand' },
  { value: 'homepage', label: 'Homepage' },
  { value: 'about', label: 'About' },
  { value: 'contact', label: 'Contact & WhatsApp' },
  { value: 'commerce', label: 'Commerce' },
  { value: 'seo', label: 'SEO & features' },
] as const;

type Tab = (typeof TABS)[number]['value'];

const PLACEHOLDERS = ['{{business}}', '{{product}}', '{{variant}}', '{{url}}', '{{items}}', '{{subtotal}}', '{{name}}', '{{notes}}'];


export function AdminSettings() {
  const toast = useToast();
  const adminSettings = useApi(() => getAdminSettings(), []);
  const [form, setForm] = useState<PublicSettings | null>(null);
  const [tab, setTab] = useState<Tab>('brand');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const initial = useRef('');

  useEffect(() => {
    if (adminSettings.data?.data) {
      const next = structuredClone(adminSettings.data.data);
      setForm(next);
      initial.current = JSON.stringify(next);
    }
  }, [adminSettings.data]);

  const dirty = form ? JSON.stringify(form) !== initial.current : false;

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const edit = (mutator: (draft: PublicSettings) => void) => {
    setForm((current) => {
      if (!current) return current;
      const next = structuredClone(current);
      mutator(next);
      return next;
    });
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setError('');
    if (!form.businessName.trim()) {
      setError('The business name is required.');
      setTab('brand');
      return;
    }
    if (form.whatsappNumber && !/^[1-9]\d{7,14}$/.test(form.whatsappNumber)) {
      setError('WhatsApp number must be 8–15 digits in international format (no + or spaces).');
      setTab('contact');
      return;
    }
    setSaving(true);
    try {
      const response = await updateAdminSettings(form);
      const saved = structuredClone(response.data);
      setForm(saved);
      initial.current = JSON.stringify(saved);
      toast.success('Settings saved', 'The storefront updates on its next load.');
      adminSettings.reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  if (adminSettings.loading && !form) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  if (adminSettings.error || !form) {
    return (
      <div>
        <AdminPageHeader title="Settings" />
        <ErrorState className="mt-6" error={adminSettings.error} onRetry={adminSettings.reload} />
      </div>
    );
  }

  return (
    <form onSubmit={save} noValidate>
      <AdminPageHeader
        eyebrow="Configuration"
        title="Store settings"
        description="Brand, content, contact, WhatsApp and SEO. These values drive the storefront — no code changes needed."
        actions={
          <>
            {dirty ? <span className="badge badge-gold">Unsaved changes</span> : null}
            <Button type="submit" size="sm" loading={saving}>
              Save settings
            </Button>
          </>
        }
      />

      {error ? (
        <InlineNotice tone="error" className="mt-6">
          <span role="alert">{error}</span>
        </InlineNotice>
      ) : null}

      <div className="hide-scrollbar mt-6 flex gap-1 overflow-x-auto border-b border-forest/15 pb-px">
        {TABS.map((entry) => (
          <button
            key={entry.value}
            type="button"
            onClick={() => setTab(entry.value)}
            aria-pressed={tab === entry.value}
            className={cn(
              'shrink-0 border-b-2 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors',
              tab === entry.value
                ? 'border-forest text-forest'
                : 'border-transparent text-muted hover:text-forest',
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-6">
        {tab === 'brand' ? (
          <>
            <section className="admin-card">
              <h2 className="font-serif text-[22px] text-forest-dark">Identity</h2>
              <p className="mt-1 text-[11.5px] text-muted">Used across navigation, metadata and the footer.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <AdminTextInput
                  label="Business name"
                  required
                  value={form.businessName}
                  onChange={(event) => edit((draft) => void (draft.businessName = event.target.value))}
                  maxLength={80}
                />
                <AdminTextInput
                  label="Tagline"
                  value={form.tagline}
                  onChange={(event) => edit((draft) => void (draft.tagline = event.target.value))}
                  maxLength={160}
                />
                <AdminTextarea
                  label="Short description"
                  value={form.shortDescription}
                  onChange={(event) => edit((draft) => void (draft.shortDescription = event.target.value))}
                  rows={3}
                  maxLength={600}
                  className="sm:col-span-2"
                />
                <UrlImageField
                  label="Brand logo (square mark)"
                  url={form.logoUrl}
                  onChangeUrl={(url) => edit((draft) => void (draft.logoUrl = url))}
                  hint="The supplied logo artwork. Used for structured data and fallbacks."
                />
              </div>
            </section>

            <section className="admin-card">
              <h2 className="font-serif text-[22px] text-forest-dark">Announcement bar</h2>
              <div className="mt-4 space-y-4">
                <label className="flex items-center gap-2 text-[12px]">
                  <input
                    type="checkbox"
                    checked={form.announcement.enabled}
                    onChange={(event) => edit((draft) => void (draft.announcement.enabled = event.target.checked))}
                    className="h-4 w-4 accent-forest"
                  />
                  Show the announcement bar
                </label>
                <AdminTextarea
                  label="Text"
                  value={form.announcement.text}
                  onChange={(event) => edit((draft) => void (draft.announcement.text = event.target.value))}
                  rows={2}
                  maxLength={200}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <AdminTextInput
                    label="Link label"
                    value={form.announcement.linkLabel}
                    onChange={(event) => edit((draft) => void (draft.announcement.linkLabel = event.target.value))}
                    maxLength={60}
                  />
                  <AdminTextInput
                    label="Link URL"
                    value={form.announcement.linkUrl}
                    onChange={(event) => edit((draft) => void (draft.announcement.linkUrl = event.target.value))}
                    hint="In-app path (/contact) or full https:// URL."
                    maxLength={500}
                  />
                </div>
              </div>
            </section>

            <section className="admin-card">
              <h2 className="font-serif text-[22px] text-forest-dark">Footer</h2>
              <div className="mt-4 space-y-4">
                <AdminTextarea
                  label="Footer blurb"
                  value={form.footer.blurb}
                  onChange={(event) => edit((draft) => void (draft.footer.blurb = event.target.value))}
                  rows={2}
                  maxLength={500}
                />
                <AdminTextInput
                  label="Footer note"
                  value={form.footer.note}
                  onChange={(event) => edit((draft) => void (draft.footer.note = event.target.value))}
                  hint="Shown in the bottom bar, e.g. how orders are confirmed."
                  maxLength={300}
                />
              </div>
            </section>
          </>
        ) : null}

        {tab === 'homepage' ? (
          <>
            <section className="admin-card">
              <h2 className="font-serif text-[22px] text-forest-dark">Hero</h2>
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <AdminTextInput
                    label="Eyebrow"
                    value={form.homepage.heroEyebrow}
                    onChange={(event) => edit((draft) => void (draft.homepage.heroEyebrow = event.target.value))}
                    maxLength={80}
                  />
                  <AdminTextInput
                    label="Hero note"
                    value={form.homepage.heroNote}
                    onChange={(event) => edit((draft) => void (draft.homepage.heroNote = event.target.value))}
                    maxLength={160}
                  />
                  <AdminTextInput
                    label="Title"
                    value={form.homepage.heroTitle}
                    onChange={(event) => edit((draft) => void (draft.homepage.heroTitle = event.target.value))}
                    maxLength={120}
                  />
                  <AdminTextInput
                    label="Title accent line"
                    value={form.homepage.heroTitleAccent}
                    onChange={(event) => edit((draft) => void (draft.homepage.heroTitleAccent = event.target.value))}
                    hint="Displayed in italic beneath the title."
                    maxLength={120}
                  />
                  <AdminTextarea
                    label="Hero body"
                    value={form.homepage.heroBody}
                    onChange={(event) => edit((draft) => void (draft.homepage.heroBody = event.target.value))}
                    rows={3}
                    maxLength={600}
                    className="sm:col-span-2"
                  />
                  <AdminTextInput
                    label="CTA label"
                    value={form.homepage.heroCtaLabel}
                    onChange={(event) => edit((draft) => void (draft.homepage.heroCtaLabel = event.target.value))}
                    maxLength={60}
                  />
                  <AdminTextInput
                    label="CTA URL"
                    value={form.homepage.heroCtaUrl}
                    onChange={(event) => edit((draft) => void (draft.homepage.heroCtaUrl = event.target.value))}
                    maxLength={500}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <UrlImageField
                    label="Hero image"
                    url={form.homepage.heroImage}
                    alt={form.homepage.heroImageAlt}
                    onChangeUrl={(url) => edit((draft) => void (draft.homepage.heroImage = url))}
                    onChangeAlt={(alt) => edit((draft) => void (draft.homepage.heroImageAlt = alt))}
                    hint="Portrait 4:5 works best. Use a high-quality product still life."
                  />
                  <UrlImageField
                    label="Philosophy image"
                    url={form.homepage.philosophyImage}
                    alt={form.homepage.philosophyImageAlt}
                    onChangeUrl={(url) => edit((draft) => void (draft.homepage.philosophyImage = url))}
                    onChangeAlt={(alt) => edit((draft) => void (draft.homepage.philosophyImageAlt = alt))}
                    hint="Landscape 5:4."
                  />
                </div>
              </div>
            </section>

            <section className="admin-card">
              <h2 className="font-serif text-[22px] text-forest-dark">Section headings</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ['categoriesEyebrow', 'Categories eyebrow'],
                    ['categoriesTitle', 'Categories title'],
                    ['featuredEyebrow', 'Featured eyebrow'],
                    ['featuredTitle', 'Featured title'],
                    ['bestsellersEyebrow', 'Bestsellers eyebrow'],
                    ['bestsellersTitle', 'Bestsellers title'],
                    ['reviewsEyebrow', 'Reviews eyebrow'],
                    ['reviewsTitle', 'Reviews title'],
                    ['galleryEyebrow', 'Journal eyebrow'],
                    ['galleryTitle', 'Journal title'],
                    ['whatsappEyebrow', 'WhatsApp eyebrow'],
                    ['whatsappTitle', 'WhatsApp title'],
                  ] as const
                ).map(([key, label]) => (
                  <AdminTextInput
                    key={key}
                    label={label}
                    value={form.homepage[key]}
                    onChange={(event) => edit((draft) => void (draft.homepage[key] = event.target.value))}
                    maxLength={160}
                  />
                ))}
                <AdminTextarea
                  label="WhatsApp section body"
                  value={form.homepage.whatsappBody}
                  onChange={(event) => edit((draft) => void (draft.homepage.whatsappBody = event.target.value))}
                  rows={3}
                  maxLength={600}
                  className="sm:col-span-2"
                />
              </div>
            </section>

            <section className="admin-card">
              <h2 className="font-serif text-[22px] text-forest-dark">Philosophy &amp; values</h2>
              <div className="mt-4 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <AdminTextInput
                    label="Philosophy eyebrow"
                    value={form.homepage.philosophyEyebrow}
                    onChange={(event) => edit((draft) => void (draft.homepage.philosophyEyebrow = event.target.value))}
                    maxLength={80}
                  />
                  <AdminTextInput
                    label="Philosophy title"
                    value={form.homepage.philosophyTitle}
                    onChange={(event) => edit((draft) => void (draft.homepage.philosophyTitle = event.target.value))}
                    maxLength={160}
                  />
                </div>
                <StringListEditor
                  label="Philosophy paragraphs"
                  values={form.homepage.philosophyBody}
                  onChange={(values) => edit((draft) => void (draft.homepage.philosophyBody = values))}
                  placeholder="A short editorial paragraph"
                  max={6}
                />
                <StringListEditor
                  label="Ingredient notes"
                  values={form.homepage.ingredients}
                  onChange={(values) => edit((draft) => void (draft.homepage.ingredients = values))}
                  placeholder="e.g. Botanical oils"
                  hint="Generic descriptors only — do not imply certifications."
                  max={12}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <AdminTextInput
                    label="Why eyebrow"
                    value={form.homepage.whyEyebrow}
                    onChange={(event) => edit((draft) => void (draft.homepage.whyEyebrow = event.target.value))}
                    maxLength={80}
                  />
                  <AdminTextInput
                    label="Why title"
                    value={form.homepage.whyTitle}
                    onChange={(event) => edit((draft) => void (draft.homepage.whyTitle = event.target.value))}
                    maxLength={160}
                  />
                </div>
                <PairListEditor
                  label="Value props"
                  values={form.homepage.values}
                  onChange={(values) => edit((draft) => void (draft.homepage.values = values))}
                />
              </div>
            </section>

            <section className="admin-card">
              <h2 className="font-serif text-[22px] text-forest-dark">Ritual</h2>
              <div className="mt-4 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <AdminTextInput
                    label="Ritual eyebrow"
                    value={form.homepage.ritualEyebrow}
                    onChange={(event) => edit((draft) => void (draft.homepage.ritualEyebrow = event.target.value))}
                    maxLength={80}
                  />
                  <AdminTextInput
                    label="Ritual title"
                    value={form.homepage.ritualTitle}
                    onChange={(event) => edit((draft) => void (draft.homepage.ritualTitle = event.target.value))}
                    maxLength={160}
                  />
                </div>
                <UrlImageField
                  label="Ritual image"
                  url={form.homepage.ritualImage}
                  alt={form.homepage.ritualImageAlt}
                  onChangeUrl={(url) => edit((draft) => void (draft.homepage.ritualImage = url))}
                  onChangeAlt={(alt) => edit((draft) => void (draft.homepage.ritualImageAlt = alt))}
                  hint="Wide landscape crop (12:7)."
                />
                <PairListEditor
                  label="Ritual steps"
                  values={form.homepage.ritualSteps}
                  onChange={(values) => edit((draft) => void (draft.homepage.ritualSteps = values))}
                  max={4}
                />
              </div>
            </section>
          </>
        ) : null}

        {tab === 'about' ? (
          <section className="admin-card">
            <h2 className="font-serif text-[22px] text-forest-dark">About page</h2>
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <AdminTextInput
                  label="Eyebrow"
                  value={form.about.eyebrow}
                  onChange={(event) => edit((draft) => void (draft.about.eyebrow = event.target.value))}
                  maxLength={80}
                />
                <AdminTextInput
                  label="Title"
                  value={form.about.title}
                  onChange={(event) => edit((draft) => void (draft.about.title = event.target.value))}
                  maxLength={160}
                />
              </div>
              <AdminTextarea
                label="Introduction"
                value={form.about.intro}
                onChange={(event) => edit((draft) => void (draft.about.intro = event.target.value))}
                rows={4}
                maxLength={1200}
              />
              <UrlImageField
                label="About image"
                url={form.about.image}
                alt={form.about.imageAlt}
                onChangeUrl={(url) => edit((draft) => void (draft.about.image = url))}
                onChangeAlt={(alt) => edit((draft) => void (draft.about.imageAlt = alt))}
              />
              <PairListEditor
                label="Story sections"
                values={form.about.sections}
                onChange={(values) => edit((draft) => void (draft.about.sections = values))}
              />
            </div>
          </section>
        ) : null}

        {tab === 'contact' ? (
          <>
            <section className="admin-card">
              <h2 className="font-serif text-[22px] text-forest-dark">Contact details</h2>
              <p className="mt-1 text-[11.5px] text-muted">Only filled fields are shown on the storefront.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <AdminTextInput
                  label="Email"
                  type="email"
                  value={form.contact.email}
                  onChange={(event) => edit((draft) => void (draft.contact.email = event.target.value))}
                  maxLength={254}
                />
                <AdminTextInput
                  label="Phone"
                  value={form.contact.phone}
                  onChange={(event) => edit((draft) => void (draft.contact.phone = event.target.value))}
                  maxLength={40}
                />
                <AdminTextInput
                  label="Opening hours"
                  value={form.contact.hours}
                  onChange={(event) => edit((draft) => void (draft.contact.hours = event.target.value))}
                  maxLength={200}
                  className="sm:col-span-2"
                />
              </div>
              <div className="mt-4">
                <StringListEditor
                  label="Address lines"
                  values={form.contact.addressLines}
                  onChange={(values) => edit((draft) => void (draft.contact.addressLines = values))}
                  placeholder="Street, city, postcode"
                  max={4}
                />
              </div>
            </section>

            <section className="admin-card">
              <h2 className="font-serif text-[22px] text-forest-dark">WhatsApp ordering</h2>
              <div className="mt-4 space-y-4">
                <AdminTextInput
                  label="WhatsApp number"
                  value={form.whatsappNumber}
                  onChange={(event) =>
                    edit((draft) => void (draft.whatsappNumber = event.target.value.replace(/[^\d]/g, '')))
                  }
                  hint="International format, digits only, no + or spaces. Example placeholder: 15550100000. Replace before launch."
                  maxLength={15}
                  inputMode="numeric"
                />
                <div className="rounded-[3px] border border-gold/40 bg-gold/10 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6b5527]">Template placeholders</p>
                  <p className="mt-1.5 flex flex-wrap gap-1.5">
                    {PLACEHOLDERS.map((placeholder) => (
                      <code key={placeholder} className="rounded bg-white/70 px-1.5 py-0.5 text-[10.5px] text-[#6b5527]">
                        {placeholder}
                      </code>
                    ))}
                  </p>
                </div>
                <AdminTextarea
                  label="General enquiry template"
                  value={form.whatsappTemplates.general}
                  onChange={(event) =>
                    edit((draft) => void (draft.whatsappTemplates.general = event.target.value))
                  }
                  rows={2}
                  maxLength={1000}
                />
                <AdminTextarea
                  label="Product enquiry template"
                  value={form.whatsappTemplates.product}
                  onChange={(event) =>
                    edit((draft) => void (draft.whatsappTemplates.product = event.target.value))
                  }
                  rows={3}
                  maxLength={1000}
                />
                <AdminTextarea
                  label="Cart enquiry template"
                  value={form.whatsappTemplates.cart}
                  onChange={(event) => edit((draft) => void (draft.whatsappTemplates.cart = event.target.value))}
                  rows={6}
                  maxLength={2000}
                  hint="The cart template builds the item list and subtotal automatically."
                />
              </div>
            </section>

            <section className="admin-card">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-[22px] text-forest-dark">Social links</h2>
                  <p className="mt-1 text-[11.5px] text-muted">Only https:// links are accepted.</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    edit((draft) => void draft.socials.push({ platform: 'instagram', url: 'https://' }))
                  }
                  className="text-[10px] font-medium uppercase tracking-[0.1em] text-forest hover:text-gold-dark"
                >
                  + Add link
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {form.socials.map((social, index) => (
                  <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <AdminSelect
                      label="Platform"
                      value={social.platform}
                      onChange={(event) =>
                        edit((draft) => void (draft.socials[index]!.platform = event.target.value))
                      }
                      className="sm:w-40"
                    >
                      {['instagram', 'facebook', 'tiktok', 'pinterest', 'youtube', 'x'].map((platform) => (
                        <option key={platform} value={platform}>
                          {platform}
                        </option>
                      ))}
                    </AdminSelect>
                    <AdminField label="URL" className="flex-1">
                      <input
                        value={social.url}
                        onChange={(event) =>
                          edit((draft) => void (draft.socials[index]!.url = event.target.value))
                        }
                        className="admin-field"
                        placeholder="https://instagram.com/…"
                        aria-label={`Social URL ${index + 1}`}
                      />
                    </AdminField>
                    <button
                      type="button"
                      onClick={() => edit((draft) => void draft.socials.splice(index, 1))}
                      className="mb-1 p-2 text-forest/50 hover:text-red-800"
                      aria-label={`Remove social link ${index + 1}`}
                    >
                      <AdminIcon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {form.socials.length === 0 ? <p className="text-[11px] text-muted">No social links yet.</p> : null}
              </div>
            </section>
          </>
        ) : null}

        {tab === 'commerce' ? (
          <section className="admin-card">
            <h2 className="font-serif text-[22px] text-forest-dark">Commerce</h2>
            <p className="mt-1 text-[11.5px] text-muted">
              Prices are stored as integer minor units (paise) and displayed everywhere in Indian rupees (₹). No
              payment gateway is connected.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <AdminTextInput
                label="Currency"
                value="INR — Indian rupee (₹)"
                readOnly
                hint="Fixed for this storefront; amounts are stored in paise."
                onChange={() => undefined}
              />
              <AdminTextInput
                label="Low stock threshold"
                type="number"
                min="0"
                max="100"
                value={String(form.commerce.lowStockThreshold)}
                onChange={(event) =>
                  edit((draft) => void (draft.commerce.lowStockThreshold = Number.parseInt(event.target.value || '0', 10) || 0))
                }
                hint="Shows “Only N left” under this quantity."
              />
              <AdminTextarea
                label="Shipping / delivery note"
                value={form.commerce.shippingNote}
                onChange={(event) => edit((draft) => void (draft.commerce.shippingNote = event.target.value))}
                rows={3}
                maxLength={600}
                className="sm:col-span-2"
              />
              <AdminTextarea
                label="Price note"
                value={form.commerce.priceNote}
                onChange={(event) => edit((draft) => void (draft.commerce.priceNote = event.target.value))}
                rows={3}
                maxLength={600}
                className="sm:col-span-2"
              />
            </div>
          </section>
        ) : null}

        {tab === 'seo' ? (
          <>
            <section className="admin-card">
              <h2 className="font-serif text-[22px] text-forest-dark">Search &amp; social metadata</h2>
              <div className="mt-4 space-y-4">
                <AdminTextInput
                  label="Default SEO title"
                  value={form.seo.title}
                  onChange={(event) => edit((draft) => void (draft.seo.title = event.target.value))}
                  maxLength={70}
                  hint={`${form.seo.title.length}/70 characters.`}
                />
                <AdminTextarea
                  label="Default SEO description"
                  value={form.seo.description}
                  onChange={(event) => edit((draft) => void (draft.seo.description = event.target.value))}
                  rows={3}
                  maxLength={320}
                  hint={`${form.seo.description.length}/320 characters.`}
                />
                <AdminTextInput
                  label="Canonical domain"
                  value={form.seo.canonicalUrl}
                  onChange={(event) => edit((draft) => void (draft.seo.canonicalUrl = event.target.value))}
                  placeholder="https://www.herbandhue.com"
                  hint="Full https:// origin used for canonical and Open Graph URLs. Leave blank to use the current origin."
                  maxLength={300}
                />
                <UrlImageField
                  label="Open Graph image"
                  url={form.seo.ogImage}
                  onChangeUrl={(url) => edit((draft) => void (draft.seo.ogImage = url))}
                  hint="1200×630 recommended."
                />
              </div>
            </section>

            <section className="admin-card">
              <h2 className="font-serif text-[22px] text-forest-dark">Storefront features</h2>
              <div className="mt-4 space-y-3">
                <label className="flex items-start gap-3 text-[12.5px]">
                  <input
                    type="checkbox"
                    checked={form.features.reviewsEnabled}
                    onChange={(event) => edit((draft) => void (draft.features.reviewsEnabled = event.target.checked))}
                    className="mt-0.5 h-4 w-4 accent-forest"
                  />
                  <span>
                    <span className="font-medium text-forest">Customer reviews</span>
                    <span className="mt-0.5 block text-[11px] text-muted">
                      Show approved reviews and accept new submissions.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3 text-[12.5px]">
                  <input
                    type="checkbox"
                    checked={form.features.galleryEnabled}
                    onChange={(event) => edit((draft) => void (draft.features.galleryEnabled = event.target.checked))}
                    className="mt-0.5 h-4 w-4 accent-forest"
                  />
                  <span>
                    <span className="font-medium text-forest">Journal / gallery</span>
                    <span className="mt-0.5 block text-[11px] text-muted">
                      Show the gallery sections on the homepage and journal page.
                    </span>
                  </span>
                </label>
              </div>
            </section>
          </>
        ) : null}
      </div>

      <div className="sticky bottom-0 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-forest/15 bg-[#f5f2e9]/95 py-4 backdrop-blur">
        <p className="text-[11px] text-muted">
          {dirty ? 'You have unsaved changes.' : 'All changes saved.'}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!dirty || saving}
            onClick={() => {
              if (adminSettings.data?.data) {
                const reset = structuredClone(adminSettings.data.data);
                setForm(reset);
                initial.current = JSON.stringify(reset);
                setError('');
              }
            }}
          >
            Discard changes
          </Button>
          <Button type="submit" size="sm" loading={saving}>
            Save settings
          </Button>
        </div>
      </div>
    </form>
  );
}
