"use client";

import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';

export default function VendedorPDV({ params }: { params: Promise<{ cidadeId: string }> }) {
  const { cidadeId } = use(params);
  const router = useRouter();

  const [cidade, setCidade] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendedorNome, setVendedorNome] = useState("");
  const [selecionados, setSelecionados] = useState<Record<string, any>>({});

  // Estados do Modal
  const [vendaModal, setVendaModal] = useState<{aberto: boolean, produto: any, sabor: any, estoqueId: number} | null>(null);
  const [processando, setProcessando] = useState(false);
  const [vendaSucesso, setVendaSucesso] = useState(false); // 🚀 ESTADO NOVO PARA A TELA DE SUCESSO

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
        agrupados[prod.id].sabores.push({ 
          ...sab, 
          quantidade: item.quantidade,
          estoqueId: item.id
        });
      });
    }

    setProdutos(Object.values(agrupados));
    setLoading(false);
  }

  const abrirPagamento = (produto: any, sabor: any) => {
    setVendaModal({ aberto: true, produto, sabor, estoqueId: sabor.estoqueId });
  };

  const confirmarVenda = async (metodo: string) => {
    if (!vendaModal) return;
    setProcessando(true);

    try {
      // 1. Verifica se alguém comprou no mesmo segundo
      const { data: checkEstoque } = await supabase
        .from('estoque')
        .select('quantidade')
        .eq('id', vendaModal.estoqueId)
        .single();

      if (!checkEstoque || checkEstoque.quantidade <= 0) {
        alert("⚠️ Venda não realizada! Alguém acabou de vender a última unidade deste sabor.");
        setVendaModal(null);
        carregarCatalogo();
        setProcessando(false);
        return;
      }

      // 🚀 2. SALVA A VENDA PRIMEIRO! (Se der erro aqui, não tira do estoque)
      const { error: errVenda } = await supabase
        .from('vendas')
        .insert([{
          cidade_id: parseInt(cidadeId),
          produto_id: vendaModal.produto.id,
          sabor_id: vendaModal.sabor.id,
          vendedor_nome: vendedorNome,
          quantidade: 1,
          valor_total: vendaModal.produto.preco,
          metodo_pagamento: metodo
        }]);

      if (errVenda) throw errVenda;

      // 🚀 3. DA BAIXA NO ESTOQUE DEPOIS DA VENDA GARANTIDA
      const { error: errEstoque } = await supabase
        .from('estoque')
        .update({ quantidade: checkEstoque.quantidade - 1 })
        .eq('id', vendaModal.estoqueId);

      if (errEstoque) throw errEstoque;

      // 🚀 4. MOSTRA A TELA DE SUCESSO LINDONA
      setVendaSucesso(true);
      
      // Espera 2 segundos mostrando o sucesso, depois fecha tudo e atualiza
      setTimeout(async () => {
        setVendaSucesso(false);
        setVendaModal(null);
        
        const novosSelecionados = { ...selecionados };
        delete novosSelecionados[vendaModal.produto.id];
        setSelecionados(novosSelecionados);
        
        await carregarCatalogo();
      }, 2000);
      
    } catch (error: any) {
      alert("Erro ao registrar venda: " + error.message);
    }

    setProcessando(false);
  };

  if (loading) {
    return <div className="min-h-screen bg-[#030303] flex items-center justify-center"><div className="w-12 h-12 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" /></div>;
  }

  return (
    <main className="min-h-screen bg-[#030303] text-zinc-100 font-sans selection:bg-pink-500 pb-24 relative overflow-hidden">
      
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
          <p className="text-pink-500 text-[10px] uppercase tracking-widest font-bold">Modo PDV Ativo</p>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">
            Vendedor: <span className="text-zinc-400">{vendedorNome}</span>
          </h1>
        </div>

        {produtos.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/30 border border-white/5 rounded-[2rem]">
            <h3 className="text-xl font-bold text-white mb-2">Estoque Zerado</h3>
            <p className="text-zinc-500 text-sm">Nenhum pod disponível para {cidade?.nome}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {produtos.map((produto) => {
              const saborSelecionado = selecionados[produto.id];

              return (
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
                      <div className="text-right bg-black/60 px-3 py-1.5 rounded-xl border border-pink-500/30">
                        <span className="text-lg font-black text-white">R$ {produto.preco.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 pb-6 flex-1 flex flex-col justify-between">
                    <div className="mb-6">
                      <div className="flex flex-wrap gap-2">
                        {produto.sabores.map((sabor: any) => {
                          const isSelected = saborSelecionado?.id === sabor.id;
                          return (
                            <button
                              key={sabor.id}
                              onClick={() => setSelecionados({ ...selecionados, [produto.id]: sabor })}
                              className={`relative px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-2
                                ${isSelected ? 'bg-pink-600 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]' : 'bg-[#121212] text-zinc-400 border border-white/5 hover:bg-zinc-800'}
                              `}
                            >
                              {sabor.nome}
                              <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${isSelected ? 'bg-white/20' : 'bg-black/50'}`}>{sabor.quantidade} un.</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button 
                      onClick={() => saborSelecionado && abrirPagamento(produto, saborSelecionado)}
                      disabled={!saborSelecionado}
                      className={`w-full h-12 rounded-2xl font-black uppercase tracking-widest transition-all
                        ${saborSelecionado 
                          ? 'bg-gradient-to-r from-pink-600 to-rose-500 text-white hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(236,72,153,0.3)]' 
                          : 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-white/5'
                        }
                      `}
                    >
                      {saborSelecionado ? 'Registrar Venda' : 'Selecione um Sabor'}
                    </button>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE PAGAMENTO (FINALIZAR VENDA E SUCESSO) */}
      {vendaModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] w-full max-w-sm p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-300">
            
            {vendaSucesso ? (
              // TELA DE SUCESSO ANIMADA
              <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center text-4xl border border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                  ✓
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight">Venda Salva!</h3>
                <p className="text-zinc-400 text-sm">Caixa e estoque atualizados.</p>
              </div>
            ) : (
              // TELA DE ESCOLHER PAGAMENTO
              <>
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-black text-white tracking-tight">Finalizar Venda</h3>
                  <p className="text-zinc-400 text-sm">Selecione o método de pagamento</p>
                </div>
                
                <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 text-center">
                  <p className="text-pink-500 font-black uppercase text-sm">{vendaModal.produto.nome}</p>
                  <p className="text-zinc-300 text-xs font-bold">{vendaModal.sabor.nome}</p>
                  <p className="text-white font-black text-2xl mt-2">R$ {vendaModal.produto.preco.toFixed(2)}</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <button onClick={() => confirmarVenda('Pix')} disabled={processando} className="w-full bg-[#1e293b] hover:bg-[#334155] border border-cyan-500/30 text-cyan-400 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                    <span className="text-xl">❖</span> Pix
                  </button>
                  <button onClick={() => confirmarVenda('Cartão')} disabled={processando} className="w-full bg-[#3f2441] hover:bg-[#582e5b] border border-purple-500/30 text-purple-400 font-bold py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50">
                    💳 Cartão (Débito/Crédito)
                  </button>
                  <button onClick={() => confirmarVenda('Dinheiro')} disabled={processando} className="w-full bg-[#143321] hover:bg-[#1a442b] border border-green-500/30 text-green-400 font-bold py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50">
                    💵 Dinheiro
                  </button>
                </div>

                <button onClick={() => !processando && setVendaModal(null)} disabled={processando} className="w-full py-3 rounded-xl bg-zinc-800 text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-50">
                  Cancelar
                </button>
              </>
            )}
            
          </div>
        </div>
      )}

    </main>
  );
}