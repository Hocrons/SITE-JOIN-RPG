-- =====================================================================
--  Quadro: mensagem mais clara quando um fio aponta para um cartão que
--  não existe mais (alguém tirou do quadro em outro aparelho).
-- =====================================================================
create or replace function public.tg_quadro_ligacao() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  mo uuid;
  md uuid;
begin
  select mesa_id into mo from quadro_cartoes where id = new.origem_id;
  select mesa_id into md from quadro_cartoes where id = new.destino_id;
  if mo is null or md is null then
    raise exception 'Um dos cartões não está mais no quadro (alguém tirou em outro aparelho).'
      using errcode = 'P0002';
  end if;
  if mo <> new.mesa_id or md <> new.mesa_id then
    raise exception 'Ligação entre cartões de outra mesa.';
  end if;
  return new;
end $$;
