export type Papel = "mestre" | "jogador";
export type Variante = "99" | "50";
export type Visibilidade = "mestre" | "todos" | "especificos";
export type Atributo = "AGI" | "FOR" | "INT" | "PRE" | "VIG";

export interface Mesa {
  id: string;
  codigo: string;
  nome: string;
  ancora_global: boolean;
}

export interface Membro {
  user_id: string;
  mesa_id: string;
  papel: Papel;
  personagem_id: string | null;
  nome_exibicao: string;
}

export interface Personagem {
  id: string;
  mesa_id: string;
  tipo: "pj" | "npc" | "ameaca";
  nome: string;
  jogador: string | null;
  classe: string | null;
  trilha: string | null;
  origem: string | null;
  foto_caminho: string | null;
  ordem: number;
  tem_marca: boolean;
  ancora_ativa: boolean;
  usa_determinacao: boolean;
  pv_atual: number;
  san_atual: number;
  pe_atual: number;
  pd_atual: number | null;
  pv_temp: number;
  condicoes: string[];
  arquivado: boolean;
  atualizado_em: string;
}

export interface Ficha {
  personagem_id: string;
  variante: Variante;
  mesa_id: string;
  nex: number;
  pv_max: number;
  san_max: number;
  pe_max: number;
  pd_max: number | null;
}

export interface Pericia {
  nome: string;
  atributo: Atributo;
  bonus: number;
}

export interface FichaDetalhes {
  personagem_id: string;
  variante: Variante;
  mesa_id: string;
  defesa: number | null;
  deslocamento: string | null;
  atributos: Record<Atributo, number>;
  pericias: Pericia[];
}

export interface LogAlteracao {
  id: number;
  mesa_id: string;
  personagem_id: string | null;
  personagem_nome: string | null;
  lote: number;
  autor: string;
  campo: string;
  antes: unknown;
  depois: unknown;
  desfeito: boolean;
  criado_em: string;
}

export interface TermoRolagem {
  tipo: "dados" | "fixo";
  valor?: number;
  qtd?: number;
  faces?: number;
  sinal?: number;
  manter?: string | null;
  dados?: number[];
  mantidos?: number[];
  soma?: number;
}

export interface Rolagem {
  id: number;
  mesa_id: string;
  user_id: string | null;
  autor: string;
  personagem_id: string | null;
  titulo: string | null;
  expressao: string;
  detalhes: { termos: TermoRolagem[]; margem: number; critico_aplicado: boolean;
    dados_crit?: number | null; multiplicador: number };
  total: number;
  critico: boolean;
  secreta: boolean;
  criado_em: string;
}

export type CampoStatus = "pv_atual" | "san_atual" | "pe_atual" | "pd_atual" | "pv_temp";

export interface PersonagemPublico {
  id: string;
  mesa_id: string;
  tipo: "pj" | "npc" | "ameaca";
  nome: string;
  jogador: string | null;
  nex: number | null;
  ordem: number;
  arquivado: boolean;
}

export interface PersonagemPrivado {
  personagem_id: string;
  mesa_id: string;
  anotacoes: string;
  inventario: unknown[];
}

export interface GrupoAncora {
  id: string;
  mesa_id: string;
  nome: string;
  personagem_ids: string[];
}
