import mongoose, { Schema, model, type HydratedDocument, type Model } from 'mongoose';

export interface SocialLink {
  platform: string;
  url: string;
}

export interface ValueProp {
  title: string;
  body: string;
}

export interface RitualStep {
  title: string;
  body: string;
}

export interface AboutSection {
  title: string;
  body: string;
}

export interface SiteSettingsData {
  key: string;
  businessName: string;
  tagline: string;
  shortDescription: string;
  logoUrl: string;
  whatsappNumber: string;
  whatsappTemplates: {
    general: string;
    product: string;
    cart: string;
  };
  contact: {
    email: string;
    phone: string;
    addressLines: string[];
    hours: string;
  };
  socials: SocialLink[];
  announcement: {
    enabled: boolean;
    text: string;
    linkLabel: string;
    linkUrl: string;
  };
  homepage: {
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
    values: ValueProp[];
    bestsellersEyebrow: string;
    bestsellersTitle: string;
    ritualEyebrow: string;
    ritualTitle: string;
    ritualImage: string;
    ritualImageAlt: string;
    ritualSteps: RitualStep[];
    reviewsEyebrow: string;
    reviewsTitle: string;
    galleryEyebrow: string;
    galleryTitle: string;
    whatsappEyebrow: string;
    whatsappTitle: string;
    whatsappBody: string;
  };
  about: {
    eyebrow: string;
    title: string;
    intro: string;
    image: string;
    imageAlt: string;
    sections: AboutSection[];
  };
  seo: {
    title: string;
    description: string;
    canonicalUrl: string;
    ogImage: string;
  };
  commerce: {
    currency: string;
    shippingNote: string;
    priceNote: string;
    lowStockThreshold: number;
  };
  footer: {
    blurb: string;
    note: string;
  };
  features: {
    reviewsEnabled: boolean;
    galleryEnabled: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export type SiteSettingsDocument = HydratedDocument<SiteSettingsData>;

const socialSchema = new Schema<SocialLink>(
  {
    platform: {
      type: String,
      required: true,
      enum: ['instagram', 'facebook', 'tiktok', 'pinterest', 'youtube', 'x'],
    },
    url: { type: String, required: true, maxlength: 500 },
  },
  { _id: false },
);

const valueSchema = new Schema<ValueProp>(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    body: { type: String, required: true, trim: true, maxlength: 400 },
  },
  { _id: false },
);

const ritualStepSchema = new Schema<RitualStep>(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    body: { type: String, required: true, trim: true, maxlength: 400 },
  },
  { _id: false },
);

const aboutSectionSchema = new Schema<AboutSection>(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    body: { type: String, required: true, trim: true, maxlength: 1200 },
  },
  { _id: false },
);

