import * as albums from './albums';
import * as pages from './pages';

export function isGeneratedRoute(route: string): boolean {
  return albums.isGeneratedRoute(route) || pages.isGeneratedRoute(route);
}

export async function applyTransforms(route: string, html: string): Promise<string> {
  return pages.transform(route, await albums.transform(route, html));
}
