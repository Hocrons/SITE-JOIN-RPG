-- =====================================================================
--  ETAPA 4 — Catálogo de itens e habilidades + o que cada ficha tem
--  Rode no SQL Editor do Supabase, depois do 0003.
--  Em seguida rode 0005_catalogo_livro.sql (o conteúdo do Livro de Regras).
-- =====================================================================

-- Catálogo: mesa_id nulo = catálogo base (livros), visível para todos e só alterável pelo SQL.
-- mesa_id preenchido = entradas criadas pela mesa (mestre e jogadores).
create table if not exists public.catalogo (
  id         uuid primary key default gen_random_uuid(),
  mesa_id    uuid references public.mesas on delete cascade,
  tipo       text not null,
  nome       text not null,
  dados      jsonb not null default '{}',   -- campos de regra (dano, círculo, custo, NEX...)
  resumo     text not null default '',
  descricao  text not null default '',      -- texto livre da mesa
  fonte      text,
  criado_por uuid,
  criado_em  timestamptz not null default now()
);
create index if not exists catalogo_tipo_nome on public.catalogo (tipo, nome);
create index if not exists catalogo_mesa on public.catalogo (mesa_id);

alter table public.catalogo enable row level security;
create policy ler on public.catalogo for select
  using (mesa_id is null or eh_membro(mesa_id));
create policy criar on public.catalogo for insert
  with check (mesa_id is not null and eh_membro(mesa_id) and criado_por = auth.uid());
create policy mudar on public.catalogo for update
  using (mesa_id is not null and (eh_mestre(mesa_id) or criado_por = auth.uid()))
  with check (mesa_id is not null and (eh_mestre(mesa_id) or criado_por = auth.uid()));
create policy apagar on public.catalogo for delete
  using (mesa_id is not null and (eh_mestre(mesa_id) or criado_por = auth.uid()));

-- O que cada personagem tem: inventário, habilidades/poderes e rituais.
create table if not exists public.personagem_itens (
  id            uuid primary key default gen_random_uuid(),
  personagem_id uuid not null references public.personagens on delete cascade,
  mesa_id       uuid not null references public.mesas on delete cascade,
  catalogo_id   uuid references public.catalogo on delete set null,
  secao         text not null check (secao in ('inventario', 'habilidades', 'rituais')),
  tipo          text,
  nome          text not null,
  resumo        text not null default '',
  categoria     text,
  espacos       numeric,
  quantidade    int not null default 1,
  nota          text not null default '',
  equipado      boolean not null default false,
  ordem         int not null default 0,
  criado_em     timestamptz not null default now()
);
create index if not exists personagem_itens_p on public.personagem_itens (personagem_id);

create trigger herdar_mesa before insert on public.personagem_itens
  for each row execute function public.tg_herdar_mesa_personagem();

alter table public.personagem_itens enable row level security;
create policy dono_ou_mestre on public.personagem_itens for all
  using (eh_mestre(mesa_id) or eh_dono(personagem_id))
  with check (eh_mestre(mesa_id) or eh_dono(personagem_id));

grant select, insert, update, delete on public.catalogo, public.personagem_itens to authenticated;

alter publication supabase_realtime add table public.catalogo, public.personagem_itens;
