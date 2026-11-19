import { Link } from 'react-router-dom';
import { Seo } from '../components/Seo';
import { ButtonLink } from '../components/ui/Button';
import { Wordmark } from '../components/brand/Logo';

export function NotFound() {
  return (
    <>
      <Seo title="Page not found" description="This page could not be found." path="/404" noIndex />
      <section className="relative flex min-h-[70vh] items-center overflow-hidden bg-forest text-ivory">
        <img
          src={`${import.meta.env.BASE_URL}brand/leaf-mark.png`}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-10 w-[420px] opacity-[0.08]"
        />
        <div className="container-editorial relative py-20">
          <div className="max-w-xl">
            <Wordmark height={34} />
            <p className="mt-10 font-sans text-[10px] uppercase tracking-[0.28em] text-gold">404</p>
            <h1 className="mt-4 text-[clamp(2.6rem,6vw,4.4rem)] leading-[0.98] text-ivory">
              This page has wandered off the path.
            </h1>
            <p className="mt-5 max-w-md text-[14px] leading-[1.9] text-ivory/70">
              The link may be old, or the page may have moved. The collection and the studio are both still here.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/" variant="gold">
                Return home
              </ButtonLink>
              <ButtonLink to="/shop" variant="light">
                Shop the collection
              </ButtonLink>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 border-t border-gold/25 pt-6 text-[10px] uppercase tracking-[0.16em] text-ivory/50">
              <Link to="/about" className="hover:text-gold">Our story</Link>
              <Link to="/reviews" className="hover:text-gold">Reviews</Link>
              <Link to="/contact" className="hover:text-gold">Contact</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
