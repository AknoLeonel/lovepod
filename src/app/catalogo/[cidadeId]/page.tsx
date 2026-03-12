import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const revalidate = 0;

export default async function CatalogoCidade({ params }: { params: Promise<{ cidadeId: string }> }) {
  const { cidadeId } = await params;

  // Busca a cidade
  const { data: cidade } = await supabase
    .from('cidades')
    .select('nome')
    .eq('id', cidadeId)
    .single();

  if (!cidade) return notFound();

  // Busca o estoque
  const { data: estoqueRaw } = await supabase
    .from('estoque')
    .select(`
      quantidade,
      produto:produtos ( id, nome, preco, descricao ),
      sabor:sabores ( id, nome )
    `)
    .eq('cidade_id', cidadeId)
    .gt('quantidade', 0)
    .order('quantidade', { ascending: false }); // Ordena do maior estoque para o menor

  // Agrupa os produtos
  const produtosAgrupados: Record<string, any> = {};

  if (estoqueRaw) {
    estoqueRaw.forEach((item: any) => {
      const prod = item.produto;
      const sab = item.sabor;
      if (!produtosAgrupados[prod.id]) {
        produtosAgrupados[prod.id] = { ...prod, sabores: [] };
      }
      produtosAgrupados[prod.id].sabores.push({ ...sab, quantidade: item.quantidade });
    });
  }

  const produtos = Object.values(produtosAgrupados);
  const numeroWhatsApp = "5561999999999"; // 🚨 Troque pelo seu número real

  return (
    <main className="min-h-screen bg-[#030303] text-zinc-100 font-sans selection:bg-pink-500 selection:text-white pb-24">
      
      {/* HEADER LUXUOSO (Sticky com Glassmorphism) */}
      <header className="sticky top-0 z-50 bg-[#030303]/70 backdrop-blur-2xl border-b border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="group flex items-center gap-2 text-zinc-400 hover:text-pink-500 transition-all text-sm font-semibold tracking-wide">
            <span className="group-hover:-translate-x-1 transition-transform">←</span> Cidades
          </Link>
          <div className="text-right flex flex-col items-end">
            <span className="text-[9px] uppercase tracking-[0.3em] text-zinc-500 font-black">Estoque Local</span>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-pink-500 animate-pulse shadow-[0_0_10px_rgba(236,72,153,0.8)]" />
              <span className="text-white font-black uppercase tracking-widest">{cidade.nome}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 mt-10 space-y-16">
        
        {/* HERO SECTION (Chamada para Ação Principal) */}
        <section className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-zinc-300 to-zinc-600">
            Descubra o <br className="sm:hidden"/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-400 drop-shadow-[0_0_20px_rgba(236,72,153,0.2)]">Sabor Perfeito</span>
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base max-w-lg mx-auto font-medium">
            Pods originais, lacrados e com entrega imediata em <strong className="text-zinc-200">{cidade.nome}</strong>. Escolha o seu e finalize pelo WhatsApp.
          </p>
          
          {/* Badge de Desconto Pix */}
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 px-4 py-2 rounded-full mt-6">
            <span className="text-green-400 text-lg">💸</span>
            <span className="text-green-400 text-xs font-bold uppercase tracking-wider">Desconto especial no PIX / Dinheiro</span>
          </div>
        </section>

        {produtos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50 space-y-4">
            <div className="text-6xl">🏜️</div>
            <p className="text-lg font-medium text-zinc-400">Estoque esgotado no momento.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {produtos.map((produto) => (
              <section key={produto.id} className="animate-in fade-in zoom-in-95 duration-700">
                
                {/* CARD DO PRODUTO (Luxo) */}
                <div className="relative bg-zinc-900/40 border border-white/5 rounded-[2rem] overflow-hidden group hover:border-pink-500/30 transition-all duration-500 shadow-2xl">
                  
                  {/* Fundo com brilho sutil ao passar o mouse */}
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500/0 via-pink-500/0 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  
                  <div className="flex flex-col sm:flex-row">
                    
                    {/* LADO ESQUERDO: Imagem/Destaque do Pod */}
                    <div className="w-full sm:w-2/5 p-8 flex flex-col justify-between bg-gradient-to-br from-zinc-900 to-black relative overflow-hidden border-r border-white/5">
                      {/* Placeholder da Imagem (No futuro, a tag <img /> entra aqui) */}
                      <div className="absolute -top-20 -left-20 w-64 h-64 bg-pink-500/20 rounded-full blur-[80px]" />
                      
                      <div className="relative z-10 space-y-4">
                        <div>
                          <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white drop-shadow-lg">{produto.nome}</h2>
                          <p className="text-zinc-400 text-sm mt-1 font-medium">{produto.descricao || 'Pod Descartável Premium'}</p>
                        </div>
                        
                        <div className="pt-4">
                          <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mb-1">A partir de</span>
                          <span className="text-4xl font-black text-pink-500 tracking-tighter">
                            R$ {produto.preco.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* LADO DIREITO: Lista de Sabores VIP */}
                    <div className="w-full sm:w-3/5 p-6 sm:p-8 bg-black/20">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em]">Selecione o Sabor</h3>
                        <span className="text-xs font-bold text-pink-500 bg-pink-500/10 px-3 py-1 rounded-full">{produto.sabores.length} Opções</span>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {produto.sabores.map((sabor: any) => {
                          const mensagem = `*LOVEPOD - NOVO PEDIDO* 🛍️\n\n*Cidade:* ${cidade.nome}\n*Produto:* ${produto.nome}\n*Sabor:* ${sabor.nome}\n*Valor:* R$ ${produto.preco.toFixed(2)}\n\n_Como gostaria de realizar o pagamento?_`;
                          const linkWhats = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`;
                          
                          // Gatilho de Escassez (Urgência)
                          const acabando = sabor.quantidade <= 2;

                          return (
                            <a 
                              key={sabor.id}
                              href={linkWhats}
                              target="_blank"
                              className="group/btn relative overflow-hidden bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between hover:bg-zinc-900 hover:border-pink-500/50 transition-all duration-300 active:scale-[0.98]"
                            >
                              <div className="flex flex-col gap-1 relative z-10">
                                <span className="font-bold text-zinc-200 group-hover/btn:text-white transition-colors text-base sm:text-lg">
                                  {sabor.nome}
                                </span>
                                
                                <div className="flex items-center gap-2">
                                  {acabando ? (
                                    <span className="flex items-center gap-1.5 text-[10px] text-orange-400 font-bold uppercase tracking-wider bg-orange-400/10 px-2 py-0.5 rounded-sm">
                                      <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
                                      Últimas {sabor.quantidade} un!
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1.5 text-[10px] text-green-400 font-bold uppercase tracking-wider">
                                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                      Disponível
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="relative z-10 bg-white text-black group-hover/btn:bg-gradient-to-r group-hover/btn:from-pink-600 group-hover/btn:to-rose-500 group-hover/btn:text-white font-black px-6 py-3 rounded-xl transition-all duration-300 text-xs sm:text-sm uppercase tracking-widest shadow-lg">
                                Quero esse
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </div>
              </section>
            ))}
          </div>
        )}

      </div>

      {/* BOTÃO FLUTUANTE DE SUPORTE WPP */}
      <a 
        href={`https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(`Olá LOVEPOD! Sou de ${cidade.nome} e tenho uma dúvida.`)}`}
        target="_blank"
        className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-400 text-white p-4 rounded-full shadow-[0_10px_30px_rgba(34,197,94,0.4)] transition-transform hover:scale-110 active:scale-95 group flex items-center justify-center"
        title="Dúvidas? Fale com a gente"
      >
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824z" />
        </svg>
      </a>

    </main>
  );
}