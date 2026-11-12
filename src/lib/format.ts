const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Formata um valor em reais (R$ 85,00). Valores nulos ou inválidos viram R$ 0,00. */
export function formatBRL(valor: number | null | undefined): string {
  return brl.format(Number.isFinite(valor) ? (valor as number) : 0);
}

/** Lê "85,00", "R$ 1.250,50" ou "85.5" e devolve o número, ou null se não for um preço válido. */
export function parsePreco(texto: string | number): number | null {
  if (typeof texto === 'number') return Number.isFinite(texto) && texto >= 0 ? texto : null;
  let limpo = texto.replace(/[^\d.,]/g, '');
  if (!limpo) return null;
  // Com vírgula, o ponto é separador de milhar (1.250,50). Sem vírgula, o ponto é decimal (85.5).
  if (limpo.includes(',')) limpo = limpo.replace(/\./g, '').replace(',', '.');
  const valor = Number(limpo);
  return Number.isFinite(valor) && valor >= 0 ? valor : null;
}

/** Escapa os curingas do LIKE/ILIKE para comparar o texto literalmente. */
export function escapeLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}
