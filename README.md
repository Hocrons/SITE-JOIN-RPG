# Paratus — site da mesa (Ordem Paranormal)

Fichas compartilhadas em tempo real, Escudo do Mestre com a Âncora, dados com presets, catálogo dos livros, combate, Códice da lore, caderno pessoal dos jogadores, quadro de investigação, linha do tempo e backup.

**Stack:** Next.js 15 (App Router) + TypeScript + Tailwind 4 · Supabase (Postgres + RLS + Realtime + Storage) · Vercel.

## Estrutura

```
supabase/
  migrations/0001…0021         esquema, regras (RLS), funções e dados iniciais; rode em ordem
  seed.sql                     mesa "Paratus" + 5 personagens (+ lore e linha do tempo, se 0008/0014 já rodaram)
  catalogo/                    gerador do catálogo dos livros (0005, 0006)
  lore/                        lore inicial do Notion (0008) e eventos da linha do tempo (0014)
  test/                        testes das regras num Postgres local
src/
  app/page.tsx                 entrar na mesa (código + PIN)
  app/ficha                    jogador: Ficha, Itens, Dados, Combate, Códice (Códice, Linha, Quadro), Notas (Minha lore, Bloco)
  app/mestre                   Escudo (Âncora, PINs, backup), combate, lore (Códice), linha, quadro, ficha/[id]
  components/                  peças de tela (codice/, caderno/, quadro/, linha/, mestre/…)
  lib/                         dados ao vivo (aoVivo), sessão, regras, dados, catálogo, lore, quadro, linha do tempo, tema
```

## Como as regras ficam garantidas no banco

- **Acesso sem e-mail:** o navegador faz login anônimo no Supabase; a função `entrar_mesa(código, PIN, personagem)` confere o PIN (bcrypt) e liga aquela sessão ao personagem ou ao papel de mestre. Depois de 8 PINs errados em 15 min, o alvo é bloqueado temporariamente.
- **RLS em todas as tabelas:** jogador só altera o próprio personagem; detalhes da ficha, anotações e inventário só para dono e mestre; NPCs/ameaças, log e notas secretas só para o mestre.
- **Âncora:** ao entrar, o que passar do máximo da ficha de 50% fica guardado (`pv_reserva`…) e o valor desce até esse máximo; quem já está abaixo não muda. Dentro, dano e cura são normais e a cura vai só até o máximo da ficha ativa. Ao sair, o guardado volta. A Marca do Império só afeta quem tem `tem_marca`.
- **PV temporário:** campo `pv_temp`, que fica acima do máximo, aparece em dourado listrado e é gasto primeiro quando o personagem leva dano. A Âncora não corta o PV temporário.
- **Log e desfazer:** toda mudança de PV/SAN/PE/PD, condições e Âncora vai para `log_alteracoes`; `desfazer_ultima` reverte o último lote (um clique na Âncora global desfaz tudo de uma vez).
- **Dados no servidor:** `rolar()` sorteia no banco, então o feed é confiável. Rolagens secretas só aparecem para o autor e o mestre.
- **Lore:** entradas e conexões "só o mestre" nunca saem do banco para jogadores (nem pelo tempo real). Revelar ou esconder avisa os jogadores na hora (broadcast), e eles recarregam o que podem ver. A lore inicial vem de `supabase/lore/paratus.py` (gerada para `0008_codice.sql`): tudo "só o mestre", exceto Cidadãos e o resumo da Temporada 1.

## Configuração (passo a passo)

### 1. Supabase
1. Crie uma conta em <https://supabase.com> → **New project** (região *South America (São Paulo)*). Guarde a senha do banco.
2. **Authentication → Sign In / Providers → Allow anonymous sign-ins: ON** → Save. *(Obrigatório: é assim que se entra sem e-mail.)*
3. **SQL Editor → New query** → cole todo o conteúdo de `supabase/migrations/0001_paratus.sql` → **Run**.
4. Nova query → cole `supabase/seed.sql` → **Run**.
5. Depois, rode os outros arquivos de `supabase/migrations/` em ordem (`0002` até `0021`), um por query. Quando sair um arquivo novo, rode só ele.
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

Troque em **Escudo → PINs de acesso**. Se precisar, também dá pelo SQL Editor:
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
- [x] 4. Catálogo (Livro de Regras) + itens, habilidades e rituais na ficha
- [x] 4b. Catálogo: Arquivos Secretos 1–7 e 9
- [x] 5. Combate/iniciativa
- [x] 6. Códice da Lore com grafo, visibilidade por entrada e conexão, e a lore inicial do Notion
- [x] 7. Lore pessoal do jogador (estilo Obsidian): notas com [[links]], "mencionada em", grafo; o mestre lê
- [x] 8. Quadro de investigação: arquivos do mestre registrados, cartões, notas e fios, todos ao vivo
- [x] 9. Linha do tempo: eras, datas, sessões, imagens, ligações com o Códice e "quem vê" por evento
- [x] 10. Backup da mesa em JSON (Escudo → Backup) e tema escuro para os jogadores
- [x] 11. Mesa (tabuleiro virtual)
  - [x] 11.1 Cenas, mapa (versões leve/otimizada no Storage) e grade alinhável; o mestre escolhe a cena que os jogadores veem
  - [x] 11.2 Tokens de corpo inteiro com facção, barras da ficha (cada jogador só vê as do próprio agente), NPCs escondidos e movimento ao vivo
  - [x] 11.3 Névoa de guerra (pincel e retângulo para cobrir/revelar; NPCs na névoa somem para os jogadores)
  - [x] 11.4 Régua (quadrados e metros), ping (segurar parado), zoom/arrasto e destaque do token da vez na iniciativa

## Backup
Em **Escudo → Backup**:
- **Baixar backup:** um `.json` com tudo da mesa (personagens, fichas, PINs, itens, presets, Códice, linha do tempo, cadernos e quadro). Não inclui rolagens, histórico, combates nem as imagens/PDFs em si (só os caminhos, que continuam no Storage).
- **Restaurar:** volta a mesa ao estado do arquivo. Só aceita backup da mesma mesa; jogadores continuam conectados.

## Tema
Jogadores alternam no ícone ao lado de "Sair" entre claro e escuro. Antes de escolher, segue o tema do celular. A Área do Mestre é sempre escura. O quadro de investigação continua claro nos dois temas.

> Arte, brasão e ícones são originais; nada oficial de Ordem Paranormal é usado.
