// ── Input handler (URL params + postMessage) ──
function applyParams(p) {
    const v = val => val === '1' || val === 1 || val === true;
    if (p.needleAngle !== undefined) document.getElementById('needleAngle').value = p.needleAngle;
    if (p.fuelLevel !== undefined) document.getElementById('fuelLevel').value = p.fuelLevel;
    ['luci','fendi','profo','generat','olio','riserva'].forEach(k => {
        const cb = document.querySelector(`[data-spia="${k}"]`);
        if (cb && p[k] !== undefined) cb.checked = v(p[k]);
    });
    if (p.map !== undefined) document.getElementById('toggleMap').checked = v(p.map);
    if (p.semi !== undefined) document.getElementById('toggleSemi').checked = v(p.semi);
    if (p.caricamento !== undefined) document.getElementById('toggleCaricamento').checked = v(p.caricamento);
    if (p.pos !== undefined) document.getElementById('posSlider').value = p.pos;
    if (p.odo !== undefined) { odoValue = +p.odo; updateOdometer(odoValue); }
    if (p.debug) document.getElementById('controls').style.display = '';
    // trigger handlers
    document.getElementById('needleAngle').dispatchEvent(new Event('input'));
    document.getElementById('fuelLevel').dispatchEvent(new Event('input'));
    document.querySelectorAll('[data-spia]').forEach(cb => cb.dispatchEvent(new Event('change')));
    document.getElementById('toggleMap').dispatchEvent(new Event('change'));
    document.getElementById('toggleSemi').dispatchEvent(new Event('change'));
    document.getElementById('toggleCaricamento').dispatchEvent(new Event('change'));
    document.getElementById('posSlider').dispatchEvent(new Event('input'));
}

const params = new URLSearchParams(window.location.search);
const parsed = {};
for (const [k, val] of params) parsed[k] = /^\d+$/.test(val) ? +val : val;

if (Object.keys(parsed).length) setTimeout(() => applyParams(parsed), 100);

window.addEventListener('message', e => {
    try { applyParams(typeof e.data === 'object' ? e.data : JSON.parse(e.data)); } catch {}
});

// ── Dimensioni responsive ─────────────────────
const dashboard = document.querySelector('.dashboard-display');
const SIZE = 720;
const R = SIZE / 2; // es. 360 per 720px

const RADIUS_RAGGIERA = R - 26;
const RADIUS_TACCHE   = R - 46;
const RADIUS_NUMBERS  = R * (138 / 200);
const RADIUS_FUEL     = R * (180 / 200);
const FONT_NUMBER     = R * (28  / 200);

const NEEDLE_W   = 10;
const NEEDLE_H   = R * (102  / 200);
const NEEDLE_TOP = R * (-272 / 200);
const NEEDLE_OX  = 10;
const NEEDLE_OY  = 330;

// Needle
const needleEl = document.querySelector('.needle');
needleEl.style.width           = `${NEEDLE_W}px`;
needleEl.style.height          = `${NEEDLE_H}px`;
needleEl.style.top             = `${NEEDLE_TOP}px`;
needleEl.style.transformOrigin = `${NEEDLE_OX}px ${NEEDLE_OY}px`;

// ── Origin marker (debug) ────────────────────
const originMarker = document.querySelector('.origin-marker');
const needleRect = needleEl.getBoundingClientRect();
const dashRect = dashboard.getBoundingClientRect();
const oxPx = NEEDLE_OX;
const oyPx = NEEDLE_OY;
originMarker.style.left = `${oxPx + (720 - NEEDLE_W) / 2}px`;
originMarker.style.top  = `${NEEDLE_TOP + oyPx}px`;

// ── Odometer ──────────────────────────────────
let odoValue = 32791;

function updateOdometer(val) {
    const s = String(val).padStart(5, '0');
    for (let i = 0; i < 5; i++) document.getElementById(`odo-d${i}`).textContent = s[4 - i];
}
updateOdometer(odoValue);

const startAngle = -110;
const endAngle   =  110;
const totalArc   = endAngle - startAngle;

