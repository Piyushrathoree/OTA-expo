import Constants from "expo-constants";
import i18n from "./i18n";
import type { CheckInResult, EventItem, TicketItem } from "./types";
import { USERS } from "./users";

const devHost = Constants.expoConfig?.hostUri?.split(":")[0];
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (devHost ? `http://${devHost}:3000` : "http://localhost:3000");

let currentUserId = Number(process.env.EXPO_PUBLIC_USER_ID ?? USERS[0].id);
export const getCurrentUserId = () => currentUserId;
export const setCurrentUserId = (id: number) => {
  currentUserId = id;
};

export class ApiError extends Error {
  status: number;
  body: any;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

const ERROR_KEYS: Record<number, string> = {
  401: "errors.user",
  404: "errors.notFound",
  409: "errors.conflict",
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": String(currentUserId),
        ...init?.headers,
      },
    });
  } catch {
    throw new Error(i18n.t("errors.network"));
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(
      res.status,
      i18n.t(ERROR_KEYS[res.status] ?? "errors.generic"),
      body,
    );
  }
  return (await res.json()) as T;
}

export const getEvents = () => request<EventItem[]>("/events");

export const getMyTickets = () => request<TicketItem[]>("/me/tickets");

export const bookTickets = (eventId: number, quantity: number) =>
  request<TicketItem[]>(`/events/${eventId}/book`, {
    method: "POST",
    body: JSON.stringify({ quantity }),
  });

export const checkIn = (code: string) =>
  request<CheckInResult>("/checkins", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
