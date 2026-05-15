// ── Dimensioni responsive ─────────────────────
const dashboard = document.querySelector('.dashboard-display');
const SIZE = 720;
const R = SIZE / 2; // es. 360 per 720px

const RADIUS_RAGGIERA = R - 26;
const RADIUS_TACCHE   = R - 46;
const RADIUS_NUMBERS  = R * (138 / 200);
const RADIUS_FUEL     = R * (180 / 200);
const FONT_NUMBER     = R * (28  / 200);

const NEEDLE_W   = R * (11   / 200);
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
var od = new Odometer({
    el: document.getElementById('odometer'),
    value: '32791',
    format: 'd',
    theme: 'minimal'
});
od.update(32791);

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
}

fuelInput.addEventListener('input', e => setFuelLevel(+e.target.value));
setFuelLevel(+fuelInput.value);

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

document.getElementById('toggleMap').addEventListener('change', e => {
    dashboard.classList.toggle('NavMode', e.target.checked);
    if (e.target.checked && !mapInstance) {
        const container = document.querySelector('.map-container');
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

        function bearing(from, to) {
            const [lat1, lon1] = from.map(d => d * Math.PI / 180);
            const [lat2, lon2] = to.map(d => d * Math.PI / 180);
            const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
            const x = Math.cos(lat1) * Math.sin(lat2) -
                      Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
            return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
        }

        const angle = bearing(from, to);

        L.marker(from, {
            icon: L.divIcon({
                className: 'car-marker',
                html: `<div class="car-icon" style="transform:rotate(${angle}deg)"><div class="car-roof"></div></div>`,
                iconSize: [22, 36],
                iconAnchor: [11, 18],
            }),
        }).addTo(mapInstance);

        const routeQuery = `${from[1]},${from[0]};${to[1]},${to[0]}`;
        const routeUrl = `https://router.project-osrm.org/route/v1/driving/${routeQuery}?geometries=geojson&overview=full`;
        const routeLine = L.polyline([], {
            color: '#4285F4',
            weight: 6,
            opacity: 0.9,
        }).addTo(mapInstance);

        fetch(routeUrl)
            .then(r => r.json())
            .then(data => {
                if (data.routes && data.routes[0]) {
                    const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                    routeLine.setLatLngs(coords);
                    mapInstance.setView(from, 18);
                }
            });

        setTimeout(() => mapInstance.invalidateSize(), 400);
    }
    if (mapInstance) {
        setTimeout(() => mapInstance.invalidateSize(), 50);
    }
});

// ── Spie ──────────────────────────────────────
document.querySelectorAll('[data-spia]').forEach(checkbox => {
    checkbox.addEventListener('change', e => {
        const el = document.querySelector(`.color-${e.target.dataset.spia}`);
        if (!el) return;
        el.classList.toggle('active', e.target.checked);
    });
});