// ── Fuel Gauge ────────────────────────────────
const fuelContainer = document.getElementById('fuelTacche');
const fuelInput     = document.getElementById('fuelLevel');
const fuelValueEl   = document.getElementById('fuelLevelValue');
const iconaFuel     = document.querySelector('.color-benzina');

const FUEL_COUNT       = 100;
const FUEL_START       = 150;
const FUEL_END         = 210;
const FUEL_ARC         = FUEL_END - FUEL_START;
const QUARTER_INDICES  = new Set([25, 50, 75]);
const DANGER_THRESHOLD = 20;
const BLINK_THRESHOLD  = 5;

for (let i = FUEL_COUNT; i > 0; i--) {
    const angle = FUEL_START + (FUEL_ARC / (FUEL_COUNT - 1)) * i;
    const el = document.createElement('div');
    el.classList.add('fuel-tacca');
    el.dataset.index = i;

    if (i === 100)              el.classList.add('tacca-e', 'tacca-major');
    else if (i === 1)           el.classList.add('tacca-major');
    else if (QUARTER_INDICES.has(i)) el.classList.add('tacca-quarter');

    el.style.transformOrigin = `50% calc(50% + ${RADIUS_FUEL}px)`;
    el.style.transform = `rotate(${angle}deg)`;
    fuelContainer.appendChild(el);
}

const taccaFuel = document.querySelectorAll('.fuel-tacca');

function setFuelLevel(percent) {
    fuelValueEl.textContent = percent;
    const activeCut = Math.round((percent / 100) * (FUEL_COUNT - 1));
    const isDanger  = percent <= DANGER_THRESHOLD;

    taccaFuel.forEach((tacca, i) => {
        const isActive = i <= activeCut;
        tacca.classList.toggle('active', isActive);
        tacca.classList.toggle('danger', isActive && isDanger);
        iconaFuel.classList.toggle('active', isDanger);
    });
    iconaFuel.classList.toggle('blink', percent <= BLINK_THRESHOLD);
}

fuelInput.addEventListener('input', e => setFuelLevel(+e.target.value));
setFuelLevel(+fuelInput.value);



// ── Odometer increment ────────────────────────
document.getElementById('btnOdoInc').addEventListener('click', () => {
    odoValue++;
    updateOdometer(odoValue);
});

// ── Numbers ring ──────────────────────────────
const containerNumbers = document.getElementById('numbers-ring');
const valoriNumeri = [0, 20, 40, 60, 80, 100, 120, 140, 160];

valoriNumeri.forEach(kmh => {
    const angle = startAngle + (kmh / 160) * totalArc;
    const el = document.createElement('div');
    el.classList.add('number');
    el.dataset.angle = angle.toFixed(2);
    el.style.transformOrigin = `50% calc(50% + ${RADIUS_NUMBERS}px)`;
    el.style.fontSize        = `${FONT_NUMBER}px`;
    el.style.transform       = `rotate(${angle}deg)`;
    el.innerHTML = `<span style="display:block; transform:rotate(${-angle}deg)">${kmh}</span>`;
    containerNumbers.appendChild(el);
});

// ── Tacche principali ─────────────────────────
const containerPrinc = document.getElementById('tacche-principali');
const countPrinc = 33;

for (let i = 0; i < countPrinc; i++) {
    const angle = startAngle + (totalArc / (countPrinc - 1)) * i;
    const el = document.createElement('div');
    el.classList.add('tacca');
    if (i % 2 !== 0) el.classList.add('tacca-sottile');
    el.dataset.angle = angle.toFixed(2);
    el.style.transformOrigin = `50% calc(50% + ${RADIUS_TACCHE}px)`;
    el.style.transform = `rotate(${angle}deg)`;
    containerPrinc.appendChild(el);
}

// ── Tacche raggiera ───────────────────────────
const containerRaggiera = document.getElementById('tacche-raggiera');
const countRaggiera = 160;

