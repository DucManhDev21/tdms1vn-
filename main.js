/* ==========================================================================
   TDMS1VN - MAIN ENGINE (SỬ DỤNG SERVICE.JS & FIREBASE REALTIME)
   ========================================================================== */

import { getServices, createOrderAPI, createDepositAPI } from './service.js';

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signInAnonymously 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  onSnapshot, 
  collection, 
  query, 
  orderBy, 
  addDoc, 
  runTransaction, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. CẤU HÌNH FIREBASE
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "tdms1vn-smm.firebaseapp.com",
  projectId: "tdms1vn-smm",
  storageBucket: "tdms1vn-smm.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 2. STATES
let currentUser = null;
let previousBalance = null;
let rawOrdersList = [];
let liveServicesList = [];
let currentSelectedService = null;

/* ==========================================================================
   3. TẢI VÀ RENDER DỊCH VỤ QUA SERVICE.JS
   ========================================================================== */

async function fetchLiveServices() {
  const categorySelect = document.getElementById("category-select");

  const result = await getServices();
  if (result.success && Array.isArray(result.data)) {
    liveServicesList = result.data;
    renderCategoriesDropdown(liveServicesList);
  } else {
    categorySelect.innerHTML = `<option value="" disabled selected>Lỗi tải dịch vụ từ SMMS1VN!</option>`;
    showToast(result.message || "Không thể lấy danh sách dịch vụ", "error");
  }
}

function renderCategoriesDropdown(services) {
  const categorySelect = document.getElementById("category-select");
  const serviceSelect = document.getElementById("service-select");

  const categories = [...new Set(services.map(s => s.category))];
  
  categorySelect.innerHTML = `<option value="" disabled selected>-- Chọn Danh Mục Dịch Vụ --</option>`;
  categories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categorySelect.appendChild(option);
  });

  categorySelect.addEventListener("change", (e) => {
    const selectedCat = e.target.value;
    const filteredServices = services.filter(s => s.category === selectedCat);

    serviceSelect.innerHTML = `<option value="" disabled selected>-- Chọn máy chủ (Server) --</option>`;
    filteredServices.forEach(srv => {
      const option = document.createElement("option");
      option.value = srv.service;
      option.textContent = `#${srv.service} - ${srv.name} [${Number(srv.rate).toLocaleString('vi-VN')}đ / 1k]`;
      serviceSelect.appendChild(option);
    });

    serviceSelect.disabled = false;
    document.getElementById("service-details-box").classList.add("hidden");
    currentSelectedService = null;
    calculateTotalPrice();
  });

  serviceSelect.addEventListener("change", (e) => {
    const serviceId = parseInt(e.target.value);
    currentSelectedService = liveServicesList.find(s => parseInt(s.service) === serviceId);

    if (currentSelectedService) {
      const rateNum = Number(currentSelectedService.rate);
      const minNum = Number(currentSelectedService.min);
      const maxNum = Number(currentSelectedService.max);

      document.getElementById("service-rate").innerText = `${rateNum.toLocaleString('vi-VN')} đ / 1.000`;
      document.getElementById("service-min-max").innerText = `Min: ${minNum.toLocaleString('vi-VN')} | Max: ${maxNum.toLocaleString('vi-VN')}`;
      document.getElementById("service-description").innerText = currentSelectedService.desc || `Loại: ${currentSelectedService.type} - Refill: ${currentSelectedService.refill ? 'Có' : 'Không'}`;
      
      const quantityInput = document.getElementById("order-quantity");
      quantityInput.min = minNum;
      quantityInput.placeholder = `Tối thiểu ${minNum.toLocaleString('vi-VN')}`;
      
      document.getElementById("service-details-box").classList.remove("hidden");
      calculateTotalPrice();
    }
  });
}

/* ==========================================================================
   4. UI TOAST & SỐ DƯ
   ========================================================================== */

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  const icon = type === "success" ? "fa-circle-check text-emerald-400" : "fa-triangle-exclamation text-rose-400";
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function updateBalanceUI(newBalance) {
  const element = document.getElementById("user-balance");
  if (!element) return;

  if (previousBalance === null) {
    element.innerText = newBalance.toLocaleString('vi-VN');
    previousBalance = newBalance;
    return;
  }

  if (previousBalance === newBalance) return;

  animateBalanceNumber("user-balance", previousBalance, newBalance, 1200);
  previousBalance = newBalance;
}

function animateBalanceNumber(elementId, startValue, endValue, duration) {
  const element = document.getElementById(elementId);
  if (!element) return;
  let startTime = null;

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const current = Math.floor(progress * (endValue - startValue) + startValue);
    element.innerText = current.toLocaleString('vi-VN');

    if (progress < 1) window.requestAnimationFrame(step);
  }
  window.requestAnimationFrame(step);
}

