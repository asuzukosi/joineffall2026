import { parse } from "csv-parse/sync";
import { getJson, getText, postJson } from "./http.ts";
import { day, section, table } from "./markdown.ts";

const NOMIS = "https://www.nomisweb.co.uk/api/v01/dataset/NM_142_1";
const SIZE_BANDS = "0,10,20,30,40";
const AREAS = "K02000001,E12000007";

type Codelist = { structure: { codelists: { codelist: { code: { value: number; description: { value: string } }[] }[] } } };

async function nomisIndustry(sic: string) {
  const res = await getJson<Codelist>(`${NOMIS}/industry.def.sdmx.json?search=*${sic}*`);
  const code = res.structure.codelists.codelist[0]?.code.find((c) => c.description.value.startsWith(`${sic} :`));
  if (!code) throw new Error(`no Nomis industry for SIC ${sic}; use a 5-digit SIC 2007 code`);
  return code;
}

async function businessCounts(sics: string[]) {
  const rows: unknown[][] = [];
  for (const sic of sics) {
    const industry = await nomisIndustry(sic);
    const params = `geography=${AREAS}&industry=${industry.value}&employment_sizeband=${SIZE_BANDS}&legal_status=0&measures=20100&date=latest`;
    const csv = await getText(`${NOMIS}.data.csv?${params}&select=date_name,geography_name,employment_sizeband_name,obs_value`);
    const records = parse(csv, { columns: true }) as Record<string, string>[];
    for (const area of ["United Kingdom", "London"]) {
      const band = (name: string) => records.find((r) => r.GEOGRAPHY_NAME === area && r.EMPLOYMENT_SIZEBAND_NAME.startsWith(name))?.OBS_VALUE;
      rows.push([industry.description.value, area, records[0]?.DATE_NAME, band("Total"), band("Micro"), band("Small"), band("Medium"), band("Large")]);
    }
  }
  const note = "Businesses registered for VAT or PAYE (ONS UK Business Counts). Multiply by a price a buyer would pay for a bottom-up size.\n\n";
  return note + table(["Industry", "Area", "Year", "Total", "Micro 0-9", "Small 10-49", "Medium 50-249", "Large 250+"], rows);
}

type Notices = {
  hitCount: number;
  noticeList: { item: { id: string; title: string; organisationName: string; publishedDate: string; valueHigh: number; noticeStatus: string } }[];
};

async function contracts(query: string) {
  const res = await postJson<Notices>("https://www.contractsfinder.service.gov.uk/api/rest/2/search_notices/json", {
    searchCriteria: { keyword: query },
    size: 10,
  });
  const rows = res.noticeList.map(({ item: n }) => [
    day(n.publishedDate),
    n.title,
    n.organisationName.replaceAll("&amp;", "&"),
    n.valueHigh ? `£${n.valueHigh.toLocaleString("en-GB")}` : "",
    n.noticeStatus,
    `https://www.contractsfinder.service.gov.uk/Notice/${n.id}`,
  ]);
  return `${res.hitCount} notices match. Top 10 by relevance:\n\n${table(["Published", "Title", "Buyer", "Value up to", "Status", "Link"], rows)}`;
}

type Projects = {
  totalSize: number;
  project: { title: string; leadFunder: string; grantCategory: string; status: string; identifiers: { identifier: { value: string }[] } }[];
};

async function researchFunding(query: string) {
  const res = await getJson<Projects>(`https://gtr.ukri.org/gtr/api/projects?q=${encodeURIComponent(query)}&s=10`, {
    headers: { Accept: "application/vnd.rcuk.gtr.json-v7" },
  });
  const rows = res.project.map((p) => {
    const ref = p.identifiers.identifier[0]?.value ?? "";
    return [p.title, p.leadFunder, p.grantCategory, p.status, `https://gtr.ukri.org/projects?ref=${encodeURIComponent(ref)}`];
  });
  return `${res.totalSize} UKRI-funded projects match. Top 10 by relevance:\n\n${table(["Project", "Funder", "Type", "Status", "Link"], rows)}`;
}

type HnSearch = { nbHits: number; hits: { title: string; points: number; created_at: string; objectID: string }[] };
const HN = "https://hn.algolia.com/api/v1/search";

async function attention(query: string) {
  const q = encodeURIComponent(query);
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => thisYear - 4 + i);
  const counts = await Promise.all(
    years.map(async (y) => {
      const range = `created_at_i>=${Date.UTC(y, 0, 1) / 1000},created_at_i<${Date.UTC(y + 1, 0, 1) / 1000}`;
      return (await getJson<HnSearch>(`${HN}?query=${q}&tags=story&hitsPerPage=0&numericFilters=${range}`)).nbHits;
    }),
  );
  const top = await getJson<HnSearch>(`${HN}?query=${q}&tags=story&hitsPerPage=5`);
  const topRows = top.hits.map((h) => [day(h.created_at), h.title, h.points, `https://news.ycombinator.com/item?id=${h.objectID}`]);
  return `Hacker News stories per year (${thisYear} is partial):\n\n${table(years.map(String), [counts])}\nMost discussed:\n\n${table(["Date", "Story", "Points", "Link"], topRows)}`;
}

export async function market(query: string, sics: string[]) {
  const parts = await Promise.all([
    sics.length ? section("UK buyer count", () => businessCounts(sics)) : Promise.resolve("## UK buyer count\n\n_skipped: pass --sic with 5-digit SIC codes_\n"),
    section("UK public contracts", () => contracts(query)),
    section("UK public research funding", () => researchFunding(query)),
    section("Attention on Hacker News", () => attention(query)),
  ]);
  const gap = "\n_Not covered here: leaders, startups and funding. Name them with a web search and cite each one._\n";
  return `# Market signals: "${query}"\n\n${parts.join("\n")}${gap}`;
}
