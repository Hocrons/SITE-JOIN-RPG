"""Gera supabase/migrations/0005_catalogo_livro.sql a partir dos módulos deste diretório.

Uso: python3 supabase/catalogo/gerar_sql.py /caminho/para/equip.txt
(equip.txt = Capítulo 3 do Livro de Regras extraído com `pdftotext -layout`, só para ler a Tabela 3.3.)
Se armas.json já existir ao lado deste arquivo, ele é usado no lugar.
"""
import json, os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)

import amaldicoados, classes, equipamento, origens, poderes_paranormais, rituais  # noqa: E402

CAMPOS_TOPO = {"tipo", "nome", "resumo", "fonte"}


def armas():
    cache = os.path.join(AQUI, "armas.json")
    if os.path.exists(cache):
        return json.load(open(cache, encoding="utf-8"))
    import armas as mod
    dados = mod.ler(sys.argv[1])
    json.dump(dados, open(cache, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    return dados


def q(s):
    return "null" if s is None else "'" + str(s).replace("'", "''") + "'"


def main():
    todos = (armas() + equipamento.TODOS + poderes_paranormais.TODOS + rituais.TODOS
             + amaldicoados.TODOS + origens.TODOS + classes.TODOS)
    linhas = []
    for x in todos:
        dados = {k: v for k, v in x.items() if k not in CAMPOS_TOPO and v is not None}
        linhas.append(
            f"({q(x['tipo'])}, {q(x['nome'])}, {q(json.dumps(dados, ensure_ascii=False))}::jsonb, "
            f"{q(x.get('resumo') or '')}, {q(x.get('fonte'))})"
        )
    destino = os.path.join(AQUI, "..", "migrations", "0005_catalogo_livro.sql")
    with open(destino, "w", encoding="utf-8") as f:
        f.write("-- =====================================================================\n")
        f.write("--  CATÁLOGO BASE — Livro de Regras de Ordem Paranormal\n")
        f.write("--  Dados de regra + resumos escritos para este site (não é o texto do livro).\n")
        f.write("--  Gerado por supabase/catalogo/gerar_sql.py. Pode rodar de novo: substitui o catálogo base.\n")
        f.write("-- =====================================================================\n")
        f.write("delete from public.catalogo where mesa_id is null and fonte like 'Livro de Regras%';\n\n")
        f.write("insert into public.catalogo (tipo, nome, dados, resumo, fonte) values\n")
        f.write(",\n".join(linhas))
        f.write(";\n")
    contagem = {}
    for x in todos:
        contagem[x["tipo"]] = contagem.get(x["tipo"], 0) + 1
    print(f"{len(todos)} entradas →", os.path.relpath(destino))
    for k, v in sorted(contagem.items()):
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
