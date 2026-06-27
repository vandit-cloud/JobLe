export function isPastDate(value) {
  return new Date(value).getTime() < Date.now();
}

export function toStartOfDay(dateValue) {
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  return date;
}

