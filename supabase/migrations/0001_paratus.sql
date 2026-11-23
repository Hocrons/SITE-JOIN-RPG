-- =====================================================================
--  PARATUS — esquema completo (tabelas, regras de segurança, funções)
--  Rode este arquivo inteiro no SQL Editor do Supabase (uma vez).
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 1. MESAS E ACESSO
-- ---------------------------------------------------------------------
create table public.mesas (
  id            uuid primary key default gen_random_uuid(),
  codigo        text not null unique check (codigo ~ '^[A-Z0-9-]{3,20}$'),
  nome          text not null,
  ancora_global boolean not null default false,
  criado_em     timestamptz not null default now()
);

-- Hash do PIN do mestre: tabela sem nenhuma política => ninguém lê pela API.
create table public.mesas_credenciais (
  mesa_id         uuid primary key references public.mesas on delete cascade,
  pin_mestre_hash text not null
);

create table public.personagens (
  id               uuid primary key default gen_random_uuid(),
  mesa_id          uuid not null references public.mesas on delete cascade,
  tipo             text not null default 'pj' check (tipo in ('pj','npc','ameaca')),
  nome             text not null,
  jogador          text,
  classe           text,
  trilha           text,
  origem           text,
  foto_caminho     text,
  ordem            int  not null default 0,
  tem_marca        boolean not null default false,
  ancora_ativa     boolean not null default false,
  usa_determinacao boolean not null default false,   -- PD substitui SAN e PE
  pv_atual         int  not null default 0,
  san_atual        int  not null default 0,
  pe_atual         int  not null default 0,
  pd_atual         int,
  pv_temp          int  not null default 0,  -- PV temporário: fica ACIMA do máximo, não é cortado pela Âncora
  condicoes        text[] not null default '{}',
  arquivado        boolean not null default false,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);
create index on public.personagens (mesa_id);

create table public.personagens_pin (
  personagem_id uuid primary key references public.personagens on delete cascade,
  pin_hash      text not null
);

create table public.tentativas_pin (
  id        bigserial primary key,
  mesa_id   uuid not null references public.mesas on delete cascade,
  alvo      uuid,                       -- null = PIN do mestre
  criado_em timestamptz not null default now()
);

create table public.membros (
  user_id       uuid not null references auth.users on delete cascade,
  mesa_id       uuid not null references public.mesas on delete cascade,
  papel         text not null check (papel in ('mestre','jogador')),
  personagem_id uuid references public.personagens on delete cascade,
  nome_exibicao text not null,
  criado_em     timestamptz not null default now(),
  primary key (user_id, mesa_id),
  check (papel = 'mestre' or personagem_id is not null)
);
create index on public.membros (mesa_id);

-- Partes "públicas" da ficha (barras): NEX e máximos de cada variante.
create table public.fichas (
  personagem_id uuid not null references public.personagens on delete cascade,
  variante      text not null check (variante in ('99','50')),
  mesa_id       uuid not null references public.mesas on delete cascade,
  nex           int  not null,
  pv_max        int  not null default 0,
  san_max       int  not null default 0,
  pe_max        int  not null default 0,
  pd_max        int,
  primary key (personagem_id, variante)
);

-- Partes privadas da ficha (só dono e mestre).
create table public.fichas_detalhes (
  personagem_id uuid not null references public.personagens on delete cascade,
  variante      text not null check (variante in ('99','50')),
  mesa_id       uuid not null references public.mesas on delete cascade,
  defesa        int,
  deslocamento  text,
  atributos     jsonb not null default '{"AGI":0,"FOR":0,"INT":0,"PRE":0,"VIG":0}',
  pericias      jsonb not null default '[]',   -- [{nome, atributo, bonus}]
  primary key (personagem_id, variante)
);

create table public.personagens_privado (
  personagem_id uuid primary key references public.personagens on delete cascade,
  mesa_id       uuid not null references public.mesas on delete cascade,
  anotacoes     text  not null default '',
  inventario    jsonb not null default '[]'     -- [{nome, qtd, nota}]
);

create table public.grupos_ancora (
  id             uuid primary key default gen_random_uuid(),
  mesa_id        uuid not null references public.mesas on delete cascade,
  nome           text not null,
  personagem_ids uuid[] not null default '{}'
);

create table public.log_alteracoes (
  id              bigserial primary key,
  mesa_id         uuid not null references public.mesas on delete cascade,
  personagem_id   uuid references public.personagens on delete cascade,
  personagem_nome text,
  lote            bigint not null,           -- mesma transação = mesmo lote (desfazer junto)
  user_id         uuid,
  autor           text not null,
  campo           text not null,
  antes           jsonb,
  depois          jsonb,
  desfeito        boolean not null default false,
  criado_em       timestamptz not null default now()
);
create index on public.log_alteracoes (mesa_id, id desc);

-- ---------------------------------------------------------------------
-- 2. DADOS
-- ---------------------------------------------------------------------
create table public.presets_dados (
  id            uuid primary key default gen_random_uuid(),
  mesa_id       uuid not null references public.mesas on delete cascade,
  personagem_id uuid references public.personagens on delete cascade,  -- null = preset do mestre
  titulo        text not null,
  tipo          text not null default 'livre' check (tipo in ('teste','dano','livre')),
  expressao     text not null default '',      -- usada em 'dano' e 'livre'
  atributo      text check (atributo in ('AGI','FOR','INT','PRE','VIG')),
  bonus         int  not null default 0,
  margem        int  not null default 20,
  multiplicador int  not null default 2,
  ordem         int  not null default 0,
  criado_em     timestamptz not null default now()
);

