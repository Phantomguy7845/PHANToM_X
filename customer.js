// customer.js – Logic ฝั่งลูกค้า PHANToM X

// 1) ใส่ config ของ Firebase โปรเจกต์คุณตรงนี้
// ไปที่ Firebase Console → Project settings → Config → copy มาแทน {...}
const firebaseConfig = {
  // TODO: วาง config จริงของคุณตรงนี้
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

// 2) dom helper
const $ = (id) => document.getElementById(id);

const calcBtn = $("calcFareBtn");
const createBtn = $("createOrderBtn");
const fareSummary = $("fareSummary");
const errorBox = $("errorBox");
const successBox = $("successBox");

// 3) ฟังก์ชันคำนวณระยะทาง (Haversine)
function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function calcDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d; // km
}

// 4) ฟังก์ชันคำนวณค่ารอบตามเรทของคุณ
function calcFareFromDistance(distanceKm) {
  // ปัดระยะทางเป็นทศนิยม 1 ตำแหน่ง
  const d = Math.round(distanceKm * 10) / 10;

  if (d <= 0) return 0;

  if (d <= 3.5) {
    return 35;
  } else if (d <= 4.0) {
    return 40;
  } else if (d <= 7.0) {
    return 65;
  } else {
    // ตั้งแต่ 7.0 ขึ้นไป เพิ่ม 0.1 กม.ละ 1 บาท
    const over = d - 7.0;
    const steps = Math.ceil(over * 10); // จำนวน 0.1 km
    return 65 + steps * 1;
  }
}

// 5) อ่านและ validate ข้อมูลฟอร์ม
function getFormData() {
  errorBox.textContent = "";
  successBox.textContent = "";

  const senderName = $("senderName").value.trim();
  const senderPhone = $("senderPhone").value.trim();
  const receiverName = $("receiverName").value.trim();
  const receiverPhone = $("receiverPhone").value.trim();

  const pickupAddress = $("pickupAddress").value.trim();
  const dropoffAddress = $("dropoffAddress").value.trim();

  const pickupLat = parseFloat($("pickupLat").value);
  const pickupLng = parseFloat($("pickupLng").value);
  const dropoffLat = parseFloat($("dropoffLat").value);
  const dropoffLng = parseFloat($("dropoffLng").value);

  const sizeW = parseFloat($("sizeW").value);
  const sizeL = parseFloat($("sizeL").value);
  const sizeH = parseFloat($("sizeH").value);
  const weightKg = parseFloat($("weightKg").value);

  const imgFile = $("packageImage").files[0] || null;

  // ตรวจข้อมูลจำเป็น
  if (!senderName || !senderPhone || !receiverName || !receiverPhone) {
    throw new Error("กรุณากรอกชื่อและเบอร์ผู้ส่ง/ผู้รับให้ครบ");
  }

  if (
    isNaN(pickupLat) ||
    isNaN(pickupLng) ||
    isNaN(dropoffLat) ||
    isNaN(dropoffLng)
  ) {
    throw new Error("กรุณากรอกพิกัดละติจูด/ลองจิจูด จุดรับและจุดส่งให้ครบ");
  }

  if (
    isNaN(sizeW) ||
    isNaN(sizeL) ||
    isNaN(sizeH) ||
    isNaN(weightKg)
  ) {
    throw new Error("กรุณากรอกขนาดและน้ำหนักพัสดุให้ครบ");
  }

  // ตรวจเงื่อนไขขนาด/น้ำหนัก
  if (sizeW > 40 || sizeL > 40 || sizeH > 40) {
    throw new Error("ขนาดพัสดุเกิน 40×40×40 cm");
  }
  if (weightKg > 20) {
    throw new Error("น้ำหนักพัสดุเกิน 20 kg");
  }

  return {
    senderName,
    senderPhone,
    receiverName,
    receiverPhone,
    pickupAddress,
    dropoffAddress,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
    sizeW,
    sizeL,
    sizeH,
    weightKg,
    imgFile,
  };
}

