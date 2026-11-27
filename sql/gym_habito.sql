-- ============================================================
-- PASTANAGA · hábito de gym (rama gym-habito)
-- Tabla NUEVA: no toca ninguna de las que ya existen
-- (ni pastanaga_finanzas, ni pastanaga_gym…).
-- Se pega una vez en Supabase → SQL Editor → Run.
-- ============================================================

-- Una fila por persona y semana: ¿esa semana Roney va de tarde?
--   true  → semana de gym (L-X-V, cuenta con 2)
--   false → semana en casa (rutina D, cuenta con 1)
create table if not exists public.pastanaga_semanas (
  user_id      uuid not null references auth.users(id) on delete cascade,
  lunes        date not null,              -- el lunes de esa semana
  roney_tarde  boolean not null,
  creado       timestamptz not null default now(),
  primary key (user_id, lunes)
);

alter table public.pastanaga_semanas enable row level security;

-- Los dos podéis VER las semanas (para cotillear la racha del otro)
create policy "semanas: ver si has iniciado sesion"
  on public.pastanaga_semanas for select
  to authenticated using (true);

-- Pero cada uno solo CREA y CAMBIA las suyas
create policy "semanas: crear las mias"
  on public.pastanaga_semanas for insert
  to authenticated with check (auth.uid() = user_id);

create policy "semanas: cambiar las mias"
  on public.pastanaga_semanas for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
