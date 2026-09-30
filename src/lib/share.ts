/**
 * The share sheet's destinations (in display order) and their share URLs.
 * The first seven are visible; the rest appear after "More".
 *
 * React/Next.js equivalent: a config array mapped by a <ShareMenu> component.
 */
import { socialIcons } from './icons';

/** Extra Bootstrap Icons (1.13.1, MIT) used only by the share sheet. */
export const shareIcons = {
  ...socialIcons,
  'bluesky': "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-bluesky\" viewBox=\"0 0 16 16\">\n  <path d=\"M3.468 1.948C5.303 3.325 7.276 6.118 8 7.616c.725-1.498 2.698-4.29 4.532-5.668C13.855.955 16 .186 16 2.632c0 .489-.28 4.105-.444 4.692-.572 2.04-2.653 2.561-4.504 2.246 3.236.551 4.06 2.375 2.281 4.2-3.376 3.464-4.852-.87-5.23-1.98-.07-.204-.103-.3-.103-.218 0-.081-.033.014-.102.218-.379 1.11-1.855 5.444-5.231 1.98-1.778-1.825-.955-3.65 2.28-4.2-1.85.315-3.932-.205-4.503-2.246C.28 6.737 0 3.12 0 2.632 0 .186 2.145.955 3.468 1.948\"/>\n</svg>",
  'three-dots': "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-three-dots\" viewBox=\"0 0 16 16\">\n  <path d=\"M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3\"/>\n</svg>",
  'telegram': "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-telegram\" viewBox=\"0 0 16 16\">\n  <path d=\"M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8.287 5.906q-1.168.486-4.666 2.01-.567.225-.595.442c-.03.243.275.339.69.47l.175.055c.408.133.958.288 1.243.294q.39.01.868-.32 3.269-2.206 3.374-2.23c.05-.012.12-.026.166.016s.042.12.037.141c-.03.129-1.227 1.241-1.846 1.817-.193.18-.33.307-.358.336a8 8 0 0 1-.188.186c-.38.366-.664.64.015 1.088.327.216.589.393.85.571.284.194.568.387.936.629q.14.092.27.187c.331.236.63.448.997.414.214-.02.435-.22.547-.82.265-1.417.786-4.486.906-5.751a1.4 1.4 0 0 0-.013-.315.34.34 0 0 0-.114-.217.53.53 0 0 0-.31-.093c-.3.005-.763.166-2.984 1.09\"/>\n</svg>",
  'reddit': "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-reddit\" viewBox=\"0 0 16 16\">\n  <path d=\"M6.167 8a.83.83 0 0 0-.83.83c0 .459.372.84.83.831a.831.831 0 0 0 0-1.661m1.843 3.647c.315 0 1.403-.038 1.976-.611a.23.23 0 0 0 0-.306.213.213 0 0 0-.306 0c-.353.363-1.126.487-1.67.487-.545 0-1.308-.124-1.671-.487a.213.213 0 0 0-.306 0 .213.213 0 0 0 0 .306c.564.563 1.652.61 1.977.61zm.992-2.807c0 .458.373.83.831.83s.83-.381.83-.83a.831.831 0 0 0-1.66 0z\"/>\n  <path d=\"M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.828-1.165c-.315 0-.602.124-.812.325-.801-.573-1.9-.945-3.121-.993l.534-2.501 1.738.372a.83.83 0 1 0 .83-.869.83.83 0 0 0-.744.468l-1.938-.41a.2.2 0 0 0-.153.028.2.2 0 0 0-.086.134l-.592 2.788c-1.24.038-2.358.41-3.17.992-.21-.2-.496-.324-.81-.324a1.163 1.163 0 0 0-.478 2.224q-.03.17-.029.353c0 1.795 2.091 3.256 4.669 3.256s4.668-1.451 4.668-3.256c0-.114-.01-.238-.029-.353.401-.181.688-.592.688-1.069 0-.65-.525-1.165-1.165-1.165\"/>\n</svg>",
  'clipboard': "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-clipboard\" viewBox=\"0 0 16 16\">\n  <path d=\"M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z\"/>\n  <path d=\"M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z\"/>\n</svg>",
};
export type ShareIcon = keyof typeof shareIcons;

export interface ShareTarget {
  label: string;
  icon: ShareIcon;
  /** Brand colour of the icon tile. */
  color: string;
  href: string;
  /** Hidden until "More" is pressed. */
  extra?: boolean;
}

/** Share links for a page title and absolute URL. */
export function shareTargets(title: string, url: string): ShareTarget[] {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  return [
    { label: 'Pinterest', icon: 'pinterest', color: '#d5001f', href: `https://pinterest.com/pin/create/button/?url=${u}&description=${t}` },
    { label: 'Instagram', icon: 'instagram', color: '#c13584', href: 'https://www.instagram.com/' },
    { label: 'Facebook', icon: 'facebook', color: '#1877f2', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { label: 'WhatsApp', icon: 'whatsapp', color: '#1eb355', href: `https://api.whatsapp.com/send?text=${t}%20${u}` },
    { label: 'Email', icon: 'email', color: '#c2413f', href: `mailto:?subject=${t}&body=${u}` },
    { label: 'X', icon: 'x', color: '#0e0e0c', href: `https://x.com/intent/tweet?text=${t}&url=${u}` },
    { label: 'Bluesky', icon: 'bluesky', color: '#1185fe', href: `https://bsky.app/intent/compose?text=${t}%20${u}` },
    { label: 'Threads', icon: 'threads', color: '#0e0e0c', href: `https://www.threads.net/intent/post?text=${t}%20${u}`, extra: true },
    { label: 'Telegram', icon: 'telegram', color: '#2596d8', href: `https://t.me/share/url?url=${u}&text=${t}`, extra: true },
    { label: 'LinkedIn', icon: 'linkedin', color: '#0a66c2', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, extra: true },
    { label: 'Reddit', icon: 'reddit', color: '#e03d00', href: `https://www.reddit.com/submit?url=${u}&title=${t}`, extra: true },
  ];
}
