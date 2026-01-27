// Seleção de elementos
const modal = document.getElementById("modalProduto");
const modalTitulo = document.getElementById("modalTitulo");
const btnAbrir = document.getElementById("btnAbrirModal");
const btnCancelar = document.getElementById("btnCancelar");
const btnSalvar = document.getElementById("btnSalvar");
const btnDeletar = document.getElementById("btnDeletar");
const btnEditar = document.getElementById("btnEditar");
const btnExportar = document.getElementById("btnExportar");
const btnImportar = document.getElementById("btnImportar");
const iptFileImport = document.getElementById("iptFileImport");
const selectArmazem = document.getElementById("selectArmazem");
const tabelaBody = document.getElementById("tabelaProdutos");
const checkTodos = document.getElementById("checkTodos");

const iptNome = document.getElementById("iptNome");
const iptSku = document.getElementById("iptSku");
const iptCond = document.getElementById("iptCond");
const iptLocal = document.getElementById("iptLocal");
const iptQuant = document.getElementById("iptQuant");
const iptQuantReservada = document.getElementById("iptQuantReservada");
const iptPreco = document.getElementById("iptPreco");

// Modais Customizados
const modalAviso = document.getElementById("modalAviso");
const avisoMsg = document.getElementById("avisoMsg");
const btnFecharAviso = document.getElementById("btnFecharAviso");
const modalConfirm = document.getElementById("modalConfirmacao");
const confirmMsg = document.getElementById("confirmMsg");
const btnAceitarConfirm = document.getElementById("btnAceitarConfirm");
const btnCancelarConfirm = document.getElementById("btnCancelarConfirm");

let linhaEditando = null;
let acaoConfirmar = null;

// --- FUNÇÕES DE MODAL ---
function exibirAviso(texto) {
  avisoMsg.innerText = texto;
  modalAviso.style.display = "flex";
}

function exibirConfirmacao(texto, callback) {
  confirmMsg.innerText = texto;
  acaoConfirmar = callback;
  modalConfirm.style.display = "flex";
}

btnFecharAviso.addEventListener(
  "click",
  () => (modalAviso.style.display = "none"),
);
btnCancelarConfirm.addEventListener(
  "click",
  () => (modalConfirm.style.display = "none"),
);
btnAceitarConfirm.addEventListener("click", () => {
  if (acaoConfirmar) acaoConfirmar();
  modalConfirm.style.display = "none";
});

// --- LOGICA DE PRODUTOS ---
btnAbrir.addEventListener("click", () => {
  linhaEditando = null;
  modalTitulo.innerText = "Cadastrar Novo Produto";
  fecharELimpar();
  modal.style.display = "flex";
});

btnCancelar.addEventListener("click", fecharELimpar);

btnSalvar.addEventListener("click", () => {
  if (iptNome.value === "" || iptSku.value === "") {
    exibirAviso("Preencha Nome e SKU!");
    return;
  }
  const quant = parseInt(iptQuant.value) || 0;
  const reserv = parseInt(iptQuantReservada.value) || 0;

  if (linhaEditando) {
    linhaEditando.cells[1].innerText = iptNome.value;
    linhaEditando.cells[2].innerText = iptSku.value;
    linhaEditando.cells[3].innerText = iptCond.value;
    linhaEditando.cells[4].innerText = iptLocal.value || "Armazém 1";
    linhaEditando.cells[5].innerText = quant;
    linhaEditando.cells[6].innerText = reserv;
    linhaEditando.cells[7].innerText = `R$ ${iptPreco.value || "0.00"}`;
  } else {
    adicionarLinhaTabela(
      iptNome.value,
      iptSku.value,
      iptCond.value,
      iptLocal.value,
      quant,
      reserv,
      iptPreco.value,
    );
  }
  fecharELimpar();
});

