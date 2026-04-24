import { firebaseConfig, slugify, showToast } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  updateDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ==================== ELEMENTOS ====================

const loginSection = document.getElementById("loginSection");
const adminSection = document.getElementById("adminSection");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginMessage = document.getElementById("loginMessage");

const productForm = document.getElementById("productForm");
const adminProductsList = document.getElementById("adminProductsList");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const saveBtn = document.getElementById("saveBtn");

const mediaFile = document.getElementById("mediaFile");
const uploadProgress = document.getElementById("uploadProgress");
const uploadProgressBar = document.getElementById("uploadProgressBar");
const uploadStatus = document.getElementById("uploadStatus");
const uploadPreview = document.getElementById("uploadPreview");
const mediaUrl = document.getElementById("mediaUrl");
const mediaTipo = document.getElementById("mediaTipo");

const totalProductsEl = document.getElementById("totalProducts");
const activeProductsEl = document.getElementById("activeProducts");
const featuredProductsEl = document.getElementById("featuredProducts");

let editingId = null;
let currentStoragePath = null;

// ==================== LOGIN ====================

loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  loginMessage.textContent = "Entrando...";

  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginMessage.textContent = "";
    showToast("Login realizado com sucesso!", "success");
  } catch (error) {
    loginMessage.textContent = "Erro: e-mail ou senha incorretos.";
    loginMessage.style.color = "red";
    showToast("Erro ao fazer login.", "danger");
    console.error(error);
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  showToast("Você saiu do painel.", "success");
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginSection.classList.add("hidden");
    adminSection.classList.remove("hidden");
    loadAdminProducts();
  } else {
    loginSection.classList.remove("hidden");
    adminSection.classList.add("hidden");
  }
});

// ==================== UPLOAD ====================

mediaFile.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 50 * 1024 * 1024) {
    showToast("Arquivo muito grande. Máximo 50MB.", "danger");
    return;
  }

  showLocalPreview(file);
  await uploadMedia(file);
});

function showLocalPreview(file) {
  const url = URL.createObjectURL(file);
  const isVideo = file.type.startsWith("video/");

  uploadPreview.style.display = "block";
  uploadPreview.innerHTML = isVideo
    ? `<video src="${url}" controls muted style="width:100%;max-height:260px;object-fit:cover;"></video>`
    : `<img src="${url}" alt="Preview" style="width:100%;max-height:260px;object-fit:cover;">`;
}

async function uploadMedia(file) {
  const isVideo = file.type.startsWith("video/");
  const folder = isVideo ? "videos" : "imagens";
  const fileName = `${Date.now()}_${file.name.replace(/\s/g, "_")}`;
  const storagePath = `produtos/${folder}/${fileName}`;

  const storageRef = ref(storage, storagePath);
  const uploadTask = uploadBytesResumable(storageRef, file);

  uploadProgress.style.display = "block";
  uploadStatus.textContent = "Enviando arquivo...";
  saveBtn.disabled = true;

  uploadTask.on(
    "state_changed",
    (snapshot) => {
      const percent = Math.round(
        (snapshot.bytesTransferred / snapshot.totalBytes) * 100
      );
      uploadProgressBar.style.width = `${percent}%`;
      uploadStatus.textContent = `Enviando... ${percent}%`;
    },
    (error) => {
      uploadStatus.textContent = "Erro no upload.";
      uploadProgress.style.display = "none";
      saveBtn.disabled = false;
      showToast("Erro ao enviar arquivo.", "danger");
      console.error("Erro upload:", error);
    },
    async () => {
      const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

      mediaUrl.value = downloadURL;
      mediaTipo.value = isVideo ? "video" : "imagem";
      currentStoragePath = storagePath;

      uploadProgressBar.style.width = "100%";
      uploadStatus.textContent = "✅ Upload concluído!";
      uploadStatus.style.color = "var(--success)";
      saveBtn.disabled = false;

      setTimeout(() => {
        uploadProgress.style.display = "none";
      }, 3000);

      showToast("Arquivo enviado com sucesso!", "success");
    }
  );
}

