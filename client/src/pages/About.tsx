import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { Seo } from '../components/Seo';
import { PageHeader } from '../components/layout/PageHeader';
import { ButtonLink } from '../components/ui/Button';
import { SectionHeading } from '../components/ui/Bits';
import { WhatsAppLink, WhatsAppIcon } from '../components/ui/WhatsAppLink';
import { buildGeneralEnquiry } from '../lib/whatsapp';
import { imageUrl, IMAGE_WIDTHS } from '../lib/images';
import { resolveImageUrl } from '../lib/images';

export function About() {
  const { settings } = useSettings();
  const { about, homepage } = settings;

  return (
    <>
      <Seo
        title="Our story"
        description={about.intro || settings.shortDescription}
        path="/about"
        image={about.image}
      />
      <PageHeader
        eyebrow={about.eyebrow}
        title={about.title}
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Our story' }]}
      />

      <section className="section bg-ivory">
        <div className="container-editorial grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <div className="relative">
            <div className="absolute -inset-3 border border-gold/30 sm:-inset-4" aria-hidden="true" />
            <img
              src={imageUrl(about.image, IMAGE_WIDTHS.hero)}
              alt={about.imageAlt || 'Botanical skincare still life'}
              loading="lazy"
              decoding="async"
              className="relative aspect-[4/5] w-full object-cover"
            />
            <img
              src={resolveImageUrl('/brand/leaf-mark.png')}
              alt=""
              aria-hidden="true"
              className="absolute -bottom-8 -right-6 hidden w-28 opacity-80 sm:block"
            />
          </div>
          <div>
            <p className="eyebrow">In short</p>
            <p className="mt-6 font-serif text-[clamp(1.6rem,2.6vw,2.2rem)] leading-[1.35] text-forest-dark">
              {about.intro}
            </p>
            <div className="mt-8 border-t border-gold/30 pt-6">
              <p className="text-[11px] uppercase tracking-[0.16em] text-gold-dark">The house edit</p>
              <p className="mt-3 text-[13px] leading-[1.85] text-muted">{settings.shortDescription}</p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/shop">Explore the collection</ButtonLink>
              <WhatsAppLink message={buildGeneralEnquiry(settings)}>
                <WhatsAppIcon className="h-4 w-4" /> Ask a question
              </WhatsAppLink>
            </div>
          </div>
        </div>
      </section>

      <section className="section border-y border-gold/20 bg-ivory-dark/60">
        <div className="container-editorial">
          <SectionHeading eyebrow="What guides us" title="A slower, more transparent way to care" className="mb-12" />
          <div className="grid gap-x-12 gap-y-10 lg:grid-cols-3">
            {about.sections.map((section, index) => (
              <article key={section.title} className="border-t border-forest/20 pt-6">
                <p className="font-sans text-[10px] tracking-[0.2em] text-gold-dark">0{index + 1}</p>
                <h2 className="mt-3 font-serif text-[26px] leading-tight text-forest-dark">{section.title}</h2>
                <p className="mt-3 text-[13.5px] leading-[1.9] text-charcoal/75">{section.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-forest text-ivory">
        <div className="container-editorial">
          <SectionHeading
            eyebrow={homepage.whyEyebrow}
            title={homepage.whyTitle}
            light
            align="center"
            className="mb-12"
          />
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {homepage.values.map((value, index) => (
              <div key={value.title} className="border-t border-gold/30 pt-5">
                <p className="text-[10px] tracking-[0.2em] text-gold/70">0{index + 1}</p>
                <h3 className="mt-3 font-serif text-[23px] leading-tight text-ivory">{value.title}</h3>
                <p className="mt-2 text-[13px] leading-[1.8] text-ivory/65">{value.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-14 flex flex-col items-start justify-between gap-5 border-t border-gold/25 pt-8 sm:flex-row sm:items-center">
            <p className="max-w-xl font-serif text-[24px] leading-snug text-ivory/90">
              Curious about a formula, an ingredient or the right piece for your routine?
            </p>
            <div className="flex flex-wrap gap-3">
              <WhatsAppLink message={buildGeneralEnquiry(settings)} variant="gold">
                <WhatsAppIcon className="h-4 w-4" /> Start a conversation
              </WhatsAppLink>
              <Link to="/contact" className="btn btn-light">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
