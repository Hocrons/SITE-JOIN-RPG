-- =====================================================================
--  TABULEIRO — etapa 2: tokens
--  * Cada token pertence a uma cena e ocupa N×N quadrados da grade
--    (posição guardada em coluna/linha, então acompanha a grade se o
--    mestre realinhar).
--  * Token de agente fica ligado ao personagem: o dono move o próprio.
--  * "oculto": jogadores não recebem o token (nem a imagem dele) até o
--    mestre revelar.
-- =====================================================================
create table if not exists public.tokens (
  id             uuid primary key default gen_random_uuid(),
  mesa_id        uuid not null references public.mesas on delete cascade,
  cena_id        uuid not null references public.cenas on delete cascade,
  personagem_id  uuid references public.personagens on delete cascade,
  nome           text not null check (length(trim(nome)) between 1 and 60),
  imagem_caminho text,
  tamanho        int  not null default 1 check (tamanho between 1 and 8),
  coluna         int  not null default 0,
  linha          int  not null default 0,
  faccao         text not null default 'neutro'
                 check (faccao in ('agente', 'aliado', 'neutro', 'inimigo', 'paranormal')),
  oculto         boolean not null default false,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
create index if not exists tokens_cena on public.tokens (cena_id);
create index if not exists tokens_mesa on public.tokens (mesa_id);
create unique index if not exists tokens_um_por_personagem on public.tokens (cena_id, personagem_id) where personagem_id is not null;

create or replace function public.tg_tokens_antes() returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  if tg_op = 'UPDATE' then
    new.mesa_id := old.mesa_id;
    new.cena_id := old.cena_id;
  end if;
  if not exists (select 1 from cenas where id = new.cena_id and mesa_id = new.mesa_id) then
    raise exception 'Cena de outra mesa.';
  end if;
  if new.personagem_id is not null
     and not exists (select 1 from personagens where id = new.personagem_id and mesa_id = new.mesa_id) then
    raise exception 'Personagem de outra mesa.';
  end if;
  return new;
end $$;
create trigger antes before insert or update on public.tokens
  for each row execute function public.tg_tokens_antes();

create or replace function public.pode_ver_token(p_token uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from tokens t
     where t.id = p_token and (eh_mestre(t.mesa_id) or (not t.oculto and pode_ver_cena(t.cena_id)))
  )
$$;

alter table public.tokens enable row level security;
create policy ver on public.tokens for select
  using (eh_mestre(mesa_id) or (not oculto and pode_ver_cena(cena_id)));
create policy mestre on public.tokens for all
  using (eh_mestre(mesa_id)) with check (eh_mestre(mesa_id));
grant select, insert, update, delete on public.tokens to authenticated;
alter publication supabase_realtime add table public.tokens;

-- mover: o mestre move qualquer um; o jogador só o token do próprio personagem,
-- na cena que está na mesa. Só muda coluna/linha.
create or replace function public.token_mover(p_token uuid, p_coluna int, p_linha int)
returns public.tokens
language plpgsql security definer set search_path = public as $$
declare t tokens;
begin
  select * into t from tokens where id = p_token for update;
  if not found then raise exception 'Token não encontrado.'; end if;
  if not (
    eh_mestre(t.mesa_id)
    or (t.personagem_id is not null and eh_dono(t.personagem_id) and not t.oculto and pode_ver_cena(t.cena_id))
  ) then
    raise exception 'Você só pode mover o seu próprio token.' using errcode = '42501';
  end if;
  update tokens set coluna = p_coluna, linha = p_linha where id = p_token returning * into t;
  return t;
end $$;
revoke all on function public.token_mover(uuid, int, int) from public, anon;
grant execute on function public.token_mover(uuid, int, int) to authenticated;

-- imagens: tokens/<mesa>/<token>/<arquivo>; jogador só lê token visível
create policy "midia ler tokens" on storage.objects for select to authenticated using (
  bucket_id = 'midia' and (storage.foldername(name))[1] = 'tokens'
  and pode_ver_token(uuid_ou_nulo((storage.foldername(name))[3]))
);

-- backup leva os tokens (depois das cenas)
create or replace function public._tabelas_backup() returns text[]
language sql immutable as $$
  select array[
    'fichas', 'fichas_detalhes', 'personagens_privado',
    'grupos_ancora', 'presets_dados', 'modelos_ameaca', 'catalogo', 'personagem_itens',
    'lore_entradas', 'lore_entradas_reveladas', 'lore_notas_mestre', 'lore_conexoes',
    'lore_conexoes_reveladas', 'lore_imagens',
    'eventos', 'eventos_revelados', 'eventos_entradas',
    'notas_pessoais', 'arquivos_mesa', 'quadro_cartoes', 'quadro_ligacoes',
    'pins_legiveis', 'cenas', 'tokens'
  ]
$$;