const settingsSchema = new Schema<SiteSettingsData>(
  {
    key: { type: String, default: 'site', unique: true, immutable: true },
    businessName: { type: String, required: true, trim: true, maxlength: 80, default: 'Herb & Hue' },
    tagline: { type: String, default: '', trim: true, maxlength: 160 },
    shortDescription: { type: String, default: '', trim: true, maxlength: 600 },
    logoUrl: { type: String, default: '/brand/herb-and-hue-logo.png', maxlength: 2048 },
    whatsappNumber: {
      type: String,
      default: '',
      trim: true,
      validate: {
        validator: (value: string) => value === '' || /^[1-9]\d{7,14}$/.test(value),
        message: 'WhatsApp number must be 8–15 digits in international format without + or spaces',
      },
    },
    whatsappTemplates: {
      general: { type: String, default: '', maxlength: 1000 },
      product: { type: String, default: '', maxlength: 1000 },
      cart: { type: String, default: '', maxlength: 2000 },
    },
    contact: {
      email: { type: String, default: '', trim: true, maxlength: 254 },
      phone: { type: String, default: '', trim: true, maxlength: 40 },
      addressLines: { type: [String], default: [] },
      hours: { type: String, default: '', maxlength: 200 },
    },
    socials: { type: [socialSchema], default: [] },
    announcement: {
      enabled: { type: Boolean, default: false },
      text: { type: String, default: '', maxlength: 200 },
      linkLabel: { type: String, default: '', maxlength: 60 },
      linkUrl: { type: String, default: '', maxlength: 500 },
    },
    homepage: {
      heroEyebrow: { type: String, default: '', maxlength: 80 },
      heroTitle: { type: String, default: '', maxlength: 120 },
      heroTitleAccent: { type: String, default: '', maxlength: 120 },
      heroBody: { type: String, default: '', maxlength: 600 },
      heroCtaLabel: { type: String, default: 'Shop the collection', maxlength: 60 },
      heroCtaUrl: { type: String, default: '/shop', maxlength: 500 },
      heroImage: { type: String, default: '', maxlength: 2048 },
      heroImageAlt: { type: String, default: '', maxlength: 200 },
      heroNote: { type: String, default: '', maxlength: 160 },
      categoriesEyebrow: { type: String, default: '', maxlength: 80 },
      categoriesTitle: { type: String, default: '', maxlength: 120 },
      featuredEyebrow: { type: String, default: '', maxlength: 80 },
      featuredTitle: { type: String, default: '', maxlength: 120 },
      philosophyEyebrow: { type: String, default: '', maxlength: 80 },
      philosophyTitle: { type: String, default: '', maxlength: 160 },
      philosophyBody: { type: [String], default: [] },
      ingredients: { type: [String], default: [] },
      philosophyImage: { type: String, default: '', maxlength: 2048 },
      philosophyImageAlt: { type: String, default: '', maxlength: 200 },
      whyEyebrow: { type: String, default: '', maxlength: 80 },
      whyTitle: { type: String, default: '', maxlength: 160 },
      values: { type: [valueSchema], default: [] },
      bestsellersEyebrow: { type: String, default: '', maxlength: 80 },
      bestsellersTitle: { type: String, default: '', maxlength: 120 },
      ritualEyebrow: { type: String, default: '', maxlength: 80 },
      ritualTitle: { type: String, default: '', maxlength: 160 },
      ritualImage: { type: String, default: '', maxlength: 2048 },
      ritualImageAlt: { type: String, default: '', maxlength: 200 },
      ritualSteps: { type: [ritualStepSchema], default: [] },
      reviewsEyebrow: { type: String, default: '', maxlength: 80 },
      reviewsTitle: { type: String, default: '', maxlength: 120 },
      galleryEyebrow: { type: String, default: '', maxlength: 80 },
      galleryTitle: { type: String, default: '', maxlength: 120 },
      whatsappEyebrow: { type: String, default: '', maxlength: 80 },
      whatsappTitle: { type: String, default: '', maxlength: 160 },
      whatsappBody: { type: String, default: '', maxlength: 600 },
    },
    about: {
      eyebrow: { type: String, default: '', maxlength: 80 },
      title: { type: String, default: '', maxlength: 160 },
      intro: { type: String, default: '', maxlength: 1200 },
      image: { type: String, default: '', maxlength: 2048 },
      imageAlt: { type: String, default: '', maxlength: 200 },
      sections: { type: [aboutSectionSchema], default: [] },
    },
    seo: {
      title: { type: String, default: '', maxlength: 70 },
      description: { type: String, default: '', maxlength: 320 },
      canonicalUrl: { type: String, default: '', maxlength: 300 },
      ogImage: { type: String, default: '', maxlength: 2048 },
    },
    commerce: {      currency: {        type: String,        default: 'INR',        enum: ['USD', 'EUR', 'GBP', 'PKR', 'AED', 'INR', 'CAD', 'AUD', 'SAR'],      },
      shippingNote: { type: String, default: '', maxlength: 600 },
      priceNote: { type: String, default: '', maxlength: 600 },
      lowStockThreshold: { type: Number, default: 3, min: 0, max: 100 },
    },
    footer: {
      blurb: { type: String, default: '', maxlength: 500 },
      note: { type: String, default: '', maxlength: 300 },
    },
    features: {
      reviewsEnabled: { type: Boolean, default: true },
      galleryEnabled: { type: Boolean, default: true },
    },
  },
  { timestamps: true, versionKey: false, minimize: false },
);

// Idempotent registration: test workers may re-evaluate this module.
export const SiteSettings =
  (mongoose.models.SiteSettings as Model<SiteSettingsData> | undefined) ?? model<SiteSettingsData>("SiteSettings", settingsSchema);
