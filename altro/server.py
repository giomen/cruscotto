from flask import Flask, Response, send_from_directory
from gpiozero import DigitalInputDevice
import json
import time
import threading
import queue
import os
import subprocess
import collections

app = Flask(__name__)
clients = []
clients_lock = threading.Lock()

# ── Mappa GPIO (BCM) / pin fisico ────────────────────
# #  Segnale                         GPIO (BCM)  Pin fisico
# 1  Luci (anabbaglianti)            GPIO17      11
# 2  Fendinebbia                     GPIO22      15
# 3  Profondità                      GPIO27      13
# 4  Batteria/Generatore             GPIO24      18
# 5  Olio                            GPIO25      22
# 6  Riserva                         GPIO23      16
# 7  Tachimetro (impulsi velocità)   GPIO18      12
# 8  Chiave/Ignition (standby)       GPIO6       31
# 9  Contagiri (impulsi RPM)         GPIO26      37
#
# GND di riferimento disponibili su tutto l'header: pin fisici
# 6, 9, 14, 20, 25, 30, 34, 39.
#
# Luci/fendi/profo/generat/olio/riserva passano da una scheda
# optoisolatore multi-canale (GND di uscita comune): uscita a LOW = spia
# attiva. Il segnale chiave (GPIO6) ha invece polarità opposta (non passa
# dallo stesso optoisolatore delle spie): 3,3V/HIGH = chiave ON, 0V/LOW =
# chiave OFF.

pin_config = {
    'luci': 17,
    'fendi': 22,
    'profo': 27,
    'generat': 24,
    'olio': 25,
    'riserva': 23
}

sensors = {}
state = {}


def broadcast(event_dict):
    event = json.dumps(event_dict)
    with clients_lock:
        for q in clients:
            q.put(event)

def make_callback(name, active):
    def callback():
        state[name] = active
        broadcast({'name': name, 'active': active})
    return callback

for name, pin in pin_config.items():
    dev = DigitalInputDevice(pin, pull_up=True, bounce_time=0.05)
    dev.when_activated = make_callback(name, False)
    dev.when_deactivated = make_callback(name, True)
    state[name] = not dev.is_active
    sensors[name] = dev

# ── Standby a chiave spenta ──────────────────────────
# Il Raspberry resta sempre alimentato (non sul circuito chiavi): il pin
# qui sotto legge solo lo stato chiave ON/OFF (via optoisolatore) per
# mettere il cruscotto in standby software istantaneo. Se la chiave resta
# su OFF oltre SHUTDOWN_DELAY_SEC, viene eseguito uno spegnimento pulito
# per non scaricare la batteria dell'auto (richiede sudoers NOPASSWD per
# /sbin/shutdown sull'utente del servizio).
IGNITION_PIN = 6
SHUTDOWN_DELAY_SEC = 30 * 60

shutdown_timer = None
shutdown_timer_lock = threading.Lock()

def _cancel_shutdown_timer():
    global shutdown_timer
    with shutdown_timer_lock:
        if shutdown_timer is not None:
            shutdown_timer.cancel()
            shutdown_timer = None

def _do_shutdown():
    print('Chiave OFF da', SHUTDOWN_DELAY_SEC, 's: spegnimento pulito', flush=True)
    subprocess.run(['sudo', 'shutdown', '-h', 'now'])

def _schedule_shutdown():
    global shutdown_timer
    with shutdown_timer_lock:
        shutdown_timer = threading.Timer(SHUTDOWN_DELAY_SEC, _do_shutdown)
        shutdown_timer.daemon = True
        shutdown_timer.start()

def on_ignition_on():
    global current_standby
    current_standby = False
    _cancel_shutdown_timer()
    broadcast({'name': 'standby', 'active': False})

def on_ignition_off():
    global current_standby
    current_standby = True
    broadcast({'name': 'standby', 'active': True})
    _schedule_shutdown()

ignition = DigitalInputDevice(IGNITION_PIN, pull_up=True, bounce_time=0.2)
ignition.when_activated = on_ignition_off    # LOW (0V) = chiave OFF
ignition.when_deactivated = on_ignition_on   # HIGH (3.3V) = chiave ON
current_standby = ignition.is_active
if current_standby:
    _schedule_shutdown()

# ── Tachimetro / Odometro ────────────────────────────
IMPULSI_PER_KM = 10000
UPDATE_INTERVAL = 0.1
ODOMETRO_FILE = 'odometro.json'

pulse_count = 0
total_impulsi = 0
pulse_lock = threading.Lock()

def carica_km():
    global total_impulsi
    try:
        with open(ODOMETRO_FILE) as f:
            data = json.load(f)
            total_impulsi = int(data.get('km_totali', 00000) * IMPULSI_PER_KM)
    except FileNotFoundError:
        total_impulsi = 0

def salva_km():
    while True:
        time.sleep(30)
        with pulse_lock:
            km = total_impulsi / IMPULSI_PER_KM
        with open(ODOMETRO_FILE, 'w') as f:
            json.dump({'km_totali': km}, f)

