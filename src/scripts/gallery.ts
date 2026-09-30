/**
 * Justified rows for album galleries (`[data-gallery]`, Gallery.astro).
 *
 * Photographs are grouped into rows that fill the container width exactly
 * without cropping. A "slot" in a row is either one photo or a vertical stack
 * of two. The best grouping is found with a small dynamic-programming search
 * that scores each row by how far its height is from the ideal (plus penalties
 * for very short rows, stacks and lone photos) and keeps the cheapest overall.
 * Rows are recomputed when the width changes by roughly 40px or the
 * breakpoint changes (2 slots per row on small screens, 3 from 64rem).
 */

/** A slot: indexes of the photos in it (1 = single photo, 2 = stack). */
type Slot = number[];
type Row = Slot[];

interface Plan { cost: number; rows: Row[] }

interface Gallery {
  container: HTMLElement;
  frames: HTMLElement[];
  /** Height/width ratio of each photo. */
  ratios: number[];
  /** Last layout key ("slots:width/40"), to skip needless re-layouts. */
  key: string;
}

const STACK_MAX = 3;

/** Height/width of the photo in a frame, from its width/height attributes. */
const ratioOf = (frame: HTMLElement): number => {
  const img = frame.querySelector('img');
  const width = Number(img?.getAttribute('width')) || img?.naturalWidth;
  const height = Number(img?.getAttribute('height')) || img?.naturalHeight;
  return width && height ? height / width : 1;
};

/** Picks the rows for `ratios` in a container `width` px wide. */
const planRows = (ratios: number[], width: number, gap: number, maxSlots: number): Row[] => {
  const count = ratios.length;
  const idealHeight = (width / maxSlots) * 0.95;
  const memo = new Map<number, Plan>();

  /** Width/height of a slot (a stack of photos shares one width). */
  const slotAspect = (slot: Slot) => 1 / slot.reduce((sum, index) => sum + ratios[index], 0);

  const rowCost = (row: Row, isLast: boolean): number => {
    const aspect = row.reduce((sum, slot) => sum + slotAspect(slot), 0);
    const height = (width - gap * (row.length - 1)) / aspect;
    let cost = ((height - idealHeight) / idealHeight) ** 2;
    if (height < idealHeight * 0.55) cost += 2;
    row.forEach((slot) => {
      if (slot.length === 1) return;
      cost += 0.12;
      if (height * slotAspect(slot) < width * 0.35) cost += 2; // stack too narrow
    });
    if (row.length === 1 && !isLast) cost += 0.6;
    return isLast ? cost * 0.5 : cost;
  };

  /** Cheapest plan for the photos from `start` on. */
  const best = (start: number): Plan => {
    if (start >= count) return { cost: 0, rows: [] };
    const cached = memo.get(start);
    if (cached) return cached;
    let result: Plan | null = null;

    const extend = (next: number, row: Row) => {
      if (row.length) {
        const isLast = next >= count;
        const rest = isLast ? { cost: 0, rows: [] } : best(next);
        const cost = rowCost(row, isLast) + rest.cost;
        if (!result || cost < result.cost) result = { cost, rows: [row, ...rest.rows] };
      }
      const used = next - start;
      if (next >= count || row.length >= maxSlots || used >= STACK_MAX) return;
      extend(next + 1, [...row, [next]]);
      if (next + 1 < count && count > 2 && used + 2 <= STACK_MAX) extend(next + 2, [...row, [next, next + 1]]);
    };

    extend(start, []);
    const plan: Plan = result ?? { cost: 0, rows: [] };
    memo.set(start, plan);
    return plan;
  };

  return best(0).rows;
};

/** Moves the frames into `.gallery-row` (and `.gallery-stack`) wrappers. */
const render = ({ container, frames, ratios }: Gallery, rows: Row[]) => {
  container.querySelectorAll('.gallery-row, .gallery-stack').forEach((element) => element.remove());
  container.classList.add('is-justified');
  rows.forEach((row) => {
    const rowElement = document.createElement('div');
    rowElement.className = 'gallery-row';
    row.forEach((slot) => {
      const aspect = 1 / slot.reduce((sum, index) => sum + ratios[index], 0);
      if (slot.length === 1) {
        const frame = frames[slot[0]];
        frame.style.setProperty('--slot-aspect', String(aspect));
        rowElement.append(frame);
        return;
      }
      const stack = document.createElement('div');
      stack.className = 'gallery-stack';
      stack.style.setProperty('--slot-aspect', String(aspect));
      slot.forEach((index) => {
        const frame = frames[index];
        frame.style.setProperty('--stack-share', String(ratios[index]));
        frame.style.removeProperty('--slot-aspect');
        stack.append(frame);
      });
      rowElement.append(stack);
    });
    container.append(rowElement);
  });
};

const layout = (gallery: Gallery) => {
  const style = getComputedStyle(gallery.container);
  const width = gallery.container.getBoundingClientRect().width - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight);
  const gap = Number.parseFloat(style.columnGap) || 0;
  const maxSlots = window.matchMedia('(min-width: 64rem)').matches ? 3 : 2;
  const key = `${maxSlots}:${Math.round(width / 40)}`;
  if (!width || gallery.key === key) return;
  gallery.key = key;
  render(gallery, planRows(gallery.ratios, width, gap, maxSlots));
};

const galleries: Gallery[] = [...document.querySelectorAll<HTMLElement>('[data-gallery]')]
  .map((container) => ({ container, frames: [...container.querySelectorAll<HTMLElement>('.gallery-frame')], ratios: [], key: '' }))
  .filter((gallery) => gallery.frames.length > 1);

if (galleries.length) {
  galleries.forEach((gallery) => {
    gallery.ratios = gallery.frames.map(ratioOf);
  });
  const layoutAll = () => galleries.forEach(layout);
  layoutAll();

  let ticking = false;
  window.addEventListener(
    'resize',
    () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        layoutAll();
      });
    },
    { passive: true },
  );
}

export {}; // a module: keeps these names out of the global scope