// 6) คำนวณค่ารอบและแสดงผลบนจอ
function handleCalcFare() {
  try {
    const data = getFormData();
    const distanceKm = calcDistanceKm(
      data.pickupLat,
      data.pickupLng,
      data.dropoffLat,
      data.dropoffLng
    );
    const fare = calcFareFromDistance(distanceKm);

    fareSummary.innerHTML = `ระยะทาง: <span>${distanceKm.toFixed(
      1
    )}</span> กม. • ค่ารอบโดยประมาณ: <span>${fare}</span> บาท`;
  } catch (err) {
    errorBox.textContent = err.message;
  }
}

// 7) ฟังก์ชันสุ่มรหัสออเดอร์ AB1234
function generateOrderCode() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const a = letters[Math.floor(Math.random() * letters.length)];
  const b = letters[Math.floor(Math.random() * letters.length)];
  const num = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `${a}${b}${num}`;
}

// 8) สร้างออเดอร์: upload รูป (ถ้ามี) + บันทึก Firestore
async function handleCreateOrder() {
  try {
    errorBox.textContent = "";
    successBox.textContent = "";
    createBtn.disabled = true;
    createBtn.textContent = "กำลังสร้างออเดอร์...";

    const data = getFormData();

    // คำนวณระยะทาง + ค่าโดยสาร
    const distanceKm = calcDistanceKm(
      data.pickupLat,
      data.pickupLng,
      data.dropoffLat,
      data.dropoffLng
    );
    const fare = calcFareFromDistance(distanceKm);

    if (fare <= 0) {
      throw new Error("ไม่สามารถคำนวณค่ารอบได้ กรุณาตรวจสอบพิกัดอีกครั้ง");
    }

    const orderCode = generateOrderCode();

    // upload รูป ถ้ามี
    let imageUrl = null;
    if (data.imgFile) {
      const storageRef = storage.ref().child(
        `packages/${orderCode}_${Date.now()}_${data.imgFile.name}`
      );
      const snap = await storageRef.put(data.imgFile);
      imageUrl = await snap.ref.getDownloadURL();
    }

    const now = new Date();

    // บันทึก Firestore
    const orderDoc = {
      orderCode,
      status: "PENDING", // ยังไม่มีไรเดอร์รับ
      // ฝั่งลูกค้า
      customerSenderName: data.senderName,
      customerSenderPhone: data.senderPhone,
      customerReceiverName: data.receiverName,
      customerReceiverPhone: data.receiverPhone,
      // จุดรับ / ส่ง
      pickupAddress: data.pickupAddress,
      dropoffAddress: data.dropoffAddress,
      pickupLocation: {
        lat: data.pickupLat,
        lng: data.pickupLng,
      },
      dropoffLocation: {
        lat: data.dropoffLat,
        lng: data.dropoffLng,
      },
      // พัสดุ
      size: {
        w: data.sizeW,
        l: data.sizeL,
        h: data.sizeH,
      },
      weightKg: data.weightKg,
      packageImageUrl: imageUrl,
      // ระยะทาง + ค่าโดยสาร
      distanceKm: Math.round(distanceKm * 10) / 10,
      fare: fare,
      // commission จะถูกคำนวณตอนไรเดอร์จบงาน (12%)
      commission: null,
      riderNetIncome: null,
      // ยังไม่ผูกกับไรเดอร์
      riderId: null,
      // เวลา
      createdAt: now,
      updatedAt: now,
    };

    await db.collection("orders").add(orderDoc);

    successBox.textContent = `สร้างออเดอร์สำเร็จ! รหัสงานของคุณคือ ${orderCode}`;
    fareSummary.innerHTML = `ระยะทาง: <span>${orderDoc.distanceKm.toFixed(
      1
    )}</span> กม. • ค่ารอบโดยประมาณ: <span>${fare}</span> บาท`;

    // อาจจะเคลียร์ฟอร์มบางส่วน (ตามที่คุณต้องการ)
    // ที่นี่ลองเคลียร์เฉพาะรูป เพื่อให้แก้ไขข้อมูลอื่นต่อได้
    $("packageImage").value = "";
  } catch (err) {
    console.error(err);
    errorBox.textContent = err.message || "เกิดข้อผิดพลาดในการสร้างออเดอร์";
  } finally {
    createBtn.disabled = false;
    createBtn.textContent = "สร้างออเดอร์";
  }
}

// 9) ผูก event
if (calcBtn) calcBtn.addEventListener("click", handleCalcFare);
if (createBtn) createBtn.addEventListener("click", handleCreateOrder);