for (let i = 0; i < countRaggiera; i++) {
    const angle = startAngle + (totalArc / (countRaggiera - 1)) * i;
    const el = document.createElement('div');
    el.classList.add('tacca-raggiera');
    el.dataset.angle = angle.toFixed(2);
    el.style.transformOrigin = `50% calc(50% + ${RADIUS_RAGGIERA}px)`;
    el.style.transform = `rotate(${angle}deg)`;
    containerRaggiera.appendChild(el);
}

// ── Needle control ────────────────────────────
const angleInput = document.getElementById('needleAngle');
const angleValue = document.getElementById('needleAngleValue');

function setNeedleAngle(angle) {
    needleEl.style.transform = `rotate(${angle}deg)`;
    angleValue.textContent   = angle;
    angleInput.value         = angle;

    const kmh     = Math.round(((angle - startAngle) / (endAngle - startAngle)) * 160);
    const speedEl = document.getElementById('speedValue');
    speedEl.textContent = Math.max(0, Math.min(160, kmh));
    speedEl.style.color = kmh >= 80 ? 'var(--needle-red)' : 'var(--dial-cream)';

    document.querySelectorAll('[data-angle]').forEach(tacca => {
        tacca.classList.toggle('active', parseFloat(tacca.dataset.angle) <= angle);
    });
}

angleInput.addEventListener('input', e => setNeedleAngle(e.target.valueAsNumber));
window.setDashboardNeedle = angle => setNeedleAngle(angle);
setNeedleAngle(angleInput.valueAsNumber);

// ── Toggle Map ────────────────────────────────
import L from 'leaflet';

let mapInstance = null;
let routeCoords = [];
let routeDists = [];
let routeTotalLen = 0;
let routeSteps = [];
let mapContainer = null;
let carMarker = null;
let lastPct = -1;

const stepSvgs = {
    dritto: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21V3"/><polyline points="6 9 12 3 18 9"/></svg>',
    svoltaDx: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 21V11a4 4 0 0 1 4-4h10"/><polyline points="16 2 21 7 16 12"/></svg>',
    svoltaSx: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21V11a4 4 0 0 0-4-4H3"/><polyline points="8 2 3 7 8 12"/></svg>',
    curvaDx: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21v-7l8-8"/><polyline points="12 6 17 6 17 11"/></svg>',
    curvaSx: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-7l-8-8"/><polyline points="7 11 7 6 12 6"/></svg>',
    inversione: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21V10a4 4 0 0 0-4-4h0a4 4 0 0 0-4 4v11"/><polyline points="3 16 8 21 13 16"/></svg>',
    svoltaStrettaDx: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21v-8l10 6"/><polyline points="18 13 18 19 12 18"/></svg>',
    svoltaStrettaSx: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-8L6 19"/><polyline points="6 13 6 19 12 18"/></svg>',
    marker: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 355 394" width="40" height="45"><path fill="currentColor" fill-rule="evenodd" d="M 177.35,254.94 349.73,322.49 177.35,23.89 4.97,322.49 Z m -32.53,79.07 c 0,-20.07 14.57,-36.35 32.53,-36.35 17.97,0 32.53,16.27 32.53,36.35 0,20.06 -14.56,36.33 -32.53,36.33 -17.96,0 -32.53,-16.27 -32.53,-36.33"/></svg>',
};

function stepIcon(type, mod) {
    if (type === 'depart' || type === 'arrive') return stepSvgs.marker;
    if (type === 'inversion' || mod === 'uturn') return stepSvgs.inversione;
    if (mod === 'straight' || type === 'continue') return stepSvgs.dritto;
    if (mod === 'right' || mod === 'slight right') return stepSvgs.svoltaDx;
    if (mod === 'left' || mod === 'slight left') return stepSvgs.svoltaSx;
    if (mod === 'sharp right') return stepSvgs.svoltaStrettaDx;
    if (mod === 'sharp left') return stepSvgs.svoltaStrettaSx;
    return stepSvgs.dritto;
}

function getStepAtPct(pct) {
    if (routeSteps.length === 0) return null;
    const target = pct * routeTotalLen;
    let cum = 0;
    for (const s of routeSteps) {
        cum += s.distance;
        if (target <= cum) return s;
    }
    return routeSteps[routeSteps.length - 1];
}

