let produtos = [];
let paginaAtual = 1;
let itensPorPagina = 5;
let linhaEditandoId = null;
let historico = []; // NOVO: Array para histórico

const tabelaBody = document.getElementById("tabelaProdutos");
const infoPagina = document.getElementById("infoPagina");
const selectItensPorPagina = document.getElementById("selectItensPorPagina");
const modal = document.getElementById("modalProduto");
const modalExport = document.getElementById("modalExportar");
const fileInput = document.getElementById("iptFileImport");

// --- RENDERIZAÇÃO ORIGINAL ---
function renderizarTabela() {
  tabelaBody.innerHTML = "";
  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;
  const itensVisiveis = produtos.slice(inicio, fim);

  itensVisiveis.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="checkbox" class="checkItem" data-id="${p.id}"></td>
      <td>${p.nome}</td>
      <td>${p.sku}</td>
      <td>${p.cond}</td>
      <td class="col-local">${p.local}</td>
      <td>${p.quant}</td>
      <td>${p.reserv}</td>
      <td>R$ ${p.preco}</td>
      <td>${p.data}</td>
    `;
    tabelaBody.appendChild(tr);
  });

  const totalPaginas = Math.ceil(produtos.length / itensPorPagina) || 1;
  infoPagina.innerText = `Página ${paginaAtual} de ${totalPaginas}`;

  if (document.getElementById("btnAnterior"))
    document.getElementById("btnAnterior").disabled = paginaAtual === 1;
  if (document.getElementById("btnProxima"))
    document.getElementById("btnProxima").disabled = paginaAtual === totalPaginas;

  document.getElementById("checkTodos").checked = false;
}

// === FUNÇÕES DE HISTÓRICO ===
function registrarAcao(acao) {
  const agora = new Date();
  
  const log = {
    id: Date.now(),
    dia: agora.toLocaleDateString('pt-BR'), // Ex: "28/01/2026"
    hora: agora.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    }), // Ex: "14:30:22"
    acao: acao
  };
  
  // Adiciona no início (mais recente primeiro)
  historico.unshift(log);
  
  // Limita a 20 registros
  if (historico.length > 20) {
    historico = historico.slice(0, 20);
  }
  
  // Atualiza a visualização
  atualizarHistorico();
}

function atualizarHistorico() {
  const container = document.getElementById('logsHistorico');
  const contador = document.getElementById('contador-historico');
  
  if (!container) return;
  
  container.innerHTML = '';
  
  if (historico.length === 0) {
    container.innerHTML = '<div class="log-vazio">Nenhuma movimentação registrada ainda.</div>';
    if (contador) contador.textContent = '0 registros';
    return;
  }
  
  historico.forEach(log => {
    const div = document.createElement('div');
    div.className = 'log-item';
    div.innerHTML = `
      <div class="log-data">
        <span class="log-hora">${log.hora}</span>
        <span class="log-dia">${log.dia}</span>
      </div>
      <div class="log-acao">${log.acao}</div>
    `;
    container.appendChild(div);
  });
  
  if (contador) {
    contador.textContent = `${historico.length} registro${historico.length !== 1 ? 's' : ''}`;
  }
}

// Eventos de CRUD e Ações
document.getElementById("selectArmazem").onchange = (e) => {
  const novoLocal = e.target.value;
  if (!novoLocal) return;
  const selecionados = Array.from(document.querySelectorAll(".checkItem:checked")).map((cb) => Number(cb.dataset.id));
  if (selecionados.length === 0) {
    exibirAviso("Selecione os produtos que deseja mover de armazém.");
    e.target.value = "";
    return;
  }
  
  // FILTRA SÓ OS QUE REALMENTE VÃO MUDAR (NOVO)
  const produtosParaMover = produtos.filter(p => 
    selecionados.includes(p.id) && p.local !== novoLocal
  );
  
  if (produtosParaMover.length === 0) {
    exibirAviso("Os produtos selecionados já estão neste armazém.");
    e.target.value = "";
    return;
  }
  
  exibirConfirmacao(`Deseja mover ${produtosParaMover.length} item(ns) para o ${novoLocal}?`, () => {
    produtos = produtos.map((p) => {
      if (selecionados.includes(p.id) && p.local !== novoLocal) {
        return { ...p, local: novoLocal, data: new Date().toLocaleDateString("pt-BR") };
      }
      return p;
    });
    
    // REGISTRA NO HISTÓRICO
    const nomesProdutos = produtosParaMover
      .map(p => p.nome)
      .slice(0, 3)
      .join(', ');
    
    const maisTexto = produtosParaMover.length > 3 ? ` e mais ${produtosParaMover.length - 3} produto(s)` : '';
    registrarAcao(`${produtosParaMover.length} produto(s) movido(s) para ${novoLocal}: ${nomesProdutos}${maisTexto}`);
    
    renderizarTabela();
    e.target.value = "";
  });
};

document.getElementById("btnImportar").onclick = () => fileInput.click();
fileInput.onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    const conteudo = event.target.result;
    const linhas = conteudo.split(/\r?\n/);
    const novosProdutos = [];
    
    linhas.slice(1).forEach((linha, i) => {
      if (linha.trim() === "") return;
      let col = linha.split("\t");
      if (col.length < 3) col = linha.split(/\s{2,}/);
      if (col.length >= 3) {
        novosProdutos.push({
          id: Date.now() + i,
          nome: col[0].replace(/_/g, " ").trim(),
          sku: col[1].trim(),
          cond: col[2] || "Novo",
          local: col[3] ? col[3].replace(/_/g, " ").trim() : "Armazém 1",
          quant: col[4] || 0,
          reserv: col[5] || 0,
          preco: col[6] ? col[6].replace("R$", "").trim() : "0.00",
          data: new Date().toLocaleDateString("pt-BR"),
        });
      }
    });
    
    produtos.push(...novosProdutos);
    
    // REGISTRA NO HISTÓRICO
    if (novosProdutos.length > 0) {
      registrarAcao(`${novosProdutos.length} produto(s) importado(s) via arquivo`);
    }
    
    paginaAtual = 1;
    renderizarTabela();
    fileInput.value = "";
  };
  reader.readAsText(file);
};

document.getElementById("btnProxima").onclick = () => {
  const totalPaginas = Math.ceil(produtos.length / itensPorPagina);
  if (paginaAtual < totalPaginas) { paginaAtual++; renderizarTabela(); }
};
document.getElementById("btnAnterior").onclick = () => {
  if (paginaAtual > 1) { paginaAtual--; renderizarTabela(); }
};
document.getElementById("btnPrimeira").onclick = () => { paginaAtual = 1; renderizarTabela(); };
selectItensPorPagina.onchange = () => {
  itensPorPagina = parseInt(selectItensPorPagina.value);
  paginaAtual = 1;
  renderizarTabela();
};

document.getElementById("btnExportar").onclick = () => {
  const selecionados = document.querySelectorAll(".checkItem:checked");
  if (selecionados.length === 0) return exibirAviso("Selecione pelo menos um item para exportar.");
  modalExport.style.display = "flex";
  document.getElementById("iptNomeArquivo").value = "meu_estoque";
};

document.getElementById("btnConfirmarExport").onclick = () => {
  const selecionadosIds = Array.from(document.querySelectorAll(".checkItem:checked")).map((cb) => Number(cb.dataset.id));
  const nomeArquivo = document.getElementById("iptNomeArquivo").value || "estoque";
  const produtosParaExportar = produtos.filter((p) => selecionadosIds.includes(p.id));
  
  // REGISTRA NO HISTÓRICO (só se tiver produtos para exportar)
  if (produtosParaExportar.length > 0) {
    registrarAcao(`${produtosParaExportar.length} produto(s) exportado(s) para arquivo "${nomeArquivo}.txt"`);
  }
  
  let txt = "NOME\tSKU\tCONDIÇÃO\tLOCALIZAÇÃO\tDISPONÍVEL\tRESERVADO\tPREÇO\n";
  produtosParaExportar.forEach((p) => {
    txt += `${p.nome}\t${p.sku}\t${p.cond}\t${p.local}\t${p.quant}\t${p.reserv}\t${p.preco}\n`;
  });
  
  const blob = new Blob([txt], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${nomeArquivo}.txt`;
  a.click();
  modalExport.style.display = "none";
};

