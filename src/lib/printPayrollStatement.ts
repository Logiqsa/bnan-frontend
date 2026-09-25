export const printPayrollStatement = () => {
  const previousTitle = document.title;
  const restoreTitle = () => { document.title = previousTitle; };
  document.title = " ";
  window.addEventListener("afterprint", restoreTitle, { once: true });
  window.print();
};
