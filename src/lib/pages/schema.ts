/** Legacy entry point for the old string-transform pipeline; the schemas now live in src/lib/schemas.ts. */
export {
  socialPlatforms, siteSettingsSchema, homePageSchema, studioPageSchema,
  pricingPageSchema, contactPageSchema, privacyPageSchema,
} from '../schemas';
export type { SiteSettings, HomePage, StudioPage, PricingPage, ContactPage, PrivacyPage } from '../schemas';