document.getElementById("btnCancelarExport").onclick = () => (modalExport.style.display = "none");

// === FUNÇÃO COM CORREÇÃO INTELIGENTE DE LOCAL ===
document.getElementById("btnSalvar").onclick = () => {
  const nome = document.getElementById("iptNome").value;
  const sku = document.getElementById("iptSku").value;
  if (!nome || !sku) return exibirAviso("Nome e SKU são obrigatórios!");
  
  // CORREÇÃO INTELIGENTE DO LOCAL (nova lógica)
  let localDigitado = document.getElementById("iptLocal").value.trim();
  const localOriginal = localDigitado; // Guarda o original para comparação
  
  if (linhaEditandoId) {
    // EDITANDO: mantém o que o usuário digitou (sem correção)
    localDigitado = localDigitado || "Recebimento";
  } else {
    // NOVO PRODUTO: aplica correção inteligente
    if (!localDigitado) {
      localDigitado = "Recebimento";
    } else {
      const localLower = localDigitado.toLowerCase();
      
      // Se parecido com "Recebimento"
      if (localLower.includes("rece") || localLower.includes("cheg") || 
          localLower.includes("entrad") || localLower.includes("triag")) {
        localDigitado = "Recebimento";
      }
      // Se parecido com "Armazém 1"
      else if (localLower.includes("armaz") || localLower.includes("1") || 
               localLower.includes("um") || localLower.includes("prim")) {
        localDigitado = "Armazém 1";
      }
      // Se parecido com "Armazém 2"
      else if (localLower.includes("2") || localLower.includes("dois") || 
               localLower.includes("segund")) {
        localDigitado = "Armazém 2";
      }
      // Se parecido com "Armazém 3"
      else if (localLower.includes("3") || localLower.includes("tres") || 
               localLower.includes("terc")) {
        localDigitado = "Armazém 3";
      }
      // Se não identificar, mantém o que digitou
    }
    
    // Mostra aviso discreto se corrigiu
    if (localOriginal && localDigitado !== localOriginal) {
      console.log(`📍 Local corrigido: "${localOriginal}" → "${localDigitado}"`);
    }
  }
  
  const pData = {
    id: linhaEditandoId || Date.now(),
    nome,
    sku,
    cond: document.getElementById("iptCond").value,
    local: localDigitado,
    quant: document.getElementById("iptQuant").value || 0,
    reserv: document.getElementById("iptQuantReservada").value || 0,
    preco: document.getElementById("iptPreco").value || "0.00",
    data: new Date().toLocaleDateString("pt-BR"),
  };
  
  if (linhaEditandoId) {
    const index = produtos.findIndex((p) => p.id === linhaEditandoId);
    const produtoAntigo = produtos[index];
    produtos[index] = pData;
    
    // REGISTRA NO HISTÓRICO (EDIÇÃO) - só se realmente mudou algo
    const mudou = produtoAntigo.nome !== pData.nome || 
                  produtoAntigo.sku !== pData.sku || 
                  produtoAntigo.cond !== pData.cond || 
                  produtoAntigo.local !== pData.local || 
                  produtoAntigo.quant != pData.quant || 
                  produtoAntigo.reserv != pData.reserv || 
                  produtoAntigo.preco !== pData.preco;
    
    if (mudou) {
      registrarAcao(`"${pData.nome}" editado (SKU: ${pData.sku})`);
    }
  } else {
    produtos.push(pData);
    
    // REGISTRA NO HISTÓRICO (CADASTRO)
    registrarAcao(`"${pData.nome}" cadastrado em ${pData.local} (SKU: ${pData.sku})`);
  }
  
  fecharELimpar();
  renderizarTabela();
};

