"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

// === SENHA DE ACESSO AO PAINEL ===
const SENHA_ADMIN = "lovepod2026"; 

export default function AdminDashboard() {
  // ==========================================
  // ESTADOS GERAIS E AUTENTICAÇÃO
  // ==========================================
  const [isAutenticado, setIsAutenticado] = useState(false);
  const [senhaDigitada, setSenhaDigitada] = useState("");
  const [erroSenha, setErroSenha] = useState(false);
  const [verificandoSessao, setVerificandoSessao] = useState(true);
  const [loading, setLoading] = useState(true);

  // Controle de Abas (Navegação do Painel)
  const [abaAtiva, setAbaAtiva] = useState<'estoque' | 'produtos' | 'sabores' | 'cidades'>('estoque');

  // Dados do Banco
  const [estoque, setEstoque] = useState<any[]>([]);
  const [cidadesList, setCidadesList] = useState<any[]>([]);
  const [produtosList, setProdutosList] = useState<any[]>([]);
  const [saboresList, setSaboresList] = useState<any[]>([]);

  // ==========================================
  // ESTADOS DOS MODAIS (Janelas de Ação)
  // ==========================================
  // 1. Estoque
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [itemEditando, setItemEditando] = useState<any>(null);
  const [novaQuantidade, setNovaQuantidade] = useState<number>(0);
  const [isAddEstoqueModalOpen, setIsAddEstoqueModalOpen] = useState(false);
  const [formEstoque, setFormEstoque] = useState({ cidade_id: '', produto_id: '', sabor_id: '', quantidade: 1 });

  // 2. Produtos
  const [isAddProdutoModalOpen, setIsAddProdutoModalOpen] = useState(false);
  const [formProduto, setFormProduto] = useState({ nome: '', descricao: '', preco: '' });

  // 3. Sabores
  const [isAddSaborModalOpen, setIsAddSaborModalOpen] = useState(false);
  const [formSabor, setFormSabor] = useState({ produto_id: '', nome: '' });

  // 4. Cidades
  const [isAddCidadeModalOpen, setIsAddCidadeModalOpen] = useState(false);
  const [formCidade, setFormCidade] = useState({ nome: '' });

  const [salvando, setSalvando] = useState(false);

  // ==========================================
  // EFEITOS E CARREGAMENTO DE DADOS
  // ==========================================
  useEffect(() => {
    const auth = sessionStorage.getItem('lovepod_admin_auth');
    if (auth === 'true') {
      setIsAutenticado(true);
      carregarDados();
    }
    setVerificandoSessao(false);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (senhaDigitada === SENHA_ADMIN) {
      setIsAutenticado(true);
      setErroSenha(false);
      sessionStorage.setItem('lovepod_admin_auth', 'true');
      carregarDados();
    } else {
      setErroSenha(true);
      setSenhaDigitada("");
    }
  };

  const handleLogout = () => {
    setIsAutenticado(false);
    sessionStorage.removeItem('lovepod_admin_auth');
  };

  const carregarDados = async () => {
    setLoading(true);
    
    const { data: estq } = await supabase
      .from('estoque')
      .select(`id, quantidade, cidade_id, produto_id, sabor_id, cidade:cidades(nome), produto:produtos(nome), sabor:sabores(nome)`)
      .order('cidade_id');
      
    const [resCidades, resProdutos, resSabores] = await Promise.all([
      supabase.from('cidades').select('*').order('nome'),
      supabase.from('produtos').select('*').order('nome'),
      supabase.from('sabores').select('*, produto:produtos(nome)').order('nome')
    ]);

    if (estq) setEstoque(estq);
    if (resCidades.data) setCidadesList(resCidades.data);
    if (resProdutos.data) setProdutosList(resProdutos.data);
    if (resSabores.data) setSaboresList(resSabores.data);

    setLoading(false);
  };

  // ==========================================
  // FUNÇÕES DE SALVAMENTO (CRUD)
  // ==========================================

  // -- Salvar Edição de Estoque --
  const salvarEdicaoEstoque = async () => {
    setSalvando(true);
    const { error } = await supabase.from('estoque').update({ quantidade: novaQuantidade }).eq('id', itemEditando.id);
    if (!error) { setIsEditModalOpen(false); carregarDados(); } 
    else alert("Erro: " + error.message);
    setSalvando(false);
  };

  // -- Adicionar Novo Estoque --
  const salvarNovoEstoque = async () => {
    if (!formEstoque.cidade_id || !formEstoque.produto_id || !formEstoque.sabor_id) return alert("Preencha todos os campos.");
    setSalvando(true);
    const existente = estoque.find((item) => item.cidade_id.toString() === formEstoque.cidade_id && item.produto_id.toString() === formEstoque.produto_id && item.sabor_id.toString() === formEstoque.sabor_id);

    if (existente) {
      const { error } = await supabase.from('estoque').update({ quantidade: existente.quantidade + formEstoque.quantidade }).eq('id', existente.id);
      if (error) alert("Erro: " + error.message);
    } else {
      const { error } = await supabase.from('estoque').insert([{ cidade_id: parseInt(formEstoque.cidade_id), produto_id: parseInt(formEstoque.produto_id), sabor_id: parseInt(formEstoque.sabor_id), quantidade: formEstoque.quantidade }]);
      if (error) alert("Erro: " + error.message);
    }
    setSalvando(false); setIsAddEstoqueModalOpen(false); carregarDados(); 
  };

  // -- Criar Novo Produto do Zero --
  const salvarNovoProduto = async () => {
    if (!formProduto.nome || !formProduto.preco) return alert("Nome e Preço são obrigatórios.");
    setSalvando(true);
    const precoFormatado = parseFloat(formProduto.preco.replace(',', '.'));
    const { error } = await supabase.from('produtos').insert([{ nome: formProduto.nome, descricao: formProduto.descricao, preco: precoFormatado }]);
    if (!error) { setIsAddProdutoModalOpen(false); setFormProduto({nome: '', descricao: '', preco: ''}); carregarDados(); } 
    else alert("Erro: " + error.message);
    setSalvando(false);
  };

  // -- Criar Novo Sabor --
  const salvarNovoSabor = async () => {
    if (!formSabor.nome || !formSabor.produto_id) return alert("Selecione um produto e digite o nome do sabor.");
    setSalvando(true);
    const { error } = await supabase.from('sabores').insert([{ nome: formSabor.nome, produto_id: parseInt(formSabor.produto_id) }]);
    if (!error) { setIsAddSaborModalOpen(false); setFormSabor({produto_id: '', nome: ''}); carregarDados(); } 
    else alert("Erro: " + error.message);
    setSalvando(false);
  };

  // -- Criar Nova Cidade --
  const salvarNovaCidade = async () => {
    if (!formCidade.nome) return alert("Digite o nome da cidade.");
    setSalvando(true);
    const { error } = await supabase.from('cidades').insert([{ nome: formCidade.nome }]);
    if (!error) { setIsAddCidadeModalOpen(false); setFormCidade({nome: ''}); carregarDados(); } 
    else alert("Erro: " + error.message);
    setSalvando(false);
  };


  // ==========================================
  // RENDERIZAÇÃO DAS TELAS DE BLOQUEIO
  // ==========================================
  if (verificandoSessao) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-pink-500 font-bold uppercase tracking-widest animate-pulse">Carregando...</div>;

  if (!isAutenticado) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 selection:bg-pink-500">
        <div className="bg-zinc-900/80 border border-zinc-800 p-8 rounded-3xl w-full max-w-sm shadow-2xl backdrop-blur-md animate-in fade-in zoom-in duration-500">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-400 tracking-tighter">LOVEPOD</h1>
            <p className="text-zinc-500 text-xs uppercase tracking-[0.3em] mt-2 font-bold">Acesso Restrito</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input type="password" placeholder="Digite a senha admin..." value={senhaDigitada} onChange={(e) => setSenhaDigitada(e.target.value)} className={`w-full bg-zinc-950 border ${erroSenha ? 'border-red-500' : 'border-zinc-800'} rounded-xl h-14 px-4 text-center text-white focus:outline-none focus:border-pink-500`} />
              {erroSenha && <p className="text-red-500 text-xs text-center mt-2 font-bold animate-bounce">Senha incorreta!</p>}
            </div>
            <button type="submit" className="w-full bg-pink-600 hover:bg-pink-500 text-white font-black uppercase tracking-widest h-14 rounded-xl transition-all active:scale-95 shadow-[0_0_20px_rgba(236,72,153,0.2)]">Entrar no Painel</button>
            <div className="text-center pt-4"><Link href="/" className="text-zinc-500 hover:text-white text-xs transition-colors">← Voltar para a loja</Link></div>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDERIZAÇÃO DO PAINEL ADMIN COMPLETO
  // ==========================================
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 sm:p-8 selection:bg-pink-500 relative pb-20">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* CABEÇALHO SUPERIOR */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800 pb-6 pt-4">
          <div>
            <h1 className="text-3xl font-black text-pink-500 tracking-tight uppercase">Lovepod Admin</h1>
            <p className="text-zinc-400 text-sm mt-1">Gestão central do sistema.</p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Link href="/" target="_blank" className="px-4 py-2 text-sm bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-colors flex-1 sm:flex-none text-center font-medium">Ver Loja</Link>
            <button onClick={handleLogout} className="px-4 py-2 text-sm bg-red-500/10 text-red-500 hover:bg-red-500/20 font-bold rounded-lg transition-all active:scale-95 flex-none" title="Sair do Painel">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </header>

        {/* MENU DE ABAS (Navegação Interna) */}
        <nav className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {[
            { id: 'estoque', label: '📦 Controle de Estoque' },
            { id: 'produtos', label: '🏷️ Marcas & Produtos' },
            { id: 'sabores', label: '💧 Sabores' },
            { id: 'cidades', label: '🏙️ Cidades' }
          ].map((aba) => (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id as any)}
              className={`px-5 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                abaAtiva === aba.id 
                  ? 'bg-pink-600 text-white shadow-[0_0_15px_rgba(236,72,153,0.3)]' 
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              {aba.label}
            </button>
          ))}
        </nav>

        {/* CONTEÚDO DINÂMICO BASEADO NA ABA */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl animate-in fade-in duration-300">
          
          {loading ? (
             <div className="p-12 text-center text-pink-500 animate-pulse font-bold tracking-widest uppercase text-sm">Atualizando dados...</div>
          ) : (
            <>
              {/* ABA 1: ESTOQUE */}
              {abaAtiva === 'estoque' && (
                <div>
                  <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/80">
                    <h2 className="font-bold text-zinc-300">Inventário Atual</h2>
                    <button onClick={() => {setFormEstoque({cidade_id: '', produto_id: '', sabor_id: '', quantidade: 1}); setIsAddEstoqueModalOpen(true)}} className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">+ Dar Entrada</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-zinc-950 text-zinc-400 uppercase font-bold text-[10px] tracking-wider">
                        <tr><th className="px-6 py-4">Cidade</th><th className="px-6 py-4">Produto</th><th className="px-6 py-4">Sabor</th><th className="px-6 py-4">Qtd.</th><th className="px-6 py-4 text-right">Ação</th></tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {estoque.map((item: any) => (
                          <tr key={item.id} className="hover:bg-zinc-800/30">
                            <td className="px-6 py-4 text-zinc-300">{item.cidade?.nome}</td>
                            <td className="px-6 py-4 font-bold text-pink-400">{item.produto?.nome}</td>
                            <td className="px-6 py-4 text-zinc-300">{item.sabor?.nome}</td>
                            <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold ${item.quantidade > 3 ? 'bg-green-500/10 text-green-400' : item.quantidade > 0 ? 'bg-orange-500/10 text-orange-400' : 'bg-red-500/10 text-red-400'}`}>{item.quantidade} un.</span></td>
                            <td className="px-6 py-4 text-right"><button onClick={() => {setItemEditando(item); setNovaQuantidade(item.quantidade); setIsEditModalOpen(true)}} className="text-zinc-400 hover:text-white px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs font-bold">Ajustar</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ABA 2: PRODUTOS */}
              {abaAtiva === 'produtos' && (
                <div>
                  <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/80">
                    <h2 className="font-bold text-zinc-300">Catálogo de Produtos</h2>
                    <button onClick={() => {setFormProduto({nome: '', descricao: '', preco: ''}); setIsAddProdutoModalOpen(true)}} className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">+ Novo Produto</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-zinc-950 text-zinc-400 uppercase font-bold text-[10px] tracking-wider">
                        <tr><th className="px-6 py-4">ID</th><th className="px-6 py-4">Nome do Pod</th><th className="px-6 py-4">Descrição</th><th className="px-6 py-4">Preço (R$)</th></tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {produtosList.map((p: any) => (
                          <tr key={p.id} className="hover:bg-zinc-800/30">
                            <td className="px-6 py-4 text-zinc-500">#{p.id}</td>
                            <td className="px-6 py-4 font-bold text-white">{p.nome}</td>
                            <td className="px-6 py-4 text-zinc-400 truncate max-w-[200px]">{p.descricao || '-'}</td>
                            <td className="px-6 py-4 text-pink-400 font-bold">R$ {p.preco.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ABA 3: SABORES */}
              {abaAtiva === 'sabores' && (
                <div>
                  <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/80">
                    <h2 className="font-bold text-zinc-300">Lista de Sabores</h2>
                    <button onClick={() => {setFormSabor({produto_id: '', nome: ''}); setIsAddSaborModalOpen(true)}} className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">+ Novo Sabor</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-zinc-950 text-zinc-400 uppercase font-bold text-[10px] tracking-wider">
                        <tr><th className="px-6 py-4">Vinculado Ao Produto</th><th className="px-6 py-4">Nome do Sabor</th></tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {saboresList.map((s: any) => (
                          <tr key={s.id} className="hover:bg-zinc-800/30">
                            <td className="px-6 py-4 font-bold text-pink-500/80">{s.produto?.nome}</td>
                            <td className="px-6 py-4 text-white font-medium">{s.nome}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ABA 4: CIDADES */}
              {abaAtiva === 'cidades' && (
                <div>
                  <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/80">
                    <h2 className="font-bold text-zinc-300">Cidades Atendidas</h2>
                    <button onClick={() => {setFormCidade({nome: ''}); setIsAddCidadeModalOpen(true)}} className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">+ Nova Cidade</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-zinc-950 text-zinc-400 uppercase font-bold text-[10px] tracking-wider">
                        <tr><th className="px-6 py-4">ID</th><th className="px-6 py-4">Nome da Cidade</th></tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {cidadesList.map((c: any) => (
                          <tr key={c.id} className="hover:bg-zinc-800/30">
                            <td className="px-6 py-4 text-zinc-500">#{c.id}</td>
                            <td className="px-6 py-4 font-bold text-white">{c.nome}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* ÁREA DOS MODAIS (Pop-ups de Formulário)    */}
      {/* ========================================== */}

      {/* Modal: Ajustar Estoque Existente */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 space-y-6">
            <h3 className="text-xl font-black text-white">Ajustar Estoque</h3>
            <p className="text-zinc-400 text-sm leading-tight">{itemEditando?.produto?.nome} - {itemEditando?.sabor?.nome} <br/><span className="text-pink-500 text-xs">Unidade: {itemEditando?.cidade?.nome}</span></p>
            <div className="flex items-center gap-4">
              <button onClick={() => setNovaQuantidade(Math.max(0, novaQuantidade - 1))} className="w-12 h-12 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xl font-bold">-</button>
              <input type="number" value={novaQuantidade} onChange={(e) => setNovaQuantidade(parseInt(e.target.value) || 0)} className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl h-12 text-center text-xl font-black focus:outline-none focus:border-pink-500" />
              <button onClick={() => setNovaQuantidade(novaQuantidade + 1)} className="w-12 h-12 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xl font-bold">+</button>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setIsEditModalOpen(false)} className="flex-1 px-4 py-3 rounded-xl font-bold bg-zinc-800 hover:bg-zinc-700">Cancelar</button>
              <button onClick={salvarEdicaoEstoque} disabled={salvando} className="flex-1 px-4 py-3 rounded-xl font-bold bg-pink-600 hover:bg-pink-500 text-white">{salvando ? '...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Dar Entrada em Novo Estoque */}
      {isAddEstoqueModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-xl font-black text-white">Nova Mercadoria</h3>
            <select className="w-full bg-zinc-950 border border-zinc-800 rounded-xl h-12 px-4 text-sm focus:border-pink-500" value={formEstoque.cidade_id} onChange={(e) => setFormEstoque({...formEstoque, cidade_id: e.target.value})}>
              <option value="">1. Selecione a Cidade</option>
              {cidadesList.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <select className="w-full bg-zinc-950 border border-zinc-800 rounded-xl h-12 px-4 text-sm focus:border-pink-500" disabled={!formEstoque.cidade_id} value={formEstoque.produto_id} onChange={(e) => setFormEstoque({...formEstoque, produto_id: e.target.value, sabor_id: ''})}>
              <option value="">2. Selecione o Produto</option>
              {produtosList.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <select className="w-full bg-zinc-950 border border-zinc-800 rounded-xl h-12 px-4 text-sm focus:border-pink-500" disabled={!formEstoque.produto_id} value={formEstoque.sabor_id} onChange={(e) => setFormEstoque({...formEstoque, sabor_id: e.target.value})}>
              <option value="">3. Selecione o Sabor</option>
              {saboresList.filter(s => s.produto_id.toString() === formEstoque.produto_id).map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
            <div className="flex items-center gap-4 pt-2">
              <label className="text-xs font-bold text-zinc-400 w-1/2">Quantidade:</label>
              <input type="number" value={formEstoque.quantidade} onChange={(e) => setFormEstoque({...formEstoque, quantidade: parseInt(e.target.value) || 1})} className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl h-12 text-center font-black focus:border-pink-500" />
            </div>
            <div className="flex gap-3 pt-4">
              <button onClick={() => setIsAddEstoqueModalOpen(false)} className="flex-1 px-4 py-3 rounded-xl font-bold bg-zinc-800 hover:bg-zinc-700">Cancelar</button>
              <button onClick={salvarNovoEstoque} disabled={salvando} className="flex-1 px-4 py-3 rounded-xl font-bold bg-pink-600 hover:bg-pink-500 text-white">{salvando ? '...' : 'Adicionar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Criar Produto do Zero */}
      {isAddProdutoModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-xl font-black text-white">Criar Novo Produto</h3>
            <p className="text-xs text-zinc-400">Ex: Ignite V150, Waka 10k...</p>
            <input type="text" placeholder="Nome do Produto" value={formProduto.nome} onChange={(e) => setFormProduto({...formProduto, nome: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl h-12 px-4 focus:border-pink-500" />
            <input type="text" placeholder="Descrição (Opcional)" value={formProduto.descricao} onChange={(e) => setFormProduto({...formProduto, descricao: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl h-12 px-4 focus:border-pink-500" />
            <input type="text" placeholder="Preço (Ex: 119,90)" value={formProduto.preco} onChange={(e) => setFormProduto({...formProduto, preco: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl h-12 px-4 focus:border-pink-500" />
            <div className="flex gap-3 pt-4">
              <button onClick={() => setIsAddProdutoModalOpen(false)} className="flex-1 px-4 py-3 rounded-xl font-bold bg-zinc-800 hover:bg-zinc-700">Cancelar</button>
              <button onClick={salvarNovoProduto} disabled={salvando} className="flex-1 px-4 py-3 rounded-xl font-bold bg-pink-600 hover:bg-pink-500 text-white">{salvando ? '...' : 'Salvar Produto'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Criar Novo Sabor */}
      {isAddSaborModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-xl font-black text-white">Cadastrar Sabor</h3>
            <select className="w-full bg-zinc-950 border border-zinc-800 rounded-xl h-12 px-4 text-sm focus:border-pink-500" value={formSabor.produto_id} onChange={(e) => setFormSabor({...formSabor, produto_id: e.target.value})}>
              <option value="">Selecione o Produto (Marca)</option>
              {produtosList.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <input type="text" placeholder="Nome do Sabor (Ex: Mint Ice)" value={formSabor.nome} onChange={(e) => setFormSabor({...formSabor, nome: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl h-12 px-4 focus:border-pink-500" />
            <div className="flex gap-3 pt-4">
              <button onClick={() => setIsAddSaborModalOpen(false)} className="flex-1 px-4 py-3 rounded-xl font-bold bg-zinc-800 hover:bg-zinc-700">Cancelar</button>
              <button onClick={salvarNovoSabor} disabled={salvando} className="flex-1 px-4 py-3 rounded-xl font-bold bg-pink-600 hover:bg-pink-500 text-white">{salvando ? '...' : 'Salvar Sabor'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Criar Nova Cidade */}
      {isAddCidadeModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-xl font-black text-white">Adicionar Cidade</h3>
            <input type="text" placeholder="Nome da Cidade (Ex: Brasília)" value={formCidade.nome} onChange={(e) => setFormCidade({...formCidade, nome: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl h-12 px-4 focus:border-pink-500" />
            <div className="flex gap-3 pt-4">
              <button onClick={() => setIsAddCidadeModalOpen(false)} className="flex-1 px-4 py-3 rounded-xl font-bold bg-zinc-800 hover:bg-zinc-700">Cancelar</button>
              <button onClick={salvarNovaCidade} disabled={salvando} className="flex-1 px-4 py-3 rounded-xl font-bold bg-pink-600 hover:bg-pink-500 text-white">{salvando ? '...' : 'Salvar Cidade'}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}