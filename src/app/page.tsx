import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';

// 🚀 OTIMIZAÇÃO DE SEO 100% COMPLETA
export const metadata: Metadata = {
  title: 'LOVEPOD | O Melhor Pod Descartável da Região',
  description: 'Entrega expressa de pods descartáveis. Selecione sua cidade e acesse o catálogo VIP. Atendemos Formosa, Barreiras e Corrente.',
  keywords: ['pod descartável', 'vape', 'comprar pod', 'ignite', 'elfbar', 'lovepod', 'formosa', 'barreiras', 'corrente'],
  authors: [{ name: 'LOVEPOD' }],
  openGraph: {
    title: 'LOVEPOD | Escolha sua Cidade',
    description: 'Entrega rápida de pods descartáveis. Selecione sua cidade para ver o estoque em tempo real.',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'LOVEPOD',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LOVEPOD | Escolha sua Cidade',
    description: 'Entrega rápida de pods descartáveis. Estoque em tempo real.',
  },
  robots: {
    index: true,
    follow: true,
  }
};

// Cache agressivo (60 segundos)
export const revalidate = 60; 

export default async function Home() {
  const { data: cidades, error } = await supabase
    .from('cidades')
    .select('*')
    .order('nome');

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#030303] text-zinc-100 flex flex-col items-center justify-center p-6 sm:p-12 selection:bg-pink-500 selection:text-white">
      
      {/* 🌌 EFEITOS DE FUNDO PREMIUM (Luzes + Grid) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] sm:w-[600px] h-[300px] sm:h-[400px] bg-pink-600/15 blur-[100px] sm:blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-rose-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* 📦 CONTAINER PRINCIPAL */}
      <div className="w-full max-w-md relative z-10 flex flex-col items-center text-center space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        
        <header className="space-y-6 w-full flex flex-col items-center">
          {/* Tag Animada */}
          <div className="inline-block border border-pink-500/20 bg-pink-500/5 px-5 py-2 rounded-full mb-2 animate-pulse shadow-[0_0_15px_rgba(236,72,153,0.1)]">
            <span className="text-[10px] sm:text-xs uppercase tracking-[0.3em] font-black text-pink-400">
              Entrega Expressa
            </span>
          </div>
          
          {/* Logo Otimizada com next/image */}
          <h1 className="sr-only">LOVEPOD</h1> {/* Mantém o H1 escondido para o Google ler */}
          <div className="relative w-48 sm:w-60 h-20 sm:h-28 mx-auto hover:scale-105 transition-transform duration-500 drop-shadow-[0_0_25px_rgba(236,72,153,0.25)]">
            <Image 
              src="/logolove.png" 
              alt="Logo LOVEPOD" 
              fill
              className="object-contain"
              priority // Força o carregamento imediato (LCP Boost)
            />
          </div>

          <p className="text-zinc-400 text-sm sm:text-base font-medium max-w-[280px] mx-auto leading-relaxed">
            Selecione sua localização para acessar o catálogo <span className="text-zinc-200">exclusivo.</span>
          </p>
        </header>

        {/* 🏙️ LISTA DE CIDADES (Cartões Interativos) */}
        <nav className="w-full flex flex-col gap-4">
          {error ? (
            <div className="p-5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm backdrop-blur-md animate-in zoom-in-95">
              <p className="font-bold">Sistema temporariamente indisponível.</p>
              <p className="text-xs opacity-80 mt-1">Recarregue a página em instantes.</p>
            </div>
          ) : cidades?.length === 0 ? (
            <div className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-2xl text-zinc-500 text-sm backdrop-blur-md animate-in zoom-in-95">
              <p>Nenhuma cidade disponível no momento.</p>
            </div>
          ) : (
            cidades?.map((cidade, index) => (
              <Link 
                key={cidade.id} 
                href={`/catalogo/${cidade.id}`}
                className="group relative w-full flex items-center justify-between px-6 py-5 sm:py-6 bg-zinc-900/40 backdrop-blur-xl border border-white/5 hover:border-pink-500/40 rounded-[2rem] transition-all duration-500 hover:shadow-[0_0_40px_rgba(236,72,153,0.15)] overflow-hidden active:scale-[0.97] opacity-0 animate-[fade-in-up_0.6s_ease-out_forwards]"
                style={{ animationDelay: `${index * 150}ms` }} // Efeito cascata lindo
              >
                {/* Efeito de hover interno brilhante */}
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-pink-500/10 to-pink-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                <div className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-white/5 to-transparent rotate-45 group-hover:animate-shine pointer-events-none" />
                
                <span className="relative text-lg sm:text-xl font-bold text-zinc-300 group-hover:text-white transition-colors tracking-wide z-10">
                  {cidade.nome}
                </span>
                
                {/* Botão circular de seta */}
                <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-black/40 border border-white/5 group-hover:bg-pink-600 group-hover:border-pink-500 group-hover:shadow-[0_0_20px_rgba(236,72,153,0.5)] text-zinc-500 group-hover:text-white transition-all duration-300">
                  <svg 
                    className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))
          )}
        </nav>

        {/* 🔞 FOOTER MINIMALISTA */}
        <footer className="pt-8 w-full flex flex-col items-center gap-4 opacity-50 hover:opacity-100 transition-opacity duration-300">
          <div className="h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent w-full max-w-[200px]" />
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-bold flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full border border-white/5">
            <span className="text-xs">🔞</span> Proibido para menores de 18 anos
          </p>
        </footer>
        
      </div>

      {/* Estilos customizados para as animações locais */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes shine {
          0% { transform: translateX(-100%) rotate(45deg); }
          100% { transform: translateX(100%) rotate(45deg); }
        }
      `}} />
    </main>
  );
}