/**
 * Sharing an album (PostFooter.astro + ShareSheet.astro).
 *
 * 1. Where the Web Share API can share the page (mostly phones), the Share
 *    button opens the native sheet; its capture-phase listener then stops the
 *    click from also opening ours.
 * 2. Otherwise the button opens the `[data-share-sheet]` <dialog>: closes on
 *    backdrop click, Escape, the close button or after choosing a target;
 *    "More" reveals the extra targets; "Copy" copies the link (falling back to
 *    selecting the field when the clipboard is unavailable).
 */
document.querySelectorAll<HTMLElement>('[data-share-open]').forEach((button) => {
  button.addEventListener(
    'click',
    async (event) => {
      const data = { title: button.dataset.shareTitle ?? document.title, url: button.dataset.shareUrl ?? window.location.href };
      if (!navigator.canShare?.(data)) return;
      event.stopImmediatePropagation();
      try {
        await navigator.share(data);
      } catch {
        /* dismissed by the user */
      }
    },
    { capture: true },
  );
});

const sheet = document.querySelector<HTMLDialogElement>('[data-share-sheet]');

if (sheet && typeof sheet.showModal === 'function') {
  let opener: HTMLElement | null = null;
  const close = () => {
    if (sheet.open) sheet.close();
  };

  document.querySelectorAll<HTMLElement>('[data-share-open]').forEach((button) => {
    button.addEventListener('click', () => {
      opener = button;
      if (!sheet.open) sheet.showModal();
      document.documentElement.classList.add('has-open-share');
    });
  });

  sheet.addEventListener('close', () => {
    document.documentElement.classList.remove('has-open-share');
    opener?.focus({ preventScroll: true });
    opener = null;
  });
  sheet.addEventListener('click', (event) => {
    if (event.target === sheet) close(); // click on the backdrop
  });
  sheet.querySelectorAll('[data-share-close]').forEach((button) => button.addEventListener('click', close));
  sheet.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    close();
  });
  sheet.querySelectorAll('[data-share-target]').forEach((link) => link.addEventListener('click', close));

  sheet.querySelector('[data-share-more]')?.addEventListener('click', () => {
    sheet.querySelectorAll<HTMLElement>('[data-share-extra]').forEach((item) => {
      item.hidden = false;
    });
    const moreItem = sheet.querySelector<HTMLElement>('[data-share-more-item]');
    if (moreItem) moreItem.hidden = true;
  });

  const copyButton = sheet.querySelector<HTMLElement>('[data-share-copy]');
  const copyLabel = sheet.querySelector<HTMLElement>('[data-share-copy-label]');
  const field = sheet.querySelector<HTMLInputElement>('[data-share-url]');
  let resetTimer = 0;

  copyButton?.addEventListener('click', async () => {
    const url = copyButton.getAttribute('data-copy-url');
    if (!url || !copyLabel) return;
    let label = copyButton.dataset.labelCopied ?? '';
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url);
    } catch {
      field?.select();
      label = copyButton.dataset.labelFallback ?? '';
    }
    copyLabel.textContent = label;
    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => {
      copyLabel.textContent = copyButton.dataset.labelCopy ?? '';
    }, 2400);
  });
}

export {}; // a module: keeps these names out of the global scope
