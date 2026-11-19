import type { CSSProperties } from 'react';
import { hueFromString } from '../utils/cover';

interface BookCoverProps {
  title: string;
  publisher: string;
  authors?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Generated cover used when no real cover image is available. Purely decorative:
 * the same information is always present as text elsewhere in the UI.
 */
export function BookCover({ title, publisher, authors, size = 'md' }: BookCoverProps) {
  const hue = hueFromString(publisher);
  const style = { '--cover-hue': hue } as CSSProperties;

  return (
    <div className={`book-cover book-cover-${size}`} style={style} aria-hidden="true">
      <span className="book-cover-publisher">{publisher}</span>
      <span className="book-cover-title">{title}</span>
      {size !== 'sm' && authors ? <span className="book-cover-author">{authors}</span> : null}
    </div>
  );
}

