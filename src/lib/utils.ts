export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

export function getRarityColor(rarity: string): string {
  const rarityColors = {
    common: 'var(--color-common)',
    uncommon: 'var(--color-uncommon)',
    rare: 'var(--color-rare)',
    epic: 'var(--color-epic)',
    legendary: 'var(--color-legendary)',
  }
  return rarityColors[rarity as keyof typeof rarityColors] || rarityColors.common
}
