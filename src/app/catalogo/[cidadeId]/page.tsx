"use client";

import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useEffect, useState, use } from 'react';

export default function CatalogoCidade({ params }: { params: Promise<{ cidadeId: string }> }) {
  const { cidadeId } = use(params);

  const [cidade, setCidade] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecionados, setSelecionados] = useState<Record<string, any>>({});

  const numeroWhatsApp = "5577999371685"; // 🚨 SEU NÚMERO AQUI (Ex: 5511999999999)

  useEffect(() => {
    async function carregarCatalogo() {
      const { data: cid } = await supabase.from('cidades').select('nome').eq('id', cidadeId).single();
      if (cid) setCidade(cid);

      // 🚀 ATUALIZAÇÃO: Agora puxamos a imagem_url do banco de dados
      const { data: estoqueRaw } = await supabase
        .from('estoque')
        .select(`quantidade, produto:produtos ( id, nome, preco, descricao, imagem_url ), sabor:sabores ( id, nome )`)
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
      <div className="min-h-screen bg-[#030303] flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-pink-600/20 blur-[120px] rounded-full" />
        <div className="w-12 h-12 border-4 border-white/5 border-t-pink-500 rounded-full animate-spin z-10" />
      </div>
    );
  }

  if (!cidade) {
    return <div className="min-h-screen bg-[#030303] text-zinc-400 flex flex-col items-center justify-center gap-4"><p>Cidade não encontrada.</p><Link href="/" className="px-6 py-2 bg-zinc-900 rounded-full text-white font-bold hover:bg-pink-600 transition-colors">Voltar</Link></div>;
  }

  return (
    <main className="min-h-screen bg-[#030303] text-zinc-100 font-sans selection:bg-pink-500 pb-24 relative overflow-hidden">
      
      {/* 🌌 Efeitos de Fundo */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-pink-900/10 to-transparent pointer-events-none" />
      <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-rose-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* HEADER PREMIUM */}
      <header className="sticky top-0 z-50 bg-[#030303]/80 backdrop-blur-2xl border-b border-white/5 shadow-2xl">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="group flex items-center gap-2 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all">
            <span className="bg-white/5 group-hover:bg-pink-500/20 p-2 rounded-full transition-colors">←</span> Voltar
          </Link>
          <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/5">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
            <span className="text-white text-xs font-black uppercase tracking-widest">{cidade.nome}</span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-12 space-y-12 relative z-10">
        
        {/* TÍTULO DA PÁGINA */}
        <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-500 drop-shadow-lg">
            Catálogo <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-400">VIP</span>
          </h1>
          <p className="text-zinc-400 text-sm font-medium">Selecione o sabor e finalize seu pedido direto no WhatsApp.</p>
        </div>

        {produtos.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/30 border border-white/5 rounded-[2rem] backdrop-blur-sm animate-in zoom-in-95">
            <span className="text-4xl mb-4 block">😔</span>
            <h3 className="text-xl font-bold text-white mb-2">Estoque Zerado</h3>
            <p className="text-zinc-500 text-sm">Nenhum pod disponível para {cidade.nome} no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {produtos.map((produto, index) => {
              const saborSelecionado = selecionados[produto.id];
              const mensagem = saborSelecionado 
                ? `*LOVEPOD - NOVO PEDIDO* 🛍️\n\n*Cidade:* ${cidade.nome}\n*Produto:* ${produto.nome}\n*Sabor:* ${saborSelecionado.nome}\n*Valor:* R$ ${produto.preco.toFixed(2)}\n\n_Como gostaria de realizar o pagamento?_` 
                : '';
              const linkWhats = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`;

              return (
                <section 
                  key={produto.id} 
                  className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-2 hover:border-pink-500/40 transition-all duration-500 shadow-2xl flex flex-col opacity-0 animate-[fade-in-up_0.6s_ease-out_forwards] group"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  
                  {/* VITRINE DA IMAGEM */}
                  <div className="relative w-full h-56 sm:h-64 bg-zinc-900/50 rounded-[2rem] overflow-hidden flex items-center justify-center mb-6">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                    {produto.imagem_url ? (
                      <img 
                        src={produto.imagem_url} 
                        alt={produto.nome} 
                        className="w-full h-full object-contain p-6 relative z-0 group-hover:scale-110 transition-transform duration-700 drop-shadow-[0_20px_20px_rgba(0,0,0,0.8)]"
                      />
                    ) : (
                      <div className="text-zinc-700 font-black text-2xl tracking-widest uppercase opacity-30">LOVEPOD</div>
                    )}
                    
                    {/* Infos sobrepostas na imagem */}
                    <div className="absolute bottom-5 left-6 right-6 z-20 flex justify-between items-end">
                      <div>
                        <h2 className="text-2xl sm:text-3xl font-black italic tracking-tighter uppercase text-white drop-shadow-md leading-none">{produto.nome}</h2>
                        <p className="text-zinc-300 text-xs mt-2 font-medium bg-black/50 backdrop-blur-md inline-block px-3 py-1 rounded-full border border-white/10">{produto.descricao || 'Premium Edition'}</p>
                      </div>
                      <div className="text-right bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-pink-500/30">
                        <span className="block text-[9px] text-pink-400 font-bold uppercase tracking-widest mb-0.5">Valor</span>
                        <span className="text-xl sm:text-2xl font-black text-white">R$ {produto.preco.toFixed(2).replace('.', ',')}</span>
                      </div>
                    </div>
                  </div>

                  {/* ÁREA DE SABORES E BOTÃO */}
                  <div className="px-4 sm:px-6 pb-6 flex-1 flex flex-col justify-between">
                    <div className="mb-8">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" /> Escolha sua Essência:
                      </p>
                      <div className="flex flex-wrap gap-2.5">
                        {produto.sabores.map((sabor: any) => {
                          const isSelected = saborSelecionado?.id === sabor.id;
                          const acabando = sabor.quantidade <= 2;

                          return (
                            <button
                              key={sabor.id}
                              onClick={() => setSelecionados({ ...selecionados, [produto.id]: sabor })}
                              className={`relative px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 active:scale-95 flex items-center gap-2 overflow-hidden
                                ${isSelected 
                                  ? 'bg-pink-600 text-white shadow-[0_0_20px_rgba(236,72,153,0.4)] border border-pink-500' 
                                  : 'bg-[#121212] text-zinc-400 border border-white/5 hover:border-white/20 hover:text-white hover:bg-zinc-800'
                                }
                              `}
                            >
                              {isSelected && <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-[shine_1.5s_ease-in-out_infinite]" />}
                              <span className="relative z-10">{sabor.nome}</span>
                              
                              {/* Badge de Esgotando */}
                              {acabando && (
                                <span className={`relative z-10 text-[9px] px-1.5 py-0.5 rounded-md ml-1 ${isSelected ? 'bg-white/20 text-white' : 'bg-orange-500/20 text-orange-400'}`}>
                                  Últimos
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <a 
                      href={saborSelecionado ? linkWhats : '#'}
                      target={saborSelecionado ? "_blank" : "_self"}
                      className={`w-full flex items-center justify-center gap-3 h-14 rounded-2xl font-black uppercase tracking-widest transition-all duration-300 overflow-hidden relative
                        ${saborSelecionado 
                          ? 'bg-white text-black hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)]' 
                          : 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-white/5'
                        }
                      `}
                    >
                      {saborSelecionado ? (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
                          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.571-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                          Pedir {saborSelecionado.nome}
                        </>
                      ) : (
                        'Selecione um Sabor'
                      )}
                    </a>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* Estilos customizados para as animações */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes shine {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(200%) skewX(-15deg); }
        }
      `}} />
    </main>
  );
}