// ==================== FORMULÁRIO ====================

productForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!mediaUrl.value && !editingId) {
    const confirmed = confirm(
      "Você não adicionou foto ou vídeo. Deseja salvar assim mesmo?"
    );
    if (!confirmed) return;
  }

  const product = {
    nome: document.getElementById("nome").value.trim(),
    descricao: document.getElementById("descricao").value.trim(),
    preco: document.getElementById("preco").value.trim(),
    precoAntigo: document.getElementById("precoAntigo").value.trim(),
    loja: document.getElementById("loja").value.trim(),
    categoria: document.getElementById("categoria").value.trim(),
    badge: document.getElementById("badge").value.trim() || "Oferta",
    cupom: document.getElementById("cupom").value.trim(),
    emoji: document.getElementById("emoji").value.trim() || "🛍️",
    link: document.getElementById("link").value.trim(),
    destaque: document.getElementById("destaque").checked,
    ativo: document.getElementById("ativo").checked
  };

  if (mediaUrl.value) {
    product.midia = mediaUrl.value;
    product.midiaTipo = mediaTipo.value;
    product.storagePath = currentStoragePath;
  }

  try {
    if (editingId) {
      await updateDoc(doc(db, "produtos", editingId), product);
      showToast("Produto atualizado com sucesso!", "success");
    } else {
      await addDoc(collection(db, "produtos"), {
        ...product,
        criadoEm: serverTimestamp()
      });
      showToast("Produto cadastrado com sucesso!", "success");
    }

    resetForm();
    loadAdminProducts();
  } catch (error) {
    showToast("Erro ao salvar produto.", "danger");
    console.error(error);
  }
});

cancelEditBtn.addEventListener("click", () => {
  resetForm();
});

function resetForm() {
  productForm.reset();
  document.getElementById("ativo").checked = true;
  editingId = null;
  currentStoragePath = null;
  mediaUrl.value = "";
  mediaTipo.value = "";
  uploadPreview.style.display = "none";
  uploadPreview.innerHTML = "";
  uploadProgress.style.display = "none";
  uploadProgressBar.style.width = "0%";
  uploadStatus.textContent = "";
  uploadStatus.style.color = "";
  saveBtn.textContent = "Salvar produto";
  saveBtn.disabled = false;
  cancelEditBtn.classList.add("hidden");
}

// ==================== LISTAGEM ====================

