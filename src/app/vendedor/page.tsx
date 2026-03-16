"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const SENHA_VENDEDOR = "vendas2026"; // 🔐 Defina a senha dos vendedores aqui

export default function VendedorLogin() {
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim()) {
      setErro("Por favor, digite seu nome.");
      return;
    }

    if (senha === SENHA_VENDEDOR) {
      // Salva a sessão do vendedor
      sessionStorage.setItem('lovepod_vendedor_auth', 'true');
      sessionStorage.setItem('lovepod_vendedor_nome', nome);
      
      router.push('/vendedor/cidades'); // Próximo passo: escolher a cidade
    } else {
      setErro("Chave de acesso incorreta.");
      setSenha("");
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Efeito de fundo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-pink-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="bg-zinc-900/40 border border-white/5 p-8 sm:p-10 rounded-[2.5rem] w-full max-w-md shadow-2xl backdrop-blur-xl relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="text-center mb-8">
          <div className="relative w-32 h-16 mx-auto mb-4">
             <Image src="/logolove.png" alt="Logo" fill className="object-contain" />
          </div>
          <h1 className="text-xl font-black text-white uppercase tracking-widest">Acesso Vendedor</h1>
          <p className="text-zinc-500 text-[10px] uppercase tracking-[0.3em] mt-2 font-bold text-pink-500">Área de Vendas</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold ml-2">Seu Nome</label>
            <input 
              type="text" 
              placeholder="Ex: João Silva" 
              value={nome} 
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-2xl h-14 px-6 text-white focus:border-pink-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold ml-2">Chave de Acesso</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={senha} 
              onChange={(e) => setSenha(e.target.value)}
              className={`w-full bg-black/50 border ${erro ? 'border-red-500' : 'border-white/10'} rounded-2xl h-14 px-6 text-white focus:border-pink-500 outline-none transition-all`}
            />
          </div>

          {erro && <p className="text-red-500 text-xs font-bold text-center animate-bounce">{erro}</p>}

          <button 
            type="submit" 
            className="w-full bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 text-white font-black uppercase tracking-widest h-14 rounded-2xl transition-all active:scale-95 shadow-[0_0_30px_rgba(236,72,153,0.3)] mt-4"
          >
            Entrar no Sistema
          </button>
          
          <Link href="/" className="block text-center text-zinc-600 hover:text-zinc-400 text-[10px] uppercase font-bold transition-colors pt-4">
            Voltar para o site público
          </Link>
        </form>
      </div>
    </div>
  );
}