create table public.rolagens (
  id            bigserial primary key,
  mesa_id       uuid not null references public.mesas on delete cascade,
  user_id       uuid,
  autor         text not null,
  personagem_id uuid references public.personagens on delete set null,
  titulo        text,
  expressao     text not null,
  detalhes      jsonb not null,
  total         int  not null,
  critico       boolean not null default false,
  secreta       boolean not null default false,  -- só autor + mestre veem
  criado_em     timestamptz not null default now()
);
create index on public.rolagens (mesa_id, id desc);

-- ---------------------------------------------------------------------
-- 3. COMBATE
-- ---------------------------------------------------------------------
create table public.modelos_ameaca (
  id        uuid primary key default gen_random_uuid(),
  mesa_id   uuid not null references public.mesas on delete cascade,
  nome      text not null,
  tipo      text not null default 'ameaca' check (tipo in ('npc','ameaca')),
  pv_max    int  not null default 10,
  defesa    int,
  iniciativa_bonus int not null default 0,
  anotacoes text not null default ''
);

create table public.combates (
  id        uuid primary key default gen_random_uuid(),
  mesa_id   uuid not null references public.mesas on delete cascade,
  nome      text not null default 'Combate',
  ativo     boolean not null default true,
  rodada    int not null default 1,
  turno     int not null default 0,
  criado_em timestamptz not null default now()
);

create table public.participantes (
  id            uuid primary key default gen_random_uuid(),
  combate_id    uuid not null references public.combates on delete cascade,
  mesa_id       uuid not null references public.mesas on delete cascade,
  personagem_id uuid references public.personagens on delete set null,
  nome          text not null,
  tipo          text not null default 'ameaca' check (tipo in ('pj','npc','ameaca')),
  iniciativa    int,
  desempate     int not null default 0,
  ordem         int not null default 0,
  pv_atual      int,
  pv_max        int,
  defesa        int,
  condicoes     text[] not null default '{}',
  anotacoes     text not null default '',
  pv_visivel    boolean not null default false,
  derrotado     boolean not null default false
);

-- Espelho sem segredos, que os jogadores podem ler (preenchido por gatilho).
create table public.participantes_publico (
  id         uuid primary key references public.participantes on delete cascade,
  combate_id uuid not null references public.combates on delete cascade,
  mesa_id    uuid not null references public.mesas on delete cascade,
  personagem_id uuid,
  nome       text not null,
  tipo       text not null,
  iniciativa int,
  ordem      int not null,
  condicoes  text[] not null,
  derrotado  boolean not null,
  pv_atual   int,
  pv_max     int
);