function updateSemiPanel(pct) {
    const step = getStepAtPct(pct);
    const icon = document.getElementById('semiIcon');
    const label = document.getElementById('semiLabel');
    const dist = document.getElementById('semiDist');
    if (!step) { icon.innerHTML = ''; label.textContent = ''; dist.textContent = ''; return; }
    icon.innerHTML = stepIcon(step.maneuver.type, step.maneuver.modifier);
    label.textContent = step.instruction || step.name;
    const km = (step.distance / 1000).toFixed(1);
    dist.textContent = km + ' km';
}

function bearing(from, to) {
    const [lat1, lon1] = from.map(d => d * Math.PI / 180);
    const [lat2, lon2] = to.map(d => d * Math.PI / 180);
    const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function haversine(a, b) {
    const R = 6371000;
    const [lat1, lon1] = a.map(d => d * Math.PI / 180);
    const [lat2, lon2] = b.map(d => d * Math.PI / 180);
    const dlat = lat2 - lat1, dlon = lon2 - lon1;
    const s = Math.sin(dlat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dlon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1-s));
}

function updatePosition(pct) {
    const c = routeCoords, d = routeDists;
    if (c.length < 2 || !carMarker || !mapContainer) return;
    if (pct === lastPct) return;
    lastPct = pct;

    const target = pct * routeTotalLen;
    let lo = 0, hi = d.length - 1;
    while (lo < hi) { const m = (lo + hi) >>> 1; if (d[m] < target) lo = m + 1; else hi = m; }
    const seg = Math.max(0, lo - 1);
    const t = (target - d[seg]) / (d[seg + 1] - d[seg] || 1);
    const pos = [c[seg][0] + (c[seg+1][0] - c[seg][0]) * t, c[seg][1] + (c[seg+1][1] - c[seg][1]) * t];

    carMarker.setLatLng(pos);
    mapInstance.panTo(pos, { animate: true, duration: 0.3 });

    let ahead = seg + 1;
    while (ahead < c.length && haversine(pos, c[ahead]) < 30) ahead++;
    const angle = ahead < c.length ? bearing(pos, c[ahead]) : bearing(c[seg], c[Math.min(seg + 1, c.length - 1)]);

    mapContainer.style.transform = `translate(-50%, -50%) rotate(${-angle}deg)`;
    const arrow = carMarker._icon?.querySelector('.car-arrow');
    if (arrow) {
        arrow.style.transformOrigin = '25px 3px';
        arrow.style.transform = `rotate(${angle}deg)`;
    }
    if (document.getElementById('toggleSemi').checked) updateSemiPanel(pct);
}

function initMap() {
    if (mapInstance) return;
    const container = document.querySelector('.map-container');
    mapContainer = container;
    mapInstance = L.map(container, {
        center: [45.2017, 9.1763],
        zoom: 18,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        touchZoom: false,
        doubleClickZoom: false,
        keyboard: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 40,
    }).addTo(mapInstance);

    const from = [45.20465970588177, 9.171326044897937];
    const to   = [45.198663367330454, 9.18123634099786];

    L.circleMarker(to, { radius: 6, fillColor: '#005dad', color: '#fff', weight: 2, fillOpacity: 0.9 }).addTo(mapInstance).bindPopup('Destinazione');

    const navIcon = `<div class="car-arrow" style="transform-origin:25px 3px;transform:rotate(0deg)"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 355 394" width="50" height="56">
        <path fill="#005dad" fill-rule="evenodd" d="M 177.35,254.94 349.73,322.49 177.35,23.89 4.97,322.49 Z m -32.53,79.07 c 0,-20.07 14.57,-36.35 32.53,-36.35 17.97,0 32.53,16.27 32.53,36.35 0,20.06 -14.56,36.33 -32.53,36.33 -17.96,0 -32.53,-16.27 -32.53,-36.33" />
    </svg></div>`;

    carMarker = L.marker(from, {
        icon: L.divIcon({
            className: 'car-marker',
            html: navIcon,
            iconSize: [50, 56],
            iconAnchor: [25, 3],
        }),
    }).addTo(mapInstance);

    const routeQuery = `${from[1]},${from[0]};${to[1]},${to[0]}`;
    const routeUrl = `https://router.project-osrm.org/route/v1/driving/${routeQuery}?geometries=geojson&overview=full&steps=true`;
    const routeLine = L.polyline([], {
        color: '#4285F4',
        weight: 6,
        opacity: 0.9,
    }).addTo(mapInstance);

    fetch(routeUrl)
        .then(r => r.json())
        .then(data => {
            if (data.routes && data.routes[0]) {
                routeCoords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                routeDists = [0];
                for (let i = 1; i < routeCoords.length; i++) routeDists.push(routeDists[i-1] + haversine(routeCoords[i-1], routeCoords[i]));
                routeTotalLen = routeDists[routeDists.length - 1];
                routeSteps = (data.routes[0].legs?.[0]?.steps || []).filter(s => s.distance > 0);
                routeLine.setLatLngs(routeCoords);
                mapContainer.style.transition = 'transform 0.3s ease';
                document.getElementById('posSlider').value = 0;
                lastPct = -1;
                updatePosition(0);
            }
        });

    setTimeout(() => mapInstance.invalidateSize(), 400);
}

