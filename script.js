/* Shared logic for pembayaran-umm-final */

/* Utilities */
function formatRp(n){ return 'Rp ' + Number(n).toLocaleString('id-ID'); }
function rndCode(len=12){ let s=''; const chars='0123456789'; for(let i=0;i<len;i++) s += chars.charAt(Math.floor(Math.random()*chars.length)); return s; }

/* Data init: payments per user stored in localStorage under key 'umm_payments' and history in 'umm_history' */
function initDataIfEmpty(){
  if(!localStorage.getItem('umm_payments')){
    const obj = {};
    // single user only (wahyu). Key by nim
    const nim = '20231037031103';
    obj[nim] = { SPP: [], DPP: [] };
    for(let i=1;i<=14;i++){
      obj[nim].SPP.push({ id: `SPP-${i}`, semester: i, amount: 2900000, paid: false, paidAmount: 0, pendingPaid: 0 });
      obj[nim].DPP.push({ id: `DPP-${i}`, semester: i, amount: 4850000, paid: false, paidAmount: 0, pendingPaid: 0 });
    }
    localStorage.setItem('umm_payments', JSON.stringify(obj));
  }
  if(!localStorage.getItem('umm_history')) localStorage.setItem('umm_history', JSON.stringify([]));
}
initDataIfEmpty();

/* ---------- pembayaran.html logic ---------- */
if(location.pathname.endsWith('pembayaran.html')){
  const userName = localStorage.getItem('user_name') || 'Wahyu Denta Fahrezi';
  const userNim = localStorage.getItem('user_nim') || '20231037031103';
  document.getElementById('userNameTop').textContent = userName;
  document.getElementById('userNimTop').textContent = userNim;

  const data = JSON.parse(localStorage.getItem('umm_payments'));
  const my = data[userNim];

  const sppTable = document.getElementById('sppTable');
  const dppTable = document.getElementById('dppTable');

  function render(){
    sppTable.innerHTML = '';
    dppTable.innerHTML = '';

    my.SPP.forEach(item => {
      const kek = Math.max(0, item.amount - item.paidAmount - (item.pendingPaid || 0));
      const status = item.paid ? '<span class="badge-paid">Sudah Dibayar</span>' : '<span class="badge-pending">Belum Dibayar</span>';
      const aksi = item.paid ? '' : `<button class="payBtn bg-maroon text-white px-3 py-1 rounded btn" data-type="SPP" data-id="${item.id}" data-amount="${item.amount}" data-sem="${item.semester}">Bayar</button>`;
      sppTable.innerHTML += `<tr class="text-sm"><td class="p-3 border text-center">Semester ${item.semester}</td><td class="p-3 border text-center">${formatRp(item.amount)}</td><td class="p-3 border text-center">${formatRp(kek)}</td><td class="p-3 border text-center">${status}</td><td class="p-3 border text-center">${aksi}</td></tr>`;
    });

    my.DPP.forEach(item => {
      const kek = Math.max(0, item.amount - item.paidAmount - (item.pendingPaid || 0));
      const status = item.paid ? '<span class="badge-paid">Sudah Dibayar</span>' : '<span class="badge-pending">Belum Dibayar</span>';
      const aksi = item.paid ? '' : `<button class="payBtn bg-maroon text-white px-3 py-1 rounded btn" data-type="DPP" data-id="${item.id}" data-amount="${item.amount}" data-sem="${item.semester}">Bayar</button>`;
      dppTable.innerHTML += `<tr class="text-sm"><td class="p-3 border text-center">Semester ${item.semester}</td><td class="p-3 border text-center">${formatRp(item.amount)}</td><td class="p-3 border text-center">${formatRp(kek)}</td><td class="p-3 border text-center">${status}</td><td class="p-3 border text-center">${aksi}</td></tr>`;
    });
  }

  render();

  // logout
  document.getElementById('logoutBtn').addEventListener('click', ()=>{
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_nim');
    window.location.href = 'index.html';
  });

  // delegation for Pay buttons
  document.addEventListener('click', function(e){
    const btn = e.target.closest('.payBtn');
    if(!btn) return;
    const type = btn.getAttribute('data-type');
    const id = btn.getAttribute('data-id');
    const amount = Number(btn.getAttribute('data-amount'));
    const sem = btn.getAttribute('data-sem');
    // store selected info to localStorage for konfirmasi page
    localStorage.setItem('selected_payment', JSON.stringify({ type, id, sem, amount }));
    window.location.href = 'konfirmasi.html';
  });
}