# Niente print() qui: questa callback scatta ad ogni impulso fisico del
# sensore (decine/centinaia di volte al secondo in marcia). Una print/flush
# per impulso satura il GIL e l'I/O su un Pi Zero 2, ritardando a cascata
# anche i broadcast SSE (speed/rpm), che sembrano quindi arrivare a scatti.
def tachimetro_callback():
    global pulse_count, total_impulsi
    with pulse_lock:
        pulse_count += 1
        total_impulsi += 1

tach = DigitalInputDevice(18, pull_up=True, bounce_time=0.001)
tach.when_activated = tachimetro_callback
tach.when_deactivated = tachimetro_callback

def calcola_velocita():
    global pulse_count
    while True:
        time.sleep(UPDATE_INTERVAL)
        with pulse_lock:
            impulsi = pulse_count
            pulse_count = 0
            km_totali = total_impulsi / IMPULSI_PER_KM

        km_h = (impulsi / IMPULSI_PER_KM) * (3600 / UPDATE_INTERVAL)
        broadcast({'name': 'speed', 'value': round(km_h, 1)})
        broadcast({'name': 'odometro', 'value': round(km_totali, 2)})

carica_km()
threading.Thread(target=calcola_velocita, daemon=True).start()
threading.Thread(target=salva_km, daemon=True).start()

# ── Contagiri (RPM) ───────────────────────────────────
# GPIO26, 1 impulso per giro: rpm = frequenza_hz * 60. Conta un solo fronte
# (when_activated) per evitare il raddoppio che si avrebbe contando anche
# when_deactivated come fa il tachimetro velocità sopra — se il sensore
# emette più impulsi per giro, dividere qui di conseguenza.
#
# Misura basata sul PERIODO tra impulsi consecutivi (timestamp precisi
# dell'interrupt), non sul conteggio impulsi in una finestra di tempo fissa:
# contare impulsi in una finestra da 100ms-1s è intrinsecamente quantizzato
# (al minimo arrivano solo 1-2 impulsi a finestra, quindi il valore salta
# tra multipli interi), mentre misurare il tempo esatto tra impulsi usa
# tutta la risoluzione del timer e dà una stima molto più precisa a parità
# di ritardo. Si fa la media degli ultimi RPM_PERIOD_HISTORY intervalli.
RPM_PIN = 26
RPM_PERIOD_HISTORY = 5
RPM_STALE_AFTER = 1.0  # nessun impulso da tanto: motore considerato fermo

rpm_lock = threading.Lock()
rpm_last_pulse_time = None
rpm_periods = collections.deque(maxlen=RPM_PERIOD_HISTORY)

def rpm_callback():
    global rpm_last_pulse_time
    now = time.monotonic()
    with rpm_lock:
        if rpm_last_pulse_time is not None:
            period = now - rpm_last_pulse_time
            if period > 0:
                rpm_periods.append(period)
        rpm_last_pulse_time = now

rpm_sensor = DigitalInputDevice(RPM_PIN, pull_up=True, bounce_time=0.001)
rpm_sensor.when_activated = rpm_callback

def calcola_rpm():
    while True:
        time.sleep(UPDATE_INTERVAL)
        with rpm_lock:
            last_time = rpm_last_pulse_time
            periods = list(rpm_periods)
        if not periods or last_time is None or (time.monotonic() - last_time) > RPM_STALE_AFTER:
            rpm = 0.0
        else:
            avg_period = sum(periods) / len(periods)
            rpm = 60.0 / avg_period if avg_period > 0 else 0.0
        broadcast({'name': 'rpm', 'value': round(rpm, 1)})

threading.Thread(target=calcola_rpm, daemon=True).start()

# ── Routes ────────────────────────────────────────────
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def assets(filename):
    return send_from_directory('.', filename)

@app.route('/stream')
def stream():
    def event_stream():
        q = queue.Queue()
        with clients_lock:
            clients.append(q)
        try:
            init_data = dict(state)
            init_data['standby'] = current_standby
            yield f"data: {json.dumps({'init': init_data})}\n\n"
            yield f"data: {json.dumps({'name': 'odometro', 'value': round(total_impulsi / IMPULSI_PER_KM, 2)})}\n\n"
            while True:
                data = q.get()
                yield f"data: {data}\n\n"
        finally:
            with clients_lock:
                clients.remove(q)
    return Response(event_stream(), mimetype='text/event-stream')

if __name__ == '__main__':
    try:
        # Server WSGI multi-thread più leggero del dev server di Flask per
        # un uso 24/7 su Pi Zero 2 (meno overhead per richiesta, stesso
        # supporto a connessioni SSE long-lived con threads=N).
        from waitress import serve
        serve(app, host='0.0.0.0', port=8080, threads=4)
    except ImportError:
        print('waitress non installato (pip install waitress nel venv): '
              'uso il dev server Flask come fallback.', flush=True)
        app.run(host='0.0.0.0', port=8080, threaded=True, use_reloader=False)