document.getElementById('toggleMap').addEventListener('change', e => {
    dashboard.classList.toggle('NavMode', e.target.checked || document.getElementById('toggleSemi').checked);
    if (e.target.checked) initMap();
    if (mapInstance) {
        setTimeout(() => mapInstance.invalidateSize(), 50);
    }
});

document.getElementById('posSlider').addEventListener('input', e => {
    updatePosition(+e.target.value / 100);
});

document.getElementById('toggleSemi').addEventListener('change', e => {
    const show = e.target.checked;
    const mapOn = document.getElementById('toggleMap').checked;
    dashboard.classList.toggle('NavMode', show || mapOn);
    if (show) initMap();
    const mc = document.querySelector('.map-container');
    const sp = document.querySelector('.semi-panel');
    if (mc) mc.style.display = show ? 'none' : (mapOn ? '' : 'none');
    if (sp) sp.style.display = show ? 'flex' : 'none';
    if (show && routeSteps.length) updateSemiPanel(lastPct >= 0 ? lastPct : 0);
});

// ── Toggle Caricamento ────────────────────────
document.getElementById('toggleCaricamento').addEventListener('change', e => {
    const show = e.target.checked;
    document.querySelector('.dashboard-display').style.display = show ? 'none' : '';
    document.getElementById('caricamento').style.display = show ? '' : 'none';
});

// ── Spie ──────────────────────────────────────
document.querySelectorAll('[data-spia]').forEach(checkbox => {
    checkbox.addEventListener('change', e => {
        if (e.target.dataset.spia === 'riserva') {
            const el = document.querySelector('.color-benzina');
            el.classList.toggle('blink', e.target.checked);
            el.classList.toggle('active', e.target.checked);
            return;
        }
        const el = document.querySelector(`.color-${e.target.dataset.spia}`);
        if (!el) return;
        el.classList.toggle('active', e.target.checked);
    });
});

function initDashboardStream() {
    const evtSource = new EventSource('/stream');


    evtSource.onmessage = function(event) {
        const data = JSON.parse(event.data);

        if (data.init) {
            Object.entries(data.init).forEach(([name, active]) => {
                if (name === 'standby') {
                    initStandby(active);
                    return;
                }
                updateSpia(name, active);
            });
            return;
        }

        if (data.name === 'speed') {
            updateSpeed(data.value);
            return;
        }

        if (data.name === 'odometro') {
            updateOdometro(data.value);
            return;
        }

        if (data.name === 'standby') {
            setStandby(data.active);
            return;
        }

        updateSpia(data.name, data.active);
    };

    evtSource.onerror = function() {
        console.warn('Connessione SSE persa, riconnessione automatica in corso...');
    };
}

function updateSpia(name, active) {
    if (name === 'speed') return; // gestito separatamente
    const el = document.querySelector(`[data-spia="${name}"]`);
    if (el) {
        el.checked = active;
        el.dispatchEvent(new Event('change'));
    }
}

