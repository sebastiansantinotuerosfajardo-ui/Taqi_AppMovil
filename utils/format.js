export function formatSoles(value, decimals = 2) {
  const n = Number(value) || 0;
  const [intPart, decPart] = n.toFixed(decimals).split(".");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimals > 0 ? `S/ ${withCommas}.${decPart}` : `S/ ${withCommas}`;
}

export function formatDate(isoString) {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}
