export function formatCurrency(amount: number, currency: string = 'USD') {
  // The 'style' is 'currency', and we will let Intl.NumberFormat handle the symbol.
  // By default, it uses the symbol for known currencies.
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    currencyDisplay: 'symbol' // This is the default, but we can be explicit
  }).format(amount);
}