import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const sb = createClient(
  'https://vgoqbaxragkkfqnmzlrq.supabase.co',
  'sb_publishable_bJ23lq8V3rmZI3FV_bd3mg_N9YIqMlx'
);

/// ========================
// DATA
// ========================
const WHATSAPP_NUMBER = '51993483753';



let services = [];

async function loadServicesSite() {
  const { data, error } = await sb
    .from('services')
    .select('*')
    .eq('active', true);

  if (error) {
    console.error('Erro ao carregar serviços:', error);
    return;
  }

  services = data;
  renderBooking();
}



// Serviços




// ========================
// BOOKING STATE
// ========================
let booking = {
  step: 1,
  services: [],
  otherServices: '',
  barber: null,
  date: null,
  time: null,
  name: '',
  phone: '',
  email: '',
  note: '',
  geoAllowed: false,
  lat: null,
  lng: null,
  accuracy: null,
};

let calendarDate = new Date();


// ========================
// BARBEIROS
// ========================

let barbers = [];

function loadBarbersFromSystem() {
  const users = JSON.parse(localStorage.getItem('gp_users')) || [];

  barbers = users
    .filter(u => u.role === 'barbeiro' && u.active)
    .map(u => ({
      id: u.id,
      name: u.name
    }));

  // opcional: adicionar "sem preferência"
  barbers.unshift({ id: 0, name: 'Sem preferência' });
}




function selectBarber(id) {
  const barber = barbers.find(b => b.id === id);
  if (!barber) return;

  booking.barber = barber;
  renderBooking();
}


// ========================
// BOOKING ENGINE
// ========================



function toMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}


function scrollToBooking(serviceName) {
  
  const s = services.find(x => x.name === serviceName);
  if (!s) return;

  const exists = booking.services.some(sel => sel.id === s.id);
  if (!exists) booking.services.push(s);

  document.getElementById('agendamento')
    .scrollIntoView({ behavior: 'smooth' });

  setTimeout(renderBooking, 400);
}


function renderBooking() {
  const body = document.getElementById('bookingBody');
  updateStepTabs();
  if (booking.step === 1) body.innerHTML = renderStep1();
  else if (booking.step === 2) body.innerHTML = renderStep2();
  else if (booking.step === 3) body.innerHTML = renderStep3();
  else if (booking.step === 4) body.innerHTML = renderStep4();
  else body.innerHTML = renderSuccess();

  attachBookingHandlers();
}

function updateStepTabs() {
  for (let i = 1; i <= 4; i++) {
    const tab = document.getElementById(`step${i}-tab`);
    if (!tab) continue;
    tab.className = 'booking-step';
    if (i < booking.step) tab.classList.add('done');
    else if (i === booking.step) tab.classList.add('active');
  }
}

function renderStep1() {
  return `
  
<h3 style="
  font-family:'Oswald',sans-serif;
  font-weight:600;
  font-size:0.7rem;
  letter-spacing:0.18em;
  text-transform:uppercase;
  color:rgba(255,255,255,0.4);
  margin-bottom:0.75rem;">
  Escolha o Barbeiro
</h3>

<div class="booking-service-grid" style="margin-bottom:1.5rem;">
  ${barbers.map(b => `
    <button class="booking-service-option ${
      booking.barber?.id === b.id ? 'selected' : ''
    }" onclick="selectBarber(${b.id})">
      <div class="bso-name">${b.name}</div>
    </button>
  `).join('')}
</div>

    <h3 style="font-family:'Oswald',sans-serif;font-weight:600;color:rgba(255,255,255,0.6);font-size:0.75rem;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:1.25rem;">Escolha o Serviço</h3>
    <div class="booking-service-grid">
      ${services.map(s => `
        <button class="booking-service-option ${booking.services.some(sel => sel.id === s.id) || (s.price === null && booking.otherServices) ? 'selected' : ''}" onclick="selectService(${s.id})">
          <div class="bso-name">${s.name}</div>
          
          <div class="bso-price">
            ${s.price === null ? 'A combinar' : 'R$ ' + s.price}
          </div>

        </button>
      `).join('')}
    </div>
    <div class="booking-nav">
      <div></div>
      
<button class="btn-next" onclick="goStep(2)"
  ${(booking.services.length === 0 && !booking.otherServices) || !booking.barber
    ? 'disabled'
    : ''}>
  Próximo →
</button>

    </div>
  `;
}

