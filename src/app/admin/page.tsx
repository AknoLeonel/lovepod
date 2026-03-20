"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

const SENHA_ADMIN = "lovepod2026"; 

export default function AdminDashboard() {
  const [isAutenticado, setIsAutenticado] = useState(false);
  const [senhaDigitada, setSenhaDigitada] = useState("");
  const [erroSenha, setErroSenha] = useState(false);
  const [verificandoSessao, setVerificandoSessao] = useState(true);
  const [loading, setLoading] = useState(true);

  const [abaAtiva, setAbaAtiva] = useState<'vendas' | 'estoque' | 'produtos' | 'sabores' | 'cidades' | 'importacao'>('vendas');

  const [estoque, setEstoque] = useState<any[]>([]);
  const [cidadesList, setCidadesList] = useState<any[]>([]);
  const [produtosList, setProdutosList] = useState<any[]>([]);
  const [saboresList, setSaboresList] = useState<any[]>([]);
  const [vendasList, setVendasList] = useState<any[]>([]);

  // 🚀 NOVOS ESTADOS: Filtros
  const [filtroVendaData, setFiltroVendaData] = useState("");
  const [filtroVendaVendedor, setFiltroVendaVendedor] = useState("");
  const [filtroVendaCidade, setFiltroVendaCidade] = useState("");
  const [filtroEstoque, setFiltroEstoque] = useState("");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [itemEditando, setItemEditando] = useState<any>(null);
  const [novaQuantidade, setNovaQuantidade] = useState<number>(0);
  
  const [isAddEstoqueModalOpen, setIsAddEstoqueModalOpen] = useState(false);
  const [formEstoque, setFormEstoque] = useState({ cidade_id: '', produto_id: '', sabor_id: '', quantidade: 1 });

  const [isAddProdutoModalOpen, setIsAddProdutoModalOpen] = useState(false);
  const [formProduto, setFormProduto] = useState({ nome: '', descricao: '', preco: '' });

  const [isAddSaborModalOpen, setIsAddSaborModalOpen] = useState(false);
  const [formSabor, setFormSabor] = useState({ produto_id: '', nome: '' });

  const [isAddCidadeModalOpen, setIsAddCidadeModalOpen] = useState(false);
  const [formCidade, setFormCidade] = useState({ nome: '' });

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [produtoImage, setProdutoImage] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState("");

  // 🚀 NOVO ESTADO: Edição de Venda
  const [isEditVendaModalOpen, setIsEditVendaModalOpen] = useState(false);
  const [vendaEditando, setVendaEditando] = useState<any>(null);
  const [novoMetodoPagamento, setNovoMetodoPagamento] = useState("");

  const [salvando, setSalvando] = useState(false);

  // Estados da Importação
  const [textImport, setTextImport] = useState('');
  const [cityImport, setCityImport] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importLogs, setImportLogs] = useState<string[]>([]);

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
    
    // Atualizado para puxar IDs necessários nas vendas para podermos devolver o estoque
    const [resEstoque, resCidades, resProdutos, resSabores, resVendas] = await Promise.all([
      supabase.from('estoque').select(`id, quantidade, cidade_id, produto_id, sabor_id, cidade:cidades(nome), produto:produtos(nome), sabor:sabores(nome)`).order('cidade_id'),
      supabase.from('cidades').select('*').order('nome'),
      supabase.from('produtos').select('*').order('nome'),
      supabase.from('sabores').select('*, produto:produtos(nome)').order('nome'),
      supabase.from('vendas').select(`id, quantidade, valor_total, metodo_pagamento, vendedor_nome, created_at, cidade_id, produto_id, sabor_id, cidade:cidades(nome), produto:produtos(nome), sabor:sabores(nome)`).order('created_at', { ascending: false })
    ]);

    if (resEstoque.data) setEstoque(resEstoque.data);
    if (resCidades.data) setCidadesList(resCidades.data);
    if (resProdutos.data) setProdutosList(resProdutos.data);
    if (resSabores.data) setSaboresList(resSabores.data);
    if (resVendas.data) setVendasList(resVendas.data);

    setLoading(false);
  };

  // ==========================================
  // FUNÇÕES DE SALVAR / EDITAR
  // ==========================================
  const salvarEdicaoEstoque = async () => {
    setSalvando(true);
    const { error } = await supabase.from('estoque').update({ quantidade: novaQuantidade }).eq('id', itemEditando.id);
    if (!error) { setIsEditModalOpen(false); carregarDados(); } else alert("Erro: " + error.message);
    setSalvando(false);
  };

  const salvarNovoEstoque = async () => {
    if (!formEstoque.cidade_id || !formEstoque.produto_id || !formEstoque.sabor_id) return alert("Preencha todos os campos.");
    setSalvando(true);
    const existente = estoque.find((item) => item.cidade_id.toString() === formEstoque.cidade_id && item.produto_id.toString() === formEstoque.produto_id && item.sabor_id.toString() === formEstoque.sabor_id);
    if (existente) {
      await supabase.from('estoque').update({ quantidade: existente.quantidade + formEstoque.quantidade }).eq('id', existente.id);
    } else {
      await supabase.from('estoque').insert([{ cidade_id: parseInt(formEstoque.cidade_id), produto_id: parseInt(formEstoque.produto_id), sabor_id: parseInt(formEstoque.sabor_id), quantidade: formEstoque.quantidade }]);
    }
    setSalvando(false); setIsAddEstoqueModalOpen(false); carregarDados(); 
  };

  const salvarNovoProduto = async () => {
    if (!formProduto.nome || !formProduto.preco) return alert("Nome e Preço são obrigatórios.");
    setSalvando(true);
    const precoFormatado = parseFloat(formProduto.preco.replace(',', '.'));
    const { error } = await supabase.from('produtos').insert([{ nome: formProduto.nome, descricao: formProduto.descricao, preco: precoFormatado }]);
    if (!error) { setIsAddProdutoModalOpen(false); setFormProduto({nome: '', descricao: '', preco: ''}); carregarDados(); } else alert("Erro: " + error.message);
    setSalvando(false);
  };

  const salvarNovoSabor = async () => {
    if (!formSabor.nome || !formSabor.produto_id) return alert("Selecione um produto e digite o nome do sabor.");
    setSalvando(true);
    const { error } = await supabase.from('sabores').insert([{ nome: formSabor.nome, produto_id: parseInt(formSabor.produto_id) }]);
    if (!error) { setIsAddSaborModalOpen(false); setFormSabor({produto_id: '', nome: ''}); carregarDados(); } else alert("Erro: " + error.message);
    setSalvando(false);
  };

  const salvarNovaCidade = async () => {
    if (!formCidade.nome) return alert("Digite o nome da cidade.");
    setSalvando(true);
    const { error } = await supabase.from('cidades').insert([{ nome: formCidade.nome }]);
    if (!error) { setIsAddCidadeModalOpen(false); setFormCidade({nome: ''}); carregarDados(); } else alert("Erro: " + error.message);
    setSalvando(false);
  };

  const salvarImagemProduto = async () => {
    setSalvando(true);
    const { error } = await supabase.from('produtos').update({ imagem_url: imageUrl }).eq('id', produtoImage.id);
    if (!error) { setIsImageModalOpen(false); setImageUrl(""); carregarDados(); } else alert("Erro ao salvar imagem: " + error.message);
    setSalvando(false);
  };

  const salvarEdicaoVenda = async () => {
    setSalvando(true);
    const { error } = await supabase.from('vendas').update({ metodo_pagamento: novoMetodoPagamento }).eq('id', vendaEditando.id);
    if (!error) { setIsEditVendaModalOpen(false); carregarDados(); } else alert("Erro: " + error.message);
    setSalvando(false);
  };

  // ==========================================
  // 🚀 FUNÇÕES DE EXCLUSÃO (NOVO)
  // ==========================================
  const excluirItemEstoque = async (id: number) => {
    if (!confirm("Tem certeza que deseja apagar este registro de estoque completamente?")) return;
    setLoading(true);
    await supabase.from('estoque').delete().eq('id', id);
    setIsEditModalOpen(false);
    carregarDados();
  };

  const excluirProduto = async (id: number) => {
    if (!confirm("⚠️ ATENÇÃO: Tem certeza que deseja apagar este produto? Isso só funcionará se não houver estoque ou vendas vinculadas a ele.")) return;
    setLoading(true);
    const { error } = await supabase.from('produtos').delete().eq('id', id);
    if (error) alert("Não foi possível excluir. Provavelmente existem sabores, estoques ou vendas vinculadas a este produto. Exclua-os primeiro.\n\nDetalhes: " + error.message);
    carregarDados();
  };

  const excluirSabor = async (id: number) => {
    if (!confirm("⚠️ ATENÇÃO: Tem certeza que deseja apagar este sabor? Isso só funcionará se não houver estoque ou vendas vinculadas a ele.")) return;
    setLoading(true);
    const { error } = await supabase.from('sabores').delete().eq('id', id);
    if (error) alert("Não foi possível excluir. Provavelmente existe estoque ou vendas com este sabor.\n\nDetalhes: " + error.message);
    carregarDados();
  };

  const excluirVenda = async (venda: any) => {
    if (!confirm("Excluir esta venda e DEVOLVER o pod ao estoque?")) return;
    setLoading(true);
    
    // 1. Deleta a venda
    const { error: errVenda } = await supabase.from('vendas').delete().eq('id', venda.id);
    
    if (!errVenda) {
      // 2. Devolve ao estoque
      const { data: estq } = await supabase.from('estoque')
        .select('id, quantidade')
        .eq('cidade_id', venda.cidade_id)
        .eq('produto_id', venda.produto_id)
        .eq('sabor_id', venda.sabor_id)
        .single();
      
      if (estq) {
        await supabase.from('estoque').update({ quantidade: estq.quantidade + 1 }).eq('id', estq.id);
      } else {
        await supabase.from('estoque').insert([{ cidade_id: venda.cidade_id, produto_id: venda.produto_id, sabor_id: venda.sabor_id, quantidade: 1 }]);
      }
    } else {
      alert("Erro ao excluir venda: " + errVenda.message);
    }
    carregarDados();
  };

  // Funções do Scanner WhatsApp
  const addLog = (msg: string) => setImportLogs(prev => [...prev, msg]);
  const processarLoteWhatsApp = async () => {
    if (!cityImport) return alert("Por favor, selecione a cidade onde esse estoque chegou!");
    if (!textImport.trim()) return alert("Cole a mensagem do WhatsApp na caixa de texto!");

    setIsImporting(true); setImportLogs(["🚀 Iniciando leitura do lote..."]);
    const linhas = textImport.split('\n'); let produtoAtualId = null; let produtoAtualNome = ""; let itensProcessados = 0;

    for (const linha of linhas) {
      const txt = linha.trim(); if (!txt) continue;
      if (txt.includes('✅')) {
        const partes = txt.split('✅'); produtoAtualNome = partes[0].trim();
        const precoMatch = txt.match(/R\$\s*:\s*([\d,]+)/i) || txt.match(/R\$\s*([\d,]+)/i) || txt.match(/([\d,]+)/);
        const precoAtual = precoMatch ? parseFloat(precoMatch[1].replace(',', '.')) : 0;
        addLog(`📦 Marca: ${produtoAtualNome}`);
        const { data: pData } = await supabase.from('produtos').select('id').ilike('nome', produtoAtualNome).limit(1);
        if (pData && pData.length > 0) { produtoAtualId = pData[0].id; } else { const { data: newProd } = await supabase.from('produtos').insert([{ nome: produtoAtualNome, preco: precoAtual, descricao: 'Importação Rápida' }]).select().single(); produtoAtualId = newProd?.id; }
        continue;
      }

      const matchSabor = txt.match(/^(\d+)\s*[-–]\s*(.+)$/);
      if (matchSabor && produtoAtualId) {
        const quantidade = parseInt(matchSabor[1]); const saborNome = matchSabor[2].trim(); let saborId = null;
        const { data: sData } = await supabase.from('sabores').select('id').eq('produto_id', produtoAtualId).ilike('nome', saborNome).limit(1);
        if (sData && sData.length > 0) { saborId = sData[0].id; } else { const { data: newSab } = await supabase.from('sabores').insert([{ nome: saborNome, produto_id: produtoAtualId }]).select().single(); saborId = newSab?.id; }
        if (saborId) {
          const { data: eData } = await supabase.from('estoque').select('*').eq('cidade_id', parseInt(cityImport)).eq('produto_id', produtoAtualId).eq('sabor_id', saborId).limit(1);
          if (eData && eData.length > 0) { await supabase.from('estoque').update({ quantidade: eData[0].quantidade + quantidade }).eq('id', eData[0].id); } else { await supabase.from('estoque').insert([{ cidade_id: parseInt(cityImport), produto_id: produtoAtualId, sabor_id: saborId, quantidade: quantidade }]); }
          addLog(`   ✅ ${quantidade}x ${saborNome} guardado`); itensProcessados++;
        }
      }
    }
    addLog(`🎉 PRONTO! ${itensProcessados} lotes foram guardados!`); setIsImporting(false); setTextImport(''); carregarDados(); 
  };


  // ==========================================
  // AGRUPAMENTOS E FILTROS 
  // ==========================================
  
  // 🚀 FILTRO DE VENDAS
  const vendasFiltradas = vendasList.filter(venda => {
    const matchData = filtroVendaData ? venda.created_at.startsWith(filtroVendaData) : true;
    const matchVendedor = filtroVendaVendedor ? venda.vendedor_nome.toLowerCase().includes(filtroVendaVendedor.toLowerCase()) : true;
    const matchCidade = filtroVendaCidade ? venda.cidade?.nome.toLowerCase().includes(filtroVendaCidade.toLowerCase()) : true;
    return matchData && matchVendedor && matchCidade;
  });

  const totalFaturamento = vendasFiltradas.reduce((acc, venda) => acc + (venda.valor_total * venda.quantidade), 0);
  const totalPodsVendidos = vendasFiltradas.reduce((acc, venda) => acc + venda.quantidade, 0);

  // 🚀 FILTRO E AGRUPAMENTO DE ESTOQUE
  let estoqueAgrupadoArray = Object.values(
    estoque.reduce((acc: any, item: any) => {
      const key = `${item.cidade_id}-${item.produto_id}`;
      if (!acc[key]) { acc[key] = { cidade: item.cidade, produto: item.produto, cidade_id: item.cidade_id, produto_id: item.produto_id, total: 0, variacoes: [] }; }
      acc[key].total += item.quantidade; acc[key].variacoes.push(item); return acc;
    }, {})
  ).sort((a: any, b: any) => a.produto?.nome.localeCompare(b.produto?.nome));

  if (filtroEstoque.trim() !== "") {
    const termo = filtroEstoque.toLowerCase();
    estoqueAgrupadoArray = estoqueAgrupadoArray.filter((grupo: any) => {
      const matchCidade = grupo.cidade?.nome.toLowerCase().includes(termo);
      const matchProduto = grupo.produto?.nome.toLowerCase().includes(termo);
      const matchSabor = grupo.variacoes.some((v: any) => v.sabor?.nome.toLowerCase().includes(termo));
      return matchCidade || matchProduto || matchSabor;
    });
  }

  const saboresAgrupadosArray = Object.values(
    saboresList.reduce((acc: any, s: any) => {
      if (!acc[s.produto_id]) { acc[s.produto_id] = { id: s.produto_id, produtoNome: s.produto?.nome, sabores: [] }; }
      acc[s.produto_id].sabores.push(s); return acc;
    }, {})
  ).sort((a: any, b: any) => a.produtoNome?.localeCompare(b.produtoNome));


  // ==========================================
  // RENDERIZAÇÃO
  // ==========================================
  if (verificandoSessao) return <div className="min-h-screen bg-[#030303] flex items-center justify-center"><div className="w-12 h-12 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" /></div>;

  if (!isAutenticado) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center p-6 selection:bg-pink-500 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-pink-600/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="bg-zinc-900/40 border border-white/5 p-8 sm:p-10 rounded-[2rem] w-full max-w-md shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-700 relative z-10">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-400 tracking-tighter drop-shadow-md">LOVEPOD</h1>
            <p className="text-zinc-500 text-[10px] uppercase tracking-[0.4em] mt-3 font-bold">Workspace Restrito</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div><input type="password" placeholder="Digite a chave de acesso" value={senhaDigitada} onChange={(e) => setSenhaDigitada(e.target.value)} className={`w-full bg-black/50 border ${erroSenha ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-pink-500'} rounded-2xl h-14 px-6 text-center text-white placeholder:text-zinc-600 focus:outline-none transition-all shadow-inner`} /></div>
            <button type="submit" className="w-full bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 text-white font-black uppercase tracking-widest h-14 rounded-2xl transition-all active:scale-95 shadow-[0_0_30px_rgba(236,72,153,0.3)]">Autorizar Acesso</button>
            <div className="text-center pt-4"><Link href="/" className="text-zinc-500 hover:text-pink-400 text-xs font-semibold transition-colors flex items-center justify-center gap-2"><span>←</span> Retornar à Loja</Link></div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 selection:bg-pink-500 pb-24 font-sans">
      <header className="sticky top-0 z-40 bg-[#030303]/80 backdrop-blur-xl border-b border-white/5 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 flex justify-between items-center">
          <div className="flex flex-col"><h1 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-400 tracking-tight uppercase">Dashboard</h1><span className="text-[9px] sm:text-xs text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Control Center</span></div>
          <div className="flex items-center gap-2 sm:gap-4"><Link href="/" target="_blank" className="hidden sm:flex px-5 py-2.5 text-xs bg-zinc-900 border border-white/5 hover:border-pink-500/50 rounded-xl transition-all font-bold">Ver Loja</Link><button onClick={handleLogout} className="p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all active:scale-95"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></button></div>
        </div>

        <nav className="max-w-6xl mx-auto px-4 sm:px-8 flex gap-3 overflow-x-auto pb-4 pt-2 [&::-webkit-scrollbar]:hidden snap-x">
          {[
            { id: 'vendas', label: '📊 Caixa & Vendas' },
            { id: 'importacao', label: '🚀 Importação Inteligente' },
            { id: 'estoque', label: '📦 Estoque' },
            { id: 'produtos', label: '🏷️ Produtos' },
            { id: 'sabores', label: '💧 Sabores' },
            { id: 'cidades', label: '🏙️ Cidades' }
          ].map((aba) => (
            <button key={aba.id} onClick={() => setAbaAtiva(aba.id as any)} className={`snap-start shrink-0 px-6 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-300 ${abaAtiva === aba.id ? 'bg-pink-600 text-white shadow-[0_4px_20px_rgba(236,72,153,0.4)] scale-100' : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-white/5 scale-95 hover:scale-100'}`}>
              {aba.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4"><div className="w-8 h-8 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" /><span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Sincronizando...</span></div>
        ) : (
          <>
            {/* ========================================== */}
            {/* ABA 0: CAIXA E VENDAS */}
            {/* ========================================== */}
            {abaAtiva === 'vendas' && (
              <div className="space-y-8">
                
                {/* 🚀 FILTROS DE VENDA */}
                <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2 block">Filtrar por Data</label>
                    <input type="date" value={filtroVendaData} onChange={e => setFiltroVendaData(e.target.value)} className="w-full bg-black/50 border border-white/10 focus:border-pink-500 rounded-xl h-12 px-4 text-sm text-white outline-none [color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2 block">Vendedor (Nome)</label>
                    <input type="text" placeholder="Ex: João" value={filtroVendaVendedor} onChange={e => setFiltroVendaVendedor(e.target.value)} className="w-full bg-black/50 border border-white/10 focus:border-pink-500 rounded-xl h-12 px-4 text-sm text-white outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2 block">Cidade</label>
                    <input type="text" placeholder="Ex: Formosa" value={filtroVendaCidade} onChange={e => setFiltroVendaCidade(e.target.value)} className="w-full bg-black/50 border border-white/10 focus:border-pink-500 rounded-xl h-12 px-4 text-sm text-white outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="bg-gradient-to-br from-pink-600/20 to-rose-600/5 border border-pink-500/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/20 blur-3xl rounded-full" />
                    <h3 className="text-pink-400 text-xs font-black uppercase tracking-widest mb-2 relative z-10">Faturamento Filtrado</h3>
                    <p className="text-4xl sm:text-5xl font-black text-white relative z-10">R$ {totalFaturamento.toFixed(2).replace('.', ',')}</p>
                  </div>
                  <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
                    <h3 className="text-zinc-400 text-xs font-black uppercase tracking-widest mb-2">Pods Vendidos (Filtro)</h3>
                    <p className="text-4xl sm:text-5xl font-black text-white">{totalPodsVendidos} <span className="text-xl text-zinc-600 font-medium">un.</span></p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h2 className="text-lg font-black text-white">Histórico de Saídas</h2>
                  {vendasFiltradas.length === 0 ? (
                    <div className="p-10 text-center bg-zinc-900/30 border border-white/5 rounded-3xl text-zinc-500">Nenhuma venda encontrada para estes filtros.</div>
                  ) : (
                    <div className="bg-zinc-900/40 border border-white/5 rounded-3xl overflow-hidden overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-black/40 text-zinc-400 uppercase font-black text-[10px] tracking-[0.2em]">
                          <tr>
                            <th className="px-6 py-5">Data/Hora</th>
                            <th className="px-6 py-5">Vendedor</th>
                            <th className="px-6 py-5">Produto</th>
                            <th className="px-6 py-5">Cidade</th>
                            <th className="px-6 py-5">Pagamento</th>
                            <th className="px-6 py-5 text-right">Valor</th>
                            <th className="px-6 py-5 text-center">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {vendasFiltradas.map((venda: any) => (
                            <tr key={venda.id} className="hover:bg-zinc-800/40 group">
                              <td className="px-6 py-4 text-xs text-zinc-500">{new Date(venda.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                              <td className="px-6 py-4 font-bold text-white"><span className="bg-white/10 px-2.5 py-1 rounded-md text-xs">{venda.vendedor_nome}</span></td>
                              <td className="px-6 py-4"><p className="font-black text-white text-sm">{venda.produto?.nome}</p><p className="text-xs text-zinc-400">{venda.sabor?.nome}</p></td>
                              <td className="px-6 py-4 text-zinc-300 font-medium">{venda.cidade?.nome}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider
                                  ${venda.metodo_pagamento === 'Pix' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : venda.metodo_pagamento === 'Cartão' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}
                                >{venda.metodo_pagamento}</span>
                              </td>
                              <td className="px-6 py-4 text-right font-black text-pink-500">R$ {venda.valor_total.toFixed(2).replace('.', ',')}</td>
                              <td className="px-6 py-4 text-center flex items-center justify-center gap-2">
                                <button onClick={() => { setVendaEditando(venda); setNovoMetodoPagamento(venda.metodo_pagamento); setIsEditVendaModalOpen(true); }} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors" title="Editar Pagamento">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                                <button onClick={() => excluirVenda(venda)} className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-colors" title="Excluir Venda (Devolve o estoque)">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ABA 1: IMPORTACAO */}
            {abaAtiva === 'importacao' && (
              <div className="space-y-6">
                <div><h2 className="text-2xl font-black text-white">Scanner de Lote</h2><p className="text-zinc-400 text-sm mt-1">Cole a lista do WhatsApp. O sistema cria e atualiza sozinho.</p></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-3xl space-y-6">
                    <div className="space-y-2"><label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">1. Cidade</label><select className="w-full bg-black/50 border border-white/10 rounded-2xl h-14 px-5 font-semibold text-white focus:border-pink-500 outline-none" value={cityImport} onChange={(e) => setCityImport(e.target.value)}><option value="">-- Escolha --</option>{cidadesList.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
                    <div className="space-y-2"><label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">2. Texto do WhatsApp</label><textarea className="w-full bg-black/50 border border-white/10 rounded-2xl p-5 text-sm font-mono text-zinc-300 focus:border-pink-500 outline-none custom-scrollbar" rows={10} value={textImport} onChange={(e) => setTextImport(e.target.value)} /></div>
                    <button onClick={processarLoteWhatsApp} disabled={isImporting} className="w-full bg-gradient-to-r from-pink-600 to-rose-500 text-white font-black uppercase tracking-widest h-14 rounded-2xl transition-all active:scale-95 disabled:opacity-50">{isImporting ? 'Lendo...' : 'Processar Estoque'}</button>
                  </div>
                  <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-3xl flex flex-col h-[500px]">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Terminal</h3>
                    <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar font-mono text-[11px] sm:text-xs text-zinc-400 bg-black/50 p-4 rounded-2xl border border-white/5">{importLogs.map((log, idx) => (<div key={idx} className={`${log.includes('PRONTO') ? 'text-green-400 font-bold text-sm pt-4' : log.includes('NOVO') ? 'text-pink-400' : ''}`}>{log}</div>))}</div>
                  </div>
                </div>
              </div>
            )}

            {/* ABA 2: ESTOQUE */}
            {abaAtiva === 'estoque' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4">
                  <h2 className="text-lg font-black text-white">Inventário</h2>
                  <div className="flex w-full sm:w-auto items-center gap-3">
                    {/* 🚀 FILTRO DE ESTOQUE */}
                    <input type="text" placeholder="Buscar produto, sabor ou cidade..." value={filtroEstoque} onChange={e => setFiltroEstoque(e.target.value)} className="flex-1 sm:w-64 bg-black/50 border border-white/10 focus:border-pink-500 rounded-xl h-10 px-4 text-xs text-white outline-none" />
                    <button onClick={() => {setFormEstoque({cidade_id: '', produto_id: '', sabor_id: '', quantidade: 1}); setIsAddEstoqueModalOpen(true)}} className="bg-pink-600 hover:bg-pink-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold active:scale-95 shadow-[0_0_15px_rgba(236,72,153,0.3)] whitespace-nowrap">+ Nova Entrada</button>
                  </div>
                </div>

                {estoqueAgrupadoArray.length === 0 ? (
                  <div className="text-center py-10 text-zinc-500">Nenhum estoque encontrado.</div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-4 sm:hidden">
                      {estoqueAgrupadoArray.map((grupo: any) => (
                        <div key={`${grupo.cidade_id}-${grupo.produto_id}`} className="bg-zinc-900/60 border border-white/5 rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-wider text-pink-500">{grupo.cidade?.nome}</span>
                              <h3 className="text-xl font-black text-white leading-tight">{grupo.produto?.nome}</h3>
                            </div>
                            <span className="bg-white/10 text-white px-3 py-1.5 rounded-xl text-xs font-black">{grupo.total} un.</span>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Sabores (Toque para editar)</p>
                            <div className="flex flex-wrap gap-2">
                              {grupo.variacoes.map((item: any) => (
                                <button key={item.id} onClick={() => {setItemEditando(item); setNovaQuantidade(item.quantidade); setIsEditModalOpen(true)}} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-transform active:scale-95 ${item.quantidade > 3 ? 'bg-green-500/10 text-green-400 border-green-500/20' : item.quantidade > 0 ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                  <span className="text-white">{item.sabor?.nome}</span>
                                  <span className="bg-black/30 px-1.5 py-0.5 rounded-md">{item.quantidade}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="hidden sm:block bg-zinc-900/40 border border-white/5 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-black/40 text-zinc-400 uppercase font-black text-[10px] tracking-[0.2em] border-b border-white/5">
                          <tr><th className="px-6 py-5 w-32">Unidade</th><th className="px-6 py-5 w-48">Produto</th><th className="px-6 py-5">Sabores e Quantidades</th><th className="px-6 py-5 text-right w-32">Total</th></tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {estoqueAgrupadoArray.map((grupo: any) => (
                            <tr key={`${grupo.cidade_id}-${grupo.produto_id}`} className="hover:bg-zinc-800/40 transition-colors">
                              <td className="px-6 py-5 text-zinc-300 font-medium align-top">{grupo.cidade?.nome}</td>
                              <td className="px-6 py-5 font-black text-white align-top">{grupo.produto?.nome}</td>
                              <td className="px-6 py-5 align-top">
                                <div className="flex flex-wrap gap-2">
                                  {grupo.variacoes.map((item: any) => (
                                    <button key={item.id} onClick={() => {setItemEditando(item); setNovaQuantidade(item.quantidade); setIsEditModalOpen(true)}} title="Clique para editar" className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border hover:opacity-80 transition-opacity cursor-pointer ${item.quantidade > 3 ? 'bg-green-500/10 text-green-400 border-green-500/20' : item.quantidade > 0 ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                      <span className="text-zinc-200">{item.sabor?.nome}</span>
                                      <span className="bg-black/50 px-1.5 py-0.5 rounded-md text-white">{item.quantidade}</span>
                                    </button>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-5 text-right align-top"><span className="bg-white/10 text-white px-3 py-1.5 rounded-lg text-xs font-bold">{grupo.total} un.</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ABA 3: PRODUTOS */}
            {abaAtiva === 'produtos' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center"><h2 className="text-lg font-black text-white">Catálogo</h2><button onClick={() => {setFormProduto({nome: '', descricao: '', preco: ''}); setIsAddProdutoModalOpen(true)}} className="bg-pink-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold active:scale-95 shadow-[0_0_15px_rgba(236,72,153,0.3)]">+ Criar Pod</button></div>
                <div className="bg-zinc-900/40 border border-white/5 rounded-3xl overflow-hidden overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-black/40 text-zinc-400 uppercase font-black text-[10px] tracking-[0.2em]">
                      <tr>
                        <th className="px-6 py-5 w-20 text-center">Imagem</th>
                        <th className="px-6 py-5">Marca/Modelo</th>
                        <th className="px-6 py-5">Descrição</th>
                        <th className="px-6 py-5 text-right">Valor Venda</th>
                        <th className="px-6 py-5 w-16 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {produtosList.map((p: any) => (
                        <tr key={p.id} className="hover:bg-zinc-800/40">
                          <td className="px-6 py-3 text-center align-middle">
                            <button onClick={() => { setProdutoImage(p); setImageUrl(p.imagem_url || ""); setIsImageModalOpen(true); }} className="relative group w-12 h-12 bg-black/50 border border-white/5 rounded-xl flex items-center justify-center overflow-hidden hover:border-pink-500 transition-all mx-auto">
                              {p.imagem_url ? <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <span className="text-zinc-500 text-xl font-light">+</span>}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm"><span className="text-[9px] text-white font-bold uppercase tracking-widest">Foto</span></div>
                            </button>
                          </td>
                          <td className="px-6 py-5 font-black text-white">{p.nome}</td>
                          <td className="px-6 py-5 text-zinc-400 text-xs truncate max-w-[150px]">{p.descricao || 'Sem descrição'}</td>
                          <td className="px-6 py-5 text-pink-400 font-bold text-right">R$ {p.preco.toFixed(2)}</td>
                          <td className="px-6 py-5 text-center">
                            {/* 🚀 BOTÃO EXCLUIR PRODUTO */}
                            <button onClick={() => excluirProduto(p.id)} className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-colors" title="Excluir Produto">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ABA 4: SABORES */}
            {abaAtiva === 'sabores' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center"><h2 className="text-lg font-black text-white">Variações Cadastradas</h2><button onClick={() => {setFormSabor({produto_id: '', nome: ''}); setIsAddSaborModalOpen(true)}} className="bg-pink-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold active:scale-95 shadow-[0_0_15px_rgba(236,72,153,0.3)]">+ Novo Sabor</button></div>
                <div className="bg-zinc-900/40 border border-white/5 rounded-3xl overflow-hidden overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-black/40 text-zinc-400 uppercase font-black text-[10px] tracking-[0.2em]">
                      <tr><th className="px-6 py-5 w-64">Produto Base</th><th className="px-6 py-5">Sabores Registrados (Clique no [x] para excluir)</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {saboresAgrupadosArray.map((grupo: any) => (
                        <tr key={grupo.id} className="hover:bg-zinc-800/40">
                          <td className="px-6 py-5 font-bold text-pink-500/80 align-top">{grupo.produtoNome}</td>
                          <td className="px-6 py-5 align-top">
                            <div className="flex flex-wrap gap-2">
                              {grupo.sabores.map((s: any) => (
                                <div key={s.id} className="flex items-center bg-black/50 text-zinc-300 pl-3 pr-1 py-1 rounded-lg text-xs font-medium border border-white/5 group">
                                  <span>{s.nome}</span>
                                  {/* 🚀 BOTÃO EXCLUIR SABOR */}
                                  <button onClick={() => excluirSabor(s.id)} className="ml-2 w-5 h-5 rounded hover:bg-red-500/20 text-zinc-600 hover:text-red-400 flex items-center justify-center transition-colors">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ABA 5: CIDADES */}
            {abaAtiva === 'cidades' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center"><h2 className="text-lg font-black text-white">Praças de Atuação</h2><button onClick={() => {setFormCidade({nome: ''}); setIsAddCidadeModalOpen(true)}} className="bg-pink-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold active:scale-95 shadow-[0_0_15px_rgba(236,72,153,0.3)]">+ Nova Praça</button></div>
                <div className="bg-zinc-900/40 border border-white/5 rounded-3xl overflow-hidden overflow-x-auto custom-scrollbar"><table className="w-full text-left text-sm whitespace-nowrap"><thead className="bg-black/40 text-zinc-400 uppercase font-black text-[10px] tracking-[0.2em]"><tr><th className="px-6 py-5">Nome da Cidade</th></tr></thead><tbody className="divide-y divide-white/5">{cidadesList.map((c: any) => (<tr key={c.id} className="hover:bg-zinc-800/40"><td className="px-6 py-5 font-black text-white text-lg">{c.nome}</td></tr>))}</tbody></table></div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ========================================== */}
      {/* MODAIS */}
      {/* ========================================== */}

      {/* 1. Modal Ajustar/Excluir Estoque */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-sm p-8 space-y-6 shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300 relative">
            
            {/* 🚀 BOTÃO EXCLUIR ITEM DO ESTOQUE */}
            <button onClick={() => excluirItemEstoque(itemEditando.id)} className="absolute top-6 right-6 p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all" title="Apagar Registro">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>

            <div className="text-center space-y-1 pr-8">
              <h3 className="text-2xl font-black text-white tracking-tight">Estoque Atual</h3>
              <p className="text-pink-500 text-sm font-black uppercase tracking-widest">{itemEditando?.produto?.nome}</p>
              <p className="text-zinc-400 text-xs font-semibold">{itemEditando?.sabor?.nome} • <span className="text-zinc-600">{itemEditando?.cidade?.nome}</span></p>
            </div>
            <div className="bg-zinc-900/50 p-6 rounded-[2rem] border border-white/5 space-y-6 shadow-inner">
              <div className="flex items-center justify-center gap-4">
                <button onClick={() => setNovaQuantidade(Math.max(0, novaQuantidade - 1))} className="w-14 h-14 rounded-full bg-zinc-800 hover:bg-pink-600 text-3xl font-black text-white flex items-center justify-center active:scale-90 transition-all shadow-lg">-</button>
                <div className="relative flex flex-col items-center justify-center">
                  <input type="number" value={novaQuantidade} onChange={(e) => setNovaQuantidade(parseInt(e.target.value) || 0)} className="w-24 bg-transparent text-center text-6xl font-black text-white focus:outline-none focus:text-pink-500 transition-colors p-0 m-0" style={{ WebkitAppearance: 'none', margin: 0 }} />
                  <span className="absolute -bottom-3 text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Unidades</span>
                </div>
                <button onClick={() => setNovaQuantidade(novaQuantidade + 1)} className="w-14 h-14 rounded-full bg-zinc-800 hover:bg-pink-600 text-3xl font-black text-white flex items-center justify-center active:scale-90 transition-all shadow-lg">+</button>
              </div>
              <div className="grid grid-cols-4 gap-2 pt-4 border-t border-white/5">
                <button onClick={() => setNovaQuantidade(0)} className="col-span-4 mb-2 py-3 rounded-xl bg-red-500/10 text-red-500 hover:text-white hover:bg-red-500 text-xs font-black uppercase tracking-widest transition-all active:scale-95">Zerar Estoque</button>
                <button onClick={() => setNovaQuantidade(Math.max(0, novaQuantidade - 10))} className="py-2.5 rounded-xl bg-black border border-white/5 text-zinc-400 text-xs font-bold hover:border-pink-500 hover:text-pink-500 active:scale-95 transition-all">-10</button>
                <button onClick={() => setNovaQuantidade(Math.max(0, novaQuantidade - 5))} className="py-2.5 rounded-xl bg-black border border-white/5 text-zinc-400 text-xs font-bold hover:border-pink-500 hover:text-pink-500 active:scale-95 transition-all">-5</button>
                <button onClick={() => setNovaQuantidade(novaQuantidade + 5)} className="py-2.5 rounded-xl bg-black border border-white/5 text-zinc-400 text-xs font-bold hover:border-pink-500 hover:text-pink-500 active:scale-95 transition-all">+5</button>
                <button onClick={() => setNovaQuantidade(novaQuantidade + 10)} className="py-2.5 rounded-xl bg-black border border-white/5 text-zinc-400 text-xs font-bold hover:border-pink-500 hover:text-pink-500 active:scale-95 transition-all">+10</button>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 rounded-2xl font-bold bg-zinc-800 hover:bg-zinc-700 text-white transition-all active:scale-95">Cancelar</button>
              <button onClick={salvarEdicaoEstoque} disabled={salvando} className="flex-1 py-4 rounded-2xl font-black bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 text-white shadow-[0_0_20px_rgba(236,72,153,0.3)] disabled:opacity-50 transition-all active:scale-95">{salvando ? 'Salvando...' : 'Confirmar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 MODAL EDITAR VENDA (Pagamento) */}
      {isEditVendaModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-[2rem] w-full max-w-sm p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-1">
              <h3 className="text-2xl font-black text-white tracking-tight">Editar Venda</h3>
              <p className="text-zinc-400 text-sm">Apenas a forma de pagamento pode ser alterada. Para mudar o produto, exclua a venda e registre novamente.</p>
            </div>
            <div className="space-y-4">
              <select className="w-full bg-zinc-900 border border-white/10 rounded-xl h-12 px-4 text-sm text-white outline-none focus:border-pink-500" value={novoMetodoPagamento} onChange={(e) => setNovoMetodoPagamento(e.target.value)}>
                <option value="Pix">Pix</option>
                <option value="Cartão">Cartão (Débito/Crédito)</option>
                <option value="Dinheiro">Dinheiro</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsEditVendaModalOpen(false)} className="flex-1 py-4 rounded-2xl font-bold bg-zinc-800 hover:bg-zinc-700 text-white transition-all active:scale-95 text-sm">Cancelar</button>
              <button onClick={salvarEdicaoVenda} disabled={salvando} className="flex-1 py-4 rounded-2xl font-black bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 text-white shadow-[0_0_20px_rgba(236,72,153,0.3)] disabled:opacity-50 transition-all active:scale-95 text-sm">{salvando ? 'Salvando...' : 'Salvar Alteração'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAIS MANTIDOS (Nova Entrada, Produto, Imagem, Sabor, Cidade)... */}
      {isImageModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-[2rem] w-full max-w-sm p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-1"><h3 className="text-2xl font-black text-white tracking-tight">Vitrine</h3><p className="text-pink-500 text-sm font-black uppercase tracking-widest">{produtoImage?.nome}</p></div>
            <div className="bg-zinc-900/50 p-6 rounded-[2rem] border border-white/5 flex flex-col items-center gap-6 shadow-inner">
              <div className="w-32 h-32 rounded-2xl bg-black/50 border border-white/5 flex items-center justify-center overflow-hidden">{imageUrl ? (<img src={imageUrl} alt="Preview" className="w-full h-full object-contain" />) : (<span className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest">Sem Imagem</span>)}</div>
              <div className="w-full space-y-2"><label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold ml-2">URL da Imagem (PNG Transparente)</label><input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://exemplo.com/foto-pod.png" className="w-full bg-black border border-white/10 focus:border-pink-500 rounded-xl h-12 px-4 text-xs text-white placeholder:text-zinc-600 outline-none transition-all" /></div>
            </div>
            <div className="flex gap-3"><button onClick={() => setIsImageModalOpen(false)} className="flex-1 py-4 rounded-2xl font-bold bg-zinc-800 hover:bg-zinc-700 text-white transition-all active:scale-95 text-sm">Voltar</button><button onClick={salvarImagemProduto} disabled={salvando} className="flex-1 py-4 rounded-2xl font-black bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 text-white shadow-[0_0_20px_rgba(236,72,153,0.3)] disabled:opacity-50 transition-all active:scale-95 text-sm">{salvando ? 'Salvando...' : 'Aplicar Foto'}</button></div>
          </div>
        </div>
      )}

      {isAddEstoqueModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] w-full max-w-sm p-8 space-y-6 animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-black text-white text-center">Nova Entrada</h3>
            <div className="space-y-4">
              <select className="w-full bg-zinc-900 border border-white/10 rounded-xl h-12 px-4 text-sm text-white outline-none focus:border-pink-500" value={formEstoque.cidade_id} onChange={(e) => setFormEstoque({...formEstoque, cidade_id: e.target.value})}><option value="">Selecione a Cidade</option>{cidadesList.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
              <select className="w-full bg-zinc-900 border border-white/10 rounded-xl h-12 px-4 text-sm text-white outline-none focus:border-pink-500" value={formEstoque.produto_id} onChange={(e) => setFormEstoque({...formEstoque, produto_id: e.target.value})}><option value="">Selecione o Produto</option>{produtosList.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
              <select className="w-full bg-zinc-900 border border-white/10 rounded-xl h-12 px-4 text-sm text-white outline-none focus:border-pink-500" value={formEstoque.sabor_id} onChange={(e) => setFormEstoque({...formEstoque, sabor_id: e.target.value})}><option value="">Selecione o Sabor</option>{saboresList.filter(s => s.produto_id.toString() === formEstoque.produto_id).map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select>
              <input type="number" placeholder="Quantidade" className="w-full bg-zinc-900 border border-white/10 rounded-xl h-12 px-4 text-sm text-white outline-none focus:border-pink-500" value={formEstoque.quantidade} onChange={(e) => setFormEstoque({...formEstoque, quantidade: parseInt(e.target.value)})} />
            </div>
            <div className="flex gap-3"><button onClick={() => setIsAddEstoqueModalOpen(false)} className="flex-1 py-3 rounded-xl bg-zinc-800 text-white font-bold text-sm">Cancelar</button><button onClick={salvarNovoEstoque} disabled={salvando} className="flex-1 py-3 rounded-xl bg-pink-600 text-white font-bold text-sm">{salvando ? '...' : 'Salvar'}</button></div>
          </div>
        </div>
      )}

      {isAddProdutoModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] w-full max-w-sm p-8 space-y-6 animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-black text-white text-center">Criar Novo Pod</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Marca / Nome" className="w-full bg-zinc-900 border border-white/10 rounded-xl h-12 px-4 text-sm text-white outline-none focus:border-pink-500" value={formProduto.nome} onChange={(e) => setFormProduto({...formProduto, nome: e.target.value})} />
              <input type="text" placeholder="Puffs, Nicotina, etc (Opcional)" className="w-full bg-zinc-900 border border-white/10 rounded-xl h-12 px-4 text-sm text-white outline-none focus:border-pink-500" value={formProduto.descricao} onChange={(e) => setFormProduto({...formProduto, descricao: e.target.value})} />
              <input type="text" placeholder="Preço (ex: 85,00)" className="w-full bg-zinc-900 border border-white/10 rounded-xl h-12 px-4 text-sm text-white outline-none focus:border-pink-500" value={formProduto.preco} onChange={(e) => setFormProduto({...formProduto, preco: e.target.value})} />
            </div>
            <div className="flex gap-3"><button onClick={() => setIsAddProdutoModalOpen(false)} className="flex-1 py-3 rounded-xl bg-zinc-800 text-white font-bold text-sm">Cancelar</button><button onClick={salvarNovoProduto} disabled={salvando} className="flex-1 py-3 rounded-xl bg-pink-600 text-white font-bold text-sm">{salvando ? '...' : 'Salvar'}</button></div>
          </div>
        </div>
      )}

      {isAddSaborModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] w-full max-w-sm p-8 space-y-6 animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-black text-white text-center">Adicionar Sabor</h3>
            <div className="space-y-4">
              <select className="w-full bg-zinc-900 border border-white/10 rounded-xl h-12 px-4 text-sm text-white outline-none focus:border-pink-500" value={formSabor.produto_id} onChange={(e) => setFormSabor({...formSabor, produto_id: e.target.value})}><option value="">Produto Base</option>{produtosList.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
              <input type="text" placeholder="Nome do Sabor (ex: Mint Ice)" className="w-full bg-zinc-900 border border-white/10 rounded-xl h-12 px-4 text-sm text-white outline-none focus:border-pink-500" value={formSabor.nome} onChange={(e) => setFormSabor({...formSabor, nome: e.target.value})} />
            </div>
            <div className="flex gap-3"><button onClick={() => setIsAddSaborModalOpen(false)} className="flex-1 py-3 rounded-xl bg-zinc-800 text-white font-bold text-sm">Cancelar</button><button onClick={salvarNovoSabor} disabled={salvando} className="flex-1 py-3 rounded-xl bg-pink-600 text-white font-bold text-sm">{salvando ? '...' : 'Salvar'}</button></div>
          </div>
        </div>
      )}

      {isAddCidadeModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] w-full max-w-sm p-8 space-y-6 animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-black text-white text-center">Nova Praça</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Nome da Cidade" className="w-full bg-zinc-900 border border-white/10 rounded-xl h-12 px-4 text-sm text-white outline-none focus:border-pink-500" value={formCidade.nome} onChange={(e) => setFormCidade({...formCidade, nome: e.target.value})} />
            </div>
            <div className="flex gap-3"><button onClick={() => setIsAddCidadeModalOpen(false)} className="flex-1 py-3 rounded-xl bg-zinc-800 text-white font-bold text-sm">Cancelar</button><button onClick={salvarNovaCidade} disabled={salvando} className="flex-1 py-3 rounded-xl bg-pink-600 text-white font-bold text-sm">{salvando ? '...' : 'Salvar'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}