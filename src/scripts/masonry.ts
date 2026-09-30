/**
 * Masonry for `[data-masonry]` grids of `.tile`s (TileGrid.astro).
 *
 * CSS alone lays the tiles out as a regular grid. Here, when the grid has two or
 * more columns (`--grid-cols`, set by the CSS per breakpoint), the tiles are
 * dealt into `.grid-column` wrappers — each tile goes to the currently shortest
 * column — and then every column's tiles are stretched or squashed slightly
 * (via `--tile-ratio`) so all columns end at exactly the same height.
 * Re-runs on resize (once per animation frame).
 */

interface Column {
  /** Indexes of the tiles in this column. */
  items: number[];
  /** Sum of the tiles' height/width ratios. */
  height: number;
}

interface Grid {
  grid: HTMLElement;
  tiles: HTMLElement[];
  /** Natural height/width ratio of each tile's photo. */
  ratios: number[];
  /** Column count of the current layout (0 = not laid out yet). */
  count: number;
  columns: Column[];
  elements: HTMLElement[];
}

/** Deals the tiles, in order, into `count` columns: each goes to the shortest one. */
const distribute = (ratios: number[], count: number): Column[] => {
  const columns: Column[] = Array.from({ length: count }, () => ({ items: [], height: 0 }));
  ratios.forEach((ratio, index) => {
    let shortest = columns[0];
    columns.forEach((column) => {
      if (column.height < shortest.height - 0.001) shortest = column;
    });
    shortest.items.push(index);
    shortest.height += ratio;
  });
  return columns;
};

/** Rendered height of a column `width` px wide with `gap` px between tiles. */
const columnHeight = (column: Column, width: number, gap: number) =>
  column.items.length ? width * column.height + gap * (column.items.length - 1) : 0;

/** Per-column scale factors that bring every column to the average height. */
const balance = (columns: Column[], width: number, gap: number): number[] => {
  const filled = columns.filter((column) => column.items.length);
  if (!filled.length) return columns.map(() => 1);
  const heights = filled.map((column) => columnHeight(column, width, gap));
  const target = heights.reduce((sum, height) => sum + height, 0) / heights.length;
  return columns.map((column) => (column.height ? (target - gap * (column.items.length - 1)) / (width * column.height) : 1));
};

/** A tile's height/width ratio, from the `--tile-ratio` ("w / h") the CSS gives its media box. */
const readRatio = (tile: HTMLElement): number => {
  const media = tile.querySelector<HTMLElement>('.tile-media');
  if (!media) return 1;
  const [width, height] = getComputedStyle(media).getPropertyValue('--tile-ratio').trim().split('/').map((part) => Number.parseFloat(part));
  return width && height ? height / width : 1;
};

const setRatio = (tile: HTMLElement, ratio: number) => {
  tile.querySelector<HTMLElement>('.tile-media')?.style.setProperty('--tile-ratio', `1 / ${ratio}`);
};

const columnCount = (grid: HTMLElement): number => {
  const count = Number.parseInt(getComputedStyle(grid).getPropertyValue('--grid-cols'), 10);
  return Number.isFinite(count) && count > 0 ? count : 1;
};

const layout = (state: Grid) => {
  const count = columnCount(state.grid);

  // Column count changed (breakpoint): rebuild the column wrappers.
  if (state.count !== count) {
    state.count = count;
    state.grid.querySelectorAll('.grid-column').forEach((column) => column.remove());
    if (count < 2) {
      // Single column: back to plain tiles with their natural ratios.
      state.grid.classList.remove('is-columned');
      state.tiles.forEach((tile, index) => {
        setRatio(tile, state.ratios[index]);
        state.grid.append(tile);
      });
      state.columns = [];
      return;
    }
    state.columns = distribute(state.ratios, count);
    state.elements = state.columns.map((column) => {
      const element = document.createElement('div');
      element.className = 'grid-column';
      element.append(...column.items.map((index) => state.tiles[index]));
      return element;
    });
    state.grid.classList.add('is-columned');
    state.grid.append(...state.elements);
  }
  if (count < 2) return;

  // Equalise the column heights for the current width.
  const width = state.elements[0].getBoundingClientRect().width;
  const gap = Number.parseFloat(getComputedStyle(state.elements[0]).rowGap) || 0;
  if (!width) return;
  balance(state.columns, width, gap).forEach((scale, column) => {
    state.columns[column].items.forEach((index) => setRatio(state.tiles[index], state.ratios[index] * scale));
  });
};

const grids = document.querySelectorAll<HTMLElement>('[data-masonry]');

if (grids.length) {
  const states: Grid[] = [...grids].map((grid) => {
    const tiles = [...grid.querySelectorAll<HTMLElement>('.tile')];
    const ratios = tiles.map(readRatio);
    tiles.forEach((tile, index) => setRatio(tile, ratios[index]));
    return { grid, tiles, ratios, count: 0, columns: [], elements: [] };
  });
  const layoutAll = () => states.forEach(layout);
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
