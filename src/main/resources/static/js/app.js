const API_URL = '/api';

// ================== 🔔 WEBSOCKET ==================
let stompClient = null;

function connectWebSocket() {
    const socket = new SockJS('http://localhost:8081/ws');
    stompClient = Stomp.over(socket);

    stompClient.connect({}, function () {
        console.log("🔥 Connected to WebSocket");

        stompClient.subscribe('/topic/emergency', function (message) {
            const data = JSON.parse(message.body);

            showNotification(
                `🚨 ${data.bloodGroup} needed at ${data.hospitalName}`
            );
        });
    });
}

function showNotification(msg) {
    // Create animated stacked notifications
    const toast = document.createElement("div");
    toast.className = "fixed right-5 glass-panel border-l-4 border-l-red-500 text-white px-6 py-4 rounded-lg shadow-2xl z-50 text-sm font-medium flex items-center gap-3 animate-fade-in transition-all duration-500";
    toast.innerHTML = `<i class="fa-solid fa-bell text-red-500 animate-pulse"></i> <span>${msg}</span>`;
    
    // Stack handling
    const existingToasts = document.querySelectorAll('.notification-toast-active');
    const offset = existingToasts.length * 80 + 80; // 80px spacing from top
    toast.style.top = `${offset}px`;
    toast.classList.add('notification-toast-active');
    
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 500); // Wait for transition
    }, 4000);
}

// ================== STATE ==================
let authState = {
    token: localStorage.getItem('token') || null,
    username: localStorage.getItem('username') || null,
    role: localStorage.getItem('role') || null
};

// ================== ROUTING ==================
function showView(viewName) {
    const container = document.getElementById('app-container');
    const template = document.getElementById(`view-${viewName}`);

    if (!template) {
        console.error(`View ${viewName} not found`);
        return;
    }

    container.innerHTML = template.innerHTML;
    updateNav();

    if (viewName === 'admin-dashboard') {
        initAdminDashboard();
    } else if (viewName === 'donor-dashboard') {
        initDonorDashboard();
    } else if (viewName === 'user-dashboard') {
        initUserDashboard();
    }
}

// ================== MAP & CHART GLOBALS ==================
let leafletMap = null;
let adminChart = null;

let globalEmergencies = [];
let userLocation = { lat: 40.7128, lng: -74.0060 }; // Default NYC

// Secure deterministic hashing for nearby fake locations
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
    return ((hash % 1000) / 10000); 
}

// Haversine Logic
function getDistanceInMiles(lat1, lon1, lat2, lon2) {
    const R = 3958.8; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function initGeoLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => { userLocation.lat = pos.coords.latitude; userLocation.lng = pos.coords.longitude; syncSystemData(); },
            (err) => { console.warn("GPS failed, defaulting to NYC"); syncSystemData(); }
        );
    } else { syncSystemData(); }
}

async function syncSystemData() {
    try {
        const res = await apiFetch(`${API_URL}/emergencies/pending`);
        if (res.ok) {
            let data = await res.json();
            // Attach geo-distances automatically based on real user coordinates
            data = data.map(req => {
                req.lat = userLocation.lat + hashString(req.hospitalName || "Hospital");
                req.lng = userLocation.lng + hashString((req.hospitalName || "H") + "salt");
                req.distance = getDistanceInMiles(userLocation.lat, userLocation.lng, req.lat, req.lng);
                return req;
            });
            // Primary Requirement: Show nearby areas first!
            data.sort((a, b) => a.distance - b.distance);
            globalEmergencies = data;
            
            updateLiveTicker();
            updateDonorMatches();
            if (leafletMap) dropRealPins();
        }
    } catch(e) { console.error("Backend Sync Error:", e); }
}

function updateLiveTicker() {
    const ticker = document.getElementById('tickerData');
    if(!ticker) return;
    if(globalEmergencies.length === 0) {
        ticker.innerHTML = '<span class="mx-4 font-bold text-slate-500">System Monitoring: No active local emergencies at this time.</span>';
        return;
    }
    let html = '';
    globalEmergencies.forEach(req => {
        let color = req.urgency === 'CRITICAL' ? 'text-red-600 font-extrabold' : 'text-orange-500';
        html += `<span class="mx-8 uppercase"><span class="${color}">● LIVE ${req.urgency}:</span> ${req.requiredBloodGroup} blood needed at ${req.hospitalName}. <strong class="text-slate-800">(${req.distance.toFixed(1)} mi)</strong></span>`;
    });
    ticker.innerHTML = html;
}

