export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString();
}

export function formatDateTime(date: Date | string) {
  return new Date(date).toLocaleString();
}