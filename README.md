# Paratus — site da mesa (Ordem Paranormal)

Fichas compartilhadas em tempo real, Escudo do Mestre com a Âncora, dados com presets, combate, códice da lore e linha do tempo.

**Stack:** Next.js 15 (App Router) + TypeScript + Tailwind 4 · Supabase (Postgres + RLS + Realtime + Storage) · Vercel.

## Estrutura

```
supabase/
  migrations/0001_paratus.sql   esquema completo: tabelas, RLS, gatilhos, funções (RPC), realtime, storage
  seed.sql                      mesa "Paratus" + 5 personagens
  test/                         testes das regras num Postgres local
src/
  lib/supabase.ts               cliente do navegador (login anônimo)
  lib/sessao.tsx                entrada por código + PIN, mesa atual
  lib/aoVivo.ts                 hook: lê uma tabela e mantém sincronizado em tempo real
  lib/regras.ts                 ficha ativa, alertas < 25%, teste da Ordem (kh1 / 2d20kl1)
  app/page.tsx                  entrar na mesa
  app/nova-mesa/page.tsx        criar outra campanha
  app/mesa/page.tsx             sala ao vivo (Etapa 1; vira Ficha e Escudo na Etapa 2)
```

## Como as regras ficam garantidas no banco

- **Acesso sem e-mail:** o navegador faz login anônimo no Supabase; a função `entrar_mesa(código, PIN, personagem)` confere o PIN (bcrypt) e liga aquela sessão ao personagem ou ao papel de mestre. Depois de 8 PINs errados em 15 min, o alvo é bloqueado temporariamente.
- **RLS em todas as tabelas:** jogador só altera o próprio personagem; detalhes da ficha, anotações e inventário só para dono e mestre; NPCs/ameaças, log e notas secretas só para o mestre.
- **Âncora:** um gatilho aplica o teto da ficha ativa em *toda* alteração. Ligar corta PV/SAN/PE no máximo da ficha 50%; desligar mantém os valores. A Marca do Império só afeta quem tem `tem_marca`.
- **PV temporário:** campo `pv_temp`, que fica acima do máximo, aparece em dourado listrado e é gasto primeiro quando o personagem leva dano. A Âncora não corta o PV temporário.
- **Log e desfazer:** toda mudança de PV/SAN/PE/PD, condições e Âncora vai para `log_alteracoes`; `desfazer_ultima` reverte o último lote (um clique na Âncora global desfaz tudo de uma vez).
- **Dados no servidor:** `rolar()` sorteia no banco, então o feed é confiável. Rolagens secretas só aparecem para o autor e o mestre.
- **Lore:** entradas e conexões "só o mestre" nunca saem do banco para jogadores (nem pelo tempo real). Revelar a alguém dispara um evento para aquela pessoa.

## Configuração (passo a passo)

### 1. Supabase
1. Crie uma conta em <https://supabase.com> → **New project** (região *South America (São Paulo)*). Guarde a senha do banco.
2. **Authentication → Sign In / Providers → Allow anonymous sign-ins: ON** → Save. *(Obrigatório: é assim que se entra sem e-mail.)*
3. **SQL Editor → New query** → cole todo o conteúdo de `supabase/migrations/0001_paratus.sql` → **Run**.
4. Nova query → cole `supabase/seed.sql` → **Run**.
5. Depois, a cada etapa nova, rode os arquivos novos de `supabase/migrations/` em ordem (`0002_...`, `0003_...`), um por query.
6. **Project Settings → API**: copie a **Project URL** e a chave **anon public**.

### 2. Rodar no seu computador (opcional)
```bash
cp .env.example .env.local     # preencha URL e chave anon
npm install
npm run dev                    # http://localhost:3000
```

### 3. Vercel
1. Em <https://vercel.com> → **Add New → Project** → importe o repositório do GitHub.
2. Em **Environment Variables**, cadastre `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. **Deploy.** Cada `git push` publica de novo automaticamente.

### PINs iniciais do seed (troque!)
| Quem | PIN |
|---|---|
| Mestre | 0000 |
| Diego | 1111 |
| Rafael Orleans | 2222 |
| Gabriela Hills | 3333 |
| Plague | 4444 |
| Rehreus Akeldama | 5555 |

Até a tela de PINs ficar pronta (Etapa 2), dá para trocar pelo SQL Editor:
```sql
select definir_pin((select id from mesas where codigo='PARATUS'), 'NOVO_PIN');                       -- mestre
select definir_pin((select id from mesas where codigo='PARATUS'), 'NOVO_PIN',
                   (select id from personagens where nome='Diego'));                                 -- jogador
```

## Testar as regras localmente
Com um Postgres 16 local:
```bash
createdb paratus_teste
psql -d paratus_teste -f supabase/test/stub_supabase.sql
psql -d paratus_teste -f supabase/migrations/0001_paratus.sql
psql -d paratus_teste -f supabase/seed.sql
psql -d paratus_teste -f supabase/test/test_regras.sql
```

## Etapas
- [x] 1. Banco, acesso e sincronização em tempo real
- [x] 2. Ficha completa + Escudo do Mestre + Âncora (aliados só com nome e NEX)
- [x] 3. Rolagem de dados com presets
- [ ] 4. Combate/iniciativa
- [ ] 5. Códice da Lore com grafo e visibilidade
- [ ] 6. Linha do tempo
- [ ] 7. Polimento visual e deploy

> Arte, brasão e ícones são originais; nada oficial de Ordem Paranormal é usado.