document.getElementById("btnDeletar").onclick = () => {
  const selecionados = Array.from(document.querySelectorAll(".checkItem:checked")).map((cb) => Number(cb.dataset.id));
  if (selecionados.length === 0) return exibirAviso("Selecione itens para deletar.");
  exibirConfirmacao(`Deseja realmente deletar ${selecionados.length} item(ns)?`, () => {
    const produtosDeletados = produtos.filter(p => selecionados.includes(p.id));
    
    produtos = produtos.filter((p) => !selecionados.includes(p.id));
    
    // REGISTRA NO HISTÓRICO (EXCLUSÃO) - só se realmente deletou
    if (produtosDeletados.length > 0) {
      const nomes = produtosDeletados.map(p => p.nome).slice(0, 3).join(', ');
      const maisTexto = selecionados.length > 3 ? ` e mais ${selecionados.length - 3} produto(s)` : '';
      registrarAcao(`${selecionados.length} produto(s) deletado(s): ${nomes}${maisTexto}`);
    }
    
    if (paginaAtual > Math.ceil(produtos.length / itensPorPagina) && paginaAtual > 1) paginaAtual--;
    renderizarTabela();
  });
};

document.getElementById("btnEditar").onclick = () => {
  const selecionados = document.querySelectorAll(".checkItem:checked");
  if (selecionados.length === 0) return exibirAviso("Selecione um item para editar.");
  if (selecionados.length > 1) return exibirAviso("Você só pode editar um item por vez. Desmarque os outros.");
  const check = selecionados[0];
  const p = produtos.find((prod) => prod.id === Number(check.dataset.id));
  linhaEditandoId = p.id;
  document.getElementById("iptNome").value = p.nome;
  document.getElementById("iptSku").value = p.sku;
  document.getElementById("iptCond").value = p.cond;
  document.getElementById("iptLocal").value = p.local;
  document.getElementById("iptQuant").value = p.quant;
  document.getElementById("iptQuantReservada").value = p.reserv;
  document.getElementById("iptPreco").value = p.preco;
  document.getElementById("modalTitulo").innerText = "Editar Produto";
  modal.style.display = "flex";
};

