/**
 * Menu drawer (MobileMenu.astro): open/close from the header button, close on the
 * backdrop, the close button, a link click, Escape or a `moments:close-drawer` event,
 * and keep Tab focus inside while it is open.
 *
 * The open state is the `has-open-menu` class on <html>; CSS animates from it. The
 * panel stays in the DOM (hidden) until the close transition has finished.
 */
const drawer = document.querySelector<HTMLElement>('[data-drawer]');
const backdrop = document.querySelector<HTMLElement>('[data-drawer-backdrop]');
const openers = document.querySelectorAll<HTMLElement>('[data-drawer-open]');

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
/** Matches the CSS close transition. */
const CLOSE_DELAY_MS = 600;

if (drawer && backdrop && openers.length) {
  const root = document.documentElement;
  /** The button that opened the drawer, to give focus back on close. */
  let trigger: HTMLElement | null = null;

  const isOpen = () => root.classList.contains('has-open-menu');

  const open = (button: HTMLElement) => {
    trigger = button;
    drawer.hidden = false;
    backdrop.hidden = false;
    drawer.getBoundingClientRect(); // force a layout so the open transition runs
    root.classList.add('has-open-menu');
    openers.forEach((opener) => opener.setAttribute('aria-expanded', 'true'));
    drawer.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  };

  const close = () => {
    if (!isOpen()) return;
    root.classList.remove('has-open-menu');
    openers.forEach((opener) => opener.setAttribute('aria-expanded', 'false'));
    trigger?.focus();
    window.setTimeout(() => {
      if (isOpen()) return;
      drawer.hidden = true;
      backdrop.hidden = true;
    }, CLOSE_DELAY_MS);
  };

  openers.forEach((button) => button.addEventListener('click', () => (isOpen() ? close() : open(button))));
  drawer.querySelector('[data-drawer-close]')?.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  drawer.addEventListener('click', (event) => {
    if ((event.target as Element).closest('a')) close();
  });

  document.addEventListener('keydown', (event) => {
    if (!isOpen()) return;
    if (event.key === 'Escape') {
      close();
      return;
    }
    if (event.key !== 'Tab') return;

    // Focus trap: wrap from the last visible focusable element to the first and back.
    const focusable = [...drawer.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  document.addEventListener('moments:close-drawer', close);
}
