/**
 * Simple Markdown to HTML converter
 * Supports basic formatting: bold, italic, headings, line breaks
 */

export function markdownToHTML(markdown: string): string {
  if (!markdown) return ""

  let html = markdown

  // Headings
  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>")
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>")
  html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>")

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")

  // Italic
  html = html.replace(/\*(.*?)\*/gim, "<em>$1</em>")

  // Line breaks (double newline = paragraph, single = <br>)
  html = html.replace(/\n\n/gim, "</p><p>")
  html = html.replace(/\n/gim, "<br>")

  // Wrap in paragraph if not already wrapped
  if (!html.startsWith("<")) {
    html = `<p>${html}</p>`
  }

  return html
}





