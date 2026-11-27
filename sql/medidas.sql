-- ============================================================
-- PASTANAGA · medidas (cintura y peso, una vez por semana)
-- Tabla NUEVA: no toca ninguna de las que ya existen.
-- Los dos veis las de los dos; cada uno solo apunta y cambia las suyas.
-- Se pega en Supabase → SQL Editor → Run (se puede repetir).
-- ============================================================
create table if not exists public.pastanaga_medidas (
  user_id   uuid not null references auth.users(id) on delete cascade,
  fecha     date not null,
  cintura   numeric(5,1),          -- cm, a la altura del ombligo
  peso      numeric(5,1),          -- kg (opcional)
  creado    timestamptz not null default now(),
  primary key (user_id, fecha)
);

alter table public.pastanaga_medidas enable row level security;

drop policy if exists "medidas: ver las mias" on public.pastanaga_medidas;
create policy "medidas: ver las mias"
  on public.pastanaga_medidas for select
  to authenticated using (true);

drop policy if exists "medidas: crear las mias" on public.pastanaga_medidas;
create policy "medidas: crear las mias"
  on public.pastanaga_medidas for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "medidas: cambiar las mias" on public.pastanaga_medidas;
create policy "medidas: cambiar las mias"
  on public.pastanaga_medidas for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "medidas: borrar las mias" on public.pastanaga_medidas;
create policy "medidas: borrar las mias"
  on public.pastanaga_medidas for delete
  to authenticated using (auth.uid() = user_id);
