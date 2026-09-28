export type Tier = "mouse" | "rabbit" | "deer" | "elephant" | "whale";

export type Signal = { id: string; kind: string; date: string; text: string; url: string; company?: string };

export type Person = {
  id: string;
  name: string;
  title: string;
  company: string;
  domain: string;
  company_size: number | null;
  linkedin: string;
  email: string;
  phone: string | null;
  phone_request_id: string | null;
  signals: Signal[];
  tier: Tier | null;
  tier_override: Tier | null;
  speed_score: number;
  speed_reasons: string[];
  approved: boolean;
  enriched_at: string | null;
};

export type Found = Partial<Omit<Person, "signals">> & { signals: Signal[] };

export type Brief = {
  industry: string;
  offer: string;
  sender: { name: string; company: string; why_me: string };
  roles: { role: string; todo_guesses: string[] }[];
  strategic_companies: string[];
};

export type Company = { name: string; signals: Signal[] };

export type Job = { title: string; company: string; start: string | null; end: string | null; current: boolean };

export type Gift = { text: string; pamphlet?: string; file?: string; link?: string };

export type Note = {
  todo_guess: string;
  subject: string;
  seen: { text: string; evidence: string[] };
  gift: Gift;
  why_me: string;
  ask: string;
  order: string[];
  linkedin: string;
};
