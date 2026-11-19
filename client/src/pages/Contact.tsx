import { useState, type FormEvent } from 'react';
import { useSettings } from '../context/SettingsContext';
import { Seo } from '../components/Seo';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { InlineNotice } from '../components/ui/feedback';
import { WhatsAppIcon } from '../components/ui/WhatsAppLink';
import { buildGeneralEnquiry, buildWhatsAppUrl } from '../lib/whatsapp';
import { trackEvent } from '../lib/analytics';
import { useToast } from '../context/ToastContext';
import { Link } from 'react-router-dom';

export function Contact() {
  const { settings } = useSettings();
  const toast = useToast();
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError('Please add your name so we know who we are speaking with.');
      return;
    }
    if (message.trim().length < 5) {
      setError('Please add a short message so we can help properly.');
      return;
    }
    setError('');
    const body = `${buildGeneralEnquiry(settings)}\n\nName: ${name.trim()}\n\n${message.trim()}`;
    const url = buildWhatsAppUrl(settings.whatsappNumber, body);
    if (!url) {
      toast.error(
        'WhatsApp is not configured',
        settings.contact.email
          ? `Please email ${settings.contact.email} instead.`
          : 'Please use the email address in the footer.',
      );
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    trackEvent('whatsapp_click', { path: '/contact' });
  };

  const directWhatsApp = buildWhatsAppUrl(settings.whatsappNumber, buildGeneralEnquiry(settings));

  return (
    <>
      <Seo
        title="Contact"
        description="Speak with the Herb & Hue studio about products, ingredients, availability and orders."
        path="/contact"
      />
      <PageHeader
        eyebrow="Here to help"
        title="Speak with the studio"
        description="Questions about a formula, a delivery or the right piece for your routine — we would rather answer than have you guess."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Contact' }]}
      />

      <div className="container-editorial py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <div className="border border-forest/15 bg-white/50 p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-forest text-ivory">
                  <WhatsAppIcon className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-serif text-[26px] leading-none text-forest-dark">WhatsApp</h2>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-gold-dark">Fastest reply</p>
                </div>
              </div>
              <p className="mt-5 text-[13px] leading-[1.85] text-charcoal/75">
                Send a note with what you are looking for. We will help you choose, confirm availability and arrange
                delivery. Orders are completed in the chat; nothing is charged on this website.
              </p>

              {directWhatsApp ? (
                <a
                  href={directWhatsApp}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent('whatsapp_click', { path: '/contact' })}
                  className="btn btn-primary mt-5 w-full"
                >
                  <WhatsAppIcon className="h-4 w-4" /> Open WhatsApp
                </a>
              ) : (
                <InlineNotice tone="warning" className="mt-5">
                  WhatsApp is not configured for this store yet. Please use the email address below.
                </InlineNotice>
              )}
            </div>

            <div className="mt-8">
              <h2 className="font-serif text-[26px] text-forest-dark">Or write to us</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                This form opens WhatsApp with your message ready to send — it is not stored on this website.
              </p>
              <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
                <div>
                  <label htmlFor="contact-name" className="field-label">
                    Your name <span className="text-gold-dark">*</span>
                  </label>
                  <input
                    id="contact-name"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      setError('');
                    }}
                    className="field"
                    autoComplete="name"
                    maxLength={80}
                  />
                </div>
                <div>
                  <label htmlFor="contact-message" className="field-label">
                    Message <span className="text-gold-dark">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    value={message}
                    onChange={(event) => {
                      setMessage(event.target.value);
                      setError('');
                    }}
                    rows={5}
                    maxLength={800}
                    className="field resize-y"
                    placeholder="What would you like to know? Include a product name if relevant."
                  />
                </div>
                {error ? (
                  <p role="alert" className="field-error-text">
                    {error}
                  </p>
                ) : null}
                <Button type="submit">Compose on WhatsApp</Button>
              </form>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="border border-forest/15 p-6">
              <p className="eyebrow">The studio</p>
              <dl className="mt-5 space-y-4 text-[13px] leading-relaxed">
                {settings.contact.email ? (
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Email</dt>
                    <dd className="mt-1">
                      <a href={`mailto:${settings.contact.email}`} className="text-forest hover:text-gold-dark">
                        {settings.contact.email}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {settings.contact.phone ? (
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Phone</dt>
                    <dd className="mt-1">
                      <a
                        href={`tel:${settings.contact.phone.replace(/[^\d+]/g, '')}`}
                        className="text-forest hover:text-gold-dark"
                      >
                        {settings.contact.phone}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {settings.contact.addressLines.length > 0 ? (
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Address</dt>
                    <dd className="mt-1 text-charcoal/75">
                      {settings.contact.addressLines.map((line) => (
                        <span key={line} className="block">
                          {line}
                        </span>
                      ))}
                    </dd>
                  </div>
                ) : null}
                {settings.contact.hours ? (
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Hours</dt>
                    <dd className="mt-1 text-charcoal/75">{settings.contact.hours}</dd>
                  </div>
                ) : null}
                {!settings.contact.email && !settings.contact.phone && settings.contact.addressLines.length === 0 ? (
                  <p className="text-muted">
                    Studio contact details are being finalised. WhatsApp is the quickest way to reach us.
                  </p>
                ) : null}
              </dl>
            </div>

            {settings.socials.length > 0 ? (
              <div className="border border-forest/15 p-6">
                <p className="eyebrow">Follow</p>
                <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                  {settings.socials.map((social) => (
                    <li key={`${social.platform}-${social.url}`}>
                      <a
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] uppercase tracking-[0.14em] text-forest hover:text-gold-dark"
                      >
                        {social.platform}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="border border-gold/40 bg-gold/10 p-6">
              <p className="eyebrow">Orders</p>
              <p className="mt-4 text-[13px] leading-[1.85] text-charcoal/75">
                {settings.commerce.shippingNote}
              </p>
              <p className="mt-3 text-[12px] leading-relaxed text-charcoal/60">
                Already chosen?{' '}
                <Link to="/cart" className="underline decoration-gold/60 underline-offset-4 hover:text-forest">
                  Review your bag
                </Link>{' '}
                and send it through.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
