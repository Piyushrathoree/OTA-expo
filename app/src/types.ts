export type EventItem = {
  id: number;
  name: string;
  venue: string;
  date: string;
  price: number;
  ticketsLeft: number;
};

export type TicketItem = {
  id: number;
  code: string;
  checkedInAt: string | null;
  event: { id: number; name: string; venue: string; date: string; price: number };
};

export type CheckInResult = {
  id: number;
  code: string;
  checkedInAt: string;
  event: { id: number; name: string; venue: string; date: string };
};
