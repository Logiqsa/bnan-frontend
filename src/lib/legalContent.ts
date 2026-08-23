const ALLOWED_TAGS = new Set([
  "P", "BR", "H2", "H3", "STRONG", "B", "EM", "I", "U", "UL", "OL", "LI", "A", "BLOCKQUOTE",
]);

export const sanitizeLegalHtml = (html: string) => {
  const documentNode = new DOMParser().parseFromString(html, "text/html");

  [...documentNode.body.querySelectorAll("*")].forEach((element) => {
    if (!ALLOWED_TAGS.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      return;
    }

    [...element.attributes].forEach((attribute) => element.removeAttribute(attribute.name));

    if (element.tagName === "A") {
      const original = new DOMParser().parseFromString(html, "text/html");
      const matchingLinks = [...original.body.querySelectorAll("a")];
      const index = [...documentNode.body.querySelectorAll("a")].indexOf(element as HTMLAnchorElement);
      const href = matchingLinks[index]?.getAttribute("href") || "";
      if (/^(https?:|mailto:|tel:)/i.test(href)) {
        element.setAttribute("href", href);
        element.setAttribute("target", "_blank");
        element.setAttribute("rel", "noopener noreferrer");
      }
    }
  });

  return documentNode.body.innerHTML;
};

export const legalHtmlHasContent = (html: string) => {
  const documentNode = new DOMParser().parseFromString(html, "text/html");
  return Boolean(documentNode.body.textContent?.trim());
};
