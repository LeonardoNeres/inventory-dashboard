// ===== SISTEMA ORIGINAL DE ESTOQUE =====
let produtos = [];
let paginaAtual = 1;
let itensPorPagina = 5;
let linhaEditandoId = null;
let historico = [];

// ===== SISTEMA DE PEDIDOS =====
let pedidos = [];
let paginaAtualPedidos = 1;
let itensPorPaginaPedidos = 10;
let pedidoEditandoId = null;
let itensPedidoAtual = [];

// Variáveis para gráficos do painel
let graficoLocalizacao = null;
let graficoTopProdutos = null;

const tabelaBody = document.getElementById("tabelaProdutos");
const infoPagina = document.getElementById("infoPagina");
const selectItensPorPagina = document.getElementById("selectItensPorPagina");
const modal = document.getElementById("modalProduto");
const modalExport = document.getElementById("modalExportar");
const fileInput = document.getElementById("iptFileImport");

// ===== FUNÇÕES ORIGINAIS DO SISTEMA =====
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
    document.getElementById("btnProxima").disabled =
      paginaAtual === totalPaginas;

  document.getElementById("checkTodos").checked = false;
}

function registrarAcao(acao) {
  const agora = new Date();

  const log = {
    id: Date.now(),
    dia: agora.toLocaleDateString("pt-BR"),
    hora: agora.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    acao: acao,
  };

  historico.unshift(log);

  if (historico.length > 20) {
    historico = historico.slice(0, 20);
  }

  atualizarHistorico();
}

