"""Gera supabase/migrations/0008_codice.sql (RPC de visibilidade + seed da lore de Paratus).

Uso: python3 supabase/lore/gerar_sql.py
"""
import json, os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import paratus  # noqa: E402


def q(s):
    return "'" + str(s).replace("'", "''") + "'"


chaves = {e["chave"] for e in paratus.ENTRADAS}
assert len(chaves) == len(paratus.ENTRADAS), "chave repetida"
for o, d, _, _ in paratus.CONEXOES:
    assert o in chaves and d in chaves, (o, d)

entradas = json.dumps(paratus.ENTRADAS, ensure_ascii=False, indent=0)
conexoes = json.dumps([dict(o=o, d=d, r=r, v=v) for o, d, r, v in paratus.CONEXOES], ensure_ascii=False, indent=0)

sql = f"""-- =====================================================================
--  ETAPA 6 — Códice da Lore
--  * corrige o gatilho personagens_publico (criar personagem novo falhava).
--  * lore_visibilidade(): muda a visibilidade de uma entrada ou conexão e
--    quem a vê, numa única operação (só o mestre).
--  * semear_lore_paratus(mesa): lore inicial tirada do Notion do mestre.
--    Tudo entra "só o mestre", exceto o que os jogadores já sabem
--    (Cidadãos e o resumo da Temporada 1). Só semeia se a mesa não tiver lore.
--  Gerado por supabase/lore/gerar_sql.py — não edite à mão.
-- =====================================================================

-- Correção: o gatilho do espelho público falhava ao criar personagem novo
-- (lia new.id numa linha de fichas). Recriar a mesa pelo seed voltou a funcionar.
create or replace function public.tg_personagem_publico() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  pid uuid;
begin
  if tg_table_name = 'fichas' then
    pid := new.personagem_id;
  else
    pid := new.id;
  end if;
  insert into personagens_publico (id, mesa_id, tipo, nome, jogador, nex, ordem, arquivado)
  select p.id, p.mesa_id, p.tipo, p.nome, p.jogador,
         (select f.nex from fichas f
           where f.personagem_id = p.id and f.variante = case when p.ancora_ativa then '50' else '99' end),
         p.ordem, p.arquivado
    from personagens p where p.id = pid
  on conflict (id) do update set
    tipo = excluded.tipo, nome = excluded.nome, jogador = excluded.jogador, nex = excluded.nex,
    ordem = excluded.ordem, arquivado = excluded.arquivado;
  return null;
end $$;


create or replace function public.lore_visibilidade(
  p_tipo text, p_id uuid, p_visibilidade text, p_personagens uuid[] default '{{}}'
) returns void
language plpgsql security definer set search_path = public as $$
declare
  m uuid;
begin
  if p_visibilidade not in ('mestre','todos','especificos') then
    raise exception 'visibilidade inválida';
  end if;
  if p_tipo = 'entrada' then
    select mesa_id into m from lore_entradas where id = p_id;
  elsif p_tipo = 'conexao' then
    select mesa_id into m from lore_conexoes where id = p_id;
  else
    raise exception 'tipo inválido';
  end if;
  if m is null or not eh_mestre(m) then
    raise exception 'só o mestre muda a visibilidade';
  end if;

  if p_tipo = 'entrada' then
    update lore_entradas set visibilidade = p_visibilidade where id = p_id;
    delete from lore_entradas_reveladas where entrada_id = p_id;
    if p_visibilidade = 'especificos' then
      insert into lore_entradas_reveladas (entrada_id, personagem_id, mesa_id)
      select p_id, pe.id, m from personagens pe where pe.mesa_id = m and pe.id = any(p_personagens);
    end if;
  else
    update lore_conexoes set visibilidade = p_visibilidade, atualizado_em = now() where id = p_id;
    delete from lore_conexoes_reveladas where conexao_id = p_id;
    if p_visibilidade = 'especificos' then
      insert into lore_conexoes_reveladas (conexao_id, personagem_id, mesa_id)
      select p_id, pe.id, m from personagens pe where pe.mesa_id = m and pe.id = any(p_personagens);
    end if;
  end if;
end;
$$;
revoke all on function public.lore_visibilidade(text, uuid, text, uuid[]) from public, anon;
grant execute on function public.lore_visibilidade(text, uuid, text, uuid[]) to authenticated;

create or replace function public.semear_lore_paratus(p_mesa uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  ents jsonb := {q(entradas)}::jsonb;
  cons jsonb := {q(conexoes)}::jsonb;
  ids  jsonb := '{{}}'::jsonb;
  x    jsonb;
  novo uuid;
  n    int := 0;
begin
  if exists (select 1 from lore_entradas where mesa_id = p_mesa) then
    return 0;
  end if;
  for x in select * from jsonb_array_elements(ents) loop
    insert into lore_entradas (mesa_id, tipo, titulo, resumo, texto, tags, status, visibilidade)
    values (p_mesa, x->>'tipo', x->>'titulo', x->>'resumo', x->>'texto',
            array(select jsonb_array_elements_text(x->'tags')), x->>'status', x->>'vis')
    returning id into novo;
    ids := ids || jsonb_build_object(x->>'chave', novo);
    if coalesce(x->>'notas', '') <> '' then
      insert into lore_notas_mestre (entrada_id, mesa_id, texto) values (novo, p_mesa, x->>'notas');
    end if;
    n := n + 1;
  end loop;
  for x in select * from jsonb_array_elements(cons) loop
    insert into lore_conexoes (mesa_id, origem_id, destino_id, rotulo, visibilidade)
    values (p_mesa, (ids->>(x->>'o'))::uuid, (ids->>(x->>'d'))::uuid, x->>'r', x->>'v');
  end loop;
  return n;
end;
$$;
revoke all on function public.semear_lore_paratus(uuid) from public, anon, authenticated;

select public.semear_lore_paratus(id) from public.mesas where codigo = 'PARATUS';
"""

destino = os.path.join(AQUI, "..", "migrations", "0008_codice.sql")
open(destino, "w", encoding="utf-8").write(sql)
print(f"{len(paratus.ENTRADAS)} entradas, {len(paratus.CONEXOES)} conexões -> {destino}")