// --- UTILITÁRIOS ---
function fecharELimpar() {
  modal.style.display = "none";
  linhaEditandoId = null;
  modal.querySelectorAll("input").forEach((i) => (i.value = ""));
}
function exibirAviso(msg) {
  document.getElementById("avisoMsg").innerText = msg;
  document.getElementById("modalAviso").style.display = "flex";
}
function exibirConfirmacao(msg, cb) {
  document.getElementById("confirmMsg").innerText = msg;
  document.getElementById("modalConfirmacao").style.display = "flex";
  document.getElementById("btnAceitarConfirm").onclick = () => {
    cb();
    document.getElementById("modalConfirmacao").style.display = "none";
  };
}

document.getElementById("btnFecharAviso").onclick = () => (document.getElementById("modalAviso").style.display = "none");
document.getElementById("btnCancelarConfirm").onclick = () => (document.getElementById("modalConfirmacao").style.display = "none");
document.getElementById("btnAbrirModal").onclick = () => {
  modal.style.display = "flex";
  document.getElementById("modalTitulo").innerText = "Cadastrar Novo Produto";
  linhaEditandoId = null;
  modal.querySelectorAll("input").forEach((i) => (i.value = ""));
};
document.getElementById("btnCancelar").onclick = fecharELimpar;
document.getElementById("checkTodos").onclick = (e) => {
  document.querySelectorAll(".checkItem").forEach((cb) => (cb.checked = e.target.checked));
};

