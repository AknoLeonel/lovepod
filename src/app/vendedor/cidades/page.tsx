"use client";

import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VendedorCidades() {
  const [cidades, setCidades] = useState<any[]>([]);
  const [vendedorNome, setVendedorNome] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 1. Verifica se o vendedor está realmente logado
    const auth = sessionStorage.getItem('lovepod_vendedor_auth');
    const nome = sessionStorage.getItem('lovepod_vendedor_nome');

    if (auth !== 'true' || !nome) {
      router.push('/vendedor'); // Expulsa pra tela de login se tentar entrar direto
      return;
    }

    setVendedorNome(nome);

    // 2. Puxa as cidades do banco
    async function carregarCidades() {
      const { data } = await supabase.from('cidades').select('*').order('nome');
      if (data) setCidades(data);
      setLoading(false);
    }

    carregarCidades();
  }, [router]);

  const handleLogout = () => {
    sessionStorage.removeItem('lovepod_vendedor_auth');
    sessionStorage.removeItem('lovepod_vendedor_nome');
    router.push('/vendedor');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#030303] text-zinc-100 p-6 sm:p-12 selection:bg-pink-500 relative overflow-hidden">
      
      {/* Luz de fundo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-pink-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-md mx-auto relative z-10 flex flex-col items-center space-y-10 mt-8">
        
        {/* Header do Vendedor */}
        <header className="w-full flex justify-between items-center bg-zinc-900/60 p-5 rounded-[2rem] border border-white/5 shadow-lg backdrop-blur-md">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Vendedor Ativo</p>
            <p className="text-lg font-black text-white">{vendedorNome}</p>
          </div>
          <button 
            onClick={handleLogout} 
            className="text-xs font-bold text-red-400 hover:text-white hover:bg-red-500 bg-red-500/10 px-5 py-2.5 rounded-xl transition-all active:scale-95"
          >
            Sair
          </button>
        </header>

        {/* Título */}
        <div className="text-center space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h1 className="text-3xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-400">
            Praça de Atuação
          </h1>
          <p className="text-zinc-400 text-sm">Onde você está realizando vendas hoje?</p>
        </div>

        {/* Lista de Cidades */}
        <nav className="w-full flex flex-col gap-4">
          {cidades.map((cidade, index) => (
            <Link 
              key={cidade.id} 
              href={`/vendedor/vender/${cidade.id}`}
              className="w-full flex items-center justify-between px-6 py-6 bg-zinc-900/40 border border-white/5 hover:border-pink-500/50 rounded-[2rem] transition-all duration-300 active:scale-95 group animate-in fade-in slide-in-from-bottom-8"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <span className="text-xl font-bold text-zinc-300 group-hover:text-white transition-colors tracking-wide">{cidade.nome}</span>
              <div className="w-10 h-10 rounded-full bg-black/50 border border-white/5 flex items-center justify-center group-hover:bg-pink-600 group-hover:border-pink-500 transition-all">
                <span className="text-zinc-500 group-hover:text-white font-bold transition-colors">→</span>
              </div>
            </Link>
          ))}
        </nav>

      </div>
    </main>
  );
}