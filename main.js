import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 1. CẤU HÌNH FIREBASE CLIENT & BACKEND URL
// Thay thế cấu hình Firebase của bạn vào đây
const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456...",
    appId: "1:1234..."
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Thay URL này bằng Domain Backend Railway của bạn
const BACKEND_URL = "https://your-backend-url.up.railway.app"; 

// Biến toàn cục lưu danh sách dịch vụ
let globalServices = [];

// DOM Elements
const loginSection = document.getElementById('login-section');
const appSection = document.getElementById('app-section');
const userInfo = document.getElementById('user-info');
const userEmailText = document.getElementById('user-email');

// 2. XỬ LÝ XÁC THỰC (AUTH)
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginSection.classList.add('hidden');
        appSection.classList.remove('hidden');
        userInfo.classList.remove('hidden');
        userEmailText.innerText = user.email;
        loadServices(); // Tải danh sách dịch vụ khi đăng nhập thành công
    } else {
        loginSection.classList.remove('hidden');
        appSection.classList.add('hidden');
        userInfo.classList.add('hidden');
    }
});

// Đăng nhập
document.getElementById('login-btn').addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    signInWithEmailAndPassword(auth, email, password)
        .catch(error => showMessage('auth-error', 'Lỗi đăng nhập: ' + error.message, true));
});

// Đăng ký
document.getElementById('register-btn').addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    createUserWithEmailAndPassword(auth, email, password)
        .then(() => alert("Đăng ký thành công! (Vui lòng cấu hình Backend để nạp số dư ban đầu cho tài khoản này)"))
        .catch(error => showMessage('auth-error', 'Lỗi đăng ký: ' + error.message, true));
});

// Đăng xuất
document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth);
});

// 3. XỬ LÝ LẤY DỊCH VỤ & TÍNH TIỀN
async function loadServices() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/services`);
        globalServices = await response.json();
        
        // Nhóm dịch vụ theo Category
        const categories = [...new Set(globalServices.map(s => s.category))];
        const categorySelect = document.getElementById('category');
        categorySelect.innerHTML = '<option value="">-- Chọn danh mục --</option>';
        
        categories.forEach(cat => {
            categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
    } catch (error) {
        alert("Không thể tải danh sách dịch vụ từ hệ thống.");
    }
}

// Khi khách hàng đổi danh mục
document.getElementById('category').addEventListener('change', (e) => {
    const selectedCat = e.target.value;
    const serviceSelect = document.getElementById('service');
    
    const filteredServices = globalServices.filter(s => s.category === selectedCat);
    serviceSelect.innerHTML = '<option value="">-- Chọn dịch vụ --</option>';
    
    filteredServices.forEach(s => {
        serviceSelect.innerHTML += `<option value="${s.service}">${s.name} - Giá: ${s.rate} / 1000</option>`;
    });
});

// Khi khách hàng đổi dịch vụ hoặc số lượng -> Tính lại giá
const calculatePrice = () => {
    const serviceId = document.getElementById('service').value;
    const quantity = parseInt(document.getElementById('quantity').value) || 0;
    
    if(!serviceId) return;

    const service = globalServices.find(s => s.service == serviceId);
    if(service) {
        document.getElementById('qty-limit-hint').innerText = `Tối thiểu: ${service.min} - Tối đa: ${service.max}`;
        // Tính giá = (Giá báo / 1000) * Số lượng
        const total = (parseFloat(service.rate) / 1000) * quantity;
        document.getElementById('total-price').innerText = `${total.toLocaleString()} VNĐ`;
    }
};

document.getElementById('service').addEventListener('change', calculatePrice);
document.getElementById('quantity').addEventListener('input', calculatePrice);

// 4. GỬI ĐƠN HÀNG (SỬ DỤNG ID TOKEN)
document.getElementById('order-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-order-btn');
    submitBtn.disabled = true;
    submitBtn.innerText = "ĐANG XỬ LÝ...";

    try {
        // Lấy Token xác thực mới nhất từ Firebase (Bảo mật tối đa)
        const idToken = await auth.currentUser.getIdToken(true);
        
        const payload = {
            service: document.getElementById('service').value,
            link: document.getElementById('link').value,
            quantity: document.getElementById('quantity').value
        };

        const response = await fetch(`${BACKEND_URL}/api/order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}` // Truyền Token vào Header
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error || "Đã xảy ra lỗi");
        
        showMessage('order-status-msg', `✅ Đặt hàng thành công! Mã đơn: ${data.orderId}`, false);
        document.getElementById('order-form').reset();
        document.getElementById('total-price').innerText = "0 VNĐ";

    } catch (error) {
        showMessage('order-status-msg', `❌ ${error.message}`, true);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "TIẾN HÀNH ĐẶT ĐƠN";
    }
});

// Hàm hiển thị thông báo UI
function showMessage(elementId, msg, isError) {
    const el = document.getElementById(elementId);
    el.innerText = msg;
    el.className = isError ? 'error-msg' : 'success-msg';
}
