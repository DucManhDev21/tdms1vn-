// XỬ LÝ ĐỔI MAN HINH (VIEW ROUTING)
function switchView(sectionId) {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    const target = document.getElementById(sectionId);
    if(target) target.classList.add('active');
    closeSidebar();
}

// SIDEBAR TOGGLE
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');

document.getElementById('open-sidebar-btn').addEventListener('click', () => {
    sidebar.classList.add('open');
    overlay.classList.add('show');
});

function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
}
document.getElementById('close-sidebar-btn').addEventListener('click', closeSidebar);
overlay.addEventListener('click', closeSidebar);

// TÍNH TỔNG TIỀN THEO TỐC ĐỘ THỜI GIAN THỰC (CHUẨN VIDEO 2)
const qtyInput = document.getElementById('order-qty-input');
if(qtyInput) {
    qtyInput.addEventListener('input', () => {
        const qty = parseInt(qtyInput.value) || 0;
        document.getElementById('summary-qty-num').innerText = qty;
        
        // Giả lập tính toán đơn giá Server 2440 (73,306đ / 1000)
        const total = Math.round((73306 / 1000) * qty);
        document.getElementById('total-price-num').innerText = `${total.toLocaleString('vi-VN')} VNĐ`;
    });
}

// BẬT POPUP BÁO LỖI KHI TẠO ĐƠN THIẾU LINK (GIỐNG HỆT VIDEO 2)
document.getElementById('btn-create-order').addEventListener('click', () => {
    const link = document.getElementById('order-link-input').value.trim();
    if(!link) {
        document.getElementById('error-modal').classList.remove('hidden');
    } else {
        alert("Đơn hàng đang được khởi tạo!");
    }
});

document.getElementById('modal-confirm-btn').addEventListener('click', () => {
    document.getElementById('error-modal').classList.add('hidden');
});

// SUB-TABS TRANG NẠP TIỀN
document.getElementById('tab-bank-btn').addEventListener('click', function() {
    this.classList.add('active');
    document.getElementById('tab-card-btn').classList.remove('active');
    document.getElementById('recharge-bank-view').classList.remove('hidden');
    document.getElementById('recharge-card-view').classList.add('hidden');
});

document.getElementById('tab-card-btn').addEventListener('click', function() {
    this.classList.add('active');
    document.getElementById('tab-bank-btn').classList.remove('active');
    document.getElementById('recharge-card-view').classList.remove('hidden');
    document.getElementById('recharge-bank-view').classList.add('hidden');
});

// SUB-TABS TRANG PROFILE / BẢO MẬT
document.getElementById('tab-profile-btn').addEventListener('click', function() {
    this.classList.add('active');
    document.getElementById('tab-security-btn').classList.remove('active');
    document.getElementById('profile-info-tab').classList.remove('hidden');
    document.getElementById('profile-security-tab').classList.add('hidden');
});

document.getElementById('tab-security-btn').addEventListener('click', function() {
    this.classList.add('active');
    document.getElementById('tab-profile-btn').classList.remove('active');
    document.getElementById('profile-security-tab').classList.remove('hidden');
    document.getElementById('profile-info-tab').classList.add('hidden');
});