-- ---------------------------------------------------------------------
-- 4. CÓDICE DA LORE
-- ---------------------------------------------------------------------
create table public.lore_entradas (
  id            uuid primary key default gen_random_uuid(),
  mesa_id       uuid not null references public.mesas on delete cascade,
  tipo          text not null check (tipo in ('personagem','faccao','local','reliquia','evento','segredo','nota')),
  titulo        text not null,
  resumo        text not null default '',
  texto         text not null default '',
  tags          text[] not null default '{}',
  status        text not null default 'aberto' check (status in ('decidido','proposto','aberto')),
  visibilidade  text not null default 'mestre' check (visibilidade in ('mestre','todos','especificos')),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index on public.lore_entradas (mesa_id);

create table public.lore_entradas_reveladas (
  entrada_id    uuid not null references public.lore_entradas on delete cascade,
  personagem_id uuid not null references public.personagens on delete cascade,
  mesa_id       uuid not null references public.mesas on delete cascade,
  primary key (entrada_id, personagem_id)
);

create table public.lore_notas_mestre (
  entrada_id uuid primary key references public.lore_entradas on delete cascade,
  mesa_id    uuid not null references public.mesas on delete cascade,
  texto      text not null default ''
);

create table public.lore_conexoes (
  id           uuid primary key default gen_random_uuid(),
  mesa_id      uuid not null references public.mesas on delete cascade,
  origem_id    uuid not null references public.lore_entradas on delete cascade,
  destino_id   uuid not null references public.lore_entradas on delete cascade,
  rotulo       text not null,
  visibilidade text not null default 'mestre' check (visibilidade in ('mestre','todos','especificos')),
  atualizado_em timestamptz not null default now(),
  check (origem_id <> destino_id)
);

create table public.lore_conexoes_reveladas (
  conexao_id    uuid not null references public.lore_conexoes on delete cascade,
  personagem_id uuid not null references public.personagens on delete cascade,
  mesa_id       uuid not null references public.mesas on delete cascade,
  primary key (conexao_id, personagem_id)
);

create table public.lore_imagens (
  id         uuid primary key default gen_random_uuid(),
  mesa_id    uuid not null references public.mesas on delete cascade,
  entrada_id uuid not null references public.lore_entradas on delete cascade,
  caminho    text not null,      -- no Storage: lore/<mesa>/<entrada>/<arquivo>
  legenda    text not null default '',
  ordem      int  not null default 0
);

-- ---------------------------------------------------------------------
-- 5. LINHA DO TEMPO
-- ---------------------------------------------------------------------
create table public.eventos (
  id            uuid primary key default gen_random_uuid(),
  mesa_id       uuid not null references public.mesas on delete cascade,
  titulo        text not null,
  descricao     text not null default '',
  ordem         numeric not null default 0,   -- posição na cronologia do mundo
  data_rotulo   text not null default '',     -- "Ano 312", "décadas atrás"...
  era           text not null default '',     -- "antes do time skip"...
  aproximada    boolean not null default false,
  sessao        text not null default '',     -- sessão real em que aconteceu
  imagem_caminho text,
  visibilidade  text not null default 'mestre' check (visibilidade in ('mestre','todos','especificos')),
  atualizado_em timestamptz not null default now()
);

create table public.eventos_revelados (
  evento_id     uuid not null references public.eventos on delete cascade,
  personagem_id uuid not null references public.personagens on delete cascade,
  mesa_id       uuid not null references public.mesas on delete cascade,
  primary key (evento_id, personagem_id)
);

create table public.eventos_entradas (
  evento_id  uuid not null references public.eventos on delete cascade,
  entrada_id uuid not null references public.lore_entradas on delete cascade,
  mesa_id    uuid not null references public.mesas on delete cascade,
  primary key (evento_id, entrada_id)
);

-- =====================================================================
-- FUNÇÕES AUXILIARES DE PERMISSÃO
-- =====================================================================
create or replace function public.eh_membro(m uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from membros where user_id = auth.uid() and mesa_id = m);
$$;

create or replace function public.eh_mestre(m uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from membros where user_id = auth.uid() and mesa_id = m and papel = 'mestre');
$$;

create or replace function public.meu_personagem(m uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select personagem_id from membros where user_id = auth.uid() and mesa_id = m;
$$;

create or replace function public.eh_dono(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from membros where user_id = auth.uid() and personagem_id = p);
$$;

create or replace function public.pode_ver_entrada(e uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from lore_entradas le
    where le.id = e
      and ( eh_mestre(le.mesa_id)
         or ( eh_membro(le.mesa_id)
              and ( le.visibilidade = 'todos'
                 or ( le.visibilidade = 'especificos'
                      and exists (select 1 from lore_entradas_reveladas r
                                  where r.entrada_id = le.id
                                    and r.personagem_id = meu_personagem(le.mesa_id))))))
  );
$$;

create or replace function public.pode_ver_evento(e uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from eventos ev
    where ev.id = e
      and ( eh_mestre(ev.mesa_id)
         or ( eh_membro(ev.mesa_id)
              and ( ev.visibilidade = 'todos'
                 or ( ev.visibilidade = 'especificos'
                      and exists (select 1 from eventos_revelados r
                                  where r.evento_id = ev.id
                                    and r.personagem_id = meu_personagem(ev.mesa_id))))))
  );
$$;

create or replace function public.uuid_ou_nulo(t text) returns uuid
language plpgsql immutable as $$
begin
  return t::uuid;
exception when others then
  return null;
end $$;

-- =====================================================================
-- GATILHOS
-- =====================================================================

-- Copia mesa_id do pai (para tabelas-filhas que dependem dele em RLS/realtime).
create or replace function public.tg_herdar_mesa_personagem() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select mesa_id into new.mesa_id from personagens where id = new.personagem_id;
  return new;
end $$;

create trigger herdar_mesa before insert on public.fichas
  for each row execute function public.tg_herdar_mesa_personagem();
create trigger herdar_mesa before insert on public.fichas_detalhes
  for each row execute function public.tg_herdar_mesa_personagem();
create trigger herdar_mesa before insert on public.personagens_privado
  for each row execute function public.tg_herdar_mesa_personagem();

create or replace function public.tg_herdar_mesa_entrada() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select mesa_id into new.mesa_id from lore_entradas where id = new.entrada_id;
  return new;
end $$;
create trigger herdar_mesa before insert on public.lore_entradas_reveladas
  for each row execute function public.tg_herdar_mesa_entrada();
create trigger herdar_mesa before insert on public.lore_notas_mestre
  for each row execute function public.tg_herdar_mesa_entrada();
create trigger herdar_mesa before insert on public.lore_imagens
  for each row execute function public.tg_herdar_mesa_entrada();

create or replace function public.tg_herdar_mesa_conexao() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select mesa_id into new.mesa_id from lore_conexoes where id = new.conexao_id;
  return new;
end $$;
create trigger herdar_mesa before insert on public.lore_conexoes_reveladas
  for each row execute function public.tg_herdar_mesa_conexao();

create or replace function public.tg_herdar_mesa_evento() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select mesa_id into new.mesa_id from eventos where id = new.evento_id;
  return new;
end $$;
create trigger herdar_mesa before insert on public.eventos_revelados
  for each row execute function public.tg_herdar_mesa_evento();
create trigger herdar_mesa before insert on public.eventos_entradas
  for each row execute function public.tg_herdar_mesa_evento();

create or replace function public.tg_herdar_mesa_combate() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select mesa_id into new.mesa_id from combates where id = new.combate_id;
  return new;
end $$;
create trigger herdar_mesa before insert on public.participantes
  for each row execute function public.tg_herdar_mesa_combate();

-- Todo personagem novo ganha as duas fichas e a parte privada.
create or replace function public.tg_personagem_criado() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into fichas (personagem_id, variante, mesa_id, nex) values
    (new.id, '99', new.mesa_id, 99), (new.id, '50', new.mesa_id, 50);
  insert into fichas_detalhes (personagem_id, variante, mesa_id) values
    (new.id, '99', new.mesa_id), (new.id, '50', new.mesa_id);
  insert into personagens_privado (personagem_id, mesa_id) values (new.id, new.mesa_id);
  return null;
end $$;
create trigger personagem_criado after insert on public.personagens
  for each row execute function public.tg_personagem_criado();

-- REGRA CENTRAL: protege campos do mestre e aplica o teto da ficha ativa.
-- Âncora ON  -> ficha 50%: valores atuais acima do máximo são cortados.
-- Âncora OFF -> ficha 99%: valores atuais continuam iguais.
create or replace function public.tg_personagens_antes() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  f fichas;
begin
  if auth.uid() is not null and not eh_mestre(old.mesa_id) then
    if new.mesa_id <> old.mesa_id or new.tipo <> old.tipo
       or new.tem_marca <> old.tem_marca or new.ancora_ativa <> old.ancora_ativa
       or new.usa_determinacao <> old.usa_determinacao or new.arquivado <> old.arquivado
       or new.jogador is distinct from old.jogador or new.ordem <> old.ordem then
      raise exception 'Somente o mestre pode alterar esse campo.' using errcode = '42501';
    end if;
  end if;

  select * into f from fichas
   where personagem_id = new.id and variante = case when new.ancora_ativa then '50' else '99' end;
  if found then
    new.pv_atual  := least(new.pv_atual,  f.pv_max);
    new.san_atual := least(new.san_atual, f.san_max);
    new.pe_atual  := least(new.pe_atual,  f.pe_max);
    if new.pd_atual is not null and f.pd_max is not null then
      new.pd_atual := least(new.pd_atual, f.pd_max);
    end if;
  end if;
  new.pv_atual  := greatest(new.pv_atual, 0);
  new.pv_temp   := greatest(new.pv_temp, 0);
  new.san_atual := greatest(new.san_atual, 0);
  new.pe_atual  := greatest(new.pe_atual, 0);
  if new.pd_atual is not null then new.pd_atual := greatest(new.pd_atual, 0); end if;
  new.atualizado_em := now();
  return new;
end $$;
create trigger personagens_antes before update on public.personagens
  for each row execute function public.tg_personagens_antes();

-- Log automático de PV/SAN/PE/PD, condições e Âncora.
create or replace function public.tg_personagens_log() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  campos text[] := array['pv_atual','pv_temp','san_atual','pe_atual','pd_atual','condicoes','ancora_ativa'];
  c text;
  o jsonb := to_jsonb(old);
  n jsonb := to_jsonb(new);
  quem text;
begin
  if coalesce(current_setting('paratus.sem_log', true), '') = '1' then
    return null;
  end if;
  select nome_exibicao into quem from membros where user_id = auth.uid() and mesa_id = new.mesa_id;
  foreach c in array campos loop
    if o -> c is distinct from n -> c then
      insert into log_alteracoes (mesa_id, personagem_id, personagem_nome, lote, user_id, autor, campo, antes, depois)
      values (new.mesa_id, new.id, new.nome, txid_current(), auth.uid(), coalesce(quem, 'Sistema'), c, o -> c, n -> c);
    end if;
  end loop;
  return null;
end $$;
create trigger personagens_log after update on public.personagens
  for each row execute function public.tg_personagens_log();

-- Se o mestre muda um máximo, reaplica o teto nos valores atuais.
create or replace function public.tg_fichas_depois() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('paratus.sem_log', '1', true);
  update personagens set pv_atual = pv_atual where id = new.personagem_id;
  perform set_config('paratus.sem_log', '', true);
  return null;
end $$;
create trigger fichas_depois after update on public.fichas
  for each row execute function public.tg_fichas_depois();

-- Espelho público dos participantes de combate.
create or replace function public.tg_participantes_espelho() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  mostra boolean := new.pv_visivel or new.tipo = 'pj';
begin
  insert into participantes_publico as pp
    (id, combate_id, mesa_id, personagem_id, nome, tipo, iniciativa, ordem, condicoes, derrotado, pv_atual, pv_max)
  values
    (new.id, new.combate_id, new.mesa_id, new.personagem_id, new.nome, new.tipo, new.iniciativa, new.ordem,
     new.condicoes, new.derrotado,
     case when mostra then new.pv_atual end, case when mostra then new.pv_max end)
  on conflict (id) do update set
    nome = excluded.nome, tipo = excluded.tipo, iniciativa = excluded.iniciativa, ordem = excluded.ordem,
    condicoes = excluded.condicoes, derrotado = excluded.derrotado,
    pv_atual = excluded.pv_atual, pv_max = excluded.pv_max, personagem_id = excluded.personagem_id;
  return null;
end $$;
create trigger participantes_espelho after insert or update on public.participantes
  for each row execute function public.tg_participantes_espelho();

-- Revelar/ocultar "toca" o item pai, para o tempo real avisar os jogadores.
create or replace function public.tg_tocar_entrada() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update lore_entradas set atualizado_em = now() where id = coalesce(new.entrada_id, old.entrada_id);
  return null;
end $$;
create trigger tocar after insert or delete on public.lore_entradas_reveladas
  for each row execute function public.tg_tocar_entrada();

create or replace function public.tg_tocar_conexao() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update lore_conexoes set atualizado_em = now() where id = coalesce(new.conexao_id, old.conexao_id);
  return null;
end $$;
create trigger tocar after insert or delete on public.lore_conexoes_reveladas
  for each row execute function public.tg_tocar_conexao();

create or replace function public.tg_tocar_evento() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update eventos set atualizado_em = now() where id = coalesce(new.evento_id, old.evento_id);
  return null;
end $$;
create trigger tocar after insert or delete on public.eventos_revelados
  for each row execute function public.tg_tocar_evento();

create or replace function public.tg_atualizado_em() returns trigger
language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;
create trigger atualizado_em before update on public.lore_entradas
  for each row execute function public.tg_atualizado_em();

-- =====================================================================
-- FUNÇÕES CHAMADAS PELO SITE (RPC)
-- =====================================================================

-- Tela de entrada: mostra o nome da mesa e os personagens jogáveis.
create or replace function public.mesa_por_codigo(p_codigo text)
returns table (mesa_id uuid, nome text, personagens jsonb)
language sql stable security definer set search_path = public as $$
  select m.id, m.nome,
         coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome, 'jogador', p.jogador)
                            order by p.ordem, p.nome) filter (where p.id is not null), '[]'::jsonb)
  from mesas m
  left join personagens p on p.mesa_id = m.id and p.tipo = 'pj' and not p.arquivado
  where m.codigo = upper(trim(p_codigo))
  group by m.id;
