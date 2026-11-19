export interface ApiImage {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
}

export interface AdminImage extends ApiImage {
  publicId: string | null;
}

export interface ProductVariant {
  id: string | null;
  label: string;
  price: number;
  compareAtPrice: number | null;
  stockQuantity: number;
  sku: string | null;
}

export interface CategoryRef {
  id: string;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  category: CategoryRef | null;
  images: ApiImage[];
  variants: ProductVariant[];
  inStock: boolean;
  stockQuantity: number;
  ingredients: string;
  benefits: string[];
  directions: string;
  warnings: string;
  featured: boolean;
  bestseller: boolean;
  displayOrder: number;
  seoTitle: string;
  seoDescription: string;
  sampleData: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProduct extends Product {
  categoryId: string;
  sku: string | null;
  images: AdminImage[];
  archivedAt: string | null;
  adminNotes: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: ApiImage | null;
  displayOrder: number;
  isActive: boolean;
  productCount: number;
}

export interface AdminCategory extends Category {
  image: AdminImage | null;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  authorName: string;
  rating: number;
  title: string;
  body: string;
  product: { name: string; slug: string } | null;
  createdAt: string;
}

export interface AdminReview extends Omit<Review, 'product'> {
  email: string;
  product: { name: string; slug: string } | null;
  status: 'pending' | 'approved' | 'rejected';
  adminNote: string;
  updatedAt: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  caption: string;
  image: ApiImage;
  linkUrl: string;
  displayOrder: number;
  sampleData: boolean;
}

export interface AdminGalleryItem extends GalleryItem {
  image: AdminImage;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface ReviewSummary {
  total: number;
  average: number;
  distribution: Record<string, number>;
}

export interface ReviewPage extends Paginated<Review> {
  summary: ReviewSummary;
}

export interface ContactDetails {
  email: string;
  phone: string;
  addressLines: string[];
  hours: string;
}

export interface SocialLink {
  platform: 'instagram' | 'facebook' | 'tiktok' | 'pinterest' | 'youtube' | 'x' | string;
  url: string;
}

export interface HomepageSettings {
  heroEyebrow: string;
  heroTitle: string;
  heroTitleAccent: string;
  heroBody: string;
  heroCtaLabel: string;
  heroCtaUrl: string;
  heroImage: string;
  heroImageAlt: string;
  heroNote: string;
  categoriesEyebrow: string;
  categoriesTitle: string;
  featuredEyebrow: string;
  featuredTitle: string;
  philosophyEyebrow: string;
  philosophyTitle: string;
  philosophyBody: string[];
  ingredients: string[];
  philosophyImage: string;
  philosophyImageAlt: string;
  whyEyebrow: string;
  whyTitle: string;
  values: { title: string; body: string }[];
  bestsellersEyebrow: string;
  bestsellersTitle: string;
  ritualEyebrow: string;
  ritualTitle: string;
  ritualImage: string;
  ritualImageAlt: string;
  ritualSteps: { title: string; body: string }[];
  reviewsEyebrow: string;
  reviewsTitle: string;
  galleryEyebrow: string;
  galleryTitle: string;
  whatsappEyebrow: string;
  whatsappTitle: string;
  whatsappBody: string;
}

export interface PublicSettings {
  businessName: string;
  tagline: string;
  shortDescription: string;
  logoUrl: string;
  whatsappNumber: string;
  whatsappTemplates: { general: string; product: string; cart: string };
  contact: ContactDetails;
  socials: SocialLink[];
  announcement: { enabled: boolean; text: string; linkLabel: string; linkUrl: string };
  homepage: HomepageSettings;
  about: {
    eyebrow: string;
    title: string;
    intro: string;
    image: string;
    imageAlt: string;
    sections: { title: string; body: string }[];
  };
  seo: { title: string; description: string; canonicalUrl: string; ogImage: string };
  // Prices are stored in minor units (integer paise). The currency is
  // presentation-only — rendering uses Intl.NumberFormat with the site's
  // chosen currency, so switching to INR does not touch stored values.
  commerce: {
    currency: string;
    shippingNote: string;
    priceNote: string;
    lowStockThreshold: number;
  };
  footer: { blurb: string; note: string };
  features: { reviewsEnabled: boolean; galleryEnabled: boolean };
  updatedAt: string;
}

export interface CartValidationLine {
  productId: string;
  variantId: string | null;
  name: string;
  slug: string;
  image: ApiImage | null;
  variantLabel: string | null;
  quantity: number;
  availableQuantity: number;
  unitPrice: number;
  lineTotal: number;
  priceChanged: boolean;
  inStock: boolean;
  issue:
    | 'none'
    | 'unavailable'
    | 'variant_required'
    | 'variant_missing'
    | 'out_of_stock'
    | 'insufficient_stock'
    | 'price_changed';
}

export interface CartValidation {
  lines: CartValidationLine[];
  subtotal: number;
  hasIssues: boolean;
  checkedAt: string;
  note: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
}

export interface LoginResponse {
  data: {
    token: string;
    expiresIn: string;
    admin: AdminUser;
    mustChangePassword: boolean;
  };
}

export interface AnalyticsSummary {
  days: number;
  since: string;
  totals: { pageViews: number; productViews: number; whatsappClicks: number; addToCart: number };
  topProducts: { slug: string; views: number }[];
  series: { date: string; count: number }[];
}

export interface UploadedImage {
  url: string;
  publicId: string;
  alt: string;
  width: number | null;
  height: number | null;
  provider: 'cloudinary' | 'local';
  bytes: number;
}
