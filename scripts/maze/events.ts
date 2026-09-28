import ICAL from "ical.js";
import { getJson, getText, postJson } from "./http.ts";
import { day, table } from "./markdown.ts";

type Event = { start: string; title: string; where: string; host: string; url: string; source: string };

const LONDON = { lat: 51.5074, lon: -0.1278 };
const LUMA_LONDON = "https://api.lu.ma/ics/get?entity=discover&id=discplace-QCcNk3HXowOR97j";
const CONFS = "https://api.github.com/repos/tech-conferences/conference-data/contents/conferences";

const MEETUP_QUERY = `query($f: EventSearchFilter!, $after: String) {
  eventSearch(filter: $f, first: 50, after: $after) {
    pageInfo { hasNextPage endCursor }
    edges { node { title description dateTime eventUrl venues { name city } group { name } } }
  }
}`;

type MeetupNode = {
  title: string;
  description: string | null;
  dateTime: string;
  eventUrl: string;
  venues: { name: string; city: string }[] | null;
  group: { name: string };
};
type MeetupPage = {
  data: { eventSearch: { pageInfo: { hasNextPage: boolean; endCursor: string }; edges: { node: MeetupNode }[] } };
};

export function terms(topic: string) {
  return topic.split(",").map((t) => t.trim()).filter(Boolean);
}

// Each comma-separated term is an alternative; every word in a term must start a word in the text.
export function matches(topic: string, text: string) {
  return terms(topic).some((term) =>
    term.split(/\s+/).every((word) => new RegExp(`\\b${word.replace(/[^\w]/g, "\\$&")}`, "i").test(text)),
  );
}

async function meetup(topic: string, from: Date, to: Date): Promise<Event[]> {
  return (await Promise.all(terms(topic).map((term) => meetupTerm(term, from, to)))).flat();
}

async function meetupTerm(term: string, from: Date, to: Date): Promise<Event[]> {
  const filter = { query: term, ...LONDON, radius: 15, startDateRange: from.toISOString(), endDateRange: to.toISOString() };
  const events: Event[] = [];
  let after: string | undefined;
  for (let page = 0; page < 5; page++) {
    const res = await postJson<MeetupPage>("https://api.meetup.com/gql-ext", { query: MEETUP_QUERY, variables: { f: filter, after } });
    for (const { node } of res.data.eventSearch.edges) {
      const venue = node.venues?.find((v) => v.city);
      if (!venue || !matches(term, `${node.title} ${node.description ?? ""}`)) continue;
      events.push({ start: node.dateTime, title: node.title, where: venue.name, host: node.group.name, url: node.eventUrl, source: "Meetup" });
    }
    if (!res.data.eventSearch.pageInfo.hasNextPage) break;
    after = res.data.eventSearch.pageInfo.endCursor;
  }
  return events;
}

async function luma(topic: string, from: Date, to: Date): Promise<Event[]> {
  const calendar = new ICAL.Component(ICAL.parse(await getText(LUMA_LONDON)));
  return calendar.getAllSubcomponents("vevent").flatMap((vevent) => {
    const e = new ICAL.Event(vevent);
    const start = e.startDate.toJSDate();
    const description = e.description ?? "";
    if (start < from || start > to || !matches(topic, `${e.summary} ${description}`)) return [];
    const host = String(vevent.getFirstProperty("organizer")?.getParameter("cn") ?? "");
    const url = description.match(/https:\/\/luma\.com\/\S+/)?.[0] ?? "";
    const where = e.location?.startsWith("http") ? "on event page" : (e.location ?? "");
    return [{ start: start.toISOString(), title: e.summary, where, host, url, source: "Luma" }];
  });
}

type ConfFile = { name: string; download_url: string };
type Conf = { name: string; url: string; startDate: string; city: string };

async function conferences(topic: string, from: Date, to: Date): Promise<Event[]> {
  const years = [...new Set([from.getFullYear(), to.getFullYear()])];
  const auth: HeadersInit = process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
  const files = (await Promise.all(years.map((y) => getJson<ConfFile[]>(`${CONFS}/${y}`, { headers: auth })))).flat();
  const lists = await Promise.all(
    files.map(async (f) => ({ topic: f.name.replace(".json", ""), confs: await getJson<Conf[]>(f.download_url) })),
  );
  return lists.flatMap(({ topic: fileTopic, confs }) =>
    confs
      .filter((c) => c.city === "London" && new Date(c.startDate) >= from && new Date(c.startDate) <= to)
      .filter((c) => matches(topic, `${c.name} ${fileTopic}`))
      .map((c) => ({ start: c.startDate, title: c.name, where: "London", host: fileTopic, url: c.url, source: "confs.tech" })),
  );
}

export function dedupe(events: Event[]) {
  const seen = new Set<string>();
  return events
    .sort((a, b) => a.start.localeCompare(b.start))
    .filter((e) => {
      const key = `${day(e.start)} ${e.title.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export async function events(topic: string, days: number) {
  const from = new Date();
  const to = new Date(from.getTime() + days * 86_400_000);
  const sources = [meetup, luma, conferences];
  const results = await Promise.allSettled(sources.map((source) => source(topic, from, to)));
  const failed = results.flatMap((r, i) => (r.status === "rejected" ? [`${sources[i].name}: ${r.reason.message}`] : []));
  const found = dedupe(results.flatMap((r) => (r.status === "fulfilled" ? r.value : [])));
  const rows = found.map((e) => [day(e.start), e.title, e.where, e.host, e.source, e.url]);
  const header = `# In-person events in London: "${topic}", next ${days} days\n\n${found.length} found.`;
  const failures = failed.length ? `\n\nSources that failed: ${failed.join("; ")}` : "";
  return `${header}${failures}\n\n${table(["Date", "Event", "Where", "Host", "Source", "Link"], rows)}`;
}
