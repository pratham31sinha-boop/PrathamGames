#!/usr/bin/env python3
"""
PRATHAM GAMES - High Performance Local Server with Direct Game Runner
Serves static website files and provides ad-free game streaming
"""

import http.server
import socketserver
import urllib.request
import json
import os
import re
import datetime
import subprocess
import threading

PORT = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_FILE = os.path.join(BASE_DIR, 'games_cache.json')
GITHUB_CONFIG_FILE = os.path.join(BASE_DIR, 'github_config.json')
ACTIVITY_JSON_FILE = os.path.join(BASE_DIR, 'activity_logs.json')
ACTIVITY_MD_FILE = os.path.join(BASE_DIR, 'GITHUB_ACTIVITY.md')

# Load cached game URIs
GAME_CACHE = {}
if os.path.exists(CACHE_FILE):
    try:
        with open(CACHE_FILE) as f:
            GAME_CACHE = json.load(f)
        print(f"Loaded {len(GAME_CACHE)} game URIs from cache.")
    except Exception as e:
        print(f"Error loading cache: {e}")

def load_github_config():
    default_cfg = {
        "enabled": True,
        "github_repo": "",
        "github_token": "",
        "webhook_url": "",
        "auto_git_commit": True
    }
    if os.path.exists(GITHUB_CONFIG_FILE):
        try:
            with open(GITHUB_CONFIG_FILE) as f:
                cfg = json.load(f)
                default_cfg.update(cfg)
        except Exception as e:
            print(f"Error loading github config: {e}")
    return default_cfg

# India Timezone Configuration (UTC + 5:30)
IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
PRATHAM_GAMES_DIR = os.path.join(BASE_DIR, 'PrathamGames')
PRATHAM_DATA_DIR = os.path.join(PRATHAM_GAMES_DIR, 'data')
os.makedirs(PRATHAM_DATA_DIR, exist_ok=True)

def get_ist_now():
    return datetime.datetime.now(IST)

def sanitize_username(name):
    clean = re.sub(r'[^a-zA-Z0-9_\-\s]', '', (name or '').strip())
    clean = re.sub(r'\s+', ' ', clean)
    return clean[:32] if clean else 'Guest'

def register_player_entry(name, age):
    now_ist = get_ist_now()
    clean_name = sanitize_username(name)
    age_str = str(age).strip() if age else 'N/A'
    date_full = now_ist.strftime('%d-%B-%Y')       # e.g. 10-November-2026
    date_user = now_ist.strftime('%d %B')         # e.g. 10 November
    time_ist = now_ist.strftime('%I:%M:%S %p IST')

    os.makedirs(PRATHAM_DATA_DIR, exist_ok=True)

    # 1. Register in data/registered_users.txt
    reg_file = os.path.join(PRATHAM_DATA_DIR, 'registered_users.txt')
    if not os.path.exists(reg_file):
        with open(reg_file, 'w', encoding='utf-8') as f:
            f.write("================================================================================\n")
            f.write("PRATHAM GAMES — REGISTERED PLAYERS DIRECTORY\n")
            f.write("Timezone: Indian Standard Time (IST, UTC+5:30)\n")
            f.write("================================================================================\n")

    # Check if already registered
    already_reg = False
    try:
        with open(reg_file, 'r', encoding='utf-8') as f:
            for line in f:
                if f"Name: {clean_name} |" in line:
                    already_reg = True
                    break
    except Exception:
        pass

    if not already_reg:
        with open(reg_file, 'a', encoding='utf-8') as f:
            f.write(f"Name: {clean_name} | Age: {age_str} | Date: {date_user} ({date_full}) | Registered: {time_ist}\n")

    # 2. Player Folder: data/<clean_name>/
    user_folder = os.path.join(PRATHAM_DATA_DIR, clean_name)
    os.makedirs(user_folder, exist_ok=True)

    # 3. Daily text file: data/<clean_name>/10-November-2026.txt
    daily_file = os.path.join(user_folder, f"{date_full}.txt")
    if not os.path.exists(daily_file):
        with open(daily_file, 'w', encoding='utf-8') as f:
            f.write("================================================================================\n")
            f.write("PRATHAM GAMES — DAILY ACTIVITY & GAMEPLAY LOG\n")
            f.write(f"Player: {clean_name}\n")
            f.write(f"Age: {age_str}\n")
            f.write(f"Date: {date_user} ({date_full})\n")
            f.write("Timezone: Indian Standard Time (IST, UTC+5:30)\n")
            f.write("================================================================================\n\n")
            f.write(f"[{time_ist}] PLAYER REGISTERED: {clean_name} (Age: {age_str}) registered into Pratham Games\n")

    # Friendly alias files e.g. 10_November.txt
    alias_name = f"{now_ist.strftime('%d_%B')}.txt"
    alias_path = os.path.join(user_folder, alias_name)
    try:
        if not os.path.exists(alias_path):
            os.link(daily_file, alias_path)
    except Exception:
        pass

    # Git auto-commit
    cfg = load_github_config()
    if cfg.get('auto_git_commit', True):
        try:
            subprocess.run(['git', '-C', BASE_DIR, 'add', 'PrathamGames/data/'], capture_output=True)
            subprocess.run(['git', '-C', BASE_DIR, 'commit', '-m', f"Register player: {clean_name} (Age: {age_str}) [IST]"], capture_output=True)
        except Exception as e:
            print(f"Git commit error: {e}")

    return {
        "name": clean_name,
        "age": age_str,
        "date": date_user,
        "registeredAt": time_ist
    }