$$;

-- Entrar com PIN (personagem) ou como mestre (p_personagem nulo).
create or replace function public.entrar_mesa(p_codigo text, p_pin text, p_personagem uuid default null)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  m mesas;
  h text;
  quem text;
  falhas int;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'erro', 'Sessão inválida. Recarregue a página.');
  end if;
  select * into m from mesas where codigo = upper(trim(p_codigo));
  if not found then
    return jsonb_build_object('ok', false, 'erro', 'Mesa não encontrada.');
  end if;

  select count(*) into falhas from tentativas_pin
   where mesa_id = m.id and alvo is not distinct from p_personagem
     and criado_em > now() - interval '15 minutes';
  if falhas >= 8 then
    return jsonb_build_object('ok', false, 'erro', 'Muitas tentativas erradas. Espere 15 minutos.');
  end if;

  if p_personagem is null then
    select pin_mestre_hash into h from mesas_credenciais where mesa_id = m.id;
    quem := 'Mestre';
  else
    select pp.pin_hash, p.nome into h, quem
      from personagens p join personagens_pin pp on pp.personagem_id = p.id
     where p.id = p_personagem and p.mesa_id = m.id and p.tipo = 'pj' and not p.arquivado;
  end if;

  if h is null or h <> crypt(coalesce(p_pin, ''), h) then
    insert into tentativas_pin (mesa_id, alvo) values (m.id, p_personagem);
    return jsonb_build_object('ok', false, 'erro', 'PIN incorreto.');
  end if;

  delete from tentativas_pin where mesa_id = m.id and alvo is not distinct from p_personagem;

  insert into membros (user_id, mesa_id, papel, personagem_id, nome_exibicao)
  values (auth.uid(), m.id, case when p_personagem is null then 'mestre' else 'jogador' end, p_personagem, quem)
  on conflict (user_id, mesa_id) do update
    set papel = excluded.papel, personagem_id = excluded.personagem_id,
        nome_exibicao = excluded.nome_exibicao, criado_em = now();

  return jsonb_build_object('ok', true, 'mesa_id', m.id,
                            'papel', case when p_personagem is null then 'mestre' else 'jogador' end,
                            'personagem_id', p_personagem);
