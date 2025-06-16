let kriteria = [];
let siswa = [];

const BASE_URL = "http://127.0.0.1:8080";


async function muatKriteriaDariBackend() {
  const response = await fetch(`${BASE_URL}/kriteria`);
  const data = await response.json();
  kriteria = data;
  tampilkanKriteria();
  tampilkanTabelSiswa(); // sinkron tabel siswa dengan kriteria
}

function tampilkanKriteria() {
  const tbody = document.getElementById("tabelKriteria");
  tbody.innerHTML = "";
  kriteria.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.nama}</td>
      <td>
        <input type="number" step="0.01" min="0" max="1" 
               value="${item.bobot ?? ''}" 
               onchange="ubahBobot(${item.id}, this.value)">
      </td>
      <td>
        <button onclick="hapusKriteria(${item.id})">Hapus</button>
      </td>`;
    tbody.appendChild(row);
  });
  simpanBobot();
}

async function tambahKriteria() {
  const nama = document.getElementById("namaKriteria").value.trim();
  if (!nama) return alert("Nama kriteria tidak boleh kosong.");

  const response = await fetch(`${BASE_URL}/kriteria`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nama, bobot: 0 })
  });

  if (!response.ok) {
    const res = await response.json();
    alert(res.error || "Gagal menambah kriteria.");
    return;
  }

  document.getElementById("namaKriteria").value = "";
  await muatKriteriaDariBackend();
}

async function hapusSiswa(id) {
  if (!confirm("Yakin ingin menghapus siswa ini?")) return;

  const res = await fetch(`${BASE_URL}/siswa/${id}`, {
    method: "DELETE"
  });

  if (!res.ok) {
    const err = await res.json();
    alert(err.error || "Gagal menghapus siswa.");
    return;
  }

  await muatSiswaDariBackend();
}


async function ubahBobot(id, bobot) {
  const bobotAngka = parseFloat(bobot);
  if (isNaN(bobotAngka) || bobotAngka < 0 || bobotAngka > 1) {
    alert("Bobot harus antara 0 dan 1.");
    return;
  }

  await fetch(`${BASE_URL}/kriteria/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bobot: bobotAngka })
  });

  await muatKriteriaDariBackend();
}

async function hapusKriteria(id) {
  if (!confirm("Yakin ingin menghapus kriteria ini?")) return;
  await fetch(`${BASE_URL}/kriteria/${id}`, { method: "DELETE" });
  await muatKriteriaDariBackend();
}

function simpanBobot() {
  const total = kriteria.reduce((sum, k) => sum + (k.bobot ?? 0), 0);
  const pesan = document.getElementById("pesan");

  if (kriteria.length === 0) {
    pesan.innerHTML = "<span style='color:red;'>Tidak ada kriteria.</span>";
    return;
  }

  if (kriteria.some(k => k.bobot == null)) {
    pesan.innerHTML = "<span style='color:red;'>Semua bobot harus diisi.</span>";
    return;
  }

  if (Math.abs(total - 1) > 0.001) {
    pesan.innerHTML = `<span style='color:red;'>Total bobot harus 1 (saat ini: ${total.toFixed(2)}).</span>`;
    return;
  }

  pesan.innerHTML = "<span style='color:green;'>Bobot valid ✅</span>";
}

// ============================
// Siswa
// ============================

async function muatSiswaDariBackend() {
  const res = await fetch(`${BASE_URL}/siswa`);
  const data = await res.json();
  siswa = data.map(s => ({
    id: s.id,
    nama: s.nama,
    nilai: s.nilai
  }));
  tampilkanTabelSiswa();
}

async function tambahSiswa() {
  const nama = document.getElementById("namaSiswa").value.trim();
  if (!nama) return alert("Nama siswa tidak boleh kosong.");
  if (siswa.some(s => s.nama.toLowerCase() === nama.toLowerCase())) {
    alert("Nama siswa sudah ada.");
    return;
  }

  const nilai = {};
  kriteria.forEach(k => nilai[k.nama] = "");

  const res = await fetch(`${BASE_URL}/siswa`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ nama, nilai })
  });
  if (!res.ok) {
    const err = await res.json();
    alert(err.error || "Gagal menambah siswa.");
    return;
  }
  const sBaru = await res.json();
  siswa.push({ id: sBaru.id, nama: sBaru.nama, nilai: sBaru.nilai });

  document.getElementById("namaSiswa").value = "";
  tampilkanTabelSiswa();
}