function renderStep2() {
  return `
    <h3 style="font-family:'Oswald',sans-serif;font-weight:600;color:rgba(255,255,255,0.6);font-size:0.75rem;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:1.5rem;">Escolha a Data e Horário</h3>
    <div class="booking-calendar">
      ${renderCalendar()}
    </div>
    ${booking.date ? `
      <div style="margin-top:1.5rem;">
        <div style="font-family:'Oswald',sans-serif;font-size:0.75rem;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:0.75rem;">Horários disponíveis — ${formatDate(booking.date)}</div>
        <div class="time-slots">
          ${getTimeSlots(booking.date).map(t => `
            <button class="time-slot ${t.busy ? 'time-slot-busy' : ''} ${booking.time === t.time ? 'time-slot-selected' : ''}"
              ${t.busy ? 'disabled' : `onclick="selectTime('${t.time}')"`}>
              ${t.time}
            </button>
          `).join('')}
        </div>
      </div>
    ` : ''}
    <div class="booking-nav">
      <button class="btn-back" onclick="goStep(1)">← Voltar</button>
      <button class="btn-next" onclick="goStep(3)" ${!booking.date || !booking.time ? 'disabled' : ''}>Próximo →</button>
    </div>
  `;
}

function renderCalendar() {
  const y = calendarDate.getFullYear();
  const m = calendarDate.getMonth();
  const today = new Date(); today.setHours(0,0,0,0);
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  let cells = '';
  for (let i = 0; i < firstDay; i++) cells += `<div class="cal-day cal-day-empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(y, m, d);
    const isPast = date < today;
    const isSunday = date.getDay() === 0;
    const isDisabled = isPast || isSunday;
    const isToday = date.toDateString() === today.toDateString();
    const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isSelected = booking.date === dateStr;
    cells += `<button class="cal-day ${isDisabled?'cal-day-disabled':''} ${isToday?'cal-day-today':''} ${isSelected?'cal-day-selected':''}" ${isDisabled?'disabled':`onclick="selectDate('${dateStr}')"`}>${d}</button>`;
  }

  return `
    <div class="cal-header">
      <button class="cal-nav" onclick="calPrev()">‹</button>
      <div class="cal-month">${monthNames[m]} ${y}</div>
      <button class="cal-nav" onclick="calNext()">›</button>
    </div>
    <div class="cal-weekdays">${days.map(d=>`<div class="cal-weekday">${d}</div>`).join('')}</div>
    <div class="cal-grid">${cells}</div>
  `;
}

function getTimeSlots(dateStr) {
  const slots = [
    '09:00','09:30','10:00','10:30','11:00','11:30',
    '13:00','13:30','14:00','14:30','15:00','15:30',
    '16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30'
  ];

  const bookings = JSON.parse(localStorage.getItem('gp_apps') || '[]');

  return slots.map(time => {


const start = toMin(time);


// 🔥 BLOQUEIO DE HORÁRIO PASSADO
const now = new Date();
const todayStr = now.toISOString().slice(0, 10);
const currentMin = now.getHours() * 60 + now.getMinutes();
const isPastTime = dateStr === todayStr && start < currentMin;

// duração
const duration = booking.services.length
  ? booking.services.reduce((s,x)=>s+(x.duration||30),0)
  : 30;


const end = start + duration;

const isBusy = bookings.some(b => {

  const bStart = toMin(b.time);
  const bEnd = bStart + (b.duration || 30);

  return (
    b.date === dateStr &&
    (
      booking.barber?.id === 0 ||
      b.barberId == String(booking.barber?.id)
    ) &&
    (
      (start >= bStart && start < bEnd) ||
      (end > bStart && end <= bEnd) ||
      (start <= bStart && end >= bEnd)
    )
  );
});

    
    return {
      time,
      busy: isBusy || isPastTime
    };

  });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y,m,d] = dateStr.split('-');
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const days = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
  const date = new Date(y, m-1, d);
  return `${days[date.getDay()]}, ${d} de ${months[m-1]} de ${y}`;
}

function renderStep3() {
  return `
    <h3 style="font-family:'Oswald',sans-serif;font-weight:600;color:rgba(255,255,255,0.6);font-size:0.75rem;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:1.5rem;">Seus Dados</h3>
    <div class="booking-form">
      <div class="form-group">
        <label class="form-label" for="bName">Nome completo *</label>
        <input class="form-input" id="bName" type="text" placeholder="Seu nome" value="${booking.name}" autocomplete="name" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="bPhone">WhatsApp / Telefone *</label>
          <input class="form-input" id="bPhone" type="tel" placeholder="(00) 00000-0000" value="${booking.phone}" autocomplete="tel" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="bEmail">E-mail (opcional)</label>
          <input class="form-input" id="bEmail" type="email" placeholder="seu@email.com" value="${booking.email}" autocomplete="email">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="bNote">Observação (opcional)</label>
        <textarea class="form-textarea" id="bNote" placeholder="Alguma preferência ou observação?">${booking.note}</textarea>
      </div>
      <label class="geo-consent" id="geoConsentLabel">
        <input type="checkbox" id="geoCheck" ${booking.geoAllowed ? 'checked' : ''}>
        <span class="geo-consent-text">
          <strong style="color:rgba(255,255,255,0.7);">Compartilhar localização</strong> — Autorizo o registro da minha localização aproximada para fins de atendimento. Conforme a LGPD, meus dados serão tratados com segurança. Posso revogar a qualquer momento.
        </span>
      </label>
    </div>
    <div class="booking-nav">
      <button class="btn-back" onclick="goStep(2)">← Voltar</button>
      <button class="btn-next" onclick="saveStep3AndAdvance()">Próximo →</button>
    </div>
  `;
}

function renderStep4() {
  
const total = booking.services.reduce((s, x) => {
  return x.price === null ? s : s + Number(x.price);
}, 0);


  return `
    <h3 style="font-family:'Oswald',sans-serif;font-weight:600;
      color:rgba(255,255,255,0.6);font-size:0.75rem;
      letter-spacing:0.18em;text-transform:uppercase;margin-bottom:1.5rem;">
      Confirmar Agendamento
    </h3>

    <div class="booking-summary">
      <div class="summary-title">📋 Resumo</div>

      ${booking.services.map(s => `
        <div class="summary-row">
          <span>${s.name}</span>
          
          <span>
            ${s.price === null ? 'A combinar' : 'R$ ' + s.price}
          </span>

        </div>
      `).join('')}

      
      ${booking.otherServices ? `
  <div class="summary-row">
    <span>Outros serviços</span>
    <span>${booking.otherServices}</span>
  </div>
`       : ''}


      <div class="summary-row">
        <span>Data</span>
        <span>${formatDate(booking.date)}</span>
      </div>

      <div class="summary-row">
        <span>Horário</span>
        <span>${booking.time}</span>
      </div>

      <div class="summary-row">
        <span>Total</span>
        <span><strong>R$ ${total}</strong></span>
      </div>
    </div>

    <p style="font-family:'Merriweather',serif;font-style:italic;
      color:rgba(255,255,255,0.45);font-size:0.8rem;
      line-height:1.7;margin-bottom:1.5rem;">
      Ao confirmar, você concorda com a política de agendamento da Barbearia Gato Preto.
    </p>

    <div class="booking-nav">
      <button class="btn-back" onclick="goStep(3)">← Voltar</button>
      <button class="btn-next" id="confirmBtn" onclick="submitBooking()">
        ✓ Confirmar Agendamento
      </button>
    </div>
  `;
}

function renderSuccess() {
  const servicesText = booking.services
    .map(s => `• ${s.name} (R$ ${s.price})`)
    .join('\n');

  
const total = booking.services.reduce((s, x) => {
  return x.price === null ? s : s + Number(x.price);
}, 0);


  
const otherText = booking.otherServices
  ? `\n\nOutros serviços:\n• ${booking.otherServices}`
  : '';


  const wppMsg = encodeURIComponent(
`Olá! Acabei de agendar pelo site:

✂️ Serviços:
${servicesText || '-'}

${otherText}


💈 Barbeiro:
${booking.barber ? booking.barber.name : 'Sem preferência'}


📅 ${formatDate(booking.date)}
⏰ ${booking.time}
👤 ${booking.name}
📱 ${booking.phone}

💰 Total: R$ ${total}

Aguardo confirmação! 🐱`
  );

  return `
    <div class="booking-success">
      <div class="success-icon">🐱</div>
      <div class="success-title">Agendamento Enviado!</div>

      <p class="success-msg">
        Ótimo, ${booking.name.split(' ')[0]}!
        Seu pedido foi enviado com sucesso.
      </p>

      <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${wppMsg}"
         target="_blank" rel="noopener" class="wpp-btn">
        Confirmar pelo WhatsApp também
      </a>

      <button onclick="resetBooking()"
        style="display:block;margin:1.5rem auto 0;background:none;border:none;
               color:rgba(255,255,255,0.3);font-family:'Oswald',sans-serif;
               font-size:0.8rem;letter-spacing:0.1em;text-transform:uppercase;">
        Fazer novo agendamento
      </button>
    </div>
  `;
}

function attachBookingHandlers() {}



function selectService(id) {
  const service = services.find(s => s.id === id);
  if (!service) return;

  // 🔴 PERSONALIZADOS
  if (service.price === null) {
    booking.otherServices = 'Personalizados (A combinar)';
    renderBooking();
    return;
  }

  // ✅ SERVIÇOS NORMAIS
  const exists = booking.services.find(s => s.id === id);
  if (exists) {
    booking.services = booking.services.filter(s => s.id !== id);
  } else {
    booking.services.push(service);
  }

  renderBooking();
}


function selectDate(dateStr) {
  booking.date = dateStr;
  booking.time = null;
  renderBooking();
}

function selectTime(time) {
  booking.time = time;
  renderBooking();
}

function calPrev() {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1);
  renderBooking();
}

function calNext() {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
  renderBooking();
}

function goStep(n) {
  booking.step = n;
  renderBooking();
}

function saveStep3AndAdvance() {
  const name = document.getElementById('bName')?.value?.trim();
  const phone = document.getElementById('bPhone')?.value?.trim();
  const email = document.getElementById('bEmail')?.value?.trim();
  const note = document.getElementById('bNote')?.value?.trim();
  const geo = document.getElementById('geoCheck')?.checked;

  if (!name) { alert('Por favor, informe seu nome.'); return; }
  if (!phone || phone.length < 8) { alert('Por favor, informe um telefone válido.'); return; }

  booking.name = name;
  booking.phone = phone;
  booking.email = email || '';
  booking.note = note || '';

  if (geo && !booking.geoAllowed) {
    booking.geoAllowed = true;
    document.getElementById('geoModal').classList.add('open');
    return;
  }

  
if (booking.otherServices) {
  booking.note = booking.note
    ? booking.note + ' | Outros serviços: ' + booking.otherServices
    : 'Outros serviços: ' + booking.otherServices;
}


  goStep(4);
}

async function submitBooking() {
  const btn = document.getElementById('confirmBtn');

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Enviando...';
  }

  // ✅ chama o sb e espera terminar
  await logBookingData();

  // ✅ só DEPOIS muda de tela
  booking.step = 5;
  renderBooking();
}

async function logBookingData() {

  // ✅ nomes dos serviços
  let serviceNames = booking.services.map(s => {
    return s.price === null
      ? `${s.name} (A combinar)`
      : s.name;
  });

  // ✅ soma total
  let totalPrice = booking.services.reduce((s, x) => {
    return x.price === null ? s : s + Number(x.price || 0);
  }, 0);

  // ✅ personalizados
  if (booking.otherServices) {
    serviceNames.push('Personalizados (A combinar)');
  }

  // ✅ dados para banco
  const data = {
    name: booking.name,
    tel: booking.phone,
    date: booking.date,
    time: booking.time,
    services: serviceNames,
    price: totalPrice,
    status: 'open',
    barber_id: booking.barber?.id || null,
    duration: booking.services.length
      ? booking.services.reduce((s, x) => s + (x.duration || 30), 0)
      : 30
  };

  // ✅ INSERT NO sb
  const { error } = await sb
    .from('appointments')
    .insert([data]);

  if (error) {
    console.error('Erro ao salvar:', error);
    alert('Erro ao salvar agendamento');
  }
}

function resetBooking() {
  booking = {
    step: 1,
    services: [],
    barber: null,
    otherServices: '',
    date: null, 
    time: null,
    name: '',
    phone: '',
    email: '',
    note: '',
    geoAllowed: false,
    lat: null,
    lng: null,
    accuracy: null
  };
  renderBooking();
}

// Phone mask
document.addEventListener('input', e => {
  if (e.target && e.target.id === 'bPhone') {
    let v = e.target.value.replace(/\D/g, '').substring(0, 11);
    if (v.length > 10) v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    else if (v.length > 6) v = v.replace(/^(\d{2})(\d{4})(\d*)$/, '($1) $2-$3');
    else if (v.length > 2) v = v.replace(/^(\d{2})(.*)$/, '($1) $2');
    e.target.value = v;
  }
});

// ========================
// PRODUCTS
// ========================
function renderProducts() {
  const track = document.getElementById('productsTrack');
  if (!track) return;

  const produtos = JSON.parse(localStorage.getItem('gp_prods')) || [];

  if (!produtos.length) {
    track.innerHTML = `
      <p style="text-align:center; width:100%;">
        Nenhum produto disponível
      </p>
    `;
    return;
  }

  // opcional: só com estoque
  const visiveis = [...produtos].sort((a, b) => {
  if (a.stock === 0 && b.stock > 0) return 1;
  if (a.stock > 0 && b.stock === 0) return -1;

  if (a.isPromo && !b.isPromo) return -1;
  if (!a.isPromo && b.isPromo) return 1;

  return 0;
});

  track.innerHTML = visiveis.map(p => `
    <div class="product-card">

      <div class="product-img-wrap">
        ${
          p.img
            ? `<img src="${p.img}" style="width:100%;height:100%;object-fit:cover;">`
            : `<div class="product-placeholder">📦</div>`
        }

        ${p.isPromo 
          ? `<div style="
              position:absolute;
              top:10px;
              left:10px;
              background:red;
              color:white;
              font-size:10px;
              padding:4px 8px;
              border-radius:6px;
            ">Promo</div>` 
          : ''
        }
      </div>

      <div class="product-name">${p.name}</div>

      <div class="product-sub">
        ${p.isPromo ? 'Oferta especial' : ''}
      </div>

      <div class="product-desc">
        ${p.desc || 'Produto profissional'}
      </div>

      <div class="product-footer">

        <div>
          <div class="product-price">
            R$ ${(+p.price || 0).toFixed(2)}
          </div>

          ${(+p.priceOld || 0) > 0 
            ? `<small style="text-decoration:line-through;color:#999;">
                R$ ${(+p.priceOld || 0).toFixed(2)}
              </small>` 
            : ''
          }

          ${p.stock > 0 && p.stock < 5 
            ? `<div style="color:red;font-size:12px;">Últimas unidades</div>`
            : ''
          }
        </div>

        ${
          p.stock <= 0
            ? `<button disabled style="background:#ccc;">Esgotado</button>`
            : `
              <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                `Olá! Quero comprar:

        🧴 Produto: ${p.name}
        💰 Valor: R$ ${(+p.price || 0).toFixed(2)}

        Pode me passar mais informações?`
              )}"
              target="_blank"
              class="product-wpp-btn">
                Comprar
              </a>
            `
        }


      </div>

    </div>
  `).join('');
}


function carregarProdutosSite() {
  const container = document.getElementById('product-list-site');

  const products = JSON.parse(localStorage.getItem('gp_prods')) || [];

  if (!products.length) {
    container.innerHTML = '<p>Sem produtos disponíveis</p>';
    return;
  }

  container.innerHTML = products.map(p => `
    <div class="product-card">

      <div class="product-image-container">
        ${p.img 
          ? `
        ${
          p.img
            ? `<img src="${p.img}" 
                    onerror="this.style.display='none'" 
                    style="width:100%;height:100%;object-fit:cover;">`
            : `<div class="product-placeholder">📦</div>`
        }
` 
          : `<div class="no-image"><i class="fas fa-box"></i></div>`
        }
      </div>

      <div class="product-info">
        <span class="product-name">${p.name}</span>

        <p class="product-desc">
          ${p.desc || 'Sem descrição'}
        </p>

        <div class="product-pricing">
          <span class="price-current">R$ ${p.price.toFixed(2)}</span>

          ${p.priceOld > 0 
            ? `<span class="price-old">R$ ${p.priceOld.toFixed(2)}</span>` 
            : ''
          }
        </div>

      </div>
    </div>
  `).join('');
}


// ========================
// SCROLL CAT ANIMATION
// ========================
const cat = document.getElementById('scrollCat');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function animateCat() {
  if (reducedMotion || !cat) return;

  const scrollY = window.scrollY;
  const docH = document.body.scrollHeight - window.innerHeight;
  const progress = docH > 0 ? scrollY / docH : 0;
  const isMobile = window.innerWidth < 768;

  // Determine cat position based on scroll progress
  const catH = isMobile ? 70 : 120;
  const viewportH = window.innerHeight;
  const topMin = 80; // below nav
  const topMax = viewportH - catH - 20;
  const catTop = topMin + (topMax - topMin) * progress;

  // Alternate sides based on sections
  let onLeft = false;
  if (progress < 0.15) onLeft = false;       // hero: right
  else if (progress < 0.3) onLeft = true;     // bemvindo: left
  else if (progress < 0.45) onLeft = false;   // ambiente: right
  else if (progress < 0.6) onLeft = true;     // services: left
  else if (progress < 0.75) onLeft = false;   // booking: right
  else if (progress < 0.88) onLeft = true;    // products: left
  else onLeft = false;                        // footer: right

  cat.style.top = catTop + 'px';
  if (onLeft) {
    cat.style.left = (isMobile ? '-10px' : '10px');
    cat.style.right = 'auto';
    cat.style.transform = 'scaleX(-1)';
  } else {
    cat.style.right = (isMobile ? '-10px' : '10px');
    cat.style.left = 'auto';
    cat.style.transform = 'scaleX(1)';
  }

  // Subtle vertical float
  const float = Math.sin(scrollY * 0.008) * 6;
  cat.style.marginTop = float + 'px';
}

// Performance: no mobile o gato fixo + listener de scroll pesa ao rolar rápido.
// Desktop mantém a animação, mas com requestAnimationFrame.
const isTouchMobile = window.matchMedia('(max-width: 768px)').matches;
let catTicking = false;

function animateCatRaf() {
  if (catTicking) return;
  catTicking = true;
  requestAnimationFrame(() => {
    animateCat();
    catTicking = false;
  });
}

if (!reducedMotion && !isTouchMobile && cat) {
  cat.style.right = '10px';
  cat.style.top = '100px';
  cat.style.opacity = '1';
  window.addEventListener('scroll', animateCatRaf, { passive: true });
  animateCatRaf();
} else if (cat) {
  cat.style.display = 'none';
}

// ========================
// GEOLOCATION
// ========================
document.getElementById('geoYes').addEventListener('click', () => {
  document.getElementById('geoModal').classList.remove('open');
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        booking.lat = pos.coords.latitude;
        booking.lng = pos.coords.longitude;
        booking.accuracy = pos.coords.accuracy;
        booking.geoAllowed = true;
        goStep(4);
      },
      () => { booking.geoAllowed = false; goStep(4); }
    );
  } else {
    booking.geoAllowed = false;
    goStep(4);
  }
});

document.getElementById('geoNo').addEventListener('click', () => {
  booking.geoAllowed = false;
  document.getElementById('geoModal').classList.remove('open');
  goStep(4);
});

// ========================
// INTERSECTION OBSERVER
// ========================
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ========================
// HAMBURGER
// ========================
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('navLinks').classList.toggle('open');
});

// Close mobile menu on link click
document.querySelectorAll('.nav-links a').forEach(a => {
  a.addEventListener('click', () => document.getElementById('navLinks').classList.remove('open'));
});

// ========================
// INIT
// ========================
loadBarbersFromSystem();
loadServicesSite();
renderProducts();

// 🔁 Atualizar horários automaticamente (a cada 1 min)
setInterval(() => {
  if (booking.step === 2 && booking.date) {
    const slots = getTimeSlots(booking.date);
    const container = document.querySelector('.time-slots');
    
    if (!container) return;

    container.innerHTML = slots.map(t => `
      <button class="time-slot ${t.busy ? 'time-slot-busy' : ''} ${booking.time === t.time ? 'time-slot-selected' : ''}"
        ${t.busy ? 'disabled' : `onclick="selectTime('${t.time}')"`}>
        ${t.time}
      </button>
    `).join('');
  }
}, 60000);

// Atualiza produtos automaticamente quando mudar no painel
window.addEventListener('storage', (e) => {

  if (e.key === 'gp_prods') {
    renderProducts();
  }

  if (e.key === 'gp_services') {
    services = JSON.parse(localStorage.getItem('gp_services')) || [];
    services = services.filter(s => s.active);
    renderBooking();
  }

  if (e.key === 'gp_users') {
    loadBarbersFromSystem();
    renderBooking();
  }

  if (e.key === 'gp_apps') {
    renderBooking(); // atualiza horários ocupados
  }

});
// Observe newly added reveal elements
setTimeout(() => {
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
}, 100);

// Smooth external links
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href').substring(1);
    const target = document.getElementById(id);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// ========================
// CARROSSEL AMBIENTE — único
// ========================
let ambCurrent = 0;
let ambTotal   = 0;
let ambTimer   = null;

function ambInit() {
  const track  = document.getElementById('ambTrack');
  const dotsEl = document.getElementById('ambDots');
  if (!track) return;

  const slides = track.querySelectorAll('.amb-slide');
  ambTotal = slides.length;

  // cria bolinhas
  dotsEl.innerHTML = '';
  slides.forEach((_, i) => {
    const d = document.createElement('button');
    d.className = 'amb-dot' + (i === 0 ? ' active' : '');
    d.setAttribute('aria-label', `Foto ${i + 1}`);
    d.onclick = () => ambGo(i);
    dotsEl.appendChild(d);
  });

  ambUpdate();
  ambAutoPlay();

  // swipe mobile
  let sx = 0;
  track.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend',   e => {
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 40) ambSlide(dx < 0 ? 1 : -1);
  }, { passive: true });
}

function ambGo(index) {
  ambCurrent = (index + ambTotal) % ambTotal;
  ambUpdate();
  ambRestart();
}

function ambSlide(dir) { ambGo(ambCurrent + dir); }

function ambUpdate() {
  const track   = document.getElementById('ambTrack');
  const label   = document.getElementById('ambLabel');
  const counter = document.getElementById('ambCounter');
  const dotsEl  = document.getElementById('ambDots');
  const slides  = track ? track.querySelectorAll('.amb-slide') : [];

  if (track)   track.style.transform = `translateX(-${ambCurrent * 100}%)`;
  if (counter) counter.textContent   = `${ambCurrent + 1} / ${ambTotal}`;
  if (label && slides[ambCurrent])
    label.textContent = slides[ambCurrent].dataset.label || '';
  if (dotsEl)
    dotsEl.querySelectorAll('.amb-dot').forEach((d, i) =>
      d.classList.toggle('active', i === ambCurrent));
}

function ambAutoPlay() {
  if (ambTotal <= 1) return;
  ambTimer = setInterval(() => ambGo(ambCurrent + 1), 4000);
}

function ambRestart() {
  clearInterval(ambTimer);
  ambAutoPlay();
}

// pausa ao passar o mouse
const ambWrap = document.querySelector('.ambiente-carousel-wrap');
if (ambWrap) {
  ambWrap.addEventListener('mouseenter', () => clearInterval(ambTimer));
  ambWrap.addEventListener('mouseleave', ambAutoPlay);
}

ambInit();

console.log('%c🐱 Barbearia Gato Preto', 'color:#008b8b;font-family:Oswald;font-size:18px;font-weight:700;');
console.log('%cSite desenvolvido com atitude e estilo.', 'color:#666;font-style:italic;');






// ========================
// Contato
// ========================


  const mapWrapper = document.querySelector('.map-wrapper');

  if (mapWrapper) {
    mapWrapper.addEventListener('click', () => {
      mapWrapper.classList.add('active');
    });

    mapWrapper.addEventListener('mouseleave', () => {
      mapWrapper.classList.remove('active');
    });
  }



 // ========================
// SOBRE - ANIMAÇÕES DE SCROLL AVANÇADAS
// ========================

// ===== SOBRE – EFEITO CASCATA =====
function initSobre() {
  const sobreSection = document.querySelector('.sobre-section');
  if (!sobreSection) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        sobreSection.classList.add('visible');
      } else {
        sobreSection.classList.remove('visible');
      }
    });
  }, { threshold: 0, rootMargin: '0px 0px -80px 0px' });

  obs.observe(sobreSection);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSobre);
} else {
  initSobre();
}



/**
 * Sistema de animação profissional e minimalista para a seção "Sobre"
 * Utiliza Intersection Observer API para performance otimizada
 * Suporta parallax scroll com detecção de direção de scroll
 */



  /**
   * Intersection Observer: Dispara animação quando seção entra em view
   */



// ========================
// EXPOSE FUNCTIONS (MODULE FIX)
// ========================
window.ambSlide = ambSlide;
window.ambGo = ambGo;
window.selectBarber = selectBarber;
window.selectService = selectService;
window.selectDate = selectDate;
window.selectTime = selectTime;
window.goStep = goStep;
window.scrollToBooking = scrollToBooking;
window.submitBooking = submitBooking;
window.resetBooking = resetBooking;
window.calPrev = calPrev;
window.calNext
