-- =====================================================================
--  Resetar fichas (só o mestre): status cheios, condições, anotações,
--  registro de alterações e rolagens — cada parte é opcional.
-- =====================================================================
create or replace function public.resetar_fichas(
  p_mesa uuid,
  p_personagens uuid[],
  p_status boolean default true,
  p_condicoes boolean default true,
  p_anotacoes boolean default false,
  p_registro boolean default true,
  p_rolagens boolean default false
) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not eh_mestre(p_mesa) then
    raise exception 'Só o mestre pode resetar as fichas.' using errcode = '42501';
  end if;

  select count(*) into n from personagens where mesa_id = p_mesa and id = any(p_personagens);

  if p_status then
    -- sai da Âncora sem devolver reserva (zera antes) e enche pelo máximo da ficha de 99%
    update personagens p set
      ancora_ativa = false,
      pv_reserva = 0, san_reserva = 0, pe_reserva = 0, pd_reserva = 0,
      pv_temp = 0,
      pv_atual  = coalesce(f.pv_max, p.pv_atual),
      san_atual = coalesce(f.san_max, p.san_atual),
      pe_atual  = coalesce(f.pe_max, p.pe_atual),
      pd_atual  = case when p.pd_atual is null and f.pd_max is null then null else coalesce(f.pd_max, p.pd_atual) end
    from fichas f
    where p.mesa_id = p_mesa and p.id = any(p_personagens)
      and f.personagem_id = p.id and f.variante = '99';
  end if;

  if p_condicoes then
    update personagens set condicoes = '{}' where mesa_id = p_mesa and id = any(p_personagens) and condicoes <> '{}';
  end if;

  if p_anotacoes then
    update personagens_privado set anotacoes = '' where mesa_id = p_mesa and personagem_id = any(p_personagens);
  end if;

  -- por último, para levar junto o que o próprio reset registrou
  if p_registro then
    delete from log_alteracoes where mesa_id = p_mesa and personagem_id = any(p_personagens);
  end if;

  if p_rolagens then
    delete from rolagens where mesa_id = p_mesa and personagem_id = any(p_personagens);
  end if;

  return n;
end $$;
revoke all on function public.resetar_fichas(uuid, uuid[], boolean, boolean, boolean, boolean, boolean) from public, anon;
grant execute on function public.resetar_fichas(uuid, uuid[], boolean, boolean, boolean, boolean, boolean) to authenticated;
