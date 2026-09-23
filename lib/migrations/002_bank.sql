-- One row per person, keyed on the LinkedIn profile URL. That key is what makes
-- merging several members' exports an exact join rather than name matching.
create table if not exists people (
  url     text primary key,
  name    text not null,
  title   text,
  company text
);

-- One row per member who knows that person. Two rows for one url is the whole
-- point: it means two people in the cohort can make the introduction.
create table if not exists knows (
  member_email text not null,
  url          text not null,
  connected_on text,
  primary key (member_email, url)
);

create index if not exists knows_url_idx on knows (url);

create virtual table if not exists people_fts using fts5(url unindexed, text);
