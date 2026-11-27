-- ============================================================
-- PASTANAGA · hábito de gym
-- Tabla NUEVA: no toca ninguna de las que ya existen
-- (ni pastanaga_finanzas, ni pastanaga_gym…).
-- Se pega en Supabase → SQL Editor → Run. Se puede ejecutar
-- más de una vez sin romper nada.
-- ============================================================

-- Una fila por persona y semana:
--   semana_gym = true  → semana de gym (L-X-V, cuenta con 2)
--   semana_gym = false → semana en casa (rutina D, cuenta con 1)
create table if not exists public.pastanaga_semanas (
  user_id      uuid not null references auth.users(id) on delete cascade,
  lunes        date not null,              -- el lunes de esa semana
  semana_gym   boolean not null,
  creado       timestamptz not null default now(),
  primary key (user_id, lunes)
);

-- Si se creó con el nombre viejo de la columna, se renombra
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'pastanaga_semanas'
               and column_name = 'roney_tarde') then
    alter table public.pastanaga_semanas rename column roney_tarde to semana_gym;
  end if;
end $$;

alter table public.pastanaga_semanas enable row level security;

-- Los dos podéis VER las semanas; cada uno solo CREA y CAMBIA las suyas
drop policy if exists "semanas: ver si has iniciado sesion" on public.pastanaga_semanas;
create policy "semanas: ver si has iniciado sesion"
  on public.pastanaga_semanas for select
  to authenticated using (true);

drop policy if exists "semanas: crear las mias" on public.pastanaga_semanas;
create policy "semanas: crear las mias"
  on public.pastanaga_semanas for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "semanas: cambiar las mias" on public.pastanaga_semanas;
create policy "semanas: cambiar las mias"
  on public.pastanaga_semanas for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
