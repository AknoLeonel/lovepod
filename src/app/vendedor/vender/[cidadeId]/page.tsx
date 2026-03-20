"use client";

import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';

type CartItem = {
  estoqueId: number;
  produto: any;
  sabor: any;
  quantidade: number;
  maxEstoque: number;
};

export default function VendedorPDV({ params }: { params: Promise<{ cidadeId: string }> }) {
  const { cidadeId } = use(params);
  const router = useRouter();

  const [cidade, setCidade] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendedorNome, setVendedorNome] = useState("");
  
  // 🚀 NOVO: Sistema de Carrinho de Compras
  const [carrinho, setCarrinho] = useState<CartItem[]>([]);
  
  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [vendaSucesso, setVendaSucesso] = useState(false);

  // 🚀 NOVO: Pagamentos e Descontos
  const [desconto, setDesconto] = useState<number | "">("");
  const [tipoPagamento, setTipoPagamento] = useState("Pix");
  const [pagDividido, setPagDividido] = useState({ metodo1: "Pix", valor1: "", metodo2: "Dinheiro" });

  useEffect(() => {
    const auth = sessionStorage.getItem('lovepod_vendedor_auth');
    const nome = sessionStorage.getItem('lovepod_vendedor_nome');

    if (auth !== 'true' || !nome) {
      router.push('/vendedor');
      return;
    }
    setVendedorNome(nome);
    carregarCatalogo();
  }, [cidadeId, router]);

  async function carregarCatalogo() {
    const { data: cid } = await supabase.from('cidades').select('nome').eq('id', cidadeId).single();
    if (cid) setCidade(cid);

    const { data: estoqueRaw } = await supabase
      .from('estoque')
      .select(`id, quantidade, produto:produtos ( id, nome, preco, imagem_url ), sabor:sabores ( id, nome )`)
      .eq('cidade_id', cidadeId)
      .gt('quantidade', 0)
      .order('quantidade', { ascending: false });

    const agrupados: Record<string, any> = {};

    if (estoqueRaw) {
      estoqueRaw.forEach((item: any) => {
        const prod = item.produto;
        const sab = item.sabor;
        if (!agrupados[prod.id]) {
          agrupados[prod.id] = { ...prod, sabores: [] };
        }
        agrupados[prod.id].sabores.push({ ...sab, quantidade: item.quantidade, estoqueId: item.id });
      });
    }
    setProdutos(Object.values(agrupados));
    setLoading(false);
  }

  // ==========================================
  // FUNÇÕES DO CARRINHO
  // ==========================================
  const adicionarAoCarrinho = (produto: any, sabor: any) => {
    setCarrinho((prev) => {
      const existe = prev.find(item => item.estoqueId === sabor.estoqueId);
      if (existe) {
        if (existe.quantidade >= sabor.quantidade) {
          alert(`Estoque máximo atingido para ${sabor.nome}`);
          return prev;
        }
        return prev.map(item => item.estoqueId === sabor.estoqueId ? { ...item, quantidade: item.quantidade + 1 } : item);
      }
      return [...prev, { estoqueId: sabor.estoqueId, produto, sabor, quantidade: 1, maxEstoque: sabor.quantidade }];
    });
  };

  const removerDoCarrinho = (estoqueId: number) => {
    setCarrinho(prev => prev.filter(item => item.estoqueId !== estoqueId));
  };

  const alterarQtd = (estoqueId: number, delta: number) => {
    setCarrinho(prev => prev.map(item => {
      if (item.estoqueId === estoqueId) {
        const novaQtd = item.quantidade + delta;
        if (novaQtd > 0 && novaQtd <= item.maxEstoque) return { ...item, quantidade: novaQtd };
      }
      return item;
    }));
  };

  const subtotal = carrinho.reduce((acc, item) => acc + (item.produto.preco * item.quantidade), 0);
  const totalComDesconto = Math.max(0, subtotal - (Number(desconto) || 0));

  // ==========================================
  // FINALIZAR VENDA (Multiplos Itens)
  // ==========================================
  const confirmarVenda = async () => {
    if (carrinho.length === 0) return;
    
    // Validação de pagamento dividido
    if (tipoPagamento === 'Dividido') {
      const val1 = Number(pagDividido.valor1) || 0;
      if (val1 <= 0 || val1 >= totalComDesconto) {
        return alert(`No pagamento dividido, o Valor 1 precisa ser válido e menor que o Total (R$ ${totalComDesconto.toFixed(2)})`);
      }
    }

    setProcessando(true);

    try {
      // 1. Verifica segurança de concorrência para todos os itens do carrinho
      const ids = carrinho.map(c => c.estoqueId);
      const { data: checkEstoque } = await supabase.from('estoque').select('id, quantidade').in('id', ids);

      for (const item of carrinho) {
        const estqDb = checkEstoque?.find(e => e.id === item.estoqueId);
        if (!estqDb || estqDb.quantidade < item.quantidade) {
          alert(`⚠️ Venda bloqueada! O sabor ${item.sabor.nome} não tem mais ${item.quantidade} un. disponíveis. Alguém acabou de comprar.`);
          setProcessando(false);
          await carregarCatalogo();
          return;
        }
      }

      // 2. Prepara string do método de pagamento e rateio do desconto
      let stringPagamento = tipoPagamento;
      if (tipoPagamento === 'Dividido') {
        const val1 = Number(pagDividido.valor1);
        const val2 = totalComDesconto - val1;
        stringPagamento = `Div: ${pagDividido.metodo1} (R$${val1.toFixed(0)}) + ${pagDividido.metodo2} (R$${val2.toFixed(0)})`;
      }
      if (Number(desconto) > 0) {
        stringPagamento += ` | Desc: R$ ${Number(desconto).toFixed(2)}`;
      }

      // 3. Registra todas as vendas
      const insertsVendas = carrinho.map(item => {
        // Rateia o desconto de forma proporcional ao item para salvar o valor_total exato
        const proporcao = (item.produto.preco * item.quantidade) / subtotal;
        const descontoDoItem = (Number(desconto) || 0) * proporcao;
        const valorFinalDoItem = (item.produto.preco * item.quantidade) - descontoDoItem;

        return {
          cidade_id: parseInt(cidadeId),
          produto_id: item.produto.id,
          sabor_id: item.sabor.id,
          vendedor_nome: vendedorNome,
          quantidade: item.quantidade,
          valor_total: valorFinalDoItem / item.quantidade, // Valor unitário real cobrado
          metodo_pagamento: stringPagamento
        };
      });

      const { error: errVenda } = await supabase.from('vendas').insert(insertsVendas);
      if (errVenda) throw errVenda;

      // 4. Dá baixa no Estoque de todos os itens
      for (const item of carrinho) {
        const estqDb = checkEstoque?.find(e => e.id === item.estoqueId);
        if (estqDb) {
          await supabase.from('estoque').update({ quantidade: estqDb.quantidade - item.quantidade }).eq('id', item.estoqueId);
        }
      }

      // 5. Sucesso!
      setVendaSucesso(true);
      setTimeout(async () => {
        setVendaSucesso(false);
        setIsModalOpen(false);
        setCarrinho([]);
        setDesconto("");
        setTipoPagamento("Pix");
        await carregarCatalogo();
      }, 2500);
      
    } catch (error: any) {
      alert("Erro ao registrar venda: " + error.message);
    }
    setProcessando(false);
  };

  if (loading) return <div className="min-h-screen bg-[#030303] flex items-center justify-center"><div className="w-12 h-12 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" /></div>;

  return (
    <main className="min-h-screen bg-[#030303] text-zinc-100 font-sans selection:bg-pink-500 pb-32 relative overflow-hidden">
      
      <header className="sticky top-0 z-40 bg-[#030303]/80 backdrop-blur-2xl border-b border-white/5 shadow-2xl">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/vendedor/cidades" className="group flex items-center gap-2 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all">
            <span className="bg-white/5 group-hover:bg-pink-500/20 p-2 rounded-full transition-colors">←</span> Trocar Cidade
          </Link>
          <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/5">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-white text-xs font-black uppercase tracking-widest">{cidade?.nome}</span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8 space-y-12 relative z-10">
        <div className="text-center space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <p className="text-pink-500 text-[10px] uppercase tracking-widest font-bold">PDV Multi-Vendas</p>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Vendedor: <span className="text-zinc-400">{vendedorNome}</span></h1>
        </div>

        {produtos.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/30 border border-white/5 rounded-[2rem]"><h3 className="text-xl font-bold text-white mb-2">Estoque Zerado</h3><p className="text-zinc-500 text-sm">Nenhum pod disponível para {cidade?.nome}.</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {produtos.map((produto) => (
              <section key={produto.id} className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-2 hover:border-pink-500/40 transition-all shadow-2xl flex flex-col group">
                <div className="relative w-full h-48 bg-zinc-900/50 rounded-[2rem] overflow-hidden flex items-center justify-center mb-6">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                  {produto.imagem_url ? (
                    <img src={produto.imagem_url} alt={produto.nome} className="w-full h-full object-contain p-4 relative z-0 group-hover:scale-110 transition-transform duration-700 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]" />
                  ) : (
                    <div className="text-zinc-700 font-black text-xl tracking-widest uppercase opacity-30">LOVEPOD</div>
                  )}
                  <div className="absolute bottom-4 left-6 right-6 z-20 flex justify-between items-end">
                    <h2 className="text-xl font-black italic tracking-tighter uppercase text-white drop-shadow-md">{produto.nome}</h2>
                    <div className="text-right bg-black/60 px-3 py-1.5 rounded-xl border border-pink-500/30"><span className="text-lg font-black text-white">R$ {produto.preco.toFixed(2)}</span></div>
                  </div>
                </div>

                <div className="px-4 pb-6 flex-1 flex flex-col justify-between">
                  <div className="mb-2">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-3">Clique para adicionar ao carrinho:</p>
                    <div className="flex flex-wrap gap-2">
                      {produto.sabores.map((sabor: any) => {
                        const noCarrinho = carrinho.find(c => c.estoqueId === sabor.estoqueId);
                        const qtyNoCarrinho = noCarrinho ? noCarrinho.quantidade : 0;
                        
                        return (
                          <button
                            key={sabor.id}
                            onClick={() => adicionarAoCarrinho(produto, sabor)}
                            className={`relative px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-2 border overflow-hidden
                              ${qtyNoCarrinho > 0 ? 'bg-pink-600 border-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]' : 'bg-[#121212] border-white/5 text-zinc-400 hover:bg-zinc-800 hover:border-white/20'}
                            `}
                          >
                            {sabor.nome}
                            <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${qtyNoCarrinho > 0 ? 'bg-white/20' : 'bg-black/50'}`}>
                              {sabor.quantidade - qtyNoCarrinho} Disp.
                            </span>
                            {qtyNoCarrinho > 0 && (
                              <div className="absolute -top-1 -right-1 bg-white text-pink-600 w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-black animate-in zoom-in">
                                {qtyNoCarrinho}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* BARRA FLUTUANTE DO CARRINHO */}
      {carrinho.length > 0 && !isModalOpen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-gradient-to-r from-pink-600 to-rose-500 p-1 rounded-3xl shadow-[0_10px_40px_rgba(236,72,153,0.4)] animate-in slide-in-from-bottom-10 z-40">
          <button onClick={() => setIsModalOpen(true)} className="w-full flex items-center justify-between bg-black/20 backdrop-blur-md px-6 py-4 rounded-[1.3rem] hover:bg-black/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white font-black">{carrinho.reduce((a, b) => a + b.quantidade, 0)}</div>
              <span className="font-black text-white uppercase tracking-widest text-sm">Ver Carrinho</span>
            </div>
            <span className="font-black text-white text-lg">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
          </button>
        </div>
      )}

      {/* MODAL DE CARRINHO / FINALIZAR VENDA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] w-full max-w-md p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
            
            {vendaSucesso ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center text-5xl border border-green-500/50 shadow-[0_0_40px_rgba(34,197,94,0.3)] animate-bounce">✓</div>
                <h3 className="text-3xl font-black text-white tracking-tight">Venda Salva!</h3>
                <p className="text-zinc-400 text-sm">Caixa e estoque atualizados com sucesso.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <h3 className="text-xl font-black text-white tracking-tight">Resumo da Venda</h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white bg-white/5 w-8 h-8 rounded-full flex items-center justify-center">✕</button>
                </div>

                {/* ITENS DO CARRINHO */}
                <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                  {carrinho.map((item) => (
                    <div key={item.estoqueId} className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-2xl border border-white/5">
                      <div>
                        <p className="text-white font-bold text-sm leading-tight">{item.produto.nome}</p>
                        <p className="text-zinc-400 text-xs">{item.sabor.nome}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-black/50 rounded-xl p-1 border border-white/5">
                          <button onClick={() => alterarQtd(item.estoqueId, -1)} className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 rounded-md font-bold">-</button>
                          <span className="text-xs font-bold w-4 text-center">{item.quantidade}</span>
                          <button onClick={() => alterarQtd(item.estoqueId, 1)} className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 rounded-md font-bold">+</button>
                        </div>
                        <button onClick={() => removerDoCarrinho(item.estoqueId)} className="text-red-500 hover:bg-red-500/20 p-1.5 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="h-px w-full bg-white/5" />

                {/* DESCONTO E TOTAL */}
                <div className="space-y-4 bg-black/30 p-5 rounded-3xl border border-white/5">
                  <div className="flex justify-between items-center text-sm text-zinc-400">
                    <span>Subtotal</span>
                    <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                  </div>
                  
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-sm font-bold text-pink-500">Desconto (R$)</span>
                    <input 
                      type="number" 
                      placeholder="0,00" 
                      value={desconto} 
                      onChange={(e) => setDesconto(e.target.value ? Number(e.target.value) : "")}
                      className="w-24 bg-zinc-900 border border-pink-500/30 focus:border-pink-500 rounded-xl h-10 px-3 text-right text-sm text-white outline-none"
                    />
                  </div>

                  <div className="flex justify-between items-end pt-2 border-t border-white/5">
                    <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Total a Cobrar</span>
                    <span className="text-3xl font-black text-white">R$ {totalComDesconto.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>

                {/* FORMA DE PAGAMENTO */}
                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold ml-2">Método de Pagamento</label>
                  <select value={tipoPagamento} onChange={(e) => setTipoPagamento(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-xl h-14 px-4 text-sm font-bold text-white outline-none focus:border-pink-500">
                    <option value="Pix">❖ Pix</option>
                    <option value="Cartão">💳 Cartão (Débito/Crédito)</option>
                    <option value="Dinheiro">💵 Dinheiro</option>
                    <option value="Dividido">⚖️ Pagamento Dividido</option>
                  </select>

                  {/* OPÇÕES DE PAGAMENTO DIVIDIDO */}
                  {tipoPagamento === 'Dividido' && (
                    <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 space-y-4 mt-2 animate-in fade-in zoom-in-95">
                      <div className="flex gap-2">
                        <select value={pagDividido.metodo1} onChange={e => setPagDividido({...pagDividido, metodo1: e.target.value})} className="flex-1 bg-black border border-white/10 rounded-xl h-12 px-3 text-xs text-white outline-none">
                          <option value="Pix">Pix</option><option value="Dinheiro">Dinheiro</option><option value="Cartão">Cartão</option>
                        </select>
                        <input type="number" placeholder="Valor 1 (R$)" value={pagDividido.valor1} onChange={e => setPagDividido({...pagDividido, valor1: e.target.value})} className="flex-1 bg-black border border-white/10 rounded-xl h-12 px-3 text-xs text-white outline-none focus:border-pink-500" />
                      </div>
                      <div className="flex gap-2 items-center">
                        <select value={pagDividido.metodo2} onChange={e => setPagDividido({...pagDividido, metodo2: e.target.value})} className="flex-1 bg-black border border-white/10 rounded-xl h-12 px-3 text-xs text-white outline-none">
                          <option value="Dinheiro">Dinheiro</option><option value="Pix">Pix</option><option value="Cartão">Cartão</option>
                        </select>
                        <div className="flex-1 bg-white/5 border border-white/5 rounded-xl h-12 px-3 flex items-center text-xs text-zinc-400">
                          Restante: R$ {Math.max(0, totalComDesconto - (Number(pagDividido.valor1) || 0)).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={confirmarVenda} disabled={processando || carrinho.length === 0} className="w-full h-14 bg-gradient-to-r from-green-500 to-emerald-400 hover:from-green-400 hover:to-emerald-300 text-white font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 shadow-[0_0_20px_rgba(34,197,94,0.3)] disabled:opacity-50 mt-4 flex items-center justify-center gap-2">
                  {processando ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Confirmar Pagamento'}
                </button>
              </div>
            )}
            
          </div>
        </div>
      )}

    </main>
  );
}