def log_gameplay_entry(name, age, game_title, category, score="Active", duration="0m"):
    now_ist = get_ist_now()
    clean_name = sanitize_username(name)
    age_str = str(age).strip() if age else 'N/A'
    date_full = now_ist.strftime('%d-%B-%Y')
    date_user = now_ist.strftime('%d %B')
    time_ist = now_ist.strftime('%I:%M:%S %p IST')

    os.makedirs(PRATHAM_DATA_DIR, exist_ok=True)
    user_folder = os.path.join(PRATHAM_DATA_DIR, clean_name)
    os.makedirs(user_folder, exist_ok=True)

    daily_file = os.path.join(user_folder, f"{date_full}.txt")
    if not os.path.exists(daily_file):
        with open(daily_file, 'w', encoding='utf-8') as f:
            f.write("================================================================================\n")
            f.write("PRATHAM GAMES — DAILY ACTIVITY & GAMEPLAY LOG\n")
            f.write(f"Player: {clean_name}\n")
            f.write(f"Age: {age_str}\n")
            f.write(f"Date: {date_user} ({date_full})\n")
            f.write("Timezone: Indian Standard Time (IST, UTC+5:30)\n")
            f.write("================================================================================\n\n")

    score_display = f"Score: {score}" if score else "Playing"
    duration_display = f"Duration: {duration}" if duration else ""
    meta_parts = [p for p in [score_display, duration_display] if p]
    meta_str = " | ".join(meta_parts)

    log_line = f"[{time_ist}] GAME PLAYED: {game_title} | Category: {category} | {meta_str}\n"
    with open(daily_file, 'a', encoding='utf-8') as f:
        f.write(log_line)

    # Git auto-commit
    cfg = load_github_config()
    if cfg.get('auto_git_commit', True):
        try:
            subprocess.run(['git', '-C', BASE_DIR, 'add', 'PrathamGames/data/'], capture_output=True)
            subprocess.run(['git', '-C', BASE_DIR, 'commit', '-m', f"Gameplay: {clean_name} - {game_title} [{time_ist}]"], capture_output=True)
        except Exception as e:
            print(f"Git commit error: {e}")

    # Async external dispatch
    event = {
        "type": "GAME_PLAY",
        "playerName": clean_name,
        "playerAge": age_str,
        "gameTitle": game_title,
        "category": category,
        "score": score,
        "duration": duration,
        "timestamp": time_ist
    }
    threading.Thread(target=dispatch_external_github, args=(event, cfg), daemon=True).start()

    return True