/* ---------- konfirmasi.html logic ---------- */
if(location.pathname.endsWith('konfirmasi.html')){
  const userName = localStorage.getItem('user_name') || 'Wahyu Denta Fahrezi';
  const userNim = localStorage.getItem('user_nim') || '20231037031103';
  document.getElementById('userNameTopC').textContent = userName;
  document.getElementById('userNimTopC').textContent = userNim;

  const sel = JSON.parse(localStorage.getItem('selected_payment') || 'null');
  if(!sel){
    alert('Tidak ada pembayaran yang dipilih. Kembali ke halaman pembayaran.');
    window.location.href = 'pembayaran.html';
  } else {
    document.getElementById('itemLabel').textContent = sel.type;
    document.getElementById('itemSem').textContent = sel.sem;
    document.getElementById('itemTotal').textContent = formatRp(sel.amount);
    document.getElementById('kodeBayar').textContent = rndCode(12);
  }

  document.getElementById('confirmBtn').addEventListener('click', ()=>{
    const bank = document.getElementById('bankSelect').value;
    const nominal = Number(document.getElementById('inputNominal').value.trim());
    if(!bank){
      return alert('Pilih bank / metode terlebih dahulu.');
    }
    if(!nominal || nominal <= 0){
      return alert('Masukkan nominal pembayaran (angka) terlebih dahulu!');
    }
    // create history entry with status Menunggu Konfirmasi Admin
    const history = JSON.parse(localStorage.getItem('umm_history') || '[]');
    const rec = {
      id: 'H_'+Date.now(),
      nim: userNim,
      name: userName,
      type: sel.type,
      semester: sel.sem,
      amount: nominal,
      targetAmount: sel.amount,
      itemId: sel.id,
      bank,
      status: 'Menunggu Konfirmasi Admin',
      createdAt: new Date().toISOString()
    };
    history.push(rec);
    localStorage.setItem('umm_history', JSON.stringify(history));
    // also mark temporary pendingPaid for display (but not set paid true until admin approves)
    const payments = JSON.parse(localStorage.getItem('umm_payments'));
    const userList = payments[userNim];
    const listArr = sel.type === 'SPP' ? userList.SPP : userList.DPP;
    const it = listArr.find(x => x.id === sel.id);
    if(it){
      it.pendingPaid = (it.pendingPaid || 0) + nominal;
      localStorage.setItem('umm_payments', JSON.stringify(payments));
    }
    document.getElementById('afterNote').classList.remove('hidden');
    // clear selected
    localStorage.removeItem('selected_payment');
  });
}

/* ---------- admin.html logic ---------- */
if(location.pathname.endsWith('admin.html')){
  const adminLoginBtn = document.getElementById('adminLogin');
  const adminArea = document.getElementById('adminArea');
  adminLoginBtn.addEventListener('click', ()=>{
    const user = document.getElementById('adminUser').value.trim();
    const pass = document.getElementById('adminPass').value.trim();
    if(user === 'admin' && pass === '12345'){
      // show admin area
      adminArea.classList.remove('hidden');
      document.getElementById('adminLogin').style.display = 'none';
      renderAdminList();
    } else alert('Username atau password admin salah.');
  });

  function renderAdminList(){
    const list = document.getElementById('paymentsList');
    list.innerHTML = '';
    const history = JSON.parse(localStorage.getItem('umm_history') || '[]');
    if(history.length === 0){
      list.innerHTML = '<div class="p-3 text-sm text-gray-500">Belum ada riwayat pembayaran.</div>';
      return;
    }
    history.slice().reverse().forEach(item => {
      const card = document.createElement('div');
      card.className = 'p-3 border rounded flex items-start justify-between';
      const left = document.createElement('div');
      left.innerHTML = `<div class="font-semibold">${item.name} — ${item.nim}</div>
                        <div class="text-sm text-gray-600">Item: ${item.type} Semester ${item.semester} — Rp ${Number(item.amount).toLocaleString()}</div>
                        <div class="text-xs text-gray-500">Diajukan: ${new Date(item.createdAt).toLocaleString()}</div>
                        <div class="text-sm mt-2">Status: <span id="hst_${item.id}">${item.status}</span></div>`;
      const right = document.createElement('div');
      right.innerHTML = `<button class="approveBtn bg-green-600 text-white px-3 py-1 rounded mr-2" data-id="${item.id}">Setujui</button>
                         <button class="rejectBtn bg-gray-600 text-white px-3 py-1 rounded" data-id="${item.id}">Tolak</button>`;
      card.appendChild(left);
      card.appendChild(right);
      list.appendChild(card);
    });
  }

  document.addEventListener('click', function(e){
    if(e.target && e.target.classList.contains('approveBtn')){
      const id = e.target.getAttribute('data-id');
      let history = JSON.parse(localStorage.getItem('umm_history') || '[]');
      const idx = history.findIndex(h => h.id === id);
      if(idx === -1) return alert('Catatan tidak ditemukan');
      // set status
      history[idx].status = 'Sudah Dibayar';
      history[idx].verifiedAt = new Date().toISOString();
      localStorage.setItem('umm_history', JSON.stringify(history));
      // update payments: set paid true and paidAmount (add)
      const payments = JSON.parse(localStorage.getItem('umm_payments'));
      const nim = history[idx].nim;
      const userList = payments[nim];
      const kind = history[idx].type;
      const arr = kind === 'SPP' ? userList.SPP : userList.DPP;
      const it = arr.find(x => x.id === history[idx].itemId);
      if(it){
        it.paid = true;
        it.paidAmount = it.paidAmount + Number(history[idx].amount);
        // remove pendingPaid tracking if exists
        if(it.pendingPaid) it.pendingPaid = 0;
      }
      localStorage.setItem('umm_payments', JSON.stringify(payments));
      renderAdminList();
      alert('Pembayaran disetujui. Status berubah menjadi Sudah Dibayar.');
    }

    if(e.target && e.target.classList.contains('rejectBtn')){
      const id = e.target.getAttribute('data-id');
      let history = JSON.parse(localStorage.getItem('umm_history') || '[]');
      const idx = history.findIndex(h => h.id === id);
      if(idx === -1) return alert('Catatan tidak ditemukan');
      history[idx].status = 'Ditolak';
      history[idx].verifiedAt = new Date().toISOString();
      localStorage.setItem('umm_history', JSON.stringify(history));
      // if rejected, revert pendingPaid on payments
      const payments = JSON.parse(localStorage.getItem('umm_payments'));
      const nim = history[idx].nim;
      const userList = payments[nim];
      const arr = history[idx].type === 'SPP' ? userList.SPP : userList.DPP;
      const it = arr.find(x => x.id === history[idx].itemId);
      if(it && it.pendingPaid){
        it.pendingPaid = Math.max(0, it.pendingPaid - Number(history[idx].amount));
      }
      localStorage.setItem('umm_payments', JSON.stringify(payments));
      renderAdminList();
      alert('Pembayaran ditolak.');
    }
  });
}