/* ==========================================================================
   5. TẠO ĐƠN HÀNG HỆ THỐNG
   ========================================================================== */

function calculateTotalPrice() {
  const quantityInput = document.getElementById("order-quantity");
  const totalPriceElement = document.getElementById("total-price");
  const quantity = parseInt(quantityInput.value) || 0;

  if (currentSelectedService && quantity > 0) {
    const total = Math.ceil((quantity / 1000) * Number(currentSelectedService.rate));
    totalPriceElement.innerText = total.toLocaleString('vi-VN');
  } else {
    totalPriceElement.innerText = "0";
  }
}

async function handleOrderSubmit(e) {
  e.preventDefault();

  const linkInput = document.getElementById("order-link");
  const quantityInput = document.getElementById("order-quantity");
  const submitBtn = document.getElementById("btn-submit-order");

  const targetLink = linkInput.value.trim();
  const quantity = parseInt(quantityInput.value) || 0;

  if (!currentSelectedService) {
    showToast("Vui lòng chọn dịch vụ trước!", "error");
    return;
  }
  if (!targetLink) {
    showToast("Vui lòng nhập Link hoặc ID!", "error");
    return;
  }
  if (quantity < Number(currentSelectedService.min)) {
    showToast(`Số lượng tối thiểu là ${Number(currentSelectedService.min).toLocaleString('vi-VN')}`, "error");
    return;
  }

  const totalPrice = Math.ceil((quantity / 1000) * Number(currentSelectedService.rate));

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...`;

  try {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists() || (userSnap.data().balance || 0) < totalPrice) {
      throw new Error("Số dư tài khoản không đủ!");
    }

    // Gửi API tạo đơn qua service.js
    const result = await createOrderAPI({
      serviceId: currentSelectedService.service,
      serviceName: currentSelectedService.name,
      link: targetLink,
      quantity: quantity,
      totalPrice: totalPrice,
      userId: currentUser.uid
    });

    if (!result.success) throw new Error(result.message || 'Lỗi tạo đơn!');

    const providerOrderId = result.providerOrderId;

    // Trừ tiền Firestore Transaction
    await runTransaction(db, async (transaction) => {
      const freshUserDoc = await transaction.get(userRef);
      const currentBalance = freshUserDoc.data().balance || 0;

      if (currentBalance < totalPrice) throw new Error("Số dư không đủ!");

      transaction.update(userRef, {
        balance: currentBalance - totalPrice,
        totalSpent: (freshUserDoc.data().totalSpent || 0) + totalPrice,
        totalOrders: (freshUserDoc.data().totalOrders || 0) + 1
      });

      const ordersRef = collection(db, "users", currentUser.uid, "orders");
      const internalOrderId = "TDMS" + Math.floor(100000 + Math.random() * 900000);

      await addDoc(ordersRef, {
        orderId: internalOrderId,
        providerOrderId: providerOrderId,
        serviceName: currentSelectedService.name,
        targetLink: targetLink,
        quantity: quantity,
        totalPrice: totalPrice,
        status: "Pending",
        createdAt: serverTimestamp()
      });
    });

    showToast(`Tạo đơn thành công! (Mã gốc SMMS1VN: #${providerOrderId})`, "success");
    linkInput.value = "";
    quantityInput.value = "";
    calculateTotalPrice();

  } catch (error) {
    showToast(error.message || "Lỗi tạo đơn hàng!", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="fa-solid fa-cart-shopping"></i> THANH TOÁN ĐƠN HÀNG`;
  }
}

/* ==========================================================================
   6. YÊU CẦU NẠP TIỀN VIA SERVICE.JS
   ========================================================================== */

async function handleDepositSubmit(e) {
  e.preventDefault();

  const amountInput = document.getElementById("deposit-amount-input");
  const memoInput = document.getElementById("deposit-memo-input");
  const submitBtn = document.getElementById("btn-submit-deposit");

  const amount = parseInt(amountInput.value) || 0;
  const memo = memoInput.value.trim() || `TDMS${currentUser.uid.slice(0,6)}`;

  if (amount < 10000) {
    showToast("Nạp tối thiểu 10.000 VNĐ!", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi...`;

  try {
    const depositsRef = collection(db, "users", currentUser.uid, "deposits");
    await addDoc(depositsRef, {
      depositId: "DEP" + Math.floor(100000 + Math.random() * 900000),
      amount: amount,
      transferCode: memo,
      status: "Pending",
      createdAt: serverTimestamp()
    });

    // Bắn thông báo qua service.js
    await createDepositAPI({
      userId: currentUser.uid,
      amount: amount,
      transferCode: memo,
      bankName: "MBBank / Thẻ Cào"
    });

    showToast("Đã gửi yêu cầu nạp tiền!", "success");
    document.getElementById("deposit-modal").classList.add("hidden");
    amountInput.value = "";
    memoInput.value = "";

  } catch (error) {
    showToast(error.message || "Lỗi gửi yêu cầu!", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> XÁC NHẬN ĐÃ CHUYỂN KHOẢN`;
  }
}

/* ==========================================================================
   7. LỜI GỌI REALTIME FIRESTORE & FILTER BẢNG
   ========================================================================== */

function listenToUserProfile(userId) {
  const userRef = doc(db, "users", userId);
  onSnapshot(userRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      updateBalanceUI(data.balance || 0);

      document.getElementById("total-spent-amount").innerText = (data.totalSpent || 0).toLocaleString('vi-VN') + " đ";
      document.getElementById("total-orders-count").innerText = (data.totalOrders || 0).toLocaleString('vi-VN');
      document.getElementById("user-display-name").innerText = data.displayName || `User_${userId.slice(0,5)}`;
    }
  });
}

function listenToUserOrders(userId) {
  const ordersRef = collection(db, "users", userId, "orders");
  const q = query(ordersRef, orderBy("createdAt", "desc"));

  onSnapshot(q, (snapshot) => {
    rawOrdersList = [];
    snapshot.forEach(docSnap => rawOrdersList.push({ id: docSnap.id, ...docSnap.data() }));
    filterAndRenderOrders();
  });
}

function filterAndRenderOrders() {
  const searchKey = document.getElementById("search-order-input").value.toLowerCase().trim();
  const filterStatus = document.getElementById("filter-status-select").value;

  const filtered = rawOrdersList.filter(order => {
    const matchSearch = (order.orderId && order.orderId.toLowerCase().includes(searchKey)) ||
                        (order.targetLink && order.targetLink.toLowerCase().includes(searchKey));
    const matchStatus = filterStatus === "all" || order.status === filterStatus;
    return matchSearch && matchStatus;
  });

  renderOrdersTable(filtered);
}

function renderOrdersTable(orders) {
  const tableBody = document.getElementById("orders-table-body");
  if (!tableBody) return;

  if (orders.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-500">Chưa có đơn hàng phù hợp.</td></tr>`;
    return;
  }

  tableBody.innerHTML = orders.map(order => {
    const timeStr = order.createdAt ? new Date(order.createdAt.toDate()).toLocaleString('vi-VN') : 'Mới tạo';
    let badgeClass = "badge-pending";
    let statusText = "Chờ xử lý";

    switch(order.status) {
      case "Processing": badgeClass = "badge-processing"; statusText = "Đang chạy"; break;
      case "Completed": badgeClass = "badge-completed"; statusText = "Hoàn thành"; break;
      case "Canceled": badgeClass = "badge-canceled"; statusText = "Đã hủy"; break;
    }

    return `
      <tr class="hover:bg-slate-700/30">
        <td class="p-3 font-semibold text-indigo-400">
          #${order.orderId}
          ${order.providerOrderId ? `<br><small class="text-slate-500 font-normal">Gốc: #${order.providerOrderId}</small>` : ''}
        </td>
        <td class="p-3 text-xs text-slate-400">${timeStr}</td>
        <td class="p-3 font-medium">${order.serviceName}</td>
        <td class="p-3"><a href="${order.targetLink}" target="_blank" class="text-indigo-400 hover:underline flex items-center gap-1"><i class="fa-solid fa-arrow-up-right-from-square text-xs"></i> Xem link</a></td>
        <td class="p-3 font-bold">${order.quantity.toLocaleString('vi-VN')}</td>
        <td class="p-3 text-emerald-400 font-semibold">${order.totalPrice.toLocaleString('vi-VN')} đ</td>
        <td class="p-3"><span class="badge-status ${badgeClass}">${statusText}</span></td>
      </tr>
    `;
  }).join('');
}

/* ==========================================================================
   8. KHỞI CHẠY APP
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  fetchLiveServices();

  document.getElementById("order-quantity").addEventListener("input", calculateTotalPrice);
  document.getElementById("smm-order-form").addEventListener("submit", handleOrderSubmit);
  document.getElementById("deposit-form").addEventListener("submit", handleDepositSubmit);

  // Lắng nghe lọc đơn hàng
  document.getElementById("search-order-input").addEventListener("input", filterAndRenderOrders);
  document.getElementById("filter-status-select").addEventListener("change", filterAndRenderOrders);

  // Modal events
  const modal = document.getElementById("deposit-modal");
  document.getElementById("btn-quick-deposit")?.addEventListener("click", () => modal.classList.remove("hidden"));
  document.getElementById("btn-nav-deposit")?.addEventListener("click", () => modal.classList.remove("hidden"));
  document.getElementById("btn-close-modal")?.addEventListener("click", () => modal.classList.add("hidden"));

  // Firebase Auth
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      listenToUserProfile(user.uid);
      listenToUserOrders(user.uid);
    } else {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Firebase Auth Error:", err);
      }
    }
  });
});