def save_github_config(cfg):
    try:
        with open(GITHUB_CONFIG_FILE, 'w') as f:
            json.dump(cfg, f, indent=2)
    except Exception as e:
        print(f"Error saving github config: {e}")

def dispatch_external_github(event, cfg):
    # 1. Webhook (Discord / Slack / GitHub webhook)
    webhook_url = cfg.get('webhook_url') or os.environ.get('GITHUB_WEBHOOK_URL')
    if webhook_url:
        try:
            title = event.get('gameTitle', 'Browser Session')
            ev_type = event.get('type', 'USER_VISIT')
            text = f"🎮 **Pratham Games Activity**: User {ev_type} -> **{title}** ({event.get('device', 'Web')}) at {event.get('timestamp')}"
            payload = json.dumps({
                "content": text,
                "text": text,
                "event": event
            }).encode('utf-8')
            req = urllib.request.Request(webhook_url, data=payload, headers={'Content-Type': 'application/json', 'User-Agent': 'PrathamGames/1.0'})
            with urllib.request.urlopen(req, timeout=4) as _:
                pass
        except Exception as e:
            print(f"Webhook dispatch error: {e}")

    # 2. GitHub API Repository Dispatch
    token = cfg.get('github_token') or os.environ.get('GITHUB_TOKEN')
    repo = cfg.get('github_repo') or os.environ.get('GITHUB_REPO')
    if token and repo and '/' in repo:
        try:
            url = f"https://api.github.com/repos/{repo}/dispatches"
            payload = json.dumps({
                "event_type": "pratham_games_activity",
                "client_payload": event
            }).encode('utf-8')
            req = urllib.request.Request(url, data=payload, headers={
                'Authorization': f'token {token}',
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'PrathamGames-Telemetry'
            })
            with urllib.request.urlopen(req, timeout=5) as _:
                pass
        except Exception as e:
            print(f"GitHub API dispatch error: {e}")

    # 3. Git Push if remote origin exists
    try:
        remote_chk = subprocess.run(['git', '-C', BASE_DIR, 'remote', 'get-url', 'origin'], capture_output=True, text=True)
        if remote_chk.returncode == 0 and remote_chk.stdout.strip():
            subprocess.run(['git', '-C', BASE_DIR, 'push', 'origin', 'main'], capture_output=True, timeout=5)
    except Exception:
        pass

def record_activity_event(data):
    now_utc = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')
    event_type = data.get('type', 'USER_VISIT')
    game_title = data.get('gameTitle') or data.get('game') or 'Website Portal'
    device = data.get('device', 'Web Browser')
    slug = data.get('slug', '')
    category = data.get('category', 'Portal')

    entry = {
        'id': f"act_{int(datetime.datetime.now().timestamp()*1000)}",
        'timestamp': now_utc,
        'type': event_type,
        'gameTitle': game_title,
        'slug': slug,
        'category': category,
        'device': device,
        'path': data.get('path', '/')
    }

    # Append to activity_logs.json
    logs = []
    if os.path.exists(ACTIVITY_JSON_FILE):
        try:
            with open(ACTIVITY_JSON_FILE) as f:
                logs = json.load(f)
        except:
            logs = []
    logs.insert(0, entry)
    logs = logs[:100]  # Keep last 100 entries
    try:
        with open(ACTIVITY_JSON_FILE, 'w') as f:
            json.dump(logs, f, indent=2)
    except Exception as e:
        print(f"Error saving activity logs: {e}")

    # Append to GITHUB_ACTIVITY.md
    try:
        with open(ACTIVITY_MD_FILE, 'a') as f:
            f.write(f"| {now_utc} | {'🎮 ' if event_type=='GAME_PLAY' else '🌐 '}{event_type} | **{game_title}** ({category}) | {device} |\n")
    except Exception as e:
        print(f"Error writing markdown log: {e}")

    # Auto Git Commit
    cfg = load_github_config()
    if cfg.get('auto_git_commit', True):
        try:
            subprocess.run(['git', '-C', BASE_DIR, 'add', 'activity_logs.json', 'GITHUB_ACTIVITY.md'], capture_output=True)
            subprocess.run(['git', '-C', BASE_DIR, 'commit', '-m', f"Activity: {event_type} - {game_title}"], capture_output=True)
        except Exception as e:
            print(f"Git commit error: {e}")

    # Async external dispatch
    threading.Thread(target=dispatch_external_github, args=(entry, cfg), daemon=True).start()

    return entry

