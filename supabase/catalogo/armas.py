"""Lê a Tabela 3.3 (Armas) do Livro de Regras em texto e gera os registros do catálogo."""
import re, json, sys

def ler(caminho):
    linhas = open(caminho, encoding="utf-8").read().splitlines()
    grupo = sub = None
    saida = []
    dentro = False
    for l in linhas:
        if "TABELA 3.3" in l:
            dentro = True; continue
        if "ARMAS IMPROVISADAS" in l:
            break
        if not dentro:
            continue
        s = l.strip()
        if not s or s.startswith("Arma ") or re.fullmatch(r"\d+", s):
            continue
        if s in ("Armas Simples", "Armas Táticas", "Armas Pesadas"):
            grupo = s.replace("Armas ", "").lower(); continue
        cols = re.split(r"\s{2,}", s)
        if len(cols) == 1:
            sub = s; continue
        if len(cols) < 7:
            continue
        nome, cat, dano, crit, alc, tipo, esp = cols[:7]
        if dano == "—":
            continue  # munições vêm da Tabela 3.4
        m = re.match(r"(?:(\d+))?(?:/)?(?:x(\d))?$", crit.replace(" ", ""))
        margem = int(m.group(1)) if m and m.group(1) else 20
        mult = int(m.group(2)) if m and m.group(2) else 2
        saida.append({
            "tipo": "arma", "nome": nome, "categoria": cat, "dano": dano, "critico": crit, "margem": margem, "multiplicador": mult,
            "alcance": None if alc == "—" else alc, "tipo_dano": {"C": "corte", "P": "perfuração", "I": "impacto", "B": "balístico"}.get(tipo, tipo.lower()),
            "espacos": None if esp == "—" else int(esp),
            "subtipo": f"{(grupo or '').capitalize()}, {sub}" if sub else grupo,
            "fonte": "Livro de Regras, p. 55-56",
        })
    return saida

if __name__ == "__main__":
    print(json.dumps(ler(sys.argv[1]), ensure_ascii=False, indent=1))
