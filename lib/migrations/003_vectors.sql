create table if not exists vectors (
  url text primary key,
  v   blob not null
);

-- Retrieval is embeddings now. The keyword index is gone rather than left
-- behind a flag: two retrieval paths means two sets of results to explain.
drop table if exists people_fts;