async function ubahNilai(namaSiswa, namaKriteria, nilai) {
  const s = siswa.find(s => s.nama === namaSiswa);
  if (!s) return;
  s.nilai[namaKriteria] = parseFloat(nilai);

  await fetch(`${BASE_URL}/siswa/${s.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nama: s.nama, nilai: s.nilai })
  });
}

function tampilkanTabelSiswa() {
  const container = document.getElementById("tabelSiswaContainer");
  if (kriteria.length === 0) {
    container.innerHTML = "<i>Tambahkan kriteria terlebih dahulu.</i>";
    return;
  }

  let html = `<table border="1"><thead><tr><th>Nama</th>`;
  kriteria.forEach(k => html += `<th>${k.nama}</th>`);
  html += `<th>Aksi</th></tr></thead><tbody>`;
  
  siswa.forEach(s => {
    html += `<tr><td>${s.nama}</td>`;
    kriteria.forEach(k => {
      const nilai = s.nilai[k.nama] ?? "";
      html += `<td><input type="number" min="0" max="100" value="${nilai}" 
                        onchange="ubahNilai('${s.nama}', '${k.nama}', this.value)"></td>`;
    });
    html += `<td><button onclick="hapusSiswa(${s.id})">Hapus</button></td></tr>`;
  });
  

  html += `</tbody></table><br><button onclick="hitungSAW()">Hitung SAW</button>
           <div id="hasilSAW" style="margin-top: 20px;"></div>`;
  container.innerHTML = html;
}

// ============================
// SAW
// ============================

function hitungSAW() {
  const hasilContainer = document.getElementById("hasilSAW");
  if (siswa.length === 0) {
    alert("Belum ada siswa.");
    return;
  }

  const totalBobot = kriteria.reduce((sum, k) => sum + (k.bobot ?? 0), 0);
  if (Math.abs(totalBobot - 1) > 0.001) {
    alert("Total bobot harus 1.");
    return;
  }

  // Ambil nilai tiap kriteria untuk tiap siswa
  let nilaiPerKriteria = {};
    kriteria.forEach(k => {
      nilaiPerKriteria[k.nama] = siswa.map(s => s.nilai[k.nama]);
    });

    // Cari nilai minimum tiap kriteria (normalisasi pembagi)
    let minNilai = {};
    kriteria.forEach(k => {
      minNilai[k.nama] = Math.min(...nilaiPerKriteria[k.nama].filter(v => !isNaN(v) && v > 0));
  });

  // Tabel 1: Detail normalisasi per kriteria per siswa
let hasilHTML1 = `<h3>Detail Normalisasi SAW</h3><table border="1" style="border-collapse:collapse; text-align:center;">
    <thead>
      <tr>
        <th>DATA</th>`;
  kriteria.forEach(k => {
    hasilHTML1 += `<th>${k.nama}</th>`;
  });
  hasilHTML1 += `</tr><tr><th>BOBOT</th>`;
  kriteria.forEach(k => {
    hasilHTML1 += `<th>${(k.bobot * 100).toFixed(0)}%</th>`;
  });
  hasilHTML1 += `</tr></thead><tbody>`;

  // Hitung skor total untuk ranking nanti
  let hasilSkor = [];

  for (const s of siswa) {
    hasilHTML1 += `<tr><td style="text-align:left;">${s.nama}</td>`;
    let totalSkor = 0;
    for (let k of kriteria) {
      const nilai = s.nilai[k.nama];
      if (isNaN(nilai) || nilai <= 0 || nilai > 100) {
        alert(`Nilai ${k.nama} pada ${s.nama} tidak valid.`);
        hasilContainer.innerHTML = "";
        return;
      }
      const normalisasi = minNilai[k.nama] / nilai;
      hasilHTML1 += `<td>${normalisasi.toFixed(9).replace('.', ',')}</td>`;
      totalSkor += normalisasi * k.bobot;
    }
    hasilHTML1 += `</tr>`;
    hasilSkor.push({ nama: s.nama, skor: totalSkor });
  }
  hasilHTML1 += `</tbody></table>`;

  // Urutkan skor descending untuk ranking
  hasilSkor.sort((a, b) => b.skor - a.skor);

  // Hitung ranking dengan handling tied values
  const skorRankMap = {};
  let i = 0;

  while (i < hasilSkor.length) {
    const currentSkor = hasilSkor[i].skor;
    const group = [hasilSkor[i]];
    let j = i + 1;

    while (j < hasilSkor.length && Math.abs(hasilSkor[j].skor - currentSkor) < 0.000001) {
      group.push(hasilSkor[j]);
      j++;
    }

    // Hitung rata-rata ranking dari posisi i+1 hingga j
    const rank = ((i + 1) + (j)) / 2;

    group.forEach(item => {
      skorRankMap[item.nama] = { skor: item.skor, rank: rank };
    });

    i = j;
  }


  // Tabel 2: Total dan Ranking
let hasilHTML2 = `<h3>Ranking SAW</h3><table border="1" style="border-collapse:collapse; text-align:center;">
    <thead><tr><th>ALTERNATIVE</th><th>TOTAL</th><th>RANGKING</th></tr></thead><tbody>`;

const hasilUrutRanking = Object.entries(skorRankMap)
  .map(([nama, { skor, rank }]) => ({ nama, skor, rank }))
  .sort((a, b) => a.rank - b.rank);

hasilUrutRanking.forEach(({ nama, skor, rank }) => {
  hasilHTML2 += `<tr>
    <td style="text-align:left;">${nama}</td>
    <td>${skor.toFixed(9).replace('.', ',')}</td>
    <td>${rank}</td>
  </tr>`;
});


hasilHTML2 += `</tbody></table>`;

hasilContainer.innerHTML = hasilHTML1 + "<br>" + hasilHTML2;
}


// ============================
// Init
// ============================

window.onload = function () {
  muatKriteriaDariBackend();
  muatSiswaDariBackend();
};

function toggleSidebar() {
  document.body.classList.toggle('toggled');
}

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('sidebar') === 'show') {
    document.body.classList.add('show-sidebar');
  }

  document.querySelector('.toggle-btn').addEventListener('click', () => {
    document.body.classList.toggle('show-sidebar');
    const isShown = document.body.classList.contains('show-sidebar');
    localStorage.setItem('sidebar', isShown ? 'show' : 'hide');
  });
});