// --- ABAS E DRAG & DROP ---
const navProdutos = document.getElementById('navProdutos');
const navArmazem = document.getElementById('navArmazem');
const abaProdutos = document.getElementById('abaProdutos');
const abaArmazem = document.getElementById('abaArmazem');

navProdutos.onclick = () => {
  navArmazem.classList.remove('active');
  navProdutos.classList.add('active');
  abaArmazem.style.display = 'none';
  abaProdutos.style.display = 'flex';
  renderizarTabela();
};

navArmazem.onclick = () => {
  navProdutos.classList.remove('active');
  navArmazem.classList.add('active');
  abaProdutos.style.display = 'none';
  abaArmazem.style.display = 'block';
  renderizarArmazens();
  atualizarHistorico(); // ATUALIZA HISTÓRICO AO ABRIR ABA
};

function renderizarArmazens() {
  // LIMPA TODOS OS CONTAINERS PRIMEIRO
  const containers = document.querySelectorAll('.items-container');
  containers.forEach(c => c.innerHTML = '');
  
  const counts = { 'Armazém 1': 0, 'Armazém 2': 0, 'Armazém 3': 0, 'Recebimento': 0 };

  produtos.forEach(p => {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.draggable = true;
    card.setAttribute('data-id', p.id); // ADICIONA DATA-ID NO CARD
    
    card.innerHTML = `
      <p class="sku">${p.sku}</p>
      <p><strong>${p.nome}</strong></p>
      <p>Disp: ${p.quant} | Res: ${p.reserv}</p>
    `;

    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData("text/plain", p.id);
      card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });

    // CORRIGE O ID DO CONTAINER (remove acentos)
    const localNormalizado = p.local || 'Recebimento';
    const zoneId = `zone-${localNormalizado.toLowerCase()
      .replace(/ /g, '-')
      .replace('é', 'e')
      .replace('ç', 'c')}`;
    
    const targetContainer = document.getElementById(zoneId);
    
    if (targetContainer) {
      targetContainer.appendChild(card);
      if(counts[localNormalizado] !== undefined) counts[localNormalizado]++;
    }
  });

  // ATUALIZA OS NÚMEROS DOS BADGES
  document.getElementById('count-armazem-1').innerText = counts['Armazém 1'];
  document.getElementById('count-armazem-2').innerText = counts['Armazém 2'];
  document.getElementById('count-armazem-3').innerText = counts['Armazém 3'];
  document.getElementById('count-recebimento').innerText = counts['Recebimento'];
}

function allowDrop(ev) {
  ev.preventDefault();
}

function drop(ev) {
  ev.preventDefault();
  const idProduto = Number(ev.dataTransfer.getData("text/plain"));
  const novoLocal = ev.currentTarget.getAttribute('data-local');
  
  const produto = produtos.find(p => p.id === idProduto);
  const localAntigo = produto.local;
  
  // VERIFICA SE REALMENTE MUDOU DE LOCAL (NOVO)
  if (localAntigo === novoLocal) {
    console.log(`Produto "${produto.nome}" já está no ${novoLocal}. Nenhuma movimentação registrada.`);
    return; // Não faz nada se for o mesmo local
  }
  
  // Feedback visual opcional
  ev.currentTarget.style.borderColor = "#2ed573"; // Verde - movimento realizado
  setTimeout(() => {
    ev.currentTarget.style.borderColor = "";
  }, 300);
  
  produtos = produtos.map(p => {
    if (p.id === idProduto) {
      return { ...p, local: novoLocal, data: new Date().toLocaleDateString("pt-BR") };
    }
    return p;
  });

  // REGISTRA NO HISTÓRICO (só se mudou mesmo)
  registrarAcao(`"${produto.nome}" movido de ${localAntigo} para ${novoLocal} via drag & drop`);
  
  renderizarArmazens();
}

// Inicialização
renderizarTabela();