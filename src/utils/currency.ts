export function formatCurrency(amount: number, currency: string = 'USD') {
  // Determine the correct locale based on the currency code
  const locale = currency === 'BDT' ? 'bn-BD' : 'en-US';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount);
}