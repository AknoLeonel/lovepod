"use client";

import Link from 'next/link';
import { useCallback, useEffect, useState, use } from 'react';
import { carregarCatalogoDaCidade, type Catalogo, type SaborEmEstoque } from '@/lib/catalogo';
import { formatBRL } from '@/lib/format';

const NUMERO_WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMERO ?? "5577999371685";

type Estado =
  | { status: 'carregando' }
  | { status: 'erro' }
  | { status: 'pronto'; catalogo: Catalogo };

function TelaCentral({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface text-zinc-400 flex flex-col items-center justify-center gap-4 p-6 text-center relative overflow-hidden">
      {children}
    </div>
  );
}

export default function CatalogoCidade({ params }: { params: Promise<{ cidadeId: string }> }) {
  const { cidadeId } = use(params);

  const [estado, setEstado] = useState<Estado>({ status: 'carregando' });
  const [selecionados, setSelecionados] = useState<Record<number, SaborEmEstoque>>({});

  const carregar = useCallback(async () => {
    try {
      setEstado({ status: 'pronto', catalogo: await carregarCatalogoDaCidade(cidadeId) });
    } catch {
      setEstado({ status: 'erro' });
    }
  }, [cidadeId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (estado.status === 'carregando') {
    return (
      <TelaCentral>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-pink-600/20 blur-[120px] rounded-full" />
        <div role="status" aria-label="Carregando catálogo" className="w-12 h-12 border-4 border-white/5 border-t-pink-500 rounded-full animate-spin z-10" />
      </TelaCentral>
    );
  }

  if (estado.status === 'erro') {
    return (
      <TelaCentral>
        <p className="text-white font-bold">Não foi possível carregar o catálogo.</p>
        <p className="text-sm">Confira sua conexão e tente de novo.</p>
        <button onClick={() => { setEstado({ status: 'carregando' }); carregar(); }} className="px-6 py-3 bg-pink-600 hover:bg-pink-500 rounded-full text-white font-bold transition-colors">Tentar novamente</button>
      </TelaCentral>
    );
  }

  const { cidade, produtos } = estado.catalogo;

  if (!cidade) {
    return (
      <TelaCentral>
        <p>Cidade não encontrada.</p>
        <Link href="/" className="px-6 py-3 bg-zinc-900 rounded-full text-white font-bold hover:bg-pink-600 transition-colors">Voltar</Link>
      </TelaCentral>
    );
  }

  return (
    <main className="min-h-screen bg-surface text-zinc-100 pb-24 relative overflow-hidden">

      {/* Efeitos de fundo */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-pink-900/10 to-transparent pointer-events-none" />
      <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-rose-600/10 blur-[120px] rounded-full pointer-events-none" />

      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-2xl border-b border-white/5 shadow-2xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
          <Link href="/" className="group flex items-center gap-2 py-2 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">
            <span aria-hidden="true" className="bg-white/5 group-hover:bg-pink-500/20 p-2 rounded-full transition-colors">←</span> Voltar
          </Link>
          <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/5">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
            <span className="text-white text-xs font-black uppercase tracking-widest">{cidade.nome}</span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-10 sm:mt-12 space-y-10 sm:space-y-12 relative z-10">

        <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-500">
            Catálogo <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-400">VIP</span>
          </h1>
          <p className="text-zinc-400 text-sm font-medium">Escolha o sabor e finalize seu pedido direto no WhatsApp.</p>
        </div>

        {produtos.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/30 border border-white/5 rounded-[2rem] backdrop-blur-sm animate-in zoom-in-95">
            <span aria-hidden="true" className="text-4xl mb-4 block">😔</span>
            <h2 className="text-xl font-bold text-white mb-2">Estoque zerado</h2>
            <p className="text-zinc-400 text-sm">Nenhum pod disponível para {cidade.nome} no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {produtos.map((produto, index) => {
              const saborSelecionado = selecionados[produto.id];
              const linkWhats = saborSelecionado
                ? `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(
                    `*LOVEPOD - NOVO PEDIDO* 🛍️\n\n*Cidade:* ${cidade.nome}\n*Produto:* ${produto.nome}\n*Sabor:* ${saborSelecionado.nome}\n*Valor:* ${formatBRL(produto.preco)}\n\n_Como gostaria de realizar o pagamento?_`
                  )}`
                : null;

              return (
                <section
                  key={produto.id}
                  aria-labelledby={`produto-${produto.id}`}
                  className="bg-surface-raised/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-2 hover:border-pink-500/40 transition-colors duration-500 shadow-2xl flex flex-col animate-fade-in-up group"
                  style={{ animationDelay: `${Math.min(index, 6) * 120}ms` }}
                >

                  {/* Vitrine */}
                  <div className="relative w-full h-56 sm:h-64 bg-zinc-900/50 rounded-[2rem] overflow-hidden flex items-center justify-center mb-6">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                    {produto.imagem_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- a URL é cadastrada pelo admin e pode vir de qualquer domínio
                      <img
                        src={produto.imagem_url}
                        alt={produto.nome}
                        loading={index < 2 ? 'eager' : 'lazy'}
                        className="w-full h-full object-contain p-6 relative z-0 group-hover:scale-110 transition-transform duration-700 drop-shadow-[0_20px_20px_rgba(0,0,0,0.8)]"
                      />
                    ) : (
                      <div aria-hidden="true" className="text-zinc-700 font-black text-2xl tracking-widest uppercase opacity-30">LOVEPOD</div>
                    )}

                    <div className="absolute bottom-5 left-5 right-5 z-20 flex justify-between items-end gap-3">
                      <div className="min-w-0">
                        <h2 id={`produto-${produto.id}`} className="text-2xl sm:text-3xl font-black italic tracking-tighter uppercase text-white drop-shadow-md leading-none break-words">{produto.nome}</h2>
                        <p className="text-zinc-300 text-xs mt-2 font-medium bg-black/50 backdrop-blur-md inline-block px-3 py-1 rounded-full border border-white/10">{produto.descricao || 'Premium Edition'}</p>
                      </div>
                      <div className="shrink-0 text-right bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-pink-500/30">
                        <span className="block text-[10px] text-pink-400 font-bold uppercase tracking-widest mb-0.5">Valor</span>
                        <span className="text-xl sm:text-2xl font-black text-white">{formatBRL(produto.preco)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Sabores e botão */}
                  <div className="px-4 sm:px-6 pb-6 flex-1 flex flex-col justify-between">
                    <div className="mb-8">
                      <p id={`sabores-${produto.id}`} className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-zinc-500" /> Escolha seu sabor
                      </p>
                      <div role="group" aria-labelledby={`sabores-${produto.id}`} className="flex flex-wrap gap-2.5">
                        {produto.sabores.map((sabor) => {
                          const isSelected = saborSelecionado?.id === sabor.id;
                          const acabando = sabor.quantidade <= 2;

                          return (
                            <button
                              key={sabor.id}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() => setSelecionados((prev) => ({ ...prev, [produto.id]: sabor }))}
                              className={`relative min-h-11 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 active:scale-95 flex items-center gap-2 overflow-hidden border
                                ${isSelected
                                  ? 'bg-pink-600 text-white shadow-[0_0_20px_rgba(236,72,153,0.4)] border-pink-500'
                                  : 'bg-[#121212] text-zinc-300 border-white/10 hover:border-white/25 hover:text-white hover:bg-zinc-800'
                                }
                              `}
                            >
                              {isSelected && <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shine" />}
                              <span className="relative z-10">{sabor.nome}</span>

                              {acabando && (
                                <span className={`relative z-10 text-[10px] px-1.5 py-0.5 rounded-md ${isSelected ? 'bg-white/20 text-white' : 'bg-orange-500/20 text-orange-400'}`}>
                                  Últimos
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {linkWhats ? (
                      <a
                        href={linkWhats}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-3 min-h-14 px-4 py-2 rounded-2xl font-black uppercase tracking-widest text-center bg-white text-black hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-transform duration-300"
                      >
                        <svg aria-hidden="true" className="w-5 h-5 shrink-0 text-green-600" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.571-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                        Pedir {saborSelecionado.nome}
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="w-full min-h-14 rounded-2xl font-black uppercase tracking-widest bg-zinc-900 text-zinc-500 cursor-not-allowed border border-white/5"
                      >
                        Selecione um sabor
                      </button>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
