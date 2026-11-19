export type SearchFilterKey =
  | 'name'
  | 'author_name'
  | 'publisher_name'
  | 'subject'
  | 'isbn';

export interface SearchFilterOption {
  label: string;
  value: SearchFilterKey;
  placeholder: string;
}

export interface ApiBook {
  name: string;
  subject: string;
  isbn: string;
  price: string;
  price_discount: string;
  link: string;
  authors: string;
  publisher: string;
}

export interface ApiPaginationMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  path: string;
  per_page: number | string;
  to: number | null;
  total: number;
}

export interface BooksApiResponse {
  data: ApiBook[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: ApiPaginationMeta;
}

export interface Book {
  id: string;
  name: string;
  authors: string;
  publisher: string;
  isbn: string;
  subject: string;
  price: string;
  priceDiscount: string;
  unitPrice: number;
  originalPrice: number;
  link: string;
}

export interface CartItem extends Book {
  quantity: number;
  addedAtMs: number;
}

export interface PublisherGroup {
  publisher: string;
  items: CartItem[];
  totalQuantity: number;
  subtotal: number;
  originalSubtotal: number;
}