def save_cache():
    try:
        with open(CACHE_FILE, 'w') as f:
            json.dump(GAME_CACHE, f, indent=2)
    except Exception as e:
        print(f"Error saving cache: {e}")

def resolve_game_slug(slug):
    """Dynamically resolve game CDN URL if not present in cache"""
    if slug in GAME_CACHE and GAME_CACHE[slug]:
        return GAME_CACHE[slug]

    headers = {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://poki.com/'
    }

    try:
        req = urllib.request.Request(f'https://poki.com/en/g/{slug}', headers=headers)
        with urllib.request.urlopen(req, timeout=7) as resp:
            html = resp.read().decode('utf-8', errors='ignore')

        # Unescape unicode slashes
        unescaped = html.replace(r'\u002F', '/')

        # Try to find direct gdn.poki.com link
        matches = re.findall(r'(https?:)?//[^\s"\']*?\.gdn\.poki\.com/[^\s"\']+', unescaped)
        if matches:
            full_match = re.search(r'((?:https?:)?//[^\s"\']*?\.gdn\.poki\.com/[^\s"\'\\]+)', unescaped)
            if full_match:
                uri = full_match.group(1)
                if uri.startswith('//'):
                    uri = 'https:' + uri
                GAME_CACHE[slug] = uri
                save_cache()
                return uri

        # Try games.poki.com proxy link
        proxy_match = re.search(r'((?:https?:)?//games\.poki\.com/\d+/[^\s"\'\\]+)', unescaped)
        if proxy_match:
            proxy_url = proxy_match.group(1)
            if proxy_url.startswith('//'):
                proxy_url = 'https:' + proxy_url
            # Fetch proxy page to get gdn URL
            req_p = urllib.request.Request(proxy_url, headers=headers)
            with urllib.request.urlopen(req_p, timeout=5) as p_resp:
                p_html = p_resp.read().decode('utf-8', errors='ignore')
            gdn_in_proxy = re.search(r'((?:https?:)?//[^\s"\']*?\.gdn\.poki\.com/[^\s"\'\\]+)', p_html)
            if gdn_in_proxy:
                uri = gdn_in_proxy.group(1)
                if uri.startswith('//'):
                    uri = 'https:' + uri
                GAME_CACHE[slug] = uri
                save_cache()
                return uri
    except Exception as e:
        print(f"Error resolving slug '{slug}': {e}")

    return None

FALLBACK_GAME_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Pratham Games - Mini Runner</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #faf9f5;
    color: #111827;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    overflow: hidden;
  }
  #gameCanvas {
    background: #ffffff;
    border: 2px solid #18181b;
    border-radius: 12px;
    box-shadow: 4px 4px 0px #18181b;
  }
  .hud {
    margin-bottom: 14px;
    display: flex;
    gap: 16px;
    align-items: center;
    font-size: 1rem;
    font-weight: 700;
  }
  .hud-badge {
    background: #da7756;
    color: #ffffff;
    border: 1.5px solid #18181b;
    box-shadow: 2px 2px 0px #18181b;
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 800;
  }
  .instructions {
    margin-top: 14px;
    color: #6b7280;
    font-size: 0.88rem;
    font-weight: 600;
  }
