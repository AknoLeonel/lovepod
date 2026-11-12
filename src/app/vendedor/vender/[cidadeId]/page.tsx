"use client";

import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useCallback, useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { carregarCatalogoDaCidade, type ProdutoCatalogo, type SaborEmEstoque } from '@/lib/catalogo';
import { formatBRL } from '@/lib/format';

type CartItem = {
  estoqueId: number;
  produto: ProdutoCatalogo;
  sabor: SaborEmEstoque;
  quantidade: number;
  maxEstoque: number;
};

const PAGAMENTO_DIVIDIDO_INICIAL = { metodo1: "Pix", valor1: "", metodo2: "Dinheiro" };

export default function VendedorPDV({ params }: { params: Promise<{ cidadeId: string }> }) {
  const { cidadeId } = use(params);
  const router = useRouter();

  const [cidade, setCidade] = useState<{ nome: string } | null>(null);
  const [produtos, setProdutos] = useState<ProdutoCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [erroCarga, setErroCarga] = useState(false);
  const [vendedorNome, setVendedorNome] = useState("");

  const [carrinho, setCarrinho] = useState<CartItem[]>([]);
  const [aviso, setAviso] = useState("");

  // Estados do modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [vendaSucesso, setVendaSucesso] = useState(false);
  const [erroVenda, setErroVenda] = useState("");

  // Pagamentos e descontos
  const [desconto, setDesconto] = useState<number | "">("");
  const [tipoPagamento, setTipoPagamento] = useState("Pix");
  const [pagDividido, setPagDividido] = useState(PAGAMENTO_DIVIDIDO_INICIAL);

  const carregarCatalogo = useCallback(async () => {
    try {
      const catalogo = await carregarCatalogoDaCidade(cidadeId);
      setCidade(catalogo.cidade);
      setProdutos(catalogo.produtos);
      setErroCarga(false);
    } catch {
      setErroCarga(true);
    }
    setLoading(false);
  }, [cidadeId]);

  useEffect(() => {
    const auth = sessionStorage.getItem('lovepod_vendedor_auth');
    const nome = sessionStorage.getItem('lovepod_vendedor_nome');

    if (auth !== 'true' || !nome) {
      router.push('/vendedor');
      return;
    }
    setVendedorNome(nome);
    carregarCatalogo();
  }, [carregarCatalogo, router]);

  // Avisos somem sozinhos
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(""), 3000);
    return () => clearTimeout(t);
  }, [aviso]);

  // ==========================================
  // FUNÇÕES DO CARRINHO
  // ==========================================
  const adicionarAoCarrinho = (produto: ProdutoCatalogo, sabor: SaborEmEstoque) => {
    const existe = carrinho.find(item => item.estoqueId === sabor.estoqueId);
    if (existe && existe.quantidade >= sabor.quantidade) {
      setAviso(`Estoque máximo atingido para ${sabor.nome}`);
      return;
    }
    setCarrinho(prev =>
      existe
        ? prev.map(item => item.estoqueId === sabor.estoqueId ? { ...item, quantidade: item.quantidade + 1 } : item)
        : [...prev, { estoqueId: sabor.estoqueId, produto, sabor, quantidade: 1, maxEstoque: sabor.quantidade }]
    );
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

  const fecharModal = () => {
    setIsModalOpen(false);
    setErroVenda("");
  };

  const subtotal = carrinho.reduce((acc, item) => acc + (item.produto.preco * item.quantidade), 0);
  const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
  const valorDesconto = Number(desconto) || 0;
  const descontoInvalido = valorDesconto < 0 || valorDesconto > subtotal;
  const totalComDesconto = descontoInvalido ? subtotal : subtotal - valorDesconto;
  const valor1Dividido = Number(pagDividido.valor1) || 0;
  const divididoInvalido = tipoPagamento === 'Dividido' && (valor1Dividido <= 0 || valor1Dividido >= totalComDesconto);

  // ==========================================
  // FINALIZAR VENDA
  // ==========================================
  const confirmarVenda = async () => {
    if (carrinho.length === 0 || processando) return;
    setErroVenda("");

    if (descontoInvalido) {
      setErroVenda(`O desconto precisa ficar entre R$ 0,00 e ${formatBRL(subtotal)}.`);
      return;
    }
    if (divididoInvalido) {
      setErroVenda(`No pagamento dividido, o Valor 1 precisa ser maior que zero e menor que o total (${formatBRL(totalComDesconto)}).`);
      return;
    }

    setProcessando(true);

    // Baixas já gravadas nesta tentativa, para desfazer se algo falhar no meio
    const baixas: { estoqueId: number; quantidade: number }[] = [];
    const desfazerBaixas = async () => {
      for (const baixa of baixas) {
        const { data } = await supabase.from('estoque').select('quantidade').eq('id', baixa.estoqueId).maybeSingle();
        if (data) {
          await supabase.from('estoque').update({ quantidade: data.quantidade + baixa.quantidade }).eq('id', baixa.estoqueId).eq('quantidade', data.quantidade);
        }
      }
    };

    try {
      // 1. Confere se a cidade ainda está ativa e lê o estoque atual de todos os itens
      const ids = carrinho.map(c => c.estoqueId);
      const [{ data: cidadeAtiva, error: errCidade }, { data: checkEstoque, error: errCheck }] = await Promise.all([
        supabase.from('cidades').select('id').eq('id', cidadeId).eq('ativa', true).maybeSingle(),
        supabase.from('estoque').select('id, quantidade').in('id', ids),
      ]);
      if (errCidade) throw errCidade;
      if (errCheck) throw errCheck;
      if (!cidadeAtiva) {
        setErroVenda("Esta cidade foi desativada pelo administrador. Nenhuma venda foi registrada.");
        return;
      }

      // 2. Dá baixa item a item. O filtro pela quantidade lida garante que, se outro
      //    vendedor mexeu no mesmo estoque nesse meio tempo, nada é gravado.
      for (const item of carrinho) {
        const estqDb = checkEstoque?.find(e => e.id === item.estoqueId);
        const disponivel = estqDb?.quantidade ?? 0;

        const { data: atualizado, error: errBaixa } = disponivel >= item.quantidade
          ? await supabase.from('estoque')
              .update({ quantidade: disponivel - item.quantidade })
              .eq('id', item.estoqueId)
              .eq('quantidade', disponivel)
              .select('id')
          : { data: [], error: null };
        if (errBaixa) throw errBaixa;

        if (!atualizado || atualizado.length === 0) {
          await desfazerBaixas();
          setErroVenda(`Venda bloqueada: o estoque de ${item.sabor.nome} acabou de mudar. Confira o carrinho e tente de novo.`);
          setCarrinho([]);
          await carregarCatalogo();
          return;
        }
        baixas.push({ estoqueId: item.estoqueId, quantidade: item.quantidade });
      }

      // 3. Monta a descrição do pagamento
      let stringPagamento = tipoPagamento;
      if (tipoPagamento === 'Dividido') {
        const val2 = totalComDesconto - valor1Dividido;
        stringPagamento = `Div: ${pagDividido.metodo1} (${formatBRL(valor1Dividido)}) + ${pagDividido.metodo2} (${formatBRL(val2)})`;
      }
      if (valorDesconto > 0) {
        stringPagamento += ` | Desc: ${formatBRL(valorDesconto)}`;
      }

      // 4. Registra as vendas, rateando o desconto proporcionalmente entre os itens
      const insertsVendas = carrinho.map(item => {
        const bruto = item.produto.preco * item.quantidade;
        const descontoDoItem = subtotal > 0 ? valorDesconto * (bruto / subtotal) : 0;

        return {
          cidade_id: parseInt(cidadeId),
          produto_id: item.produto.id,
          sabor_id: item.sabor.id,
          vendedor_nome: vendedorNome,
          quantidade: item.quantidade,
          valor_total: (bruto - descontoDoItem) / item.quantidade, // valor unitário realmente cobrado
          metodo_pagamento: stringPagamento
        };
      });

      const { error: errVenda } = await supabase.from('vendas').insert(insertsVendas);
      if (errVenda) throw errVenda;

      // 5. Sucesso
      setVendaSucesso(true);
      setCarrinho([]);
      setDesconto("");
      setTipoPagamento("Pix");
      setPagDividido(PAGAMENTO_DIVIDIDO_INICIAL);
      await carregarCatalogo();
      setTimeout(() => {
        setVendaSucesso(false);
        setIsModalOpen(false);
      }, 2500);
    } catch (error) {
      await desfazerBaixas();
      setErroVenda("Erro ao registrar a venda: " + (error instanceof Error ? error.message : (error as { message?: string })?.message ?? 'falha desconhecida'));
      await carregarCatalogo();
    } finally {
      setProcessando(false);
    }
  };

  if (!loading && erroCarga && produtos.length === 0) {
    return (
      <div className="min-h-screen bg-surface text-zinc-400 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-white font-bold">Não foi possível carregar o estoque.</p>
        <button onClick={() => { setLoading(true); carregarCatalogo(); }} className="px-6 py-3 bg-pink-600 hover:bg-pink-500 rounded-full text-white font-bold transition-colors">Tentar novamente</button>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen bg-surface flex items-center justify-center"><div className="w-12 h-12 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" /></div>;

  // Cidade apagada ou oculta pelo admin: não deixa vender nela
  if (!erroCarga && !cidade) {
    return (
      <div className="min-h-screen bg-surface text-zinc-400 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-white font-bold">Esta cidade não está disponível para vendas.</p>
        <Link href="/vendedor/cidades" className="px-6 py-3 bg-zinc-900 hover:bg-pink-600 rounded-full text-white font-bold transition-colors">Escolher outra cidade</Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-surface text-zinc-100 pb-32 relative overflow-hidden">
      
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-2xl border-b border-white/5 shadow-2xl">
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
                    <div className="text-right bg-black/60 px-3 py-1.5 rounded-xl border border-pink-500/30"><span className="text-lg font-black text-white">{formatBRL(produto.preco)}</span></div>
                  </div>
                </div>

                <div className="px-4 pb-6 flex-1 flex flex-col justify-between">
                  <div className="mb-2">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-3">Clique para adicionar ao carrinho:</p>
                    <div className="flex flex-wrap gap-2">
                      {produto.sabores.map((sabor) => {
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

      {/* AVISO RÁPIDO */}
      <div aria-live="polite" className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-sm pointer-events-none">
        {aviso && (
          <p className="bg-orange-500 text-black text-sm font-bold text-center px-4 py-3 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-4">{aviso}</p>
        )}
      </div>

      {/* BARRA FLUTUANTE DO CARRINHO */}
      {carrinho.length > 0 && !isModalOpen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-gradient-to-r from-pink-600 to-rose-500 p-1 rounded-3xl shadow-[0_10px_40px_rgba(236,72,153,0.4)] animate-in slide-in-from-bottom-10 z-40">
          <button onClick={() => setIsModalOpen(true)} className="w-full flex items-center justify-between bg-black/20 backdrop-blur-md px-6 py-4 rounded-[1.3rem] hover:bg-black/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white font-black">{totalItens}</div>
              <span className="font-black text-white uppercase tracking-widest text-sm">Ver Carrinho</span>
            </div>
            <span className="font-black text-white text-lg">{formatBRL(subtotal)}</span>
          </button>
        </div>
      )}

      {/* MODAL DE CARRINHO / FINALIZAR VENDA */}
      {isModalOpen && (
        <div role="dialog" aria-modal="true" aria-label="Resumo da venda" className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-md p-6 sm:p-8 shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
            
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
                  <button onClick={fecharModal} aria-label="Fechar" className="text-zinc-400 hover:text-white bg-white/5 w-10 h-10 rounded-full flex items-center justify-center">✕</button>
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
                          <button onClick={() => alterarQtd(item.estoqueId, -1)} aria-label="Diminuir quantidade" className="w-9 h-9 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg font-bold">−</button>
                          <span className="text-xs font-bold w-4 text-center">{item.quantidade}</span>
                          <button onClick={() => alterarQtd(item.estoqueId, 1)} aria-label="Aumentar quantidade" className="w-9 h-9 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg font-bold">+</button>
                        </div>
                        <button onClick={() => removerDoCarrinho(item.estoqueId)} aria-label={`Remover ${item.sabor.nome}`} className="text-red-400 hover:bg-red-500/20 p-2.5 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="h-px w-full bg-white/5" />

                {/* DESCONTO E TOTAL */}
                <div className="space-y-4 bg-black/30 p-5 rounded-3xl border border-white/5">
                  <div className="flex justify-between items-center text-sm text-zinc-400">
                    <span>Subtotal</span>
                    <span>{formatBRL(subtotal)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center gap-4">
                    <label htmlFor="pdv-desconto" className="text-sm font-bold text-pink-500">Desconto (R$)</label>
                    <input 
                      id="pdv-desconto"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      aria-invalid={descontoInvalido}
                      placeholder="0,00"
                      value={desconto} 
                      onChange={(e) => setDesconto(e.target.value ? Number(e.target.value) : "")}
                      className={`w-28 bg-zinc-900 border ${descontoInvalido ? "border-red-500" : "border-pink-500/30 focus:border-pink-500"} rounded-xl h-11 px-3 text-right text-sm text-white outline-none`}
                    />
                  </div>

                  <div className="flex justify-between items-end pt-2 border-t border-white/5">
                    <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Total a Cobrar</span>
                    <span className="text-3xl font-black text-white">{formatBRL(totalComDesconto)}</span>
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
                        <input type="number" inputMode="decimal" min="0" step="0.01" aria-label="Valor da primeira forma de pagamento" placeholder="Valor 1 (R$)" value={pagDividido.valor1} onChange={e => setPagDividido({...pagDividido, valor1: e.target.value})} className="flex-1 bg-black border border-white/10 rounded-xl h-12 px-3 text-xs text-white outline-none focus:border-pink-500" />
                      </div>
                      <div className="flex gap-2 items-center">
                        <select value={pagDividido.metodo2} onChange={e => setPagDividido({...pagDividido, metodo2: e.target.value})} className="flex-1 bg-black border border-white/10 rounded-xl h-12 px-3 text-xs text-white outline-none">
                          <option value="Dinheiro">Dinheiro</option><option value="Pix">Pix</option><option value="Cartão">Cartão</option>
                        </select>
                        <div className="flex-1 bg-white/5 border border-white/5 rounded-xl h-12 px-3 flex items-center text-xs text-zinc-400">
                          Restante: {formatBRL(Math.max(0, totalComDesconto - valor1Dividido))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {erroVenda && (
                  <p role="alert" className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm font-medium rounded-2xl px-4 py-3">{erroVenda}</p>
                )}

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