function adicionarLinhaTabela(nome, sku, cond, local, q, r, preco) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
      <td><input type="checkbox" class="checkItem"></td>
      <td>${nome}</td>
      <td>${sku}</td>
      <td>${cond}</td>
      <td class="col-local">${local || "Armazém 1"}</td>
      <td>${q}</td>
      <td>${r}</td>
      <td>R$ ${preco || "0.00"}</td>
      <td>${new Date().toLocaleDateString("pt-BR")}</td>
  `;
  tabelaBody.appendChild(tr);
}

// --- IMPORTAR E EXPORTAR (USANDO ESPAÇOS) ---

// EXPORTAR: Transforma tabela em texto separado por espaços
btnExportar.addEventListener("click", () => {
  const linhas = tabelaBody.querySelectorAll("tr");
  if (linhas.length === 0) {
    exibirAviso("Não há dados para exportar.");
    return;
  }

  let conteudoTxt =
    "NOME SKU CONDIÇÃO LOCALIZAÇÃO DISPONÍVEL RESERVADO PREÇO\n";

  linhas.forEach((linha) => {
    const dados = [];
    // Pega do índice 1 ao 7 (pula checkbox e data modificação)
    for (let i = 1; i <= 7; i++) {
      // Substitui espaços internos no nome por "_" para não quebrar a lógica na volta
      let texto = linha.cells[i].innerText.replace(/\s+/g, "_");
      dados.push(texto);
    }
    conteudoTxt += dados.join("   ") + "\n"; // Usa 3 espaços como separador
  });

  const blob = new Blob([conteudoTxt], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "estoque.txt";
  link.click();
});

// IMPORTAR: Lê arquivo e quebra por espaços
btnImportar.addEventListener("click", () => iptFileImport.click());

iptFileImport.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const texto = event.target.result;
    const linhas = texto.split("\n");

    // Começa do 1 para pular o cabeçalho
    for (let i = 1; i < linhas.length; i++) {
      if (linhas[i].trim() === "") continue;

      // Quebra a linha por múltiplos espaços
      const colunas = linhas[i].split(/\s{2,}/);

      if (colunas.length >= 6) {
        // Recupera os espaços originais (onde tinha _) e remove o "R$"
        const nome = colunas[0].replace(/_/g, " ");
        const sku = colunas[1];
        const cond = colunas[2];
        const local = colunas[3].replace(/_/g, " ");
        const quant = colunas[4];
        const reserv = colunas[5];
        const preco = colunas[6] ? colunas[6].replace("R$", "").trim() : "0.00";

        adicionarLinhaTabela(nome, sku, cond, local, quant, reserv, preco);
      }
    }
    exibirAviso("Dados importados com sucesso!");
    iptFileImport.value = ""; // Limpa o input
  };
  reader.readAsText(file);
});

// --- OUTRAS FUNÇÕES (EDITAR, DELETAR, ETC) ---

btnEditar.addEventListener("click", () => {
  const selecionados = document.querySelectorAll(".checkItem:checked");
  if (selecionados.length !== 1) {
    exibirAviso("Selecione exatamente um produto para editar.");
    return;
  }
  linhaEditando = selecionados[0].closest("tr");
  iptNome.value = linhaEditando.cells[1].innerText;
  iptSku.value = linhaEditando.cells[2].innerText;
  iptCond.value = linhaEditando.cells[3].innerText;
  iptLocal.value = linhaEditando.cells[4].innerText;
  iptQuant.value = linhaEditando.cells[5].innerText;
  iptQuantReservada.value = linhaEditando.cells[6].innerText;
  iptPreco.value = linhaEditando.cells[7].innerText.replace("R$ ", "");

  modalTitulo.innerText = "Editar Produto";
  modal.style.display = "flex";
});

btnDeletar.addEventListener("click", () => {
  const checkboxes = document.querySelectorAll(".checkItem:checked");
  if (checkboxes.length === 0) {
    exibirAviso("Selecione ao menos um produto.");
    return;
  }
  exibirConfirmacao(`Deletar ${checkboxes.length} item(ns)?`, () => {
    checkboxes.forEach((cb) => cb.closest("tr").remove());
    checkTodos.checked = false;
  });
});

selectArmazem.addEventListener("change", () => {
  const destino = selectArmazem.value;
  const checkboxes = document.querySelectorAll(".checkItem:checked");
  if (!destino || checkboxes.length === 0) {
    if (destino) exibirAviso("Selecione os produtos primeiro.");
    selectArmazem.value = "";
    return;
  }
  checkboxes.forEach((cb) => {
    cb.closest("tr").querySelector(".col-local").innerText = destino;
  });
  selectArmazem.value = "";
});

checkTodos.addEventListener("change", () => {
  document
    .querySelectorAll(".checkItem")
    .forEach((cb) => (cb.checked = checkTodos.checked));
});

function fecharELimpar() {
  modal.style.display = "none";
  [
    iptNome,
    iptSku,
    iptCond,
    iptLocal,
    iptQuant,
    iptQuantReservada,
    iptPreco,
  ].forEach((i) => (i.value = ""));
}
