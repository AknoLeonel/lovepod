"use client";

import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useEffect, useState, use } from 'react';

export default function CatalogoCidade({ params }: { params: Promise<{ cidadeId: string }> }) {
  // O Next.js 15 exige o 'use' para desempacotar o ID da URL
  const { cidadeId } = use(params);

  const [cidade, setCidade] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Guarda qual sabor foi clicado em cada produto { "id_produto": "id_sabor" }
  const [selecionados, setSelecionados] = useState<Record<string, any>>({});

  const numeroWhatsApp = "5561999999999"; // 🚨 Não esqueça de colocar seu número aqui

  useEffect(() => {
    async function carregarCatalogo() {
      // Busca a cidade
      const { data: cid } = await supabase.from('cidades').select('nome').eq('id', cidadeId).single();
      if (cid) setCidade(cid);

      // Busca o estoque agrupando tudo
      const { data: estoqueRaw } = await supabase
        .from('estoque')
        .select(`quantidade, produto:produtos ( id, nome, preco, descricao ), sabor:sabores ( id, nome )`)
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
          agrupados[prod.id].sabores.push({ ...sab, quantidade: item.quantidade });
        });
      }

      setProdutos(Object.values(agrupados));
      setLoading(false);
    }
    carregarCatalogo();
  }, [cidadeId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!cidade) {
    return <div className="min-h-screen bg-[#030303] text-white flex items-center justify-center">Cidade não encontrada.</div>;
  }

  return (
    <main className="min-h-screen bg-[#030303] text-zinc-100 font-sans selection:bg-pink-500 pb-24">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#030303]/70 backdrop-blur-2xl border-b border-white/5 shadow-md">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-zinc-400 hover:text-pink-500 text-sm font-semibold transition-all">← Cidades</Link>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-pink-500 animate-pulse" />
            <span className="text-white font-black uppercase tracking-widest">{cidade.nome}</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-10 space-y-10">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-400">
            Estoque Local
          </h1>
          <p className="text-zinc-400 text-sm">Selecione o sabor abaixo e finalize o pedido no WhatsApp.</p>
        </div>

        {produtos.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">Sem estoque no momento.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {produtos.map((produto) => {
              const saborSelecionado = selecionados[produto.id];
              
              // Monta a mensagem dinâmica
              const mensagem = saborSelecionado 
                ? `*LOVEPOD - NOVO PEDIDO* 🛍️\n\n*Cidade:* ${cidade.nome}\n*Produto:* ${produto.nome}\n*Sabor:* ${saborSelecionado.nome}\n*Valor:* R$ ${produto.preco.toFixed(2)}\n\n_Como gostaria de realizar o pagamento?_` 
                : '';
              const linkWhats = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`;

              return (
                <section key={produto.id} className="bg-zinc-900/40 border border-white/5 rounded-[2rem] p-6 sm:p-8 hover:border-pink-500/30 transition-all duration-300 shadow-xl flex flex-col justify-between">
                  
                  {/* Título e Preço */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white">{produto.nome}</h2>
                      <p className="text-zinc-400 text-xs mt-1">{produto.descricao || 'Pod Descartável Premium'}</p>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Valor</span>
                      <span className="text-2xl font-black text-pink-500">R$ {produto.preco.toFixed(2).replace('.', ',')}</span>
                    </div>
                  </div>

                  {/* Seleção de Sabores (Chips) */}
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-3">Escolha o Sabor:</p>
                    <div className="flex flex-wrap gap-2 mb-8">
                      {produto.sabores.map((sabor: any) => {
                        const isSelected = saborSelecionado?.id === sabor.id;
                        const acabando = sabor.quantidade <= 2;

                        return (
                          <button
                            key={sabor.id}
                            onClick={() => setSelecionados({ ...selecionados, [produto.id]: sabor })}
                            className={`relative px-4 py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-95 flex items-center gap-2
                              ${isSelected 
                                ? 'bg-pink-600 border-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]' 
                                : 'bg-black/50 border-white/5 text-zinc-400 hover:text-white hover:border-white/20'
                              }
                            `}
                          >
                            {sabor.nome}
                            {/* Bolinha laranja se estiver acabando */}
                            {acabando && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span></span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Botão de Pedir Dinâmico */}
                  <a 
                    href={saborSelecionado ? linkWhats : '#'}
                    target={saborSelecionado ? "_blank" : "_self"}
                    className={`w-full flex items-center justify-center h-14 rounded-2xl font-black uppercase tracking-widest transition-all duration-300
                      ${saborSelecionado 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-400 text-white shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:scale-[1.02] active:scale-95' 
                        : 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-white/5'
                      }
                    `}
                  >
                    {saborSelecionado ? `Pedir ${saborSelecionado.nome}` : 'Selecione um Sabor'}
                  </a>

                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}