async function loadAdminProducts() {
  try {
    const q = query(collection(db, "produtos"), orderBy("criadoEm", "desc"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      adminProductsList.innerHTML = `<div class="empty">Nenhum produto cadastrado.</div>`;
      updateStats(0, 0, 0);
      return;
    }

    const products = [];
    snapshot.forEach((item) => {
      products.push({ id: item.id, ...item.data() });
    });

    const total = products.length;
    const active = products.filter((p) => p.ativo !== false).length;
    const featured = products.filter((p) => p.destaque).length;

    updateStats(total, active, featured);
    renderAdminList(products);
  } catch (error) {
    adminProductsList.innerHTML = `<div class="empty">Erro: ${error.message}</div>`;
    console.error(error);
  }
}

function updateStats(total, active, featured) {
  totalProductsEl.textContent = total;
  activeProductsEl.textContent = active;
  featuredProductsEl.textContent = featured;
}

function renderAdminList(products) {
  adminProductsList.innerHTML = products
    .map(
      (product) => `
    <div class="admin-item ${!product.ativo ? "inactive" : ""}">

      ${
        product.midia
          ? product.midiaTipo === "video"
            ? `<video src="${product.midia}" style="width:100%;border-radius:10px;max-height:160px;object-fit:cover;" muted playsinline></video>`
            : `<img src="${product.midia}" style="width:100%;border-radius:10px;max-height:160px;object-fit:cover;" alt="${escapeHtml(product.nome)}">`
          : ""
      }

      <h4 style="margin-top:10px;">
        ${product.emoji || "🛍️"}
        ${escapeHtml(product.nome)}
        ${product.destaque ? "⭐" : ""}
        ${!product.ativo ? "<em>(Inativo)</em>" : ""}
      </h4>
      <p>${escapeHtml(product.descricao)}</p>
      <p><strong>Preço:</strong> ${escapeHtml(product.preco)}</p>
      ${product.precoAntigo ? `<p><strong>Preço antigo:</strong> ${escapeHtml(product.precoAntigo)}</p>` : ""}
      <p><strong>Loja:</strong> ${escapeHtml(product.loja)}</p>
      <p><strong>Categoria:</strong> ${escapeHtml(product.categoria)}</p>
      ${product.cupom ? `<p><strong>Cupom:</strong> ${escapeHtml(product.cupom)}</p>` : ""}

      <div class="top-actions" style="margin-top:10px;">
        <a href="${product.link}" target="_blank" class="btn btn-outline btn-small">Abrir link</a>
        <a href="produto.html?id=${product.id}&slug=${slugify(product.nome)}" target="_blank" class="btn btn-outline btn-small">Ver página</a>
        <button class="btn btn-primary btn-small" onclick="window.editProduct('${product.id}')">Editar</button>
        <button class="btn btn-danger btn-small" onclick="window.deleteProduct('${product.id}', '${product.storagePath || ""}')">Excluir</button>
      </div>
    </div>
  `
    )
    .join("");
}

// ==================== EDITAR ====================

window.editProduct = async function (id) {
  try {
    const snap = await getDoc(doc(db, "produtos", id));
    if (!snap.exists()) return;

    const product = snap.data();

    document.getElementById("nome").value = product.nome || "";
    document.getElementById("descricao").value = product.descricao || "";
    document.getElementById("preco").value = product.preco || "";
    document.getElementById("precoAntigo").value = product.precoAntigo || "";
    document.getElementById("loja").value = product.loja || "";
    document.getElementById("categoria").value = product.categoria || "";
    document.getElementById("badge").value = product.badge || "";
    document.getElementById("cupom").value = product.cupom || "";
    document.getElementById("emoji").value = product.emoji || "";
    document.getElementById("link").value = product.link || "";
    document.getElementById("destaque").checked = product.destaque || false;
    document.getElementById("ativo").checked = product.ativo !== false;

    if (product.midia) {
      uploadPreview.style.display = "block";
      uploadPreview.innerHTML =
        product.midiaTipo === "video"
          ? `<video src="${product.midia}" controls muted style="width:100%;max-height:260px;object-fit:cover;"></video>`
          : `<img src="${product.midia}" alt="Preview" style="width:100%;max-height:260px;object-fit:cover;">`;

      uploadStatus.textContent = "Mídia atual carregada. Selecione novo arquivo para substituir.";
      uploadStatus.style.color = "var(--muted)";
    }

    editingId = id;
    saveBtn.textContent = "Atualizar produto";
    cancelEditBtn.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
    showToast("Produto carregado para edição.", "success");
  } catch (error) {
    showToast("Erro ao carregar produto.", "danger");
    console.error(error);
  }
};

// ==================== EXCLUIR ====================

window.deleteProduct = async function (id, storagePath) {
  const confirmDelete = confirm("Tem certeza que deseja excluir este produto?");
  if (!confirmDelete) return;

  try {
    await deleteDoc(doc(db, "produtos", id));

    if (storagePath) {
      try {
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
      } catch (storageError) {
        console.warn("Não foi possível deletar mídia:", storageError);
      }
    }

    loadAdminProducts();
    showToast("Produto excluído com sucesso.", "success");
  } catch (error) {
    showToast("Erro ao excluir produto.", "danger");
    console.error(error);
  }
};

// ==================== UTILS ====================

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}