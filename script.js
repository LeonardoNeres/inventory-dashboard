let produtos = [];
let paginaAtual = 1;
let itensPorPagina = 5;
let linhaEditandoId = null;

const tabelaBody = document.getElementById("tabelaProdutos");
const infoPagina = document.getElementById("infoPagina");
const selectItensPorPagina = document.getElementById("selectItensPorPagina");
const modal = document.getElementById("modalProduto");
const modalExport = document.getElementById("modalExportar");
const fileInput = document.getElementById("iptFileImport");

// --- RENDERIZAÇÃO ---
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

// --- LÓGICA: MUDAR ARMAZÉM EM MASSA ---
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

  exibirConfirmacao(
    `Deseja mover ${selecionados.length} item(ns) para o ${novoLocal}?`,
    () => {
      produtos = produtos.map((p) => {
        if (selecionados.includes(p.id)) {
          return {
            ...p,
            local: novoLocal,
            data: new Date().toLocaleDateString("pt-BR"),
          };
        }
        return p;
      });

      renderizarTabela();
      e.target.value = "";
    },
  );
};

// --- IMPORTAÇÃO ---
document.getElementById("btnImportar").onclick = () => fileInput.click();

fileInput.onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const conteudo = event.target.result;
    const linhas = conteudo.split(/\r?\n/);

    linhas.slice(1).forEach((linha, i) => {
      if (linha.trim() === "") return;
      let col = linha.split("\t");
      if (col.length < 3) col = linha.split(/\s{2,}/);

      if (col.length >= 3) {
        produtos.push({
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

    paginaAtual = 1;
    renderizarTabela();
    fileInput.value = "";
  };
  reader.readAsText(file);
};

// --- PAGINAÇÃO ---
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

// --- LOGICA DE EXPORTAÇÃO ---
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

// --- CRUD ---
document.getElementById("btnSalvar").onclick = () => {
  const nome = document.getElementById("iptNome").value;
  const sku = document.getElementById("iptSku").value;
  if (!nome || !sku) return exibirAviso("Nome e SKU são obrigatórios!");

  const pData = {
    id: linhaEditandoId || Date.now(),
    nome,
    sku,
    cond: document.getElementById("iptCond").value,
    local: document.getElementById("iptLocal").value || "Armazém 1",
    quant: document.getElementById("iptQuant").value || 0,
    reserv: document.getElementById("iptQuantReservada").value || 0,
    preco: document.getElementById("iptPreco").value || "0.00",
    data: new Date().toLocaleDateString("pt-BR"),
  };

  if (linhaEditandoId) {
    const index = produtos.findIndex((p) => p.id === linhaEditandoId);
    produtos[index] = pData;
  } else {
    produtos.push(pData);
  }
  fecharELimpar();
  renderizarTabela();
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
      produtos = produtos.filter((p) => !selecionados.includes(p.id));
      if (
        paginaAtual > Math.ceil(produtos.length / itensPorPagina) &&
        paginaAtual > 1
      )
        paginaAtual--;
      renderizarTabela();
    },
  );
};

// --- LOGICA DE EDIÇÃO ---
document.getElementById("btnEditar").onclick = () => {
  const selecionados = document.querySelectorAll(".checkItem:checked");

  if (selecionados.length === 0) {
    return exibirAviso("Selecione um item para editar.");
  }

  if (selecionados.length > 1) {
    return exibirAviso(
      "Você só pode editar um item por vez. Desmarque os outros.",
    );
  }

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