end $$;

create or replace function public.sair_mesa(p_mesa uuid) returns void
language sql security definer set search_path = public as $$
  delete from membros where user_id = auth.uid() and mesa_id = p_mesa;
$$;

-- Criar uma mesa nova (outras campanhas). Quem cria vira mestre.
create or replace function public.criar_mesa(p_nome text, p_codigo text, p_pin_mestre text)
returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  novo uuid;
begin
  if auth.uid() is null then raise exception 'Sessão inválida.'; end if;
  if length(coalesce(p_pin_mestre, '')) < 4 then raise exception 'O PIN precisa de pelo menos 4 caracteres.'; end if;
  insert into mesas (codigo, nome) values (upper(trim(p_codigo)), trim(p_nome)) returning id into novo;
  insert into mesas_credenciais values (novo, crypt(p_pin_mestre, gen_salt('bf')));
  insert into membros (user_id, mesa_id, papel, nome_exibicao) values (auth.uid(), novo, 'mestre', 'Mestre');
  return novo;
end $$;

-- Mestre define/troca PINs (personagem nulo = PIN do mestre).
create or replace function public.definir_pin(p_mesa uuid, p_pin text, p_personagem uuid default null)
returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.uid() is not null and not eh_mestre(p_mesa) then
    raise exception 'Somente o mestre.' using errcode = '42501';
  end if;
  if length(coalesce(p_pin, '')) < 4 then raise exception 'O PIN precisa de pelo menos 4 caracteres.'; end if;
  if p_personagem is null then
    update mesas_credenciais set pin_mestre_hash = crypt(p_pin, gen_salt('bf')) where mesa_id = p_mesa;
  else
    if not exists (select 1 from personagens where id = p_personagem and mesa_id = p_mesa) then
      raise exception 'Personagem não pertence a esta mesa.';
    end if;
    insert into personagens_pin values (p_personagem, crypt(p_pin, gen_salt('bf')))
    on conflict (personagem_id) do update set pin_hash = excluded.pin_hash;
  end if;
end $$;

-- Ajuste atômico (+/-) de PV/SAN/PE/PD. Roda com as permissões de quem chama.
create or replace function public.ajustar_status(p_personagem uuid, p_campo text, p_delta int)
returns personagens
language plpgsql security invoker set search_path = public as $$
declare
  r personagens;
begin
  if p_campo not in ('pv_atual','san_atual','pe_atual','pd_atual','pv_temp') then
    raise exception 'Campo inválido.';
  end if;
  if p_campo = 'pv_atual' and p_delta < 0 then
    -- Dano consome primeiro o PV temporário; o que sobrar sai do PV normal.
    update personagens
       set pv_temp  = greatest(pv_temp + p_delta, 0),
           pv_atual = pv_atual + least(pv_temp + p_delta, 0)
     where id = p_personagem
    returning * into r;
  else
    execute format('update personagens set %1$I = coalesce(%1$I, 0) + $1 where id = $2 returning *', p_campo)
      into r using p_delta, p_personagem;
  end if;
  if r.id is null then raise exception 'Sem permissão para alterar este personagem.' using errcode = '42501'; end if;
  return r;
end $$;

-- ÂNCORA
--  modo 'zona'  : liga/desliga para todos os PJs (lista nula) ou para os selecionados.
--  modo 'marca' : liga/desliga só para os selecionados que têm a Marca do Império.
create or replace function public.ancora_definir(p_mesa uuid, p_ativa boolean,
                                                 p_personagens uuid[] default null,
                                                 p_modo text default 'zona')
