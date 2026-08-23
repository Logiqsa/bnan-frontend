import { marked } from "marked";

const ALLOWED_TAGS = new Set([
  "P", "BR", "H1", "H2", "H3", "STRONG", "B", "EM", "I", "U", "UL", "OL", "LI", "A", "BLOCKQUOTE",
]);

const DROP_WITH_CONTENT_TAGS = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED"]);
const SAFE_LINK_PROTOCOL = /^(https?:|mailto:|tel:)/i;
const HTML_PATTERN = /<!--[\s\S]*-->|<\/?[a-z][^>]*>/i;
const MARKDOWN_PATTERN = /(^|\n)\s{0,3}(#{1,3}\s+|(?:[*+-]|\d+[.)])\s+)|\*\*[^*\n]+\*\*|(?<!\*)\*[^*\n]+\*(?!\*)|\[[^\]\n]+\]\([^)\n]+\)/;

export const sanitizeLegalHtml = (html: string) => {
  const documentNode = new DOMParser().parseFromString(html, "text/html");

  [...documentNode.body.querySelectorAll("*")].forEach((element) => {
    if (DROP_WITH_CONTENT_TAGS.has(element.tagName)) {
      element.remove();
      return;
    }

    if (!ALLOWED_TAGS.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      return;
    }

    const href = element.tagName === "A" ? element.getAttribute("href")?.trim() : null;
    [...element.attributes].forEach((attribute) => element.removeAttribute(attribute.name));

    if (href && SAFE_LINK_PROTOCOL.test(href)) {
      element.setAttribute("href", href);
      element.setAttribute("target", "_blank");
      element.setAttribute("rel", "noopener noreferrer");
    }
  });

  return documentNode.body.innerHTML;
};

export const pastedLegalHtml = (html: string, plainText: string) => {
  const text = plainText.trim();

  if (text.startsWith("<") && HTML_PATTERN.test(text)) return sanitizeLegalHtml(text);
  if (MARKDOWN_PATTERN.test(text)) {
    return sanitizeLegalHtml(marked.parse(text, { async: false, breaks: true, gfm: true }));
  }
  if (HTML_PATTERN.test(text)) return sanitizeLegalHtml(text);
  if (html.trim()) return sanitizeLegalHtml(html);
  if (!text) return null;

  const documentNode = document.implementation.createHTMLDocument();
  return text
    .split(/\n{2,}/)
    .map((paragraph) => {
      const element = documentNode.createElement("p");
      paragraph.split("\n").forEach((line, index) => {
        if (index) element.append(documentNode.createElement("br"));
        element.append(documentNode.createTextNode(line));
      });
      return element.outerHTML;
    })
    .join("");
};

export const legalHtmlHasContent = (html: string) => {
  const documentNode = new DOMParser().parseFromString(html, "text/html");
  return Boolean(documentNode.body.textContent?.trim());
};