function atualizarHistorico() {
  const container = document.getElementById("logsHistorico");
  const contador = document.getElementById("contador-historico");

  if (!container) return;

  container.innerHTML = "";

  if (historico.length === 0) {
    container.innerHTML =
      '<div class="log-vazio">Nenhuma movimentação registrada ainda.</div>';
    if (contador) contador.textContent = "0 registros";
    return;
  }

  historico.forEach((log) => {
    const div = document.createElement("div");
    div.className = "log-item";
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
    contador.textContent = `${historico.length} registro${historico.length !== 1 ? "s" : ""}`;
  }
}

// ===== FUNÇÕES DO PAINEL (DASHBOARD) =====
function atualizarPainel() {
  atualizarMetricas();
  atualizarGraficos();
  atualizarTabelas();
}

function atualizarMetricas() {
  const totalProdutos = produtos.length;
  document.getElementById("totalProdutos").textContent = totalProdutos;

  let valorTotal = 0;
  produtos.forEach((p) => {
    const preco = parseFloat(p.preco) || 0;
    const quant = parseInt(p.quant) || 0;
    valorTotal += preco * quant;
  });

  document.getElementById("valorTotal").textContent =
    `R$ ${valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const produtosRecebimento = produtos.filter(
    (p) => p.local === "Recebimento",
  ).length;
  document.getElementById("produtosRecebimento").textContent =
    produtosRecebimento;

  const estoqueBaixo = produtos.filter((p) => {
    const quant = parseInt(p.quant) || 0;
    return quant < 5 && quant > 0;
  }).length;

  document.getElementById("estoqueBaixo").textContent = estoqueBaixo;
}

function atualizarGraficoLocalizacao() {
  const ctx = document.getElementById("graficoLocalizacao").getContext("2d");

  const locais = ["Recebimento", "Armazém 1", "Armazém 2", "Armazém 3"];
  const contagem = {
    Recebimento: 0,
    "Armazém 1": 0,
    "Armazém 2": 0,
    "Armazém 3": 0,
  };

  produtos.forEach((p) => {
    const local = p.local || "Recebimento";
    if (contagem[local] !== undefined) contagem[local]++;
    else contagem["Recebimento"]++;
  });

  const dados = locais.map((local) => contagem[local]);
  const cores = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4"];

  if (graficoLocalizacao) graficoLocalizacao.destroy();

  graficoLocalizacao = new Chart(ctx, {
    type: "pie",
    data: {
      labels: locais,
      datasets: [
        {
          data: dados,
          backgroundColor: cores,
          borderColor: "#fff",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            font: {
              size: 11,
            },
          },
        },
      },
    },
  });
}

function atualizarGraficoTopProdutos() {
  const ctx = document.getElementById("graficoTopProdutos").getContext("2d");

  const produtosOrdenados = [...produtos]
    .sort((a, b) => {
      const totalA = (parseInt(a.quant) || 0) + (parseInt(a.reserv) || 0);
      const totalB = (parseInt(b.quant) || 0) + (parseInt(b.reserv) || 0);
      return totalB - totalA;
    })
    .slice(0, 5);

  const nomes = produtosOrdenados.map((p) =>
    p.nome.length > 15 ? p.nome.substring(0, 15) + "..." : p.nome,
  );
  const totais = produtosOrdenados.map(
    (p) => (parseInt(p.quant) || 0) + (parseInt(p.reserv) || 0),
  );

  if (graficoTopProdutos) graficoTopProdutos.destroy();

  graficoTopProdutos = new Chart(ctx, {
    type: "bar",
    data: {
      labels: nomes,
      datasets: [
        {
          label: "Quantidade Total",
          data: totais,
          backgroundColor: "#FF6B6B",
          borderColor: "#FF4757",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            font: {
              size: 11,
            },
          },
        },
        x: {
          ticks: {
            font: {
              size: 10,
            },
          },
        },
      },
      plugins: {
        legend: { display: false },
      },
    },
  });
}

function atualizarGraficos() {
  atualizarGraficoLocalizacao();
  atualizarGraficoTopProdutos();
}

function atualizarTabelas() {
  atualizarTabelaEstoqueBaixo();
  atualizarTabelaUltimasMovimentacoes();
}

function atualizarTabelaEstoqueBaixo() {
  const tbody = document.getElementById("tabelaEstoqueBaixo");
  tbody.innerHTML = "";

  const produtosBaixos = produtos
    .filter((p) => {
      const quant = parseInt(p.quant) || 0;
      return quant < 10 && quant > 0;
    })
    .slice(0, 10);

  if (produtosBaixos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #666; padding: 20px;">
      Nenhum produto com estoque baixo
    </td></tr>`;
    return;
  }

  produtosBaixos.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.sku}</td>
      <td>${p.nome.length > 20 ? p.nome.substring(0, 20) + "..." : p.nome}</td>
      <td class="${p.quant < 3 ? "alerta-texto" : ""}">${p.quant}</td>
      <td>10</td>
    `;
    tbody.appendChild(tr);
  });
}

function atualizarTabelaUltimasMovimentacoes() {
  const tbody = document.getElementById("tabelaUltimasMovimentacoes");
  tbody.innerHTML = "";

  const ultimosLogs = historico.slice(0, 10);

  if (ultimosLogs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: #666; padding: 20px;">
      Nenhuma movimentação recente
    </td></tr>`;
    return;
  }

  ultimosLogs.forEach((log) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${log.hora}</td>
      <td>${log.acao}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ===== FUNÇÕES DO SISTEMA DE PEDIDOS =====
function renderizarTabelaPedidos() {
  const tbody = document.getElementById("tabelaPedidos");
  tbody.innerHTML = "";

  const inicio = (paginaAtualPedidos - 1) * itensPorPaginaPedidos;
  const fim = inicio + itensPorPaginaPedidos;
  const pedidosVisiveis = pedidos.slice(inicio, fim);

  pedidosVisiveis.forEach((pedido) => {
    const tr = document.createElement("tr");

    // Formatar status com cores
    let statusHTML = "";
    switch (pedido.status) {
      case "rascunho":
        statusHTML =
          '<span style="color: #666; background: #f1f2f6; padding: 3px 8px; border-radius: 10px; font-size: 11px;">📝 Rascunho</span>';
        break;
      case "pendente":
        statusHTML =
          '<span style="color: #ffa502; background: #fff8e1; padding: 3px 8px; border-radius: 10px; font-size: 11px;">⏳ Pendente</span>';
        break;
      case "concluido":
        statusHTML =
          '<span style="color: #2ed573; background: #e6fce6; padding: 3px 8px; border-radius: 10px; font-size: 11px;">✅ Concluído</span>';
        break;
      case "cancelado":
        statusHTML =
          '<span style="color: #ff4757; background: #ffe6e6; padding: 3px 8px; border-radius: 10px; font-size: 11px;">❌ Cancelado</span>';
        break;
      default:
        statusHTML = pedido.status;
    }

    // Formatar tipo
    const tipoTexto = pedido.tipo === "entrada" ? "📥 Entrada" : "📤 Saída";

    tr.innerHTML = `
      <td><input type="checkbox" class="checkItemPedido" data-id="${pedido.id}"></td>
      <td style="font-weight: bold;">#${pedido.numero}</td>
      <td>${tipoTexto}</td>
      <td>${statusHTML}</td>
      <td>${pedido.clienteFornecedor}</td>
      <td>${pedido.itens.length} item(s)</td>
      <td style="font-weight: bold;">R$ ${pedido.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
      <td>${pedido.dataCriacao}</td>
      <td>${pedido.criadoPor}</td>
      <td>
        <button class="btn-action" style="padding: 4px 8px; font-size: 11px;" onclick="verDetalhesPedido(${pedido.id})">Ver</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  const totalPaginas = Math.ceil(pedidos.length / itensPorPaginaPedidos) || 1;
  document.getElementById("infoPaginaPedidos").innerText =
    `Página ${paginaAtualPedidos} de ${totalPaginas}`;

  document.getElementById("btnAnteriorPedidos").disabled =
    paginaAtualPedidos === 1;
  document.getElementById("btnProximaPedidos").disabled =
    paginaAtualPedidos === totalPaginas;

  document.getElementById("checkTodosPedidos").checked = false;
}

function carregarProdutosNoSelect() {
  const select = document.getElementById("selectProdutoParaAdicionar");
  select.innerHTML = '<option value="">Selecione um produto...</option>';

  produtos.forEach((produto) => {
    const option = document.createElement("option");
    option.value = produto.id;
    option.textContent = `${produto.nome} (SKU: ${produto.sku}) - Disp: ${produto.quant}`;
    select.appendChild(option);
  });
}

function adicionarItemAoPedido() {
  const select = document.getElementById("selectProdutoParaAdicionar");
  const quantidadeInput = document.getElementById("iptQuantidadeProduto");

  const produtoId = parseInt(select.value);
  const quantidade = parseInt(quantidadeInput.value) || 1;

  if (!produtoId) {
    exibirAviso("Selecione um produto para adicionar ao pedido.");
    return;
  }

  const produto = produtos.find((p) => p.id === produtoId);

  if (!produto) {
    exibirAviso("Produto não encontrado.");
    return;
  }

  // Verificar se já existe no pedido
  const itemExistenteIndex = itensPedidoAtual.findIndex(
    (item) => item.produtoId === produtoId,
  );

  if (itemExistenteIndex > -1) {
    // Atualizar quantidade do item existente
    itensPedidoAtual[itemExistenteIndex].quantidade += quantidade;
  } else {
    // Adicionar novo item
    itensPedidoAtual.push({
      produtoId: produtoId,
      nome: produto.nome,
      sku: produto.sku,
      quantidade: quantidade,
      precoUnitario: parseFloat(produto.preco) || 0,
      subtotal: (parseFloat(produto.preco) || 0) * quantidade,
    });
  }

  atualizarTabelaItensPedido();
  select.value = "";
  quantidadeInput.value = 1;
}

function atualizarTabelaItensPedido() {
  const tbody = document.getElementById("tabelaItensPedido");
  tbody.innerHTML = "";

  let totalPedido = 0;

  itensPedidoAtual.forEach((item, index) => {
    const tr = document.createElement("tr");
    const subtotal = item.quantidade * item.precoUnitario;
    totalPedido += subtotal;

    tr.innerHTML = `
      <td>${item.nome}</td>
      <td>${item.sku}</td>
      <td>
        <input type="number" value="${item.quantidade}" min="1" 
               style="width: 60px; padding: 4px;" 
               onchange="atualizarQuantidadeItem(${index}, this.value)">
      </td>
      <td>R$ ${item.precoUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
      <td>R$ ${subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
      <td>
        <button class="btn-action" style="padding: 3px 6px; font-size: 10px;" 
                onclick="removerItemPedido(${index})">Remover</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (itensPedidoAtual.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: #666; padding: 20px;">
          Nenhum produto adicionado ao pedido.
        </td>
      </tr>
    `;
  }

  document.getElementById("totalPedido").textContent =
    totalPedido.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

function atualizarQuantidadeItem(index, novaQuantidade) {
  const qtd = parseInt(novaQuantidade) || 1;
  if (qtd < 1) return;

  itensPedidoAtual[index].quantidade = qtd;
  itensPedidoAtual[index].subtotal =
    qtd * itensPedidoAtual[index].precoUnitario;
  atualizarTabelaItensPedido();
}

function removerItemPedido(index) {
  itensPedidoAtual.splice(index, 1);
  atualizarTabelaItensPedido();
}

function limparFormularioPedido() {
  document.getElementById("iptTipoPedido").value = "entrada";
  document.getElementById("iptStatusPedido").value = "rascunho";
  document.getElementById("iptClienteFornecedor").value = "";
  document.getElementById("iptDataEntrega").value = "";
  document.getElementById("iptObservacoes").value = "";
  itensPedidoAtual = [];
  atualizarTabelaItensPedido();
  pedidoEditandoId = null;
}

function salvarPedido() {
  const tipo = document.getElementById("iptTipoPedido").value;
  const status = document.getElementById("iptStatusPedido").value;
  const clienteFornecedor = document.getElementById(
    "iptClienteFornecedor",
  ).value;
  const dataEntrega = document.getElementById("iptDataEntrega").value;
  const observacoes = document.getElementById("iptObservacoes").value;

  if (!clienteFornecedor.trim()) {
    exibirAviso("Informe o cliente/fornecedor do pedido.");
    return;
  }

  if (itensPedidoAtual.length === 0) {
    exibirAviso("Adicione pelo menos um item ao pedido.");
    return;
  }

  // BLOQUEAR EDIÇÃO DE PEDIDOS JÁ CONCLUÍDOS OU CANCELADOS
  if (pedidoEditandoId) {
    const pedidoAntigo = pedidos.find((p) => p.id === pedidoEditandoId);
    if (
      pedidoAntigo.status === "concluido" ||
      pedidoAntigo.status === "cancelado"
    ) {
      exibirAviso("Não é possível editar pedidos concluídos ou cancelados.");
      return;
    }
  }

  const valorTotal = itensPedidoAtual.reduce((total, item) => {
    return total + item.quantidade * item.precoUnitario;
  }, 0);

  const dataCriacao = new Date().toLocaleDateString("pt-BR");
  const dataEntregaFormatada = dataEntrega
    ? new Date(dataEntrega).toLocaleDateString("pt-BR")
    : "";

  const numeroPedido = pedidoEditandoId
    ? pedidos.find((p) => p.id === pedidoEditandoId).numero
    : `PED${Date.now().toString().slice(-6)}`;

  const pedidoData = {
    id: pedidoEditandoId || Date.now(),
    numero: numeroPedido,
    tipo: tipo,
    status: status,
    clienteFornecedor: clienteFornecedor,
    itens: [...itensPedidoAtual],
    valorTotal: valorTotal,
    dataCriacao: dataCriacao,
    dataEntrega: dataEntregaFormatada,
    observacoes: observacoes,
    criadoPor: "Usuário",
  };

  if (pedidoEditandoId) {
    // Editar pedido existente
    const index = pedidos.findIndex((p) => p.id === pedidoEditandoId);
    pedidos[index] = pedidoData;

    registrarAcao(`Pedido #${numeroPedido} editado`);
  } else {
    // Novo pedido
    pedidos.push(pedidoData);

    registrarAcao(
      `Novo pedido #${numeroPedido} criado (${tipo === "entrada" ? "Entrada" : "Saída"})`,
    );
  }

  // Se o pedido for concluído, atualizar o estoque
  if (status === "concluido") {
    atualizarEstoquePorPedido(pedidoData);
  }

  document.getElementById("modalPedido").style.display = "none";
  limparFormularioPedido();
  renderizarTabelaPedidos();

  // Atualizar painel se estiver visível
  if (document.getElementById("abaPainel").style.display === "block") {
    atualizarPainel();
  }
}

function atualizarEstoquePorPedido(pedido) {
  let temEstoqueInsuficiente = false;
  let produtoSemEstoque = "";

  // PRIMEIRO: Verificar se todos os produtos têm estoque suficiente
  if (pedido.tipo === "saida") {
    for (const item of pedido.itens) {
      const produto = produtos.find((p) => p.id === item.produtoId);
      if (produto) {
        const estoqueDisponivel = parseInt(produto.quant) || 0;
        if (estoqueDisponivel < item.quantidade) {
          temEstoqueInsuficiente = true;
          produtoSemEstoque = produto.nome;
          break;
        }
      }
    }
  }

  if (temEstoqueInsuficiente) {
    exibirAviso(`Estoque insuficiente para ${produtoSemEstoque}!`);
    return false; // Impede a confirmação do pedido
  }

  // SEGUNDO: Atualizar estoque
  pedido.itens.forEach((item) => {
    const produto = produtos.find((p) => p.id === item.produtoId);
    if (produto) {
      if (pedido.tipo === "entrada") {
        // ENTRADA: aumenta estoque DISPONÍVEL
        produto.quant = (parseInt(produto.quant) || 0) + item.quantidade;
      } else if (pedido.tipo === "saida") {
        // SAÍDA: Diminui DISPONÍVEL e aumenta RESERVADO
        const estoqueDisponivel = parseInt(produto.quant) || 0;

        // Diminui DISPONÍVEL
        produto.quant = estoqueDisponivel - item.quantidade;
        // Aumenta RESERVADO
        produto.reserv = (parseInt(produto.reserv) || 0) + item.quantidade;
      }
      produto.data = new Date().toLocaleDateString("pt-BR");
    }
  });

  // Atualizar tabela de produtos se estiver visível
  if (document.getElementById("abaProdutos").style.display === "flex") {
    renderizarTabela();
  }

  // Atualizar armazéns se estiver visível
  if (document.getElementById("abaArmazem").style.display === "block") {
    renderizarArmazens();
  }

  return true; // Pedido confirmado com sucesso
}

function verDetalhesPedido(pedidoId) {
  const pedido = pedidos.find((p) => p.id === pedidoId);
  if (!pedido) return;

  document.getElementById("detalhesNumeroPedido").textContent =
    `#${pedido.numero}`;
  document.getElementById("detalhesTipo").textContent =
    pedido.tipo === "entrada" ? "📥 Entrada" : "📤 Saída";
  document.getElementById("detalhesStatus").innerHTML = getStatusHTML(
    pedido.status,
  );
  document.getElementById("detalhesDataCriacao").textContent =
    pedido.dataCriacao;
  document.getElementById("detalhesDataEntrega").textContent =
    pedido.dataEntrega || "Não definida";
  document.getElementById("detalhesCliente").textContent =
    pedido.clienteFornecedor;
  document.getElementById("detalhesObservacoes").textContent =
    pedido.observacoes || "Nenhuma observação.";
  document.getElementById("detalhesTotalPedido").textContent =
    pedido.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  // Limpar e preencher itens
  const tbody = document.getElementById("detalhesItensPedido");
  tbody.innerHTML = "";

  pedido.itens.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.nome}</td>
      <td>${item.sku}</td>
      <td>${item.quantidade}</td>
      <td>R$ ${item.precoUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
      <td>R$ ${(item.quantidade * item.precoUnitario).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("modalDetalhesPedido").style.display = "flex";
}

function getStatusHTML(status) {
  switch (status) {
    case "rascunho":
      return '<span style="color: #666; background: #f1f2f6; padding: 3px 8px; border-radius: 10px; font-size: 11px;">📝 Rascunho</span>';
    case "pendente":
      return '<span style="color: #1e90ff; background: #e6f7ff; padding: 3px 8px; border-radius: 10px; font-size: 11px;">🚧 Processando</span>';
    case "concluido":
      return '<span style="color: #2ed573; background: #e6fce6; padding: 3px 8px; border-radius: 10px; font-size: 11px;">✅ Concluído</span>';
    case "cancelado":
      return '<span style="color: #ff4757; background: #ffe6e6; padding: 3px 8px; border-radius: 10px; font-size: 11px;">❌ Cancelado</span>';
    default:
      return status;
  }
}

// ===== NAVEGAÇÃO ENTRE ABAS =====
const navPainel = document.getElementById("navPainel");
const navProdutos = document.getElementById("navProdutos");
const navArmazem = document.getElementById("navArmazem");
const navPedidos = document.getElementById("navPedidos");
const abaPainel = document.getElementById("abaPainel");
const abaProdutos = document.getElementById("abaProdutos");
const abaArmazem = document.getElementById("abaArmazem");
const abaPedidos = document.getElementById("abaPedidos");

function mostrarPainel() {
  // Atualizar navegação
  navProdutos.classList.remove("active");
  navArmazem.classList.remove("active");
  navPedidos.classList.remove("active");
  navPainel.classList.add("active");

  // Mostrar/ocultar abas
  abaProdutos.style.display = "none";
  abaArmazem.style.display = "none";
  abaPedidos.style.display = "none";
  abaPainel.style.display = "block";

  // Atualizar painel
  atualizarPainel();
}

function mostrarProdutos() {
  navPainel.classList.remove("active");
  navArmazem.classList.remove("active");
  navPedidos.classList.remove("active");
  navProdutos.classList.add("active");

  abaPainel.style.display = "none";
  abaArmazem.style.display = "none";
  abaPedidos.style.display = "none";
  abaProdutos.style.display = "flex";

  renderizarTabela();
}

function mostrarArmazem() {
  navPainel.classList.remove("active");
  navProdutos.classList.remove("active");
  navPedidos.classList.remove("active");
  navArmazem.classList.add("active");

  abaPainel.style.display = "none";
  abaProdutos.style.display = "none";
  abaPedidos.style.display = "none";
  abaArmazem.style.display = "block";

  renderizarArmazens();
  atualizarHistorico();
}

function mostrarPedidos() {
  navPainel.classList.remove("active");
  navProdutos.classList.remove("active");
  navArmazem.classList.remove("active");
  navPedidos.classList.add("active");

  abaPainel.style.display = "none";
  abaProdutos.style.display = "none";
  abaArmazem.style.display = "none";
  abaPedidos.style.display = "flex";

  renderizarTabelaPedidos();
}

// Configurar eventos de navegação
navPainel.onclick = mostrarPainel;
navProdutos.onclick = mostrarProdutos;
navArmazem.onclick = mostrarArmazem;
navPedidos.onclick = mostrarPedidos;

// ===== EVENTOS DO SISTEMA ORIGINAL =====
document.getElementById("selectArmazem").onchange = (e) => {
  const novoLocal = e.target.value;
  if (!novoLocal) return;
  const selecionados = Array.from(
    document.querySelectorAll(".checkItem:checked"),
  ).map((cb) => Number(cb.dataset.id));
  if (selecionados.length === 0) {
    exibirAviso("Selecione os produtos que deseja mover de armazém.");
    e.target.value = "";
    return;
  }

  const produtosParaMover = produtos.filter(
    (p) => selecionados.includes(p.id) && p.local !== novoLocal,
  );

  if (produtosParaMover.length === 0) {
    exibirAviso("Os produtos selecionados já estão neste armazém.");
    e.target.value = "";
    return;
  }

  exibirConfirmacao(
    `Deseja mover ${produtosParaMover.length} item(ns) para o ${novoLocal}?`,
    () => {
      produtos = produtos.map((p) => {
        if (selecionados.includes(p.id) && p.local !== novoLocal) {
          return {
            ...p,
            local: novoLocal,
            data: new Date().toLocaleDateString("pt-BR"),
          };
        }
        return p;
      });

      const nomesProdutos = produtosParaMover
        .map((p) => p.nome)
        .slice(0, 3)
        .join(", ");

      const maisTexto =
        produtosParaMover.length > 3
          ? ` e mais ${produtosParaMover.length - 3} produto(s)`
          : "";
      registrarAcao(
        `${produtosParaMover.length} produto(s) movido(s) para ${novoLocal}: ${nomesProdutos}${maisTexto}`,
      );

      renderizarTabela();
      // Atualizar painel se estiver visível
      if (abaPainel.style.display === "block") {
        atualizarPainel();
      }
      e.target.value = "";
    },
  );
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

    if (novosProdutos.length > 0) {
      registrarAcao(
        `${novosProdutos.length} produto(s) importado(s) via arquivo`,
      );
    }

    paginaAtual = 1;
    renderizarTabela();

    // Atualizar painel se estiver visível
    if (abaPainel.style.display === "block") {
      atualizarPainel();
    }

    fileInput.value = "";
  };
  reader.readAsText(file);
};

document.getElementById("btnProxima").onclick = () => {
  const totalPaginas = Math.ceil(produtos.length / itensPorPagina);
  if (paginaAtual < totalPaginas) {
    paginaAtual++;
    renderizarTabela();
  }
};
document.getElementById("btnAnterior").onclick = () => {
  if (paginaAtual > 1) {
    paginaAtual--;
    renderizarTabela();
  }
};
document.getElementById("btnPrimeira").onclick = () => {
  paginaAtual = 1;
  renderizarTabela();
};
selectItensPorPagina.onchange = () => {
  itensPorPagina = parseInt(selectItensPorPagina.value);
  paginaAtual = 1;
  renderizarTabela();
};

document.getElementById("btnExportar").onclick = () => {
  const selecionados = document.querySelectorAll(".checkItem:checked");
  if (selecionados.length === 0)
    return exibirAviso("Selecione pelo menos um item para exportar.");
  modalExport.style.display = "flex";
  document.getElementById("iptNomeArquivo").value = "meu_estoque";
};

document.getElementById("btnConfirmarExport").onclick = () => {
  const selecionadosIds = Array.from(
    document.querySelectorAll(".checkItem:checked"),
  ).map((cb) => Number(cb.dataset.id));
  const nomeArquivo =
    document.getElementById("iptNomeArquivo").value || "estoque";
  const produtosParaExportar = produtos.filter((p) =>
    selecionadosIds.includes(p.id),
  );

  if (produtosParaExportar.length > 0) {
    registrarAcao(
      `${produtosParaExportar.length} produto(s) exportado(s) para arquivo "${nomeArquivo}.txt"`,
    );
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

document.getElementById("btnCancelarExport").onclick = () =>
  (modalExport.style.display = "none");

document.getElementById("btnSalvar").onclick = () => {
  const nome = document.getElementById("iptNome").value;
  const sku = document.getElementById("iptSku").value;
  if (!nome || !sku) return exibirAviso("Nome e SKU são obrigatórios!");

  let localDigitado = document.getElementById("iptLocal").value.trim();
  const localOriginal = localDigitado;

  if (linhaEditandoId) {
    localDigitado = localDigitado || "Recebimento";
  } else {
    if (!localDigitado) {
      localDigitado = "Recebimento";
    } else {
      const localLower = localDigitado.toLowerCase();

      if (
        localLower.includes("rece") ||
        localLower.includes("cheg") ||
        localLower.includes("entrad") ||
        localLower.includes("triag")
      ) {
        localDigitado = "Recebimento";
      } else if (
        localLower.includes("armaz") ||
        localLower.includes("1") ||
        localLower.includes("um") ||
        localLower.includes("prim")
      ) {
        localDigitado = "Armazém 1";
      } else if (
        localLower.includes("2") ||
        localLower.includes("dois") ||
        localLower.includes("segund")
      ) {
        localDigitado = "Armazém 2";
      } else if (
        localLower.includes("3") ||
        localLower.includes("tres") ||
        localLower.includes("terc")
      ) {
        localDigitado = "Armazém 3";
      }

      if (localOriginal && localDigitado !== localOriginal) {
        console.log(
          `📍 Local corrigido: "${localOriginal}" → "${localDigitado}"`,
        );
      }
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

    const mudou =
      produtoAntigo.nome !== pData.nome ||
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
    registrarAcao(
      `"${pData.nome}" cadastrado em ${pData.local} (SKU: ${pData.sku})`,
    );
  }

  fecharELimpar();
  renderizarTabela();

  // Atualizar painel se estiver visível
  if (abaPainel.style.display === "block") {
    atualizarPainel();
  }
};

document.getElementById("btnDeletar").onclick = () => {
  const selecionados = Array.from(
    document.querySelectorAll(".checkItem:checked"),
  ).map((cb) => Number(cb.dataset.id));
  if (selecionados.length === 0)
    return exibirAviso("Selecione itens para deletar.");
  exibirConfirmacao(
    `Deseja realmente deletar ${selecionados.length} item(ns)?`,
    () => {
      const produtosDeletados = produtos.filter((p) =>
        selecionados.includes(p.id),
      );

      produtos = produtos.filter((p) => !selecionados.includes(p.id));

      if (produtosDeletados.length > 0) {
        const nomes = produtosDeletados
          .map((p) => p.nome)
          .slice(0, 3)
          .join(", ");
        const maisTexto =
          selecionados.length > 3
            ? ` e mais ${selecionados.length - 3} produto(s)`
            : "";
        registrarAcao(
          `${selecionados.length} produto(s) deletado(s): ${nomes}${maisTexto}`,
        );
      }

      if (
        paginaAtual > Math.ceil(produtos.length / itensPorPagina) &&
        paginaAtual > 1
      )
        paginaAtual--;
      renderizarTabela();

      // Atualizar painel se estiver visível
      if (abaPainel.style.display === "block") {
        atualizarPainel();
      }
    },
  );
};

document.getElementById("btnEditar").onclick = () => {
  const selecionados = document.querySelectorAll(".checkItem:checked");
  if (selecionados.length === 0)
    return exibirAviso("Selecione um item para editar.");
  if (selecionados.length > 1)
    return exibirAviso(
      "Você só pode editar um item por vez. Desmarque os outros.",
    );
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

// ===== FUNÇÕES DE DRAG & DROP DO ARMAZÉM =====
function renderizarArmazens() {
  const containers = document.querySelectorAll(".items-container");
  containers.forEach((c) => (c.innerHTML = ""));

  const counts = {
    "Armazém 1": 0,
    "Armazém 2": 0,
    "Armazém 3": 0,
    Recebimento: 0,
  };

  produtos.forEach((p) => {
    const card = document.createElement("div");
    card.className = "item-card";
    card.draggable = true;
    card.setAttribute("data-id", p.id);

    card.innerHTML = `
      <p class="sku">${p.sku}</p>
      <p><strong>${p.nome}</strong></p>
      <p>Disp: ${p.quant} | Res: ${p.reserv}</p>
    `;

    card.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", p.id);
      card.classList.add("dragging");
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
    });

    const localNormalizado = p.local || "Recebimento";
    const zoneId = `zone-${localNormalizado
      .toLowerCase()
      .replace(/ /g, "-")
      .replace("é", "e")
      .replace("ç", "c")}`;

    const targetContainer = document.getElementById(zoneId);

    if (targetContainer) {
      targetContainer.appendChild(card);
      if (counts[localNormalizado] !== undefined) counts[localNormalizado]++;
    }
  });

  document.getElementById("count-armazem-1").innerText = counts["Armazém 1"];
  document.getElementById("count-armazem-2").innerText = counts["Armazém 2"];
  document.getElementById("count-armazem-3").innerText = counts["Armazém 3"];
  document.getElementById("count-recebimento").innerText =
    counts["Recebimento"];
}

function allowDrop(ev) {
  ev.preventDefault();
}

function drop(ev) {
  ev.preventDefault();
  const idProduto = Number(ev.dataTransfer.getData("text/plain"));
  const novoLocal = ev.currentTarget.getAttribute("data-local");

  const produto = produtos.find((p) => p.id === idProduto);
  const localAntigo = produto.local;

  if (localAntigo === novoLocal) {
    console.log(
      `Produto "${produto.nome}" já está no ${novoLocal}. Nenhuma movimentação registrada.`,
    );
    return;
  }

  ev.currentTarget.style.borderColor = "#2ed573";
  setTimeout(() => {
    ev.currentTarget.style.borderColor = "";
  }, 300);

  produtos = produtos.map((p) => {
    if (p.id === idProduto) {
      return {
        ...p,
        local: novoLocal,
        data: new Date().toLocaleDateString("pt-BR"),
      };
    }
    return p;
  });

  registrarAcao(
    `"${produto.nome}" movido de ${localAntigo} para ${novoLocal} via drag & drop`,
  );

  renderizarArmazens();

  // Atualizar painel se estiver visível
  if (abaPainel.style.display === "block") {
    atualizarPainel();
  }
}

// ===== FUNÇÕES UTILITÁRIAS =====
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

// ===== EVENTOS DE MODAIS =====
document.getElementById("btnFecharAviso").onclick = () =>
  (document.getElementById("modalAviso").style.display = "none");
document.getElementById("btnCancelarConfirm").onclick = () =>
  (document.getElementById("modalConfirmacao").style.display = "none");
document.getElementById("btnAbrirModal").onclick = () => {
  modal.style.display = "flex";
  document.getElementById("modalTitulo").innerText = "Cadastrar Novo Produto";
  linhaEditandoId = null;
  modal.querySelectorAll("input").forEach((i) => (i.value = ""));
};
document.getElementById("btnCancelar").onclick = fecharELimpar;
document.getElementById("checkTodos").onclick = (e) => {
  document
    .querySelectorAll(".checkItem")
    .forEach((cb) => (cb.checked = e.target.checked));
};

// ===== EVENTOS DO PAINEL =====
document.getElementById("selectPeriodo").onchange = () => {
  if (abaPainel.style.display === "block") {
    atualizarPainel();
  }
};

document.getElementById("btnGerarRelatorio").onclick = () => {
  exibirAviso(
    'Funcionalidade de relatório detalhado será implementada na aba "Relatório"',
  );
};

// ===== EVENTOS DO SISTEMA DE PEDIDOS =====
document.getElementById("btnNovoPedido").onclick = () => {
  carregarProdutosNoSelect();
  limparFormularioPedido();
  document.getElementById("modalTituloPedido").textContent = "Novo Pedido";
  pedidoEditandoId = null;
  document.getElementById("modalPedido").style.display = "flex";

  // Definir data de entrega padrão (7 dias a partir de hoje)
  const hoje = new Date();
  const umaSemana = new Date(hoje);
  umaSemana.setDate(hoje.getDate() + 7);
  document.getElementById("iptDataEntrega").value = umaSemana
    .toISOString()
    .split("T")[0];
};

document.getElementById("btnAdicionarProdutoPedido").onclick =
  adicionarItemAoPedido;

document.getElementById("btnSalvarPedido").onclick = salvarPedido;

document.getElementById("btnCancelarPedidoModal").onclick = () => {
  document.getElementById("modalPedido").style.display = "none";
  limparFormularioPedido();
};

document.getElementById("btnFecharDetalhes").onclick = () => {
  document.getElementById("modalDetalhesPedido").style.display = "none";
};

// Eventos de paginação da tabela de pedidos
document.getElementById("btnProximaPedidos").onclick = () => {
  const totalPaginas = Math.ceil(pedidos.length / itensPorPaginaPedidos);
  if (paginaAtualPedidos < totalPaginas) {
    paginaAtualPedidos++;
    renderizarTabelaPedidos();
  }
};

document.getElementById("btnAnteriorPedidos").onclick = () => {
  if (paginaAtualPedidos > 1) {
    paginaAtualPedidos--;
    renderizarTabelaPedidos();
  }
};

document.getElementById("btnPrimeiraPedidos").onclick = () => {
  paginaAtualPedidos = 1;
  renderizarTabelaPedidos();
};

document.getElementById("selectItensPorPaginaPedidos").onchange = () => {
  itensPorPaginaPedidos = parseInt(
    document.getElementById("selectItensPorPaginaPedidos").value,
  );
  paginaAtualPedidos = 1;
  renderizarTabelaPedidos();
};

// Checkbox "todos" para pedidos
document.getElementById("checkTodosPedidos").onclick = (e) => {
  document.querySelectorAll(".checkItemPedido").forEach((cb) => {
    cb.checked = e.target.checked;
  });
};

// Confirmar pedido selecionado
document.getElementById("btnConfirmarPedido").onclick = () => {
  const selecionados = Array.from(
    document.querySelectorAll(".checkItemPedido:checked"),
  ).map((cb) => Number(cb.dataset.id));

  if (selecionados.length === 0) {
    exibirAviso("Selecione pelo menos um pedido para confirmar.");
    return;
  }

  // VERIFICAR se algum já está concluído ou cancelado
  const pedidosInvalidos = [];
  selecionados.forEach((id) => {
    const pedido = pedidos.find((p) => p.id === id);
    if (pedido.status === "concluido") {
      pedidosInvalidos.push(`#${pedido.numero} (já concluído)`);
    } else if (pedido.status === "cancelado") {
      pedidosInvalidos.push(`#${pedido.numero} (cancelado)`);
    }
  });

  if (pedidosInvalidos.length > 0) {
    exibirAviso(`Não é possível confirmar: ${pedidosInvalidos.join(", ")}`);
    return;
  }

  exibirConfirmacao(
    `Deseja confirmar ${selecionados.length} pedido(s)? Esta ação atualizará o estoque.`,
    () => {
      selecionados.forEach((pedidoId) => {
        const pedido = pedidos.find((p) => p.id === pedidoId);
        if (
          pedido &&
          pedido.status !== "concluido" &&
          pedido.status !== "cancelado"
        ) {
          pedido.status = "concluido";

          // Atualizar estoque - verifica se deu certo
          const estoqueAtualizado = atualizarEstoquePorPedido(pedido);

          if (estoqueAtualizado) {
            registrarAcao(
              `Pedido #${pedido.numero} confirmado e estoque atualizado`,
            );
          } else {
            // Se não tinha estoque, volta o status
            pedido.status = "pendente";
          }
        }
      });

      renderizarTabelaPedidos();

      // Atualizar painel se estiver visível
      if (document.getElementById("abaPainel").style.display === "block") {
        atualizarPainel();
      }
    },
  );
};

// Cancelar pedido selecionado
document.getElementById("btnCancelarPedido").onclick = () => {
  const selecionados = Array.from(
    document.querySelectorAll(".checkItemPedido:checked"),
  ).map((cb) => Number(cb.dataset.id));

  if (selecionados.length === 0) {
    exibirAviso("Selecione pelo menos um pedido para cancelar.");
    return;
  }

  // VERIFICAR se algum já está concluído
  const pedidosConcluidos = [];
  selecionados.forEach((id) => {
    const pedido = pedidos.find((p) => p.id === id);
    if (pedido.status === "concluido") {
      pedidosConcluidos.push(`#${pedido.numero}`);
    }
  });

  if (pedidosConcluidos.length > 0) {
    exibirAviso(
      `Não é possível cancelar pedidos já concluídos: ${pedidosConcluidos.join(", ")}`,
    );
    return;
  }

  exibirConfirmacao(`Deseja cancelar ${selecionados.length} pedido(s)?`, () => {
    selecionados.forEach((pedidoId) => {
      const pedido = pedidos.find((p) => p.id === pedidoId);
      if (pedido && pedido.status !== "cancelado") {
        pedido.status = "cancelado";
        registrarAcao(`Pedido #${pedido.numero} cancelado`);
      }
    });

    renderizarTabelaPedidos();
  });
};

document.getElementById("selectFiltrarStatus").onchange = aplicarFiltrosPedidos;

document.getElementById("selectFiltrarTipo").onchange = aplicarFiltrosPedidos;
// ===== INICIALIZAÇÃO =====
// Configurar navegação inicial - Painel ativo
abaProdutos.style.display = "none";
abaArmazem.style.display = "none";
abaPedidos.style.display = "none";
abaPainel.style.display = "block";
navProdutos.classList.remove("active");
navArmazem.classList.remove("active");
navPedidos.classList.remove("active");
navPainel.classList.add("active");

// Inicializar sistema
renderizarTabela();

// FUNÇÃO 1: Aplicar filtros
function aplicarFiltrosPedidos() {
  const filtroStatus = document.getElementById("selectFiltrarStatus").value;
  const filtroTipo = document.getElementById("selectFiltrarTipo").value;

  let pedidosFiltrados = [...pedidos];

  // Filtrar por status
  if (filtroStatus) {
    pedidosFiltrados = pedidosFiltrados.filter(
      (p) => p.status === filtroStatus,
    );
  }

  // Filtrar por tipo
  if (filtroTipo) {
    pedidosFiltrados = pedidosFiltrados.filter((p) => p.tipo === filtroTipo);
  }

  // Mostrar pedidos filtrados
  const tbody = document.getElementById("tabelaPedidos");
  tbody.innerHTML = "";

  pedidosFiltrados.forEach((pedido) => {
    const tr = document.createElement("tr");

    let statusHTML = "";
    switch (pedido.status) {
      case "rascunho":
        statusHTML =
          '<span style="color: #666; background: #f1f2f6; padding: 3px 8px; border-radius: 10px; font-size: 11px;">📝 Rascunho</span>';
        break;
      case "pendente":
        statusHTML =
          '<span style="color: #ffa502; background: #fff8e1; padding: 3px 8px; border-radius: 10px; font-size: 11px;">⏳ Pendente</span>';
        break;
      case "concluido":
        statusHTML =
          '<span style="color: #2ed573; background: #e6fce6; padding: 3px 8px; border-radius: 10px; font-size: 11px;">✅ Concluído</span>';
        break;
      case "cancelado":
        statusHTML =
          '<span style="color: #ff4757; background: #ffe6e6; padding: 3px 8px; border-radius: 10px; font-size: 11px;">❌ Cancelado</span>';
        break;
    }

    const tipoTexto = pedido.tipo === "entrada" ? "📥 Entrada" : "📤 Saída";

    tr.innerHTML = `
      <td><input type="checkbox" class="checkItemPedido" data-id="${pedido.id}"></td>
      <td>#${pedido.numero}</td>
      <td>${tipoTexto}</td>
      <td>${statusHTML}</td>
      <td>${pedido.clienteFornecedor}</td>
      <td>${pedido.itens.length} itens</td>
      <td>R$ ${pedido.valorTotal.toFixed(2)}</td>
      <td>${pedido.dataCriacao}</td>
      <td>${pedido.criadoPor}</td>
      <td><button class="btn-action" onclick="verDetalhesPedido(${pedido.id})">Ver</button></td>
    `;
    tbody.appendChild(tr);
  });

  // Atualizar contador de página
  document.getElementById("infoPaginaPedidos").textContent = `Página 1 de 1`;
}

// FUNÇÃO 2: Atualizar renderização da tabela
function renderizarTabelaPedidos() {
  aplicarFiltrosPedidos();
}

// FUNÇÃO 3: Limpar filtros
function limparFiltrosPedidos() {
  document.getElementById("selectFiltrarStatus").value = "";
  document.getElementById("selectFiltrarTipo").value = "";
  aplicarFiltrosPedidos();
}
