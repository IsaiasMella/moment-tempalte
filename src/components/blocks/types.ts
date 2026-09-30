/** A responsive photograph as used by Figure.astro and Gallery.astro. */
export interface Photo {
  /** Default image URL. */
  src: string;
  /** Width candidates for the page, e.g. "a.webp 600w, b.webp 900w". */
  srcset?: string;
  /** Larger candidates for the lightbox (defaults to `srcset`). */
  lightboxSrcset?: string;
  alt: string;
  width: number;
  height: number;
}