</style>
</head>
<body>
  <div class="hud">
    <span class="hud-badge">🎮 PRATHAM GAMES</span>
    <span>Score: <span id="scoreVal" style="color: #da7756;">0</span></span>
    <span>Best: <span id="highVal" style="color: #18181b;">0</span></span>
  </div>
  <canvas id="gameCanvas" width="640" height="360"></canvas>
  <div class="instructions">Press [SPACE] or Click to Jump! Dodge obstacles.</div>

  <script>
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    let score = 0, high = 0, gameOver = false, frame = 0;
    let player = { x: 70, y: 280, w: 32, h: 32, vy: 0, jump: -11, ground: 280, grounded: true };
    let obstacles = [];

    function jump() {
      if (gameOver) { resetGame(); return; }
      if (player.grounded) {
        player.vy = player.jump;
        player.grounded = false;
      }
    }

    window.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); jump(); } });
    canvas.addEventListener('click', jump);

    function resetGame() {
      score = 0;
      frame = 0;
      obstacles = [];
      player.y = player.ground;
      player.vy = 0;
      player.grounded = true;
      gameOver = false;
    }

    function update() {
      if (!gameOver) {
        frame++;
        if (frame % 80 === 0) {
          obstacles.push({ x: canvas.width, w: 24, h: 28 + Math.random() * 24 });
        }

        player.vy += 0.55;
        player.y += player.vy;
        if (player.y >= player.ground) {
          player.y = player.ground;
          player.vy = 0;
          player.grounded = true;
        }

        for (let i = obstacles.length - 1; i >= 0; i--) {
          let o = obstacles[i];
          o.x -= 5.5;
          if (o.x + o.w < 0) {
            obstacles.splice(i, 1);
            score += 10;
            if (score > high) high = score;
          }
          // Collision
          let oy = canvas.height - 48 - o.h;
          if (player.x + player.w > o.x && player.x < o.x + o.w && player.y + player.h > oy) {
            gameOver = true;
          }
        }

        document.getElementById('scoreVal').innerText = score;
        document.getElementById('highVal').innerText = high;
      }

      // Draw
      ctx.fillStyle = '#faf9f5';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Ground
      ctx.fillStyle = '#f3f2eb';
      ctx.fillRect(0, canvas.height - 48, canvas.width, 48);
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, canvas.height - 50, canvas.width, 2);

      // Player
      ctx.fillStyle = '#da7756';
      ctx.fillRect(player.x, player.y, player.w, player.h);
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(player.x, player.y, player.w, player.h);
      ctx.fillStyle = '#fff';
      ctx.fillRect(player.x + player.w - 10, player.y + 6, 6, 6);

      // Obstacles
      ctx.fillStyle = '#18181b';
      obstacles.forEach(o => {
        let oy = canvas.height - 48 - o.h;
        ctx.fillRect(o.x, oy, o.w, o.h);
      });

      if (gameOver) {
        ctx.fillStyle = 'rgba(250, 249, 245, 0.88)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 10);
        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#da7756';
        ctx.fillText('Click or Press SPACE to Retry', canvas.width / 2, canvas.height / 2 + 25);
      }

      requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  </script>
