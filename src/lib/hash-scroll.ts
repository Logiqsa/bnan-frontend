export const scrollToSection = (hash: string, behavior: ScrollBehavior = "smooth") => {
  const id = decodeURIComponent(hash.replace(/^#/, ""));
  if (!id) return false;
  const element = document.getElementById(id);
  if (!element) return false;
  const navbarOffset = 88;
  const top = element.getBoundingClientRect().top + window.scrollY - navbarOffset;
  window.scrollTo({ top: Math.max(0, top), behavior });
  return true;
};
