/**
 * Deterministic hue (0-359) derived from a string, used to give each publisher
 * its own accent color across book covers, cart groups and badges.
 */
export function hueFromString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  // Skip the muddy yellow-green range for better contrast with white text.
  const hue = hash % 300;
  return hue < 60 ? hue : hue + 60;
}

export function publisherInitials(publisher: string): string {
  const words = publisher
    .replace(/^(ed\.|editora)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '·';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

