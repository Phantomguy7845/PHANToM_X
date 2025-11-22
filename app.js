// app.js ของ PHANToM X

// TODO: ภายหลังคุณจะเอา firebaseConfig ของโปรเจกต์จริงมาใส่ตรงนี้
// const firebaseConfig = { ... };
// firebase.initializeApp(firebaseConfig);

// ถ้าจะใช้ Firebase v9+ แบบ modular:
// import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
// const app = initializeApp(firebaseConfig);

// ฟังก์ชันเลือกบทบาทจากหน้าแรก
function selectRole(role) {
  // role: 'customer' | 'rider' | 'admin'
  // ตอนนี้ให้ redirect แบบตรง ๆ ไปก่อน
  // ภายหลังเราจะเช็ค login / auth เพิ่มเติม

  if (role === "customer") {
    window.location.href = "customer.html";
  } else if (role === "rider") {
    window.location.href = "rider.html";
  } else if (role === "admin") {
    window.location.href = "admin.html";
  }
}

// เผื่อไว้: แนบ selectRole เข้า global scope ให้ HTML มองเห็น
window.selectRole = selectRole;
