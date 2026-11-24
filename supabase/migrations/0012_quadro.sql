-- =====================================================================
--  ETAPA 8 — Quadro de investigação
--  * arquivos_mesa: o que o mestre manda (imagem, PDF ou texto). Fica
--    registrado mesmo que saia do quadro. Todos da mesa leem; só o mestre
--    envia, edita ou apaga.
--  * quadro_cartoes / quadro_ligacoes: um quadro só por mesa, que todos
--    (mestre e jogadores) mexem juntos, ao vivo.
-- =====================================================================
create table if not exists public.arquivos_mesa (
  id          uuid primary key default gen_random_uuid(),
  mesa_id     uuid not null references public.mesas on delete cascade,
  titulo      text not null check (length(trim(titulo)) between 1 and 160),
  tipo        text not null check (tipo in ('imagem', 'pdf', 'texto')),
  caminho     text,                       -- no storage (imagem/pdf)
  texto       text not null default '',   -- conteúdo (tipo texto) ou descrição
  enviado_por uuid default auth.uid(),
  criado_em   timestamptz not null default now()
);
create index if not exists arquivos_mesa_mesa on public.arquivos_mesa (mesa_id, criado_em desc);

create table if not exists public.quadro_cartoes (
  id            uuid primary key default gen_random_uuid(),
  mesa_id       uuid not null references public.mesas on delete cascade,
  tipo          text not null check (tipo in ('arquivo', 'nota')),
  arquivo_id    uuid references public.arquivos_mesa on delete cascade,
  texto         text not null default '',
  cor           text not null default 'papel',
  x             real not null default 0,
  y             real not null default 0,
  largura       real not null default 200,
  criado_por    uuid default auth.uid(),
  autor         text,
  atualizado_em timestamptz not null default now(),
  check (tipo <> 'arquivo' or arquivo_id is not null)
);
create index if not exists quadro_cartoes_mesa on public.quadro_cartoes (mesa_id);

create table if not exists public.quadro_ligacoes (
  id         uuid primary key default gen_random_uuid(),
  mesa_id    uuid not null references public.mesas on delete cascade,
  origem_id  uuid not null references public.quadro_cartoes on delete cascade,
  destino_id uuid not null references public.quadro_cartoes on delete cascade,
  rotulo     text not null default '',
  criado_por uuid default auth.uid(),
  criado_em  timestamptz not null default now(),
  check (origem_id <> destino_id)
);
create index if not exists quadro_ligacoes_mesa on public.quadro_ligacoes (mesa_id);

-- autor do cartão (nome do personagem ou "Mestre") e carimbo de atualização
create or replace function public.tg_quadro_cartao() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    select coalesce(p.nome, m.nome_exibicao, case when m.papel = 'mestre' then 'Mestre' end)
      into new.autor
      from membros m left join personagens p on p.id = m.personagem_id
     where m.user_id = auth.uid() and m.mesa_id = new.mesa_id;
  else
    new.mesa_id := old.mesa_id;
    new.criado_por := old.criado_por;
    new.autor := old.autor;
  end if;
  new.atualizado_em := now();
  return new;
end $$;
create trigger antes before insert or update on public.quadro_cartoes
  for each row execute function public.tg_quadro_cartao();

-- a ligação precisa ser entre cartões da mesma mesa
create or replace function public.tg_quadro_ligacao() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from quadro_cartoes where id = new.origem_id and mesa_id = new.mesa_id)
     or not exists (select 1 from quadro_cartoes where id = new.destino_id and mesa_id = new.mesa_id) then
    raise exception 'Ligação entre cartões de outra mesa.';
  end if;
  return new;
end $$;
create trigger antes before insert or update on public.quadro_ligacoes
  for each row execute function public.tg_quadro_ligacao();

alter table public.arquivos_mesa  enable row level security;
alter table public.quadro_cartoes enable row level security;
alter table public.quadro_ligacoes enable row level security;

create policy ler on public.arquivos_mesa for select using (eh_membro(mesa_id));
create policy mestre on public.arquivos_mesa for all using (eh_mestre(mesa_id)) with check (eh_mestre(mesa_id));

create policy membros on public.quadro_cartoes for all using (eh_membro(mesa_id)) with check (eh_membro(mesa_id));
create policy membros on public.quadro_ligacoes for all using (eh_membro(mesa_id)) with check (eh_membro(mesa_id));

grant select, insert, update, delete on public.arquivos_mesa, public.quadro_cartoes, public.quadro_ligacoes to authenticated;
alter publication supabase_realtime add table public.arquivos_mesa, public.quadro_cartoes, public.quadro_ligacoes;

-- arquivos do quadro no storage: quadro/<mesa>/<arquivo>.<ext>; todos da mesa leem (o mestre já envia pela regra geral)
create policy "midia ler quadro" on storage.objects for select to authenticated using (
  bucket_id = 'midia' and (storage.foldername(name))[1] = 'quadro'
  and eh_membro(uuid_ou_nulo((storage.foldername(name))[2]))
);