returns int
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  if auth.uid() is not null and not eh_mestre(p_mesa) then
    raise exception 'Somente o mestre controla a Âncora.' using errcode = '42501';
  end if;
  update personagens set ancora_ativa = p_ativa
   where mesa_id = p_mesa and tipo = 'pj' and not arquivado
     and (p_personagens is null or id = any (p_personagens))
     and (p_modo <> 'marca' or tem_marca)
     and ancora_ativa is distinct from p_ativa;
  get diagnostics n = row_count;
  if p_personagens is null and p_modo = 'zona' then
    update mesas set ancora_global = p_ativa where id = p_mesa;
  elsif not p_ativa then
    update mesas set ancora_global = false where id = p_mesa;
  end if;
  return n;
end $$;

-- Desfaz o último lote de alterações (ex.: um clique na Âncora global).
create or replace function public.desfazer_ultima(p_mesa uuid)
returns int
language plpgsql security definer set search_path = public as $$
declare
  l bigint;
  r log_alteracoes;
  qtd int := 0;
begin
  if auth.uid() is not null and not eh_mestre(p_mesa) then
    raise exception 'Somente o mestre.' using errcode = '42501';
  end if;
  select lote into l from log_alteracoes
   where mesa_id = p_mesa and not desfeito order by id desc limit 1;
  if l is null then return 0; end if;

  perform set_config('paratus.sem_log', '1', true);
  for r in select * from log_alteracoes
            where mesa_id = p_mesa and lote = l and not desfeito order by id desc loop
    execute format(
      'update personagens p set %1$I = x.%1$I from jsonb_populate_record(null::personagens, $1) x where p.id = $2',
      r.campo)
    using jsonb_build_object(r.campo, r.antes), r.personagem_id;
    qtd := qtd + 1;
  end loop;
  perform set_config('paratus.sem_log', '', true);

  update log_alteracoes set desfeito = true where mesa_id = p_mesa and lote = l;
  return qtd;
end $$;

-- ROLAGEM NO SERVIDOR
-- Notação: 3d20+5, 2d6+1d8+3, 4d20kh1+10 (fica com o maior), 2d20kl1 (fica com o menor).
-- p_critico multiplica a quantidade de dados (não o bônus fixo) por p_multiplicador.
create or replace function public.rolar(
  p_mesa uuid, p_expressao text, p_titulo text default null, p_personagem uuid default null,
  p_secreta boolean default false, p_margem int default 20, p_multiplicador int default 2,
  p_critico boolean default false)
returns rolagens
language plpgsql security definer set search_path = public as $$
declare
  expr     text := lower(regexp_replace(coalesce(p_expressao, ''), '\s', '', 'g'));
  m        text[];
  termos   jsonb := '[]'::jsonb;
  total    int := 0;
  sinal    int;
  qtd      int;
  faces    int;
  kn       int;
  dados    int[];
  mantidos int[];
  soma     int;
  crit     boolean := false;
  ndados   int := 0;
  quem     text;
  r        rolagens;
begin
  if not eh_membro(p_mesa) then
    raise exception 'Você não está nesta mesa.' using errcode = '42501';
  end if;
  if p_personagem is not null and not (eh_mestre(p_mesa) or eh_dono(p_personagem)) then
    raise exception 'Você só pode rolar pelo seu personagem.' using errcode = '42501';
  end if;
  if expr !~ '^[+-]?(\d*d\d+(k[hl]\d+)?|\d+)([+-](\d*d\d+(k[hl]\d+)?|\d+))*$' then
    raise exception 'Expressão inválida: %', p_expressao;
  end if;
  if left(expr, 1) not in ('+', '-') then expr := '+' || expr; end if;

  for m in select regexp_matches(expr, '([+-])(?:(\d*)d(\d+)(?:k([hl])(\d+))?|(\d+))', 'g') loop
    sinal := case when m[1] = '-' then -1 else 1 end;
    if m[6] is not null then
      total := total + sinal * m[6]::int;
      termos := termos || jsonb_build_array(jsonb_build_object('tipo', 'fixo', 'valor', sinal * m[6]::int));
    else
      qtd := coalesce(nullif(m[2], ''), '1')::int;
      faces := m[3]::int;
      if p_critico and m[4] is null then
        qtd := qtd * greatest(coalesce(p_multiplicador, 2), 1);
      end if;
      ndados := ndados + qtd;
      if qtd < 1 or faces < 2 or faces > 1000 or ndados > 200 then
        raise exception 'Dados demais ou inválidos.';
      end if;
      dados := array(select 1 + floor(random() * faces)::int from generate_series(1, qtd));
      if m[4] is not null then
        kn := least(m[5]::int, qtd);
        mantidos := array(select d from unnest(dados) d
                          order by case when m[4] = 'h' then -d else d end limit kn);
      else
        mantidos := dados;
      end if;
      soma := (select coalesce(sum(x), 0) from unnest(mantidos) x);
      total := total + sinal * soma;
      if faces = 20 and exists (select 1 from unnest(mantidos) x where x >= coalesce(p_margem, 20)) then
        crit := true;
      end if;
      termos := termos || jsonb_build_array(jsonb_build_object(
        'tipo', 'dados', 'qtd', qtd, 'faces', faces, 'sinal', sinal,
        'manter', case when m[4] is null then null else 'k' || m[4] || m[5] end,
        'dados', to_jsonb(dados), 'mantidos', to_jsonb(mantidos), 'soma', sinal * soma));
    end if;
  end loop;

  if p_personagem is not null then
    select nome into quem from personagens where id = p_personagem;
  else
    select nome_exibicao into quem from membros where user_id = auth.uid() and mesa_id = p_mesa;
  end if;

  insert into rolagens (mesa_id, user_id, autor, personagem_id, titulo, expressao, detalhes, total, critico, secreta)
  values (p_mesa, auth.uid(), coalesce(quem, '?'), p_personagem, nullif(trim(p_titulo), ''), p_expressao,
          jsonb_build_object('termos', termos, 'margem', p_margem, 'critico_aplicado', p_critico,
                             'multiplicador', p_multiplicador),
          total, crit, coalesce(p_secreta, false))
  returning * into r;
  return r;
end $$;

-- =====================================================================
-- RLS — REGRAS DE SEGURANÇA
-- =====================================================================
alter table public.mesas                   enable row level security;
alter table public.mesas_credenciais       enable row level security;
alter table public.personagens             enable row level security;
alter table public.personagens_pin         enable row level security;
alter table public.tentativas_pin          enable row level security;
alter table public.membros                 enable row level security;
alter table public.fichas                  enable row level security;
alter table public.fichas_detalhes         enable row level security;
alter table public.personagens_privado     enable row level security;
alter table public.grupos_ancora           enable row level security;
alter table public.log_alteracoes          enable row level security;
alter table public.presets_dados           enable row level security;
alter table public.rolagens                enable row level security;
alter table public.modelos_ameaca          enable row level security;
alter table public.combates                enable row level security;
alter table public.participantes           enable row level security;
alter table public.participantes_publico   enable row level security;
alter table public.lore_entradas           enable row level security;
alter table public.lore_entradas_reveladas enable row level security;
alter table public.lore_notas_mestre       enable row level security;
alter table public.lore_conexoes           enable row level security;
alter table public.lore_conexoes_reveladas enable row level security;
alter table public.lore_imagens            enable row level security;
alter table public.eventos                 enable row level security;
alter table public.eventos_revelados       enable row level security;
alter table public.eventos_entradas        enable row level security;

-- Tabelas de segredo: sem políticas + sem privilégios.
revoke all on public.mesas_credenciais, public.personagens_pin, public.tentativas_pin from anon, authenticated;

-- mesas
create policy ler   on public.mesas for select using (eh_membro(id));
create policy mudar on public.mesas for update using (eh_mestre(id)) with check (eh_mestre(id));
create policy apagar on public.mesas for delete using (eh_mestre(id));

-- membros: cada um vê os membros da própria mesa
create policy ler on public.membros for select using (eh_membro(mesa_id));
create policy expulsar on public.membros for delete using (eh_mestre(mesa_id) or user_id = auth.uid());

-- personagens: PJs são visíveis para a mesa; NPCs/ameaças só para o mestre
create policy ler on public.personagens for select
  using (eh_mestre(mesa_id) or (eh_membro(mesa_id) and tipo = 'pj'));
create policy criar on public.personagens for insert with check (eh_mestre(mesa_id));
create policy mudar on public.personagens for update
  using (eh_mestre(mesa_id) or eh_dono(id))
  with check (eh_mestre(mesa_id) or eh_dono(id));
create policy apagar on public.personagens for delete using (eh_mestre(mesa_id));

-- fichas (NEX e máximos — parte visível das barras)
create policy ler on public.fichas for select
  using (eh_mestre(mesa_id) or (eh_membro(mesa_id)
         and exists (select 1 from personagens p where p.id = personagem_id and p.tipo = 'pj')));
create policy mudar on public.fichas for update
  using (eh_mestre(mesa_id) or eh_dono(personagem_id))
  with check (eh_mestre(mesa_id) or eh_dono(personagem_id));

-- detalhes e parte privada: só dono e mestre
create policy ler on public.fichas_detalhes for select using (eh_mestre(mesa_id) or eh_dono(personagem_id));
create policy mudar on public.fichas_detalhes for update
  using (eh_mestre(mesa_id) or eh_dono(personagem_id))
  with check (eh_mestre(mesa_id) or eh_dono(personagem_id));
create policy ler on public.personagens_privado for select using (eh_mestre(mesa_id) or eh_dono(personagem_id));
create policy mudar on public.personagens_privado for update
  using (eh_mestre(mesa_id) or eh_dono(personagem_id))
  with check (eh_mestre(mesa_id) or eh_dono(personagem_id));

-- só mestre
create policy mestre on public.grupos_ancora  for all using (eh_mestre(mesa_id)) with check (eh_mestre(mesa_id));
create policy mestre on public.log_alteracoes for select using (eh_mestre(mesa_id));
create policy mestre on public.modelos_ameaca for all using (eh_mestre(mesa_id)) with check (eh_mestre(mesa_id));
create policy mestre on public.participantes  for all using (eh_mestre(mesa_id)) with check (eh_mestre(mesa_id));
create policy mestre on public.lore_notas_mestre for all using (eh_mestre(mesa_id)) with check (eh_mestre(mesa_id));

-- presets: do próprio personagem (jogador) ou do mestre
create policy ler on public.presets_dados for select
  using (eh_mestre(mesa_id) or (personagem_id is not null and eh_dono(personagem_id)));
create policy escrever on public.presets_dados for all
  using (eh_mestre(mesa_id) or (personagem_id is not null and eh_dono(personagem_id)))
  with check (eh_mestre(mesa_id) or (personagem_id is not null and eh_dono(personagem_id)));

-- rolagens: inseridas só pela função rolar(); secretas só autor + mestre
create policy ler on public.rolagens for select
  using (eh_membro(mesa_id) and (not secreta or user_id = auth.uid() or eh_mestre(mesa_id)));
create policy apagar on public.rolagens for delete using (eh_mestre(mesa_id));

-- combate
create policy ler on public.combates for select using (eh_membro(mesa_id));
create policy mestre on public.combates for all using (eh_mestre(mesa_id)) with check (eh_mestre(mesa_id));
create policy ler on public.participantes_publico for select using (eh_membro(mesa_id));

