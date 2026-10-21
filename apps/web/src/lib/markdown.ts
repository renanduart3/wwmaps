import { Marked } from 'marked';

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]!);

const parser = new Marked({
  renderer: {
    html({ text }) { return escapeHtml(text); },
    link({ href, text }) {
      return /^https:\/\//i.test(href)
        ? `<a href="${escapeHtml(href)}" rel="noopener noreferrer">${escapeHtml(text)}</a>`
        : escapeHtml(text);
    },
    image() { return ''; }
  }
});

export function renderMarkdown(source: string): string {
  return parser.parse(source) as string;
}
