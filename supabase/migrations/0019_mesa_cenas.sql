-- =====================================================================
--  TABULEIRO — etapa 1: cenas, mapa e grade
--  * cenas: cada uma com o mapa (três tamanhos: leve para celular,
--    otimizado para computador e o original) e a grade.
--  * Uma cena por mesa fica "ativa": é a que os jogadores veem.
--    Jogadores não enxergam as outras cenas nem as imagens delas.
--  Medidas da grade sempre em pixels do mapa ORIGINAL.
-- =====================================================================
create table if not exists public.cenas (
  id                    uuid primary key default gen_random_uuid(),
  mesa_id               uuid not null references public.mesas on delete cascade,
  nome                  text not null check (length(trim(nome)) between 1 and 80),
  ordem                 int not null default 0,
  ativa                 boolean not null default false,
  mapa_caminho          text,     -- otimizado (até 4096 px)
  mapa_leve_caminho     text,     -- leve (até 2048 px), para celular e para abrir rápido
  mapa_original_caminho text,
  mapa_largura          int,      -- tamanho do original, em px
  mapa_altura           int,
  grade_tamanho         real not null default 70 check (grade_tamanho between 8 and 1000),
  grade_x               real not null default 0,
  grade_y               real not null default 0,
  grade_visivel         boolean not null default true,
  grade_cor             text not null default 'rgba(20,14,8,0.45)',
  metros_por_quadrado   real not null default 1.5,
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now()
);
create unique index if not exists cenas_uma_ativa on public.cenas (mesa_id) where ativa;
create index if not exists cenas_mesa on public.cenas (mesa_id, ordem);

create or replace function public.tg_cenas_tocar() returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  if tg_op = 'UPDATE' then new.mesa_id := old.mesa_id; end if;
  return new;
end $$;
create trigger tocar before insert or update on public.cenas
  for each row execute function public.tg_cenas_tocar();

create or replace function public.pode_ver_cena(p_cena uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from cenas c
     where c.id = p_cena and (eh_mestre(c.mesa_id) or (c.ativa and eh_membro(c.mesa_id)))
  )
$$;

alter table public.cenas enable row level security;
create policy ver on public.cenas for select using (eh_mestre(mesa_id) or (ativa and eh_membro(mesa_id)));
create policy mestre on public.cenas for all using (eh_mestre(mesa_id)) with check (eh_mestre(mesa_id));
grant select, insert, update, delete on public.cenas to authenticated;
alter publication supabase_realtime add table public.cenas;

-- troca a cena dos jogadores numa operação (nula = nenhuma)
create or replace function public.cena_ativar(p_mesa uuid, p_cena uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not eh_mestre(p_mesa) then raise exception 'Só o mestre escolhe a cena.' using errcode = '42501'; end if;
  if p_cena is not null and not exists (select 1 from cenas where id = p_cena and mesa_id = p_mesa) then
    raise exception 'Cena de outra mesa.';
  end if;
  update cenas set ativa = false where mesa_id = p_mesa and ativa and id is distinct from p_cena;
  if p_cena is not null then update cenas set ativa = true where id = p_cena; end if;
end $$;
revoke all on function public.cena_ativar(uuid, uuid) from public, anon;
grant execute on function public.cena_ativar(uuid, uuid) to authenticated;

-- imagens dos mapas: cenas/<mesa>/<cena>/<arquivo>; jogador só lê a cena ativa
create policy "midia ler cenas" on storage.objects for select to authenticated using (
  bucket_id = 'midia' and (storage.foldername(name))[1] = 'cenas'
  and pode_ver_cena(uuid_ou_nulo((storage.foldername(name))[3]))
);

-- backup leva as cenas
create or replace function public._tabelas_backup() returns text[]
language sql immutable as $$
  select array[
    'fichas', 'fichas_detalhes', 'personagens_privado',
    'grupos_ancora', 'presets_dados', 'modelos_ameaca', 'catalogo', 'personagem_itens',
    'lore_entradas', 'lore_entradas_reveladas', 'lore_notas_mestre', 'lore_conexoes',
    'lore_conexoes_reveladas', 'lore_imagens',
    'eventos', 'eventos_revelados', 'eventos_entradas',
    'notas_pessoais', 'arquivos_mesa', 'quadro_cartoes', 'quadro_ligacoes',
    'pins_legiveis', 'cenas'
  ]
$$;
