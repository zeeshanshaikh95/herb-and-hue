/**
 * Brand copy used when the settings document is first created and by the seed
 * script. Editorial sample copy; the owner can replace every string in Admin →
 * Settings without touching code. No certifications, efficacy or review claims
 * are included.
 */
export const DEFAULT_SETTINGS = {
    businessName: 'Herb & Hue',
    tagline: 'Natural skincare, quietly considered.',
    shortDescription: 'Botanical skincare for everyday rituals — gentle textures, considered ingredients and an unhurried approach to care.',
    logoUrl: '/brand/herb-and-hue-logo.png',
    whatsappNumber: '15550100000',
    whatsappTemplates: {
        general: 'Hello Herb & Hue, I would like to ask about your botanical skincare collection.',
        product: 'Hello Herb & Hue, I am interested in {product} — {variant}. Is it currently available?\n{url}',
        cart: 'Hello Herb & Hue, I would like to enquire about the following order:\n\n{items}\n\nSubtotal (reference): {subtotal}\n\nName: {name}\nNotes: {notes}',
    },
    contact: {
        email: 'hello@herb-and-hue.example',
        phone: '',
        addressLines: [],
        hours: '',
    },
    socials: [],
    announcement: {
        enabled: true,
        text: 'Personal guidance on WhatsApp — we will help you build a ritual that suits your skin.',
        linkLabel: 'Ask us',
        linkUrl: '/contact',
    },
    homepage: {
        heroEyebrow: 'Botanical skincare',
        heroTitle: 'Rituals for skin,',
        heroTitleAccent: 'rooted in nature.',
        heroBody: 'A considered collection of botanical skincare: gentle textures, plant-led ingredients and quiet moments of care, made to settle into your everyday ritual.',
        heroCtaLabel: 'Shop the collection',
        heroCtaUrl: '/shop',
        heroImage: '/images/editorial/hero-botanical.svg',
        heroImageAlt: 'Amber glass serum bottle framed by botanical leaves within a deep green arch',
        heroNote: 'Plant-led care · Thoughtfully edited',
        categoriesEyebrow: 'The collection',
        categoriesTitle: 'Care, by ritual',
        featuredEyebrow: 'Selected for you',
        featuredTitle: 'The featured edit',
        philosophyEyebrow: 'Our philosophy',
        philosophyTitle: 'Where botany meets quiet luxury.',
        philosophyBody: [
            'Herb & Hue began with a simple idea: skincare should feel like a pause, not a process. Each formula is chosen for its texture, its scent and the way it settles into a daily ritual.',
            'We look to botanicals for softness and comfort, pair them with considered packaging, and keep our edit small enough that every piece earns its place on your shelf.',
        ],
        ingredients: ['Botanical oils', 'Plant extracts', 'Floral waters', 'Mineral clays'],
        philosophyImage: '/images/editorial/philosophy.svg',
        philosophyImageAlt: 'Botanical leaves and a cream card reading Pure Botanical Care',
        whyEyebrow: 'Why Herb & Hue',
        whyTitle: 'Considered, from formula to finish',
        values: [
            {
                title: 'Plant-led thinking',
                body: 'Formulas built around botanical ingredients and gentle, considered textures.',
            },
            {
                title: 'An edited collection',
                body: 'A tight edit of essentials, designed to earn a place in your everyday routine.',
            },
            {
                title: 'Details in the open',
                body: 'Ingredients, directions and cautions live on every product page — no fine print.',
            },
            {
                title: 'Care, not promises',
                body: 'We describe what a product is and how to use it, and leave miracles out of it.',
            },
        ],
        bestsellersEyebrow: 'Loved most',
        bestsellersTitle: 'The bestsellers',
        ritualEyebrow: 'The ritual',
        ritualTitle: 'Three unhurried steps',
        ritualImage: '/images/editorial/ritual.svg',
        ritualImageAlt: 'Cleanser and moisturiser bottles on a deep green botanical backdrop',
        ritualSteps: [
            {
                title: 'Cleanse',
                body: 'Begin with lukewarm water and a gentle cleanser, massaged in slow circles.',
            },
            {
                title: 'Nourish',
                body: 'Press a few drops of serum into damp skin, then seal with a soft moisturiser.',
            },
            {
                title: 'Protect',
                body: 'Finish with daily sun protection. A quiet ritual, repeated, is the whole point.',
            },
        ],
        reviewsEyebrow: 'In their words',
        reviewsTitle: 'Notes from our customers',
        galleryEyebrow: 'The journal',
        galleryTitle: 'Botanical hours',
        whatsappEyebrow: 'Here to help',
        whatsappTitle: 'A question before you commit?',
        whatsappBody: 'Send a note on WhatsApp and we will help you choose, confirm availability and arrange your order directly. No payment is taken on this website.',
    },
    about: {
        eyebrow: 'Our story',
        title: 'Skincare with a slower point of view.',
        intro: 'Herb & Hue is a botanical skincare studio built around a simple belief: the best rituals are the ones you return to. We keep our collection small, our textures gentle and our language honest.',
        image: '/images/editorial/philosophy.svg',
        imageAlt: 'Botanical leaves arranged with a cream card reading Pure Botanical Care',
        sections: [
            {
                title: 'Our approach',
                body: 'We work with plant-derived ingredients and quiet, tactile formulas. Everything in the collection is chosen for how it feels, how it layers and how easily it fits into a morning or evening routine.',
            },
            {
                title: 'On transparency',
                body: 'Each listing carries its ingredient list, directions for use and care notes. If a detail is missing, ask us — we would rather answer a question than overstate a claim.',
            },
            {
                title: 'What we do not do',
                body: 'We do not publish invented reviews, promise clinical results or label a product as a cure. Skincare is care, and we treat it that way.',
            },
        ],
    },
    seo: {
        title: 'Herb & Hue — Botanical Skincare',
        description: 'Herb & Hue is a premium botanical skincare collection: gentle cleansers, serums and moisturisers for considered everyday rituals.',
        canonicalUrl: '',
        ogImage: '/images/og-herb-and-hue.svg',
    },
    commerce: {
        // The storefront trades in Indian rupees; amounts are stored as integer paise.
        currency: 'INR',
        shippingNote: 'Delivery details and any charges are confirmed with you on WhatsApp before your order is placed.',
        priceNote: 'Prices shown in the local currency (INR). Your final order total is confirmed by our team.',
        lowStockThreshold: 3,
    },
    footer: {
        blurb: 'Botanical skincare for unhurried rituals. A small, considered collection made to be used and loved.',
        note: 'Orders and delivery are confirmed directly with our team on WhatsApp.',
    },
    features: {
        reviewsEnabled: true,
        galleryEnabled: true,
    },
};
export const WHATSAPP_PLACEHOLDERS = [
    '{{business}}',
    '{{product}}',
    '{{variant}}',
    '{{url}}',
    '{{items}}',
    '{{subtotal}}',
    '{{name}}',
    '{{notes}}',
];
//# sourceMappingURL=brandDefaults.js.map