function updateDonorMatches() {
    const list = document.getElementById('donor-matches');
    if(!list) return;
    if(globalEmergencies.length === 0) {
        list.innerHTML = '<div class="text-center font-bold text-slate-500 p-6 bg-white rounded-xl shadow-sm border border-slate-200"><i class="fa-solid fa-check-circle text-green-500 text-3xl mb-3 block"></i> Regional network stable. No pending dispatches.</div>';
        return;
    }
    let html = '';
    globalEmergencies.forEach(req => {
        let border = req.urgency === 'CRITICAL' ? 'border-red-500 shadow-red-500/20' : 'border-orange-300 shadow-orange-500/10';
        let bg = req.urgency === 'CRITICAL' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-800 hover:bg-slate-900';
        html += `
        <div class="p-5 bg-white rounded-xl border-l-4 ${border} flex justify-between items-center hover:shadow-lg transition-all shadow-md card-hover mb-4">
            <div>
                <h4 class="text-slate-900 font-black text-lg">${req.requiredBloodGroup} Request <span class="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full ml-2 font-bold tracking-widest uppercase align-middle">${req.urgency}</span></h4>
                <p class="text-sm font-bold text-slate-600 mt-1"><i class="fa-solid fa-hospital mr-1 text-slate-400"></i> ${req.hospitalName} • ${req.patientName}</p>
                <p class="text-xs font-bold text-indigo-600 mt-1 uppercase tracking-wider"><i class="fa-solid fa-location-arrow mr-1"></i> Near You: ${req.distance.toFixed(1)} miles away</p>
            </div>
            <button onclick="acceptEmergency(this, ${req.id})" class="px-6 py-3 ${bg} text-white rounded-xl text-sm font-black transition-all active:scale-95 shadow-md">RESPOND</button>
        </div>`;
    });
    list.innerHTML = html;
}

function initLeafletMap() {
    const mapContainer = document.getElementById('real-map');
    if (!mapContainer) return;
    
    if (leafletMap !== null) {
        leafletMap.remove();
        leafletMap = null;
    }

    // Initialize Map at real User physical coordinates
    leafletMap = L.map('real-map').setView([userLocation.lat, userLocation.lng], 13);

    // Premium Light Mode Tiles from CartoDB
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(leafletMap);

    L.marker([userLocation.lat, userLocation.lng]).addTo(leafletMap).bindPopup('<div class="p-2"><strong class="text-blue-600">You Are Here</strong><br>Network Anchor</div>');
    dropRealPins();
}

function dropRealPins() {
    if(!leafletMap) return;
    globalEmergencies.forEach(req => {
        const markerIcon = L.divIcon({ className: 'custom-div-icon', html: "<div class='text-red-600 text-3xl animate-bounce drop-shadow-[0_4px_8px_rgba(239,68,68,0.5)]'><i class='fa-solid fa-location-dot'></i></div>", iconSize: [30, 30], iconAnchor: [15, 30] });
        L.marker([req.lat, req.lng], {icon: markerIcon}).addTo(leafletMap)
            .bindPopup(`<div class="p-3 min-w-[200px]"><strong class="text-red-600 text-lg block border-b border-slate-200 pb-1 mb-2">${req.requiredBloodGroup} Request</strong><span class="block text-slate-800 font-bold">${req.hospitalName}</span><span class="block text-xs uppercase tracking-widest text-slate-500 mt-2 font-bold">${req.distance.toFixed(1)} Miles Away</span></div>`);
    });
}

async function acceptEmergency(btn, id) {
    btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> ROUTING';
    btn.disabled = true;
    try {
        await apiFetch(`${API_URL}/emergencies/${id}/status?status=FULFILLED`, { method: 'PUT' });
        btn.innerHTML = '<i class="fa-solid fa-check"></i> DISPATCHED';
        btn.className = "px-6 py-3 bg-emerald-500 text-white rounded-xl text-sm font-black transition-all shadow-md";
        showNotification("Mission Accepted! GPS routing activated.");
        setTimeout(syncSystemData, 1500); // Reload network globally
    } catch(e) {
        showNotification("Failed to connect to Dispatch API.");
        btn.innerHTML = "RESPOND";
        btn.disabled = false;
    }
}

function initAdminDashboard() {
    // Real-time stat simulation
    setInterval(() => {
        const emergenciesEl = document.getElementById('stat-emergencies');
        if (emergenciesEl) {
            emergenciesEl.innerText = Math.floor(Math.random() * 5) + 1;
        }
    }, 5000);

    const ctx = document.getElementById('trafficChart');
    if (ctx) {
        if (adminChart) adminChart.destroy();
        adminChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', 'Now'],
                datasets: [{
                    label: 'Active Dispatches',
                    data: [12, 19, 15, 25, 22, 30, 45],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Available Donors',
                    data: [80, 85, 75, 90, 88, 95, 120],
                    borderColor: '#3b82f6',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.4,
                    borderDash: [5, 5]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                color: '#64748b',
                plugins: { legend: { labels: { color: '#475569', font: {weight: 'bold'} } } },
                scales: {
                    x: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#64748b', font: {weight: 'bold'} } },
                    y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#64748b', font: {weight: 'bold'} } }
                }
            }
        });

        // Make Chart Live
        setInterval(() => {
            const now = new Date();
            const timeLabel = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0');
            
            // Shift labels
            adminChart.data.labels.push(timeLabel);
            adminChart.data.labels.shift();

            // Shift Active Dispatches
            let lastDispatch = adminChart.data.datasets[0].data[adminChart.data.datasets[0].data.length - 1];
            let newDispatch = Math.max(0, lastDispatch + Math.floor(Math.random() * 5) - 2);
            adminChart.data.datasets[0].data.push(newDispatch);
            adminChart.data.datasets[0].data.shift();

            // Shift Available Donors
            let lastDonors = adminChart.data.datasets[1].data[adminChart.data.datasets[1].data.length - 1];
            let newDonors = Math.max(10, lastDonors + Math.floor(Math.random() * 7) - 3);
            adminChart.data.datasets[1].data.push(newDonors);
            adminChart.data.datasets[1].data.shift();

            adminChart.update('none'); // Update without full animation for smoother live vibe
        }, 3000);
    }

    const logs = document.getElementById('admin-logs');
    if (logs) {
        setInterval(() => {
            if (!document.getElementById('admin-logs')) return;
            const msgs = ['<span class="text-blue-400">INFO</span> Map ping received.', '<span class="text-green-400">SYNC</span> Auth cycle complete.', '<span class="text-blue-400">INFO</span> Active connections validated.'];
            const msg = msgs[Math.floor(Math.random()*msgs.length)];
            const time = new Date().toLocaleTimeString('en-US',{hour12:false});
            const entry = document.createElement('div');
            entry.className = "text-slate-500 animate-fade-in";
            entry.innerHTML = `[${time}] ${msg}`;
            logs.appendChild(entry);
            logs.scrollTop = logs.scrollHeight;
        }, 3500);
    }
}

function initDonorDashboard() {
    // Force a data sync specifically for the donor dashboard view
    syncSystemData();
}

function initUserDashboard() {
    initLeafletMap();
    // Invalidate size to fix weird Leaflet rendering issues inside display:none containers
    setTimeout(() => { if (leafletMap) leafletMap.invalidateSize(); }, 500);
}

// ================== AI CHAT BOT ==================
function toggleChat() {
    const chatPanel = document.getElementById('ai-chat-panel');
    if (chatPanel) {
        chatPanel.classList.toggle('hidden');
        chatPanel.classList.toggle('flex');
    }
}

function sendAiMessage() {
    const inputField = document.getElementById('ai-chat-input');
    const msg = inputField.value.trim();
    if (!msg) return;

    const chatHistory = document.getElementById('ai-chat-history');
    
    // Add User Message
    chatHistory.innerHTML += `<div class="text-right mb-3"><span class="bg-slate-800 text-white px-4 py-3 rounded-2xl rounded-tr-sm inline-block shadow-md text-sm font-medium border border-slate-700">${msg}</span></div>`;
    inputField.value = '';
    chatHistory.scrollTop = chatHistory.scrollHeight;

    // Simulate AI Thinking
    setTimeout(() => {
        const responses = [
            "<i class='fa-solid fa-bolt text-yellow-500 mr-1'></i> Processing optimal donor routing based on live traffic...",
            "<i class='fa-solid fa-vial text-red-500 mr-1'></i> Cross-referencing rare plasma types in the current inventory.",
            "I've initiated an automated alert to 3 matching donors nearby.",
            "<i class='fa-solid fa-chart-pie text-blue-500 mr-1'></i> Analyzing regional shortage probabilities for next week."
        ];
        const aiResponse = responses[Math.floor(Math.random() * responses.length)];
        
        chatHistory.innerHTML += `<div class="text-left mb-3 animate-fade-in"><span class="bg-white text-slate-800 px-4 py-3 rounded-2xl rounded-tl-sm inline-block border border-slate-200 shadow-md text-sm font-medium"><strong class="text-red-600 block mb-1">LifeDrop AI:</strong> ${aiResponse}</span></div>`;
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }, 800);
}

// ================== INIT ==================
document.addEventListener('DOMContentLoaded', () => {

    // 🔥 CONNECT WEBSOCKET HERE
    connectWebSocket();

    if (authState.token) {
        showDashboard();
    }
    updateNav();
    showView('landing'); // Default view
    
    // Initiate Real background tracker
    initGeoLocation();
});

// ================== NAV ==================
function updateNav() {
    const navLinks = document.getElementById('nav-links');
    if (!navLinks) return;

    const ticker = document.getElementById('liveTicker');

    if (!authState.token) {
        navLinks.innerHTML = `
            <button onclick="showView('login')" class="text-sm font-bold text-slate-600 hover:text-red-600 transition-colors mr-4">Login</button>
            <button onclick="showView('register')" class="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-red-500/30 transition-colors">Register</button>
        `;
        if (ticker) ticker.classList.add('hidden');
    } else {
        navLinks.innerHTML = `
            <div class="flex items-center gap-4">
                <span class="text-sm text-slate-700 bg-slate-100 px-4 py-1.5 rounded-xl border border-slate-200 font-bold shadow-sm">
                    <i class="fa-solid fa-user-circle text-slate-400 mr-1"></i> ${authState.username} <span class="ml-1 text-xs text-red-600">(${authState.role || 'USER'})</span>
                </span>
                <button onclick="showDashboard()" class="text-sm font-bold text-slate-600 hover:text-red-600 transition-colors"><i class="fa-solid fa-table-columns mr-1 cursor-pointer"></i> Dashboard</button>
                <button onclick="handleLogout()" class="text-sm font-bold text-slate-500 hover:text-red-600 transition-colors ml-3"><i class="fa-solid fa-right-from-bracket mr-1 cursor-pointer"></i> Logout</button>
            </div>
        `;
        if (ticker) ticker.classList.remove('hidden');
    }
}

function showDashboard() {
    if (authState.role === 'ADMIN') showView('admin-dashboard');
    else if (authState.role === 'DONOR') showView('donor-dashboard');
    else showView('user-dashboard');
}

// ================== AUTH ==================
async function handleRegister(e) {
    e.preventDefault();

    const u = document.getElementById('reg-username').value;
    const p = document.getElementById('reg-password').value;
    const r = document.getElementById('reg-role').value;

    try {
        // Create user in Database
        const res = await apiFetch(`${API_URL}/auth/register`, {
            method: 'POST',
            body: JSON.stringify({ username: u, password: p, role: r })
        });

        if (res.ok) {
            showNotification(`Profile Initialized! Welcome ${u}.`);
            // Auto login immediately
            await executeLoginAction(u, p);
        } else {
            const errText = await res.text();
            showNotification(`Registration Failed: ${errText || 'Username may be taken.'}`);
        }
    } catch (err) {
        showNotification("Critical Error: Unable to reach Auth servers.");
    }
}

async function executeLoginAction(username, password) {
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!res.ok) {
            showNotification("Authentication denied. Verify credentials.");
            return;
        }

        const data = await res.json();

        // Update State
        authState.token = data.token;
        authState.username = data.username;
        authState.role = data.role;

        // Persist local storage so refresh doesn't log out
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        localStorage.setItem('role', data.role);

        showNotification(`Authentication successful. Entering network as ${data.role || 'USER'}.`);
        showDashboard();
    } catch(err) {
        showNotification("Server offline. Login failed.");
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    await executeLoginAction(u, p);
}

function handleLogout() {
    localStorage.clear();
    authState = {};
    showView('landing');
}

// ================== USER ==================
async function submitEmergency(e) {
    e.preventDefault();

    const req = {
        requesterId: authState.token ? null : null, // Backend auto-assigns via token if set up
        patientName: document.getElementById('req-patient').value,
        requiredBloodGroup: document.getElementById('req-bg').value, // Corrected schema mapping!
        urgency: document.getElementById('req-urgency').value,
        hospitalName: document.getElementById('req-hospital').value,
        contactNumber: document.getElementById('req-contact').value,
        status: 'PENDING'
    };
    
    showNotification(`Emergency Broadcasted: ${req.requiredBloodGroup} needed at ${req.hospitalName}`);
    e.target.reset();

    try {
        const res = await apiFetch(`${API_URL}/emergencies`, {
            method: 'POST',
            body: JSON.stringify(req)
        });
        if(res.ok) {
            // Live broadcast success! Let's resync the entire network automatically!
            await syncSystemData();
            showNotification(`System successfully anchored new Dispatch into global database.`);
            
            // Pan Map uniquely if on user dashboard
            if(leafletMap) {
               const lastMarker = globalEmergencies[globalEmergencies.length-1];
               if(lastMarker) leafletMap.flyTo([lastMarker.lat, lastMarker.lng], 15, { animate: true, duration: 2 });
            }
        }
    } catch(err) {
        console.warn('Backend API not reachable. UI failed to register payload.');
    }
}

// ================== FETCH ==================
async function apiFetch(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    if (authState.token) {
        headers['Authorization'] = `Bearer ${authState.token}`;
    }

    return fetch(url, { ...options, headers });
}