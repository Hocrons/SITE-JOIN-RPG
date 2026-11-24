-- =====================================================================
--  TABULEIRO — névoa protegida de verdade
--  Com a névoa ligada, o jogador não pode baixar o mapa original: recebe
--  uma versão "dos jogadores" (jog-*), já com a névoa pintada por cima,
--  que o computador do mestre gera e envia a cada mudança.
-- =====================================================================
alter table public.cenas add column if not exists mapa_jogador_caminho text;
alter table public.cenas add column if not exists mapa_jogador_leve_caminho text;
-- de qual mapa a versão dos jogadores foi feita (para refazer se o mapa mudar)
alter table public.cenas add column if not exists mapa_jogador_origem text;

create or replace function public.cena_com_nevoa(p_cena uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select nevoa_ativa from cenas where id = p_cena), false)
$$;

drop policy if exists "midia ler cenas" on storage.objects;
create policy "midia ler cenas" on storage.objects for select to authenticated using (
  bucket_id = 'midia' and (storage.foldername(name))[1] = 'cenas'
  and (
    eh_mestre(uuid_ou_nulo((storage.foldername(name))[2]))
    or (
      pode_ver_cena(uuid_ou_nulo((storage.foldername(name))[3]))
      and (
        -- versão dos jogadores e máscara: sempre
        name ~ '/(jog|nevoa)-[^/]*$'
        -- mapa original: só com a névoa desligada
        or not cena_com_nevoa(uuid_ou_nulo((storage.foldername(name))[3]))
      )
    )
  )
);
