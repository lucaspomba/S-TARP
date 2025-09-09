document.addEventListener('DOMContentLoaded', () => {

  const KEY_LOTS = 'lots';
  const KEY_USER = 'currentUser';
  const getLots = () => JSON.parse(localStorage.getItem(KEY_LOTS) || '[]');
  const setLots = v => localStorage.setItem(KEY_LOTS, JSON.stringify(v));
  const getUser = () => JSON.parse(localStorage.getItem(KEY_USER) || 'null');

  // Autenticação
  const currentUser = getUser();
  if (!currentUser) { window.location.href = 'index.html'; }
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem(KEY_USER);
    window.location.href = 'index.html';
  });
  document.getElementById('userProfile').textContent =
    `Usuário: ${currentUser.username} • Cargo: ${currentUser.role || 'Operacional'} • Unidade: Matriz`;

  // Dados simulados
  let produced7 = [120, 150, 130, 170, 160, 180, 210];
  let trace7 = [88, 92, 90, 94, 93, 95, 97];

  // KPIs
  function updateKpis() {
    const lots = getLots();
    const today = produced7.at(-1);
    const tracedAvg = Math.round(trace7.reduce((a, b) => a + b, 0) / trace7.length);
    document.getElementById('kpiToday').textContent = today;
    document.getElementById('kpiLots').textContent = lots.filter(l => l.status !== 'Encerrado').length;
    document.getElementById('kpiTrace').textContent = tracedAvg + '%';
    const alertCount = lots.filter(l => l.trace < 90).length;
    document.getElementById('kpiAlerts').textContent = alertCount;
  }

  // Gráficos
  const producedChart = new Chart(document.getElementById('producedChart').getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'],
      datasets: [{ label:'Caixas', data: produced7, backgroundColor: '#ff6b00' }]
    },
    options:{ responsive:true, plugins:{ legend:{display:false} } }
  });

  const trackingChart = new Chart(document.getElementById('trackingChart').getContext('2d'), {
    type:'line',
    data:{
      labels:['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'],
      datasets:[{label:'Rastreio (%)', data:trace7, fill:false, borderColor:'#ff6b00', tension:0.35}]
    },
    options:{ responsive:true }
  });

  // Atualização dinâmica
  setInterval(() => {
    produced7.shift(); produced7.push(produced7.at(-1) + Math.floor(Math.random()*10-5));
    trace7.shift(); trace7.push(Math.min(100, Math.max(80, trace7.at(-1) + Math.floor(Math.random()*5-2))));
    producedChart.update(); trackingChart.update(); updateKpis();
  }, 5000);

  // ---------- Lotes ----------
  function nextLotCode() {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth()+1).padStart(2,'0');
    const d = String(date.getDate()).padStart(2,'0');
    const todayPrefix = `ORT-${y}${m}${d}-`;
    const todayLots = getLots().filter(l => l.code.startsWith(todayPrefix));
    const seq = String(todayLots.length+1).padStart(4,'0');
    return todayPrefix + seq;
  }

  function createLot({farm, boxes}) {
    const code = nextLotCode();
    const now = new Date().toISOString();
    const lot = {
      code, farm, boxes: Number(boxes),
      status:'Em processamento',
      trace: Math.floor(85 + Math.random()*15),
      createdAt: now,
      history: [
        {ts: now, ev: 'Lote criado'},
        {ts: now, ev: `Origem registrada: ${farm}`},
        {ts: now, ev: `Caixas declaradas: ${boxes}`}
      ]
    };
    const lots = getLots(); lots.unshift(lot); setLots(lots);
    renderLotGrid(); updateKpis();
    return lot;
  }

  // ---------- Mostrar QR fixo no painel direito ----------
  function showQrInRightPanel(code){
    const resultPanel = document.getElementById('searchResult');
    if(!resultPanel) return;

    // Limpar conteúdo anterior do painel QR
    const oldImg = resultPanel.querySelector('img.qr-fixed');
    if(oldImg) oldImg.remove();

    // Criar e adicionar nova imagem QR
    const img = document.createElement('img');
    img.src = 'img/unnamed.jpg'; // <-- caminho da sua imagem
    img.style.width = '160px';
    img.style.height = '160px';
    img.alt = 'QR Code do lote';
    img.classList.add('qr-fixed');

    resultPanel.appendChild(img);
    resultPanel.classList.remove('hidden');
  }

  function generateMiniQr(canvas, lotCode){
    if(!canvas) return console.error('Canvas mini QR não encontrado');
    QRCode.toCanvas(canvas, lotCode, { width:120, margin:1 }, (err)=>{ if(err) console.error('Erro mini QR:',err); });
  }

  function renderLotGrid(){
    const grid = document.getElementById('lotGrid'); if(!grid) return;
    const lots = getLots().slice(0,8);
    grid.innerHTML = '';
    lots.forEach(l=>{
      const card = document.createElement('div');
      card.className = 'lot-card';
      card.innerHTML = `
        <div class="lot-code">${l.code}</div>
        <div class="lot-meta">${l.farm} • ${l.boxes} cx</div>
        <div class="muted" style="font-size:12px">Trace: ${l.trace}% • ${l.status}</div>
        <canvas class="qr-mini"></canvas>
        <button class="btn mt-1" data-view="${l.code}">Ver detalhes</button>
      `;
      grid.appendChild(card);
      const miniCanvas = card.querySelector('canvas.qr-mini');
      generateMiniQr(miniCanvas, l.code);
    });

    grid.querySelectorAll('button[data-view]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        document.getElementById('searchLot').value = btn.dataset.view;
        doSearch();
        window.location.hash = '#lots';
      });
    });
  }

  // ---------- Criar lote ----------
  document.getElementById('createLotBtn')?.addEventListener('click', ()=>{
    const farm = document.getElementById('lotFarm').value.trim();
    const boxes = document.getElementById('lotBoxes').value;
    if(!farm || !boxes || Number(boxes)<=0) return alert('Preencha fazenda/unidade e quantidade válida.');
    const lot = createLot({farm, boxes});
    document.getElementById('searchLot').value = lot.code;

    // Mostrar QR fixo instantaneamente
    showQrInRightPanel(lot.code);
  });

  // ---------- Busca ----------
  function doSearch(){
    const code = document.getElementById('searchLot').value.trim().toUpperCase();
    const lots = getLots().filter(l=>l.code.toUpperCase()===code);
    const lot = lots[0];
    const result = document.getElementById('searchResult');
    const recentLots = document.getElementById('lotGrid');

    if(!lot){
        result?.classList.add('hidden');
        recentLots?.classList.remove('hidden'); // mostra se não encontrado
        return alert('Lote não encontrado.');
    }

    result?.classList.remove('hidden');
    recentLots?.classList.add('hidden'); // esconde Lotes recentes ao pesquisar

    document.getElementById('lotCode').textContent = lot.code;
    document.getElementById('lotMeta').textContent = `${lot.farm} • ${lot.boxes} cx • Criado em ${new Date(lot.createdAt).toLocaleString()}`;
    document.getElementById('lotStatus').textContent = lot.status;
    document.getElementById('lotTrace').textContent = `${lot.trace}%`;
    const ul = document.getElementById('lotHistory'); ul.innerHTML = '';
    lot.history.slice().reverse().forEach(h=>{
        const li = document.createElement('li');
        li.textContent = `${new Date(h.ts).toLocaleString()} — ${h.ev}`;
        ul.appendChild(li);
    });

    // Mostrar QR fixo também na busca
    showQrInRightPanel(lot.code);
  }
  document.getElementById('searchBtn')?.addEventListener('click', doSearch);

  // ---------- Leitor de QR ----------
  let html5Qr;
  const scanArea = document.getElementById('scanArea');
  document.getElementById('scanBtn')?.addEventListener('click', async ()=>{
    scanArea.classList.remove('hidden');
    try{
      if(!html5Qr) html5Qr = new Html5Qrcode("qrReader");
      await html5Qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        decodedText => { document.getElementById('searchLot').value = decodedText.trim(); doSearch(); stopScanner(); },
        errorMsg => console.log('QR scan error:', errorMsg)
      );
    } catch(e){
      console.error(e); alert('Não foi possível iniciar a câmera. Use HTTPS/localhost e permita acesso.');
    }
  });
  function stopScanner(){ if(html5Qr){ html5Qr.stop().then(()=>html5Qr.clear()).catch(()=>{});} scanArea.classList.add('hidden'); }
  document.getElementById('closeScanBtn')?.addEventListener('click', stopScanner);

  // ---------- Seed inicial ----------
  (function seed(){
    if(getLots().length) return;
    ['Unidade A','Talhão 3','Unidade B'].forEach((farm,i)=>{
      const base = createLot({farm, boxes: 80 + i*20});
      base.history.push({ts:new Date().toISOString(), ev:'Inspeção de qualidade concluída'});
      base.trace = 92 + i;
      setLots([base, ...getLots()]);
    });
    renderLotGrid();
    updateKpis();
  })();

});