</body>
</html>"""

class PrathamGamesHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def do_HEAD(self):
        if self.path.startswith('/play-game/'):
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            return
        return super().do_HEAD()

    def do_GET(self):
        # Ignore empty/undefined requests from third-party scripts
        if self.path in ('/undefined', '/null'):
            self.send_response(204)
            self.end_headers()
            return

        # Route: /api/player-history
        if self.path.startswith('/api/player-history'):
            import urllib.parse
            parsed = urllib.parse.urlparse(self.path)
            qs = urllib.parse.parse_qs(parsed.query)
            player_name = sanitize_username(qs.get('name', [''])[0])
            now_ist = get_ist_now()
            date_full = now_ist.strftime('%d-%B-%Y')
            daily_file = os.path.join(PRATHAM_DATA_DIR, player_name, f"{date_full}.txt")
            lines = []
            if os.path.exists(daily_file):
                try:
                    with open(daily_file, 'r', encoding='utf-8') as f:
                        lines = [line.strip() for line in f if line.strip().startswith('[')]
                except Exception:
                    lines = []
            self.send_json_response({'success': True, 'player': player_name, 'date': date_full, 'history': lines})
            return

        # Route: /api/github-history
        if self.path == '/api/github-history':
            logs = []
            if os.path.exists(ACTIVITY_JSON_FILE):
                try:
                    with open(ACTIVITY_JSON_FILE) as f:
                        logs = json.load(f)
                except Exception:
                    logs = []
            self.send_json_response({'success': True, 'events': logs})
            return

        # Route: /api/github-config
        if self.path == '/api/github-config':
            cfg = load_github_config()
            self.send_json_response({'success': True, 'config': cfg})
            return

        # Route: /play-game/<slug>
        if self.path.startswith('/play-game/'):
            slug = self.path.split('/play-game/')[1].split('?')[0].strip('/')
            self.handle_play_game(slug)
            return

        # Handle legacy /en/g/<slug> URLs by redirecting to home with game param
        if self.path.startswith('/en/g/'):
            slug = self.path.split('/en/g/')[1].split('?')[0].strip('/')
            self.send_response(302)
            self.send_header('Location', f'/?game={slug}')
            self.end_headers()
            return

        # Handle category /en/<category> URLs
        if self.path.startswith('/en/'):
            cat = self.path.split('/en/')[1].split('?')[0].strip('/')
            self.send_response(302)
            self.send_header('Location', f'/?search={cat}')
            self.end_headers()
            return

        # Default static file serving
        return super().do_GET()

    def do_POST(self):
        # Route: /api/register-player
        if self.path == '/api/register-player':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
            except Exception:
                data = {}
            res = register_player_entry(data.get('name', 'Gamer'), data.get('age', 16))
            self.send_json_response({'success': True, 'player': res})
            return

        # Route: /api/log-gameplay
        if self.path == '/api/log-gameplay':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
            except Exception:
                data = {}
            name = data.get('name', 'Gamer')
            age = data.get('age', 16)
            game_title = data.get('gameTitle', 'Game')
            category = data.get('category', 'Arcade')
            score = data.get('score', 'Active')
            duration = data.get('duration', '0m')
            log_gameplay_entry(name, age, game_title, category, score, duration)
            self.send_json_response({'success': True})
            return

        # Route: /api/github-telemetry
        if self.path == '/api/github-telemetry':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
            except Exception:
                data = {}
            entry = record_activity_event(data)
            self.send_json_response({'success': True, 'entry': entry})
            return

        # Route: /api/github-config
        if self.path == '/api/github-config':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                cfg = load_github_config()
                cfg.update(data)
                save_github_config(cfg)

                # If remote_url is provided, set it in git
                remote_url = data.get('remote_url')
                if remote_url:
                    subprocess.run(['git', '-C', BASE_DIR, 'remote', 'remove', 'origin'], capture_output=True)
                    subprocess.run(['git', '-C', BASE_DIR, 'remote', 'add', 'origin', remote_url], capture_output=True)

                self.send_json_response({'success': True, 'config': cfg})
            except Exception as e:
                self.send_json_response({'success': False, 'error': str(e)}, status=400)
            return

        self.send_response(404)
        self.end_headers()

    def send_json_response(self, obj, status=200):
        body = json.dumps(obj).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def handle_play_game(self, slug):
        game_uri = resolve_game_slug(slug)

        if not game_uri:
            # Serve fallback game HTML
            self.serve_html(FALLBACK_GAME_HTML)
            return

        try:
            req = urllib.request.Request(game_uri, headers={
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://games.poki.com/'
            })
            with urllib.request.urlopen(req, timeout=6) as response:
                html = response.read().decode('utf-8', errors='ignore')

                # Base tag pointing to asset directory (strip query params first)
                clean_uri = game_uri.split('?')[0]
                base_url = clean_uri.rsplit('/', 1)[0] + '/'

                # Ad-free PokiSDK mock that resolves immediately
                mock_sdk_template = """
