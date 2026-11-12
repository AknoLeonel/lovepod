import { supabase } from '@/lib/supabase';

export type SaborEmEstoque = {
  id: number;
  nome: string;
  quantidade: number;
  estoqueId: number;
};

export type ProdutoCatalogo = {
  id: number;
  nome: string;
  preco: number;
  descricao: string | null;
  imagem_url: string | null;
  sabores: SaborEmEstoque[];
};

export type Catalogo = {
  cidade: { nome: string } | null;
  produtos: ProdutoCatalogo[];
};

type LinhaEstoque = {
  id: number;
  quantidade: number;
  produto: Omit<ProdutoCatalogo, 'sabores'> | null;
  sabor: { id: number; nome: string } | null;
};

/**
 * Carrega a cidade e o estoque disponível dela, agrupado por produto.
 * Lança erro em falha de rede/banco; `cidade: null` significa que a cidade não existe.
 */
export async function carregarCatalogoDaCidade(cidadeId: string): Promise<Catalogo> {
  const [resCidade, resEstoque] = await Promise.all([
    supabase.from('cidades').select('nome').eq('id', cidadeId).maybeSingle(),
    supabase
      .from('estoque')
      .select('id, quantidade, produto:produtos ( id, nome, preco, descricao, imagem_url ), sabor:sabores ( id, nome )')
      .eq('cidade_id', cidadeId)
      .gt('quantidade', 0)
      .order('quantidade', { ascending: false }),
  ]);

  if (resCidade.error) throw resCidade.error;
  if (resEstoque.error) throw resEstoque.error;

  const agrupados = new Map<number, ProdutoCatalogo>();
  for (const item of (resEstoque.data ?? []) as unknown as LinhaEstoque[]) {
    if (!item.produto || !item.sabor) continue; // registro órfão: ignora em vez de quebrar a tela
    let produto = agrupados.get(item.produto.id);
    if (!produto) {
      produto = { ...item.produto, preco: Number(item.produto.preco) || 0, sabores: [] };
      agrupados.set(item.produto.id, produto);
    }
    produto.sabores.push({ ...item.sabor, quantidade: item.quantidade, estoqueId: item.id });
  }

  return { cidade: resCidade.data, produtos: [...agrupados.values()] };
}
