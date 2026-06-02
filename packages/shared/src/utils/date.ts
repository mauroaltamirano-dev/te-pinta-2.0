export const BUSINESS_TIME_ZONE = 'America/Argentina/Cordoba' as const;

export const getBusinessDateIso = (
  date: Date = new Date(),
  timeZone: string = BUSINESS_TIME_ZONE,
): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone,
    year: 'numeric',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error(`Could not format business date for time zone ${timeZone}`);
  }

  return `${year}-${month}-${day}`;
};
