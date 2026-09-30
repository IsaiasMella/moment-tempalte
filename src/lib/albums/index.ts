/** Routes rendered by dedicated pages instead of the reference catch-all. */
export function isGeneratedRoute(_route: string): boolean {
  return false;
}

/** Rewrites a reference page's HTML with editable content. */
export async function transform(_route: string, html: string): Promise<string> {
  return html;
}
