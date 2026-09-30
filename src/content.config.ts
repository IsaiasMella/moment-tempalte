import { albumCollections } from './lib/albums/schema';
import { pageCollections } from './lib/pages/schema';

/** Editable content managed from Sveltia CMS (/admin). */
export const collections = { ...albumCollections, ...pageCollections };