-- lore
create policy ler on public.lore_entradas for select using (pode_ver_entrada(id));
create policy mestre on public.lore_entradas for all using (eh_mestre(mesa_id)) with check (eh_mestre(mesa_id));

create policy ler on public.lore_entradas_reveladas for select
  using (eh_mestre(mesa_id) or personagem_id = meu_personagem(mesa_id));
create policy mestre on public.lore_entradas_reveladas for all using (eh_mestre(mesa_id)) with check (eh_mestre(mesa_id));

create policy ler on public.lore_conexoes for select
  using (eh_mestre(mesa_id) or (
         eh_membro(mesa_id)
         and pode_ver_entrada(origem_id) and pode_ver_entrada(destino_id)
         and (visibilidade = 'todos'
              or (visibilidade = 'especificos' and exists (
                    select 1 from lore_conexoes_reveladas r
                    where r.conexao_id = lore_conexoes.id
                      and r.personagem_id = meu_personagem(lore_conexoes.mesa_id))))));
create policy mestre on public.lore_conexoes for all using (eh_mestre(mesa_id)) with check (eh_mestre(mesa_id));

create policy ler on public.lore_conexoes_reveladas for select
  using (eh_mestre(mesa_id) or personagem_id = meu_personagem(mesa_id));
create policy mestre on public.lore_conexoes_reveladas for all using (eh_mestre(mesa_id)) with check (eh_mestre(mesa_id));

create policy ler on public.lore_imagens for select using (pode_ver_entrada(entrada_id));
create policy mestre on public.lore_imagens for all using (eh_mestre(mesa_id)) with check (eh_mestre(mesa_id));

-- linha do tempo
create policy ler on public.eventos for select using (pode_ver_evento(id));
create policy mestre on public.eventos for all using (eh_mestre(mesa_id)) with check (eh_mestre(mesa_id));
create policy ler on public.eventos_revelados for select
  using (eh_mestre(mesa_id) or personagem_id = meu_personagem(mesa_id));
create policy mestre on public.eventos_revelados for all using (eh_mestre(mesa_id)) with check (eh_mestre(mesa_id));
create policy ler on public.eventos_entradas for select
  using (pode_ver_evento(evento_id) and pode_ver_entrada(entrada_id));
create policy mestre on public.eventos_entradas for all using (eh_mestre(mesa_id)) with check (eh_mestre(mesa_id));

-- Funções que só fazem sentido para usuários logados
revoke execute on function public.entrar_mesa(text, text, uuid), public.criar_mesa(text, text, text),
  public.definir_pin(uuid, text, uuid), public.ancora_definir(uuid, boolean, uuid[], text),
  public.desfazer_ultima(uuid), public.rolar(uuid, text, text, uuid, boolean, int, int, boolean),
  public.ajustar_status(uuid, text, int), public.mesa_por_codigo(text), public.sair_mesa(uuid)
  from public, anon;
grant execute on function public.entrar_mesa(text, text, uuid), public.criar_mesa(text, text, text),
  public.definir_pin(uuid, text, uuid), public.ancora_definir(uuid, boolean, uuid[], text),
  public.desfazer_ultima(uuid), public.rolar(uuid, text, text, uuid, boolean, int, int, boolean),
  public.ajustar_status(uuid, text, int), public.mesa_por_codigo(text), public.sair_mesa(uuid)
  to authenticated;

-- =====================================================================
-- TEMPO REAL
-- =====================================================================
alter publication supabase_realtime add table
  public.mesas, public.membros, public.personagens, public.fichas, public.fichas_detalhes,
  public.personagens_privado, public.grupos_ancora, public.log_alteracoes, public.presets_dados,
  public.rolagens, public.combates, public.participantes, public.participantes_publico,
  public.lore_entradas, public.lore_entradas_reveladas, public.lore_conexoes,
  public.lore_conexoes_reveladas, public.lore_imagens, public.eventos, public.eventos_revelados,
  public.eventos_entradas;

-- =====================================================================
-- STORAGE (imagens) — bucket privado "midia"
--   personagens/<mesa>/<personagem>/<arquivo>
--   lore/<mesa>/<entrada>/<arquivo>
--   linha/<mesa>/<evento>/<arquivo>
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('midia', 'midia', false)
on conflict (id) do nothing;

create policy "midia ler" on storage.objects for select to authenticated using (
  bucket_id = 'midia' and (
       ((storage.foldername(name))[1] = 'personagens'
          and eh_membro(uuid_ou_nulo((storage.foldername(name))[2])))
    or ((storage.foldername(name))[1] = 'lore'
          and pode_ver_entrada(uuid_ou_nulo((storage.foldername(name))[3])))
    or ((storage.foldername(name))[1] = 'linha'
          and pode_ver_evento(uuid_ou_nulo((storage.foldername(name))[3])))
  ));

create policy "midia enviar" on storage.objects for insert to authenticated with check (
  bucket_id = 'midia' and (
       eh_mestre(uuid_ou_nulo((storage.foldername(name))[2]))
    or ((storage.foldername(name))[1] = 'personagens'
          and eh_dono(uuid_ou_nulo((storage.foldername(name))[3])))
  ));

create policy "midia alterar" on storage.objects for update to authenticated using (
  bucket_id = 'midia' and (
       eh_mestre(uuid_ou_nulo((storage.foldername(name))[2]))
    or ((storage.foldername(name))[1] = 'personagens'
          and eh_dono(uuid_ou_nulo((storage.foldername(name))[3])))
  ));

create policy "midia apagar" on storage.objects for delete to authenticated using (
  bucket_id = 'midia' and (
       eh_mestre(uuid_ou_nulo((storage.foldername(name))[2]))
    or ((storage.foldername(name))[1] = 'personagens'
          and eh_dono(uuid_ou_nulo((storage.foldername(name))[3])))
  ));
