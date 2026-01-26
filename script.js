const modal = document.getElementById("modalProduto");
const modalTitulo = document.getElementById("modalTitulo");
const btnAbrir = document.getElementById("btnAbrirModal");
const btnCancelar = document.getElementById("btnCancelar");
const btnSalvar = document.getElementById("btnSalvar");
const btnDeletar = document.getElementById("btnDeletar");
const btnEditar = document.getElementById("btnEditar");
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

let linhaEditando = null; // Variável para controlar a edição

// Abrir para novo produto
btnAbrir.addEventListener("click", () => {
  linhaEditando = null;
  modalTitulo.innerText = "Cadastrar Novo Produto";
  fecharELimpar(); // Limpa antes de abrir
  modal.style.display = "flex";
});

btnCancelar.addEventListener("click", fecharELimpar);

// Função de Salvar (Serve para novo e para editar)
btnSalvar.addEventListener("click", () => {
  if (iptNome.value === "" || iptSku.value === "") {
    alert("Preencha Nome e SKU!");
    return;
  }

  const quant = parseInt(iptQuant.value) || 0;
  const reserv = parseInt(iptQuantReservada.value) || 0;
  const aMao = quant - reserv;

  if (linhaEditando) {
    // EDITANDO LINHA EXISTENTE
    linhaEditando.cells[1].innerText = iptNome.value;
    linhaEditando.cells[2].innerText = iptSku.value;
    linhaEditando.cells[3].innerText = iptCond.value;
    linhaEditando.cells[4].innerText = iptLocal.value || "Armazém 1";
    linhaEditando.cells[5].innerText = quant;
    linhaEditando.cells[6].innerText = reserv;
    linhaEditando.cells[7].innerText = aMao;
    linhaEditando.cells[8].innerText = `R$ ${iptPreco.value || "0.00"}`;
  } else {
    // ADICIONANDO NOVA LINHA
    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td><input type="checkbox" class="checkItem"></td>
        <td>${iptNome.value}</td>
        <td>${iptSku.value}</td>
        <td>${iptCond.value}</td>
        <td class="col-local">${iptLocal.value || "Armazém 1"}</td>
        <td>${quant}</td>
        <td>${reserv}</td>
        <td>${aMao}</td>
        <td>R$ ${iptPreco.value || "0.00"}</td>
        <td>${new Date().toLocaleDateString("pt-BR")}</td>
    `;
    tabelaBody.appendChild(tr);
  }
  
  fecharELimpar();
});

// Função Editar
btnEditar.addEventListener("click", () => {
  const selecionado = document.querySelector(".checkItem:checked");
  
  if (!selecionado) {
    alert("Selecione um produto para editar.");
    return;
  }

  const selecionados = document.querySelectorAll(".checkItem:checked");
  if (selecionados.length > 1) {
    alert("Selecione apenas um produto por vez para editar.");
    return;
  }

  linhaEditando = selecionado.closest("tr");
  
  // Preencher modal com dados atuais
  iptNome.value = linhaEditando.cells[1].innerText;
  iptSku.value = linhaEditando.cells[2].innerText;
  iptCond.value = linhaEditando.cells[3].innerText;
  iptLocal.value = linhaEditando.cells[4].innerText;
  iptQuant.value = linhaEditando.cells[5].innerText;
  iptQuantReservada.value = linhaEditando.cells[6].innerText;
  iptPreco.value = linhaEditando.cells[8].innerText.replace("R$ ", "");

  modalTitulo.innerText = "Editar Produto";
  modal.style.display = "flex";
});

// Funções de Deletar, Armazém e CheckTodos permanecem iguais
btnDeletar.addEventListener("click", () => {
  const checkboxes = document.querySelectorAll(".checkItem:checked");
  if (checkboxes.length === 0) {
    alert("Selecione ao menos um produto para deletar.");
    return;
  }
  if (confirm(`Deseja deletar ${checkboxes.length} produto(s)?`)) {
    checkboxes.forEach((cb) => cb.closest("tr").remove());
    checkTodos.checked = false;
  }
});

selectArmazem.addEventListener("change", () => {
  const destino = selectArmazem.value;
  const checkboxes = document.querySelectorAll(".checkItem:checked");
  if (!destino) return;
  if (checkboxes.length === 0) {
    alert("Selecione os produtos que deseja mover.");
    selectArmazem.value = "";
    return;
  }
  checkboxes.forEach((cb) => {
    const row = cb.closest("tr");
    row.querySelector(".col-local").innerText = destino;
  });
  selectArmazem.value = "";
});

checkTodos.addEventListener("change", () => {
  const checkboxes = document.querySelectorAll(".checkItem");
  checkboxes.forEach((cb) => (cb.checked = checkTodos.checked));
});

function fecharELimpar() {
  modal.style.display = "none";
  iptNome.value = "";
  iptSku.value = "";
  iptCond.value = "";
  iptLocal.value = "";
  iptQuant.value = "";
  iptQuantReservada.value = "";
  iptPreco.value = "";
}