const TEXT_FADE_MS = 550;
const BENTORNATO_HOLD_MS = 1200;
const ARRIVEDERCI_HOLD_MS = 2500;
const PRE_FADE_IN_PAUSE_MS = 1000;
let standbySeqId = 0;

function standbyElements() {
    return {
        dash: document.querySelector('.dashboard-display'),
        overlay: document.getElementById('standby-overlay'),
        textEl: document.getElementById('standby-text'),
    };
}

// Imposta lo stato iniziale (al primo caricamento/riconnessione) senza animazioni.
function initStandby(active) {
    const { dash, textEl } = standbyElements();
    if (!dash || !textEl) return;
    standbySeqId++;
    dash.classList.add('no-anim');
    textEl.classList.add('no-anim');
    dash.classList.remove('crt-off', 'dash-hidden');
    textEl.classList.remove('visible');
    if (active) {
        dash.classList.add('crt-off');
    }
    void dash.offsetWidth;
    requestAnimationFrame(() => {
        dash.classList.remove('no-anim');
        textEl.classList.remove('no-anim');
    });
}

// Transizione animata per i cambi di stato a runtime.
// Chiave OFF: 1) spegnimento CRT (= fade-out veloce del cruscotto) + "Arrivederci"  2) pausa  3) dissolvenza testo
// Chiave ON:  1) "Bentornato"  2) dissolvenza testo  3) pausa  4) fade-in semplice del cruscotto (nessun effetto CRT)
function setStandby(active) {
    const { dash, textEl } = standbyElements();
    if (!dash || !textEl) return;
    const seq = ++standbySeqId;
    const stillCurrent = () => seq === standbySeqId;

    if (active) {
        dash.classList.remove('dash-hidden');
        void dash.offsetWidth;
        dash.classList.add('crt-off');
        textEl.textContent = 'Arrivederci';
        textEl.classList.add('visible');
        setTimeout(() => {
            if (!stillCurrent()) return;
            textEl.classList.remove('visible');
        }, ARRIVEDERCI_HOLD_MS);
        return;
    }

    textEl.textContent = 'Bentornato';
    textEl.classList.add('visible');
    setTimeout(() => {
        if (!stillCurrent()) return;
        textEl.classList.remove('visible');
        setTimeout(() => {
            if (!stillCurrent()) return;
            setTimeout(() => {
                if (!stillCurrent()) return;
                dash.classList.add('no-anim');
                dash.classList.remove('crt-off');
                dash.classList.add('dash-hidden');
                void dash.offsetWidth;
                requestAnimationFrame(() => {
                    if (!stillCurrent()) return;
                    dash.classList.remove('no-anim');
                    requestAnimationFrame(() => {
                        if (!stillCurrent()) return;
                        dash.classList.remove('dash-hidden');
                    });
                });
            }, PRE_FADE_IN_PAUSE_MS);
        }, TEXT_FADE_MS);
    }, BENTORNATO_HOLD_MS);
}

function updateOdometro(km) {
    const totalKm = Math.max(0, Math.floor(km));
    const digits = String(totalKm % 100000).padStart(5, '0');
    for (let i = 0; i < 5; i++) {
        const el = document.getElementById(`odo-d${4 - i}`);
        if (el) el.textContent = digits[i];
    }
}

function updateSpeed(kmh) {
    const speedEl = document.getElementById('speedValue');
    if (speedEl) speedEl.textContent = Math.round(kmh);

    const needleAngleInput = document.getElementById('needleAngle');
    if (needleAngleInput) {
        const angle = mapSpeedToAngle(kmh);
        needleAngleInput.value = angle;
        needleAngleInput.dispatchEvent(new Event('input'));
    }
}

function mapSpeedToAngle(kmh) {
    const maxSpeed = 140;
    const minAngle = -110;
    const maxAngle = 110;
    const clamped = Math.min(kmh, maxSpeed);
    return minAngle + (clamped / maxSpeed) * (maxAngle - minAngle);
}
initDashboardStream();