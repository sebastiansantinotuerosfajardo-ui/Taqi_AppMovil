export const getSaved = (meta) =>
  (meta.aportes || []).reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

export const getPercentage = (meta) =>
  meta.target > 0 ? Math.min(100, Math.round((getSaved(meta) / meta.target) * 100)) : 0;