<base href="__BASE_URL__">
<script>
(function() {
  'use strict';
  var noop = function() {};
  var resolvedPromise = function(val) { return Promise.resolve(val); };

  var PokiMock = {
    init: function() { return resolvedPromise(); },
    initWithVideoHB: function() { return resolvedPromise(); },
    commercialBreak: function() { return resolvedPromise(); },
    rewardedBreak: function() { return resolvedPromise(true); },
    displayAd: function(e, t, o, i) {
      if (typeof i === 'function') i(true);
      if (typeof o === 'function') o();
      return resolvedPromise();
    },
    destroyAd: noop,
    getLeaderboard: function() { return resolvedPromise([]); },
    shareableURL: function() { return resolvedPromise(window.location.href); },
    getURLParam: function() { return ''; },
    getLanguage: function() { return (navigator.language || 'en').split('-')[0]; },
    getDeviceInfo: function() { return { category: 'desktop' }; },
    isAdBlocked: function() { return false; },
    getUser: function() { return resolvedPromise({ id: 'pratham_user', name: 'Gamer' }); },
    getToken: function() { return resolvedPromise('pratham_token'); },
    login: function() { return resolvedPromise({ id: 'pratham_user' }); },
    generateScreenshot: function() { return resolvedPromise(''); },
    measure: noop,
    captureError: noop,
    customEvent: noop,
    gameInteractive: noop,
    gameLoadingFinished: noop,
    gameLoadingProgress: noop,
    gameLoadingStart: noop,
    gameplayStart: noop,
    gameplayStop: noop,
    happyTime: noop,
    logError: noop,
    muteAd: noop,
    roundEnd: noop,
    roundStart: noop,
    sendHighscore: noop,
    setDebug: noop,
    setDebugTouchOverlayController: noop,
    setLogging: noop,
    setPlayerAge: noop,
    setPlaytestCanvas: noop,
    enableEventTracking: noop,
    openExternalLink: noop,
    playtestSetCanvas: noop,
    playtestCaptureHtmlOnce: noop,
    playtestCaptureHtmlForce: noop,
    playtestCaptureHtmlOn: noop,
    playtestCaptureHtmlOff: noop,
    movePill: noop,
    showLeaderboard: function() { return resolvedPromise([]); }
  };

  var pokiProxy = new Proxy(PokiMock, {
    get: function(target, prop) {
      if (prop in target) return target[prop];
      return function() { return resolvedPromise(true); };
    }
  });

  try {
    Object.defineProperty(window, 'PokiSDK', {
      value: pokiProxy,
      writable: false,
      configurable: false
    });
  } catch(e) {
    window.PokiSDK = pokiProxy;
  }
})();
</script>
"""
                mock_sdk = mock_sdk_template.replace('__BASE_URL__', base_url)
                # 1. Remove all Poki SDK script tags so they cannot override our mock SDK
                html = re.sub(r'<script[^>]*src=[\'"][^\'"]*poki-sdk[^\'"]*[\'"][^>]*>\s*</script>', '', html, flags=re.IGNORECASE)
                # 2. Strip out Poki video ad containers and house ads
                html = re.sub(r'<div[^>]*id=["\'](?:adInfo|poki-video-ad-container)["\'][^>]*>.*?</div>', '', html, flags=re.DOTALL | re.IGNORECASE)
                # 3. Inject our mock SDK and base tag into <head>
                if '<head>' in html:
                    html = html.replace('<head>', '<head>' + mock_sdk, 1)
                elif '<head ' in html:
                    html = re.sub(r'(<head[^>]*>)', r'\1' + mock_sdk, html, count=1)
                else:
                    html = mock_sdk + html

                self.serve_html(html)

        except Exception as e:
            print(f"Error serving game {slug}: {e}")
            self.serve_html(FALLBACK_GAME_HTML)

    def serve_html(self, html_str):
        content_bytes = html_str.encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(content_bytes)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('X-Frame-Options', 'ALLOWALL')
        self.end_headers()
        self.wfile.write(content_bytes)

if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('', PORT), PrathamGamesHandler) as httpd:
        print(f"Pratham Games Server active on port {PORT}...")
        httpd.serve_forever()
