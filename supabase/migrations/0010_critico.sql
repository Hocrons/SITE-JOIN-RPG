-- =====================================================================
--  Crítico pela regra do livro (p. 82): multiplica só os dados da arma.
--  Bônus fixos (como a Força) e dados extras (como Ataque Furtivo ou a
--  munição Explosiva) não multiplicam. Novo parâmetro p_dados_crit:
--  quantos termos de dados, do começo da expressão, multiplicam.
-- =====================================================================
drop function if exists public.rolar(uuid, text, text, uuid, boolean, int, int, boolean);

create or replace function public.rolar(
  p_mesa uuid, p_expressao text, p_titulo text default null, p_personagem uuid default null,
  p_secreta boolean default false, p_margem int default 20, p_multiplicador int default 2,
  p_critico boolean default false, p_dados_crit int default null)
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
  ntermo   int := 0;
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
      ntermo := ntermo + 1;
      -- no crítico multiplica só os dados da arma (os primeiros p_dados_crit termos);
      -- dados extras e bônus fixos não multiplicam. null = multiplica todos.
      if p_critico and m[4] is null and (p_dados_crit is null or ntermo <= p_dados_crit) then
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
                             'multiplicador', p_multiplicador, 'dados_crit', p_dados_crit),
          total, crit, coalesce(p_secreta, false))
  returning * into r;
  return r;
end $$;

revoke all on function public.rolar(uuid, text, text, uuid, boolean, int, int, boolean, int) from public, anon;
grant execute on function public.rolar(uuid, text, text, uuid, boolean, int, int, boolean, int) to authenticated;
