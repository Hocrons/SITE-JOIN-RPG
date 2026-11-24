-- =====================================================================
--  PINs que o mestre consegue ler.
--  O login continua conferindo o PIN embaralhado (bcrypt). Além dele, fica
--  uma cópia legível que só o mestre da mesa enxerga, para a tabela de PINs.
--  PINs antigos não podem ser recuperados do embaralhado; os do seed
--  (0000…5555) são reconhecidos se nunca foram trocados.
-- =====================================================================
create table if not exists public.pins_legiveis (
  mesa_id       uuid not null references public.mesas on delete cascade,
  personagem_id uuid references public.personagens on delete cascade,  -- nulo = mestre
  pin           text not null,
  atualizado_em timestamptz not null default now()
);
create unique index if not exists pins_legiveis_unico on public.pins_legiveis (mesa_id, personagem_id) nulls not distinct;

alter table public.pins_legiveis enable row level security;
create policy mestre_le on public.pins_legiveis for select using (eh_mestre(mesa_id));
revoke all on public.pins_legiveis from anon, authenticated;
grant select on public.pins_legiveis to authenticated;

create or replace function public._guardar_pin(p_mesa uuid, p_personagem uuid, p_pin text) returns void
language sql security definer set search_path = public as $$
  insert into pins_legiveis (mesa_id, personagem_id, pin) values (p_mesa, p_personagem, p_pin)
  on conflict (mesa_id, personagem_id) do update set pin = excluded.pin, atualizado_em = now();
$$;
revoke all on function public._guardar_pin(uuid, uuid, text) from public, anon, authenticated;

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
  perform _guardar_pin(p_mesa, p_personagem, p_pin);
end $$;

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
  perform _guardar_pin(novo, null, p_pin_mestre);
  return novo;
end $$;

-- reconhece PINs do seed que nunca foram trocados
do $$
declare
  c text;
  r record;
begin
  for r in select mc.mesa_id, mc.pin_mestre_hash from mesas_credenciais mc loop
    foreach c in array array['0000','1111','2222','3333','4444','5555'] loop
      if extensions.crypt(c, r.pin_mestre_hash) = r.pin_mestre_hash then
        perform _guardar_pin(r.mesa_id, null, c);
      end if;
    end loop;
  end loop;
  for r in select p.mesa_id, pp.personagem_id, pp.pin_hash from personagens_pin pp join personagens p on p.id = pp.personagem_id loop
    foreach c in array array['0000','1111','2222','3333','4444','5555'] loop
      if extensions.crypt(c, r.pin_hash) = r.pin_hash then
        perform _guardar_pin(r.mesa_id, r.personagem_id, c);
      end if;
    end loop;
  end loop;
end $$;

-- o backup também leva os PINs legíveis
create or replace function public._tabelas_backup() returns text[]
language sql immutable as $$
  select array[
    'fichas', 'fichas_detalhes', 'personagens_privado',
    'grupos_ancora', 'presets_dados', 'modelos_ameaca', 'catalogo', 'personagem_itens',
    'lore_entradas', 'lore_entradas_reveladas', 'lore_notas_mestre', 'lore_conexoes',
    'lore_conexoes_reveladas', 'lore_imagens',
    'eventos', 'eventos_revelados', 'eventos_entradas',
    'notas_pessoais', 'arquivos_mesa', 'quadro_cartoes', 'quadro_ligacoes',
    'pins_legiveis'
  ]
$$;
