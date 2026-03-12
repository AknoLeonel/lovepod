import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Metadata } from 'next';

// Otimização de SEO
export const metadata: Metadata = {
  title: 'LOVEPOD | O Melhor Pod Descartável da Região',
  description: 'Escolha sua cidade e receba seu pod descartável rapidinho! Atendemos Formosa, Barreiras e Corrente.',
  keywords: ['pod descartável', 'vape', 'comprar pod', 'ignite', 'elfbar', 'lovepod', 'formosa', 'barreiras', 'corrente'],
  openGraph: {
    title: 'LOVEPOD | Escolha sua Cidade',
    description: 'Entrega rápida de pods descartáveis. Selecione sua cidade para ver o estoque disponível.',
    type: 'website',
    locale: 'pt_BR',
  },
};

// Cache (60 segundos)
export const revalidate = 60; 

export default async function Home() {
  const { data: cidades, error } = await supabase
    .from('cidades')
    .select('*')
    .order('nome');

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#030303] text-zinc-100 flex flex-col items-center justify-center p-6 sm:p-12 selection:bg-pink-500 selection:text-white">
      
      {/* Efeitos de Luz de Fundo (Ambient Glow) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] sm:w-[800px] h-[400px] bg-pink-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-rose-600/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Container Principal */}
      <div className="w-full max-w-md relative z-10 flex flex-col items-center text-center space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        
        {/* Logo / Tipografia Premium */}
        <header className="space-y-6">
          <div className="inline-block border border-pink-500/20 bg-pink-500/5 px-4 py-1.5 rounded-full mb-4">
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-pink-400">Entrega Expressa</span>
          </div>
          <h1 className="text-6xl sm:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-600 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            LOVE<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-400">POD</span>
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base font-medium max-w-[280px] mx-auto leading-relaxed">
            Selecione sua localização para acessar o catálogo exclusivo.
          </p>
        </header>

        {/* Lista de Cidades (Cartões VIP) */}
        <nav className="w-full flex flex-col gap-4">
          {error ? (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm backdrop-blur-md">
              <p>Erro ao carregar sistema. Tente novamente.</p>
            </div>
          ) : cidades?.length === 0 ? (
            <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-2xl text-zinc-500 text-sm backdrop-blur-md">
              <p>Nenhuma cidade disponível.</p>
            </div>
          ) : (
            cidades?.map((cidade) => (
              <Link 
                key={cidade.id} 
                href={`/catalogo/${cidade.id}`}
                className="group relative w-full flex items-center justify-between px-6 py-5 sm:py-6 bg-zinc-900/40 backdrop-blur-md border border-white/5 hover:border-pink-500/30 rounded-3xl transition-all duration-500 hover:shadow-[0_0_30px_rgba(236,72,153,0.15)] overflow-hidden active:scale-[0.98]"
              >
                {/* Efeito de hover interno */}
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-pink-500/5 to-pink-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                
                <span className="relative text-lg sm:text-xl font-bold text-zinc-300 group-hover:text-white transition-colors tracking-wide">
                  {cidade.nome}
                </span>
                
                {/* Botão circular de seta */}
                <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-black/50 border border-white/5 group-hover:bg-pink-500 group-hover:border-pink-400 group-hover:text-white text-zinc-500 transition-all duration-300">
                  <svg 
                    className="w-5 h-5 transform group-hover:translate-x-0.5 transition-transform" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))
          )}
        </nav>

        {/* Footer Minimalista */}
        <footer className="pt-10 w-full flex flex-col items-center gap-3 opacity-60 hover:opacity-100 transition-opacity duration-300">
          <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent w-3/4" />
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold flex items-center gap-2">
            <span>🔞</span> Proibido para menores de 18 anos
          </p>
        </footer>
        
      </div>
    </main>
  );
}