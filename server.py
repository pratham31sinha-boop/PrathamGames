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
HTML_CACHE_DIR = os.path.join(BASE_DIR, 'games_html_cache')
os.makedirs(PRATHAM_DATA_DIR, exist_ok=True)
os.makedirs(HTML_CACHE_DIR, exist_ok=True)

def async_git_commit(message):
    def _worker():
        try:
            subprocess.run(['git', '-C', BASE_DIR, 'add', 'PrathamGames/data/'], capture_output=True)
            subprocess.run(['git', '-C', BASE_DIR, 'commit', '-m', message], capture_output=True)
        except Exception as e:
            print(f"Git commit error: {e}")
    threading.Thread(target=_worker, daemon=True).start()

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

    # Git auto-commit (Async)
    cfg = load_github_config()
    if cfg.get('auto_git_commit', True):
        async_git_commit(f"Register player: {clean_name} (Age: {age_str}) [IST]")

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

    # Git auto-commit (Async)
    cfg = load_github_config()
    if cfg.get('auto_git_commit', True):
        async_git_commit(f"Gameplay: {clean_name} - {game_title} [{time_ist}]")

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

GAME_RELOAD_HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Connecting to Game...</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #faf9f5;
    color: #18181b;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 1.5rem;
  }
  .reload-card {
    background: #ffffff;
    border: 2px solid #18181b;
    border-radius: 16px;
    box-shadow: 4px 4px 0px #18181b;
    max-width: 440px;
    width: 100%;
    padding: 2.25rem 2rem;
    text-align: center;
  }
  .reload-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    display: inline-block;
  }
  h2 {
    font-size: 1.35rem;
    font-weight: 850;
    margin-bottom: 0.5rem;
  }
  p {
    color: #6b7280;
    font-size: 0.9rem;
    line-height: 1.5;
    margin-bottom: 1.5rem;
  }
  .retry-btn {
    background: #da7756;
    color: #ffffff;
    border: 2px solid #18181b;
    border-radius: 8px;
    padding: 0.75rem 1.75rem;
    font-size: 0.95rem;
    font-weight: 800;
    cursor: pointer;
    box-shadow: 2.5px 2.5px 0px #18181b;
    transition: all 0.15s ease;
  }
  .retry-btn:hover {
    transform: translateY(-2px);
    box-shadow: 4px 4px 0px #18181b;
  }
</style>
</head>
<body>
  <div class="reload-card">
    <div class="reload-icon">🎮</div>
    <h2>Connecting to __GAME_TITLE__</h2>
    <p>The game stream is temporarily connecting. Tap below to launch your game directly.</p>
    <button class="retry-btn" onclick="window.location.reload()">🔄 Launch Actual Game</button>
  </div>
</body>
</html>"""

MOCK_SDK_TEMPLATE = """
<base href="__BASE_URL__">
<script>
(function() {
  'use strict';
  var noop = function() {};
  var resolvedPromise = function(val) { return Promise.resolve(val); };

  // Intercept slow dynamic script injections (e.g. ad networks, tracking)
  try {
    var _origCreate = document.createElement;
    document.createElement = function(tag) {
      var el = _origCreate.apply(document, arguments);
      if (typeof tag === 'string' && tag.toLowerCase() === 'script') {
        var _origSetAttr = el.setAttribute;
        el.setAttribute = function(name, val) {
          if (name && name.toLowerCase() === 'src' && typeof val === 'string' && (val.indexOf('poki-sdk') !== -1 || val.indexOf('t2.js') !== -1)) {
            setTimeout(function() {
              if (typeof el.onload === 'function') el.onload();
              el.dispatchEvent(new Event('load'));
            }, 0);
            return;
          }
          return _origSetAttr.apply(el, arguments);
        };
      }
      return el;
    };
  } catch(e) {}

  // Disable service workers inside iframe to prevent hanging
  try {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.register = function() {
        return Promise.reject(new Error('SW disabled'));
      };
    }
  } catch(e) {}

  var PokiMock = {
    init: function(opts) {
      if (opts && typeof opts === 'object') {
        if (typeof opts.submitScore === 'function') {
          try { opts.submitScore(function() {}); } catch(e) {}
        }
        if (typeof opts.onReady === 'function') {
          try { opts.onReady(); } catch(e) {}
        }
      }
      if (typeof arguments[0] === 'function') {
        try { arguments[0](); } catch(e) {}
      }
      return resolvedPromise();
    },
    initWithVideoHB: function() { return resolvedPromise(); },
    commercialBreak: function(fn) {
      if (typeof fn === 'function') {
        try { fn(); } catch(e) {}
      }
      return resolvedPromise();
    },
    rewardedBreak: function(fn) {
      if (typeof fn === 'function') {
        try { fn(true); } catch(e) {}
      }
      return resolvedPromise(true);
    },
    displayAd: function(e, t, o, i) {
      if (typeof i === 'function') i(true);
      if (typeof o === 'function') o();
      if (typeof e === 'function') e();
      return resolvedPromise();
    },
    destroyAd: noop,
    getLeaderboard: function() { return resolvedPromise([]); },
    shareableURL: function() { return resolvedPromise(window.location.href); },
    getURLParam: function(p) {
      try {
        return new URLSearchParams(window.location.search).get(p) || '';
      } catch(e) { return ''; }
    },
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
      return function() {
        var lastArg = arguments[arguments.length - 1];
        if (typeof lastArg === 'function') {
          try { lastArg(true); } catch(e) {}
        }
        return resolvedPromise(true);
      };
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

  window.pokiReady = true;
  window.pokiAdBlock = false;
  window.PokiSDKInited = true;
  window.isPokiSDKInited = true;

  // Cross-origin Worker polyfill using Blob and importScripts
  try {
    var _origWorker = window.Worker;
    if (_origWorker) {
      window.Worker = function(scriptURL, options) {
        try {
          var resolved = new URL(scriptURL, document.baseURI || window.location.href).href;
          if (resolved.indexOf(window.location.origin) !== 0) {
            var blobCode = 'importScripts(' + JSON.stringify(resolved) + ');';
            var blob = new Blob([blobCode], { type: 'application/javascript' });
            return new _origWorker(URL.createObjectURL(blob), options);
          }
          return new _origWorker(resolved, options);
        } catch(e) {
          return new _origWorker(scriptURL, options);
        }
      };
    }
  } catch(e) {}

  // Universal onload handler: ensures window.onload runs even if assigned after DOM load
  try {
    var _assignedOnload = null;
    Object.defineProperty(window, 'onload', {
      get: function() { return _assignedOnload; },
      set: function(fn) {
        _assignedOnload = fn;
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
          setTimeout(function() {
            if (typeof fn === 'function') {
              try { fn(); } catch(e) {}
            }
          }, 10);
        }
      },
      configurable: true
    });
  } catch(e) {}

  // Transparent CORS proxy for external game APIs (e.g. minefun.io, vectaria.io, supabase)
  try {
    var PROXY_DOMAINS = ['minefun.io', 'vectaria.io', 'supabase.co', 'pangolinworks.dev', 'cryzen.io', 'sushiparty.io'];
    var shouldProxy = function(u) {
      if (typeof u !== 'string') return false;
      for (var i = 0; i < PROXY_DOMAINS.length; i++) {
        if (u.indexOf(PROXY_DOMAINS[i]) !== -1) return true;
      }
      return false;
    };

    var _origFetch = window.fetch;
    if (_origFetch) {
      window.fetch = function(input, init) {
        var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
        if (shouldProxy(url)) {
          var proxyUrl = '/api/cors-proxy?url=' + encodeURIComponent(url);
          if (typeof input === 'string') {
            input = proxyUrl;
          } else if (input && input.url) {
            input = new Request(proxyUrl, input);
          }
        }
        return _origFetch.call(this, input, init).then(function(res) {
          if (typeof url === 'string' && (url.indexOf('.gz') !== -1 || url.indexOf('.unityweb') !== -1)) {
            var origGet = res.headers.get.bind(res.headers);
            res.headers.get = function(name) {
              if (name && name.toLowerCase() === 'content-encoding') {
                return origGet(name) || 'gzip';
              }
              return origGet(name);
            };
          }
          return res;
        });
      };
    }

    var _origXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, async, user, pass) {
      if (shouldProxy(url)) {
        url = '/api/cors-proxy?url=' + encodeURIComponent(url);
      }
      return _origXhrOpen.call(this, method, url, async !== false, user, pass);
    };
  } catch(e) {}

  // Poll for Unity bridge and signal ready immediately
  var bridgeInterval = setInterval(function() {
    if (window.pokiBridge && window.unityGame && typeof window.unityGame.SendMessage === 'function') {
      try {
        window.unityGame.SendMessage(window.pokiBridge, 'ready');
        clearInterval(bridgeInterval);
      } catch(e) {}
    }
  }, 100);
  setTimeout(function() { clearInterval(bridgeInterval); }, 10000);
})();
</script>
"""

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

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Access-Control-Allow-Credentials', 'true')
        self.send_header('Access-Control-Max-Age', '86400')
        self.end_headers()

    def do_GET(self):
        # Ignore empty/undefined requests from third-party scripts
        if self.path in ('/undefined', '/null'):
            self.send_response(204)
            self.end_headers()
            return

        # Route: /api/cors-proxy
        if self.path.startswith('/api/cors-proxy'):
            self.handle_cors_proxy('GET')
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
        # Route: /api/cors-proxy
        if self.path.startswith('/api/cors-proxy'):
            self.handle_cors_proxy('POST')
            return

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

    def do_PUT(self):
        if self.path.startswith('/api/cors-proxy'):
            self.handle_cors_proxy('PUT')
            return
        self.send_response(404)
        self.end_headers()

    def handle_cors_proxy(self, method):
        import urllib.parse
        parsed = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(parsed.query)
        target_url = qs.get('url', [''])[0]
        if not target_url:
            self.send_response(400)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            return

        req_headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*'
        }
        for h, v in self.headers.items():
            h_lower = h.lower()
            if h_lower not in ('host', 'origin', 'referer', 'content-length', 'connection', 'accept-encoding'):
                req_headers[h] = v

        if 'minefun' in target_url:
            req_headers['Origin'] = 'https://c89f4abe-5041-497b-8705-986b6f3b748c.poki-gdn.com'
            req_headers['Referer'] = 'https://c89f4abe-5041-497b-8705-986b6f3b748c.poki-gdn.com/'
        elif 'vectaria' in target_url:
            req_headers['Origin'] = 'https://e00d1cab-5c0c-46e5-8f15-e409e1215622.poki-gdn.com'
            req_headers['Referer'] = 'https://e00d1cab-5c0c-46e5-8f15-e409e1215622.poki-gdn.com/'
        else:
            req_headers['Origin'] = 'https://games.poki.com'
            req_headers['Referer'] = 'https://games.poki.com/'

        body = None
        if method in ('POST', 'PUT', 'PATCH'):
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                if content_len > 0:
                    body = self.rfile.read(content_len)
            except Exception:
                body = None

        try:
            req = urllib.request.Request(target_url, data=body, headers=req_headers, method=method)
            with urllib.request.urlopen(req, timeout=12) as resp:
                resp_data = resp.read()
                self.send_response(resp.status)
                for h, v in resp.getheaders():
                    if h.lower() not in ('transfer-encoding', 'content-encoding', 'access-control-allow-origin', 'access-control-allow-credentials', 'content-security-policy'):
                        self.send_header(h, v)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Credentials', 'true')
                self.end_headers()
                self.wfile.write(resp_data)
        except urllib.error.HTTPError as e:
            try:
                err_data = e.read()
            except Exception:
                err_data = b''
            self.send_response(e.code)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Credentials', 'true')
            self.send_header('Content-Type', e.headers.get('Content-Type', 'text/plain'))
            self.end_headers()
            self.wfile.write(err_data)
        except Exception as e:
            self.send_response(502)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(str(e).encode('utf-8'))

    def send_json_response(self, obj, status=200):
        body = json.dumps(obj).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def handle_play_game(self, slug):
        cached_file = os.path.join(HTML_CACHE_DIR, f"{slug}.html")
        if os.path.exists(cached_file) and os.path.getsize(cached_file) > 100:
            try:
                with open(cached_file, 'r', encoding='utf-8') as f:
                    html = f.read()
                self.serve_html(html)
                return
            except Exception as e:
                print(f"Error reading disk cache for {slug}: {e}")

        # Check if slug is a sub-resource path (e.g. scripts/jobworker.js or slug/subpath)
        ref_slug = None
        subpath = slug
        if '/' in slug:
            parts = slug.split('/', 1)
            if parts[0] in GAME_CACHE or os.path.exists(os.path.join(HTML_CACHE_DIR, f"{parts[0]}.html")):
                ref_slug = parts[0]
                subpath = parts[1]

        if not ref_slug:
            referer = self.headers.get('Referer', '')
            if '/play-game/' in referer:
                ref_slug = referer.split('/play-game/')[1].split('?')[0].strip('/').split('/')[0]
            elif '?game=' in referer:
                ref_slug = referer.split('?game=')[1].split('&')[0].strip('/')

        if ref_slug:
            base_url = None
            if ref_slug in GAME_CACHE:
                clean_uri = GAME_CACHE[ref_slug].split('?')[0]
                base_url = clean_uri.rsplit('/', 1)[0] + '/'
            else:
                ref_file = os.path.join(HTML_CACHE_DIR, f"{ref_slug}.html")
                if os.path.exists(ref_file):
                    try:
                        with open(ref_file, 'r', encoding='utf-8') as f:
                            m = re.search(r'<base\s+href=[\'"]([^\'"]+)[\'"]', f.read())
                            if m:
                                base_url = m.group(1)
                    except Exception:
                        pass

            if base_url:
                target_url = urllib.parse.urljoin(base_url, subpath)
                try:
                    req = urllib.request.Request(target_url, headers={
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Referer': 'https://games.poki.com/'
                    })
                    with urllib.request.urlopen(req, timeout=10) as resp:
                        data = resp.read()
                        self.send_response(resp.status)
                        ctype = resp.headers.get('Content-Type')
                        if not ctype or 'text/plain' in ctype:
                            if subpath.endswith('.js'): ctype = 'text/javascript; charset=utf-8'
                            elif subpath.endswith('.wasm'): ctype = 'application/wasm'
                            elif subpath.endswith('.json'): ctype = 'application/json'
                            elif subpath.endswith('.css'): ctype = 'text/css'
                            elif subpath.endswith('.png'): ctype = 'image/png'
                            elif subpath.endswith('.jpg') or subpath.endswith('.jpeg'): ctype = 'image/jpeg'
                        self.send_header('Content-Type', ctype)
                        upstream_enc = resp.headers.get('Content-Encoding')
                        if upstream_enc:
                            self.send_header('Content-Encoding', upstream_enc)
                        elif subpath.endswith('.gz') or subpath.endswith('.unityweb'):
                            self.send_header('Content-Encoding', 'gzip')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        self.wfile.write(data)
                        return
                except Exception as e:
                    print(f"Error proxying subpath {subpath} for {ref_slug}: {e}")

        # If not already cached on disk, resolve and fetch with retry
        game_uri = resolve_game_slug(slug)
        if not game_uri:
            self.serve_html(GAME_RELOAD_HTML_TEMPLATE.replace('__GAME_TITLE__', slug.replace('-', ' ').title()))
            return

        for attempt in range(3):
            try:
                clean_uri = game_uri.split('?')[0]
                base_url = clean_uri.rsplit('/', 1)[0] + '/'
                req = urllib.request.Request(game_uri, headers={
                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://games.poki.com/'
                })
                with urllib.request.urlopen(req, timeout=12) as response:
                    html = response.read().decode('utf-8', errors='ignore')
                    mock_sdk = MOCK_SDK_TEMPLATE.replace('__BASE_URL__', base_url)
                    html = re.sub(r'<script[^>]*src=[\'"][^\'"]*poki-sdk[^\'"]*[\'"][^>]*>\s*</script>', '', html, flags=re.IGNORECASE)
                    html = re.sub(r'<div[^>]*id=["\'](?:adInfo|poki-video-ad-container)["\'][^>]*>.*?</div>', '', html, flags=re.DOTALL | re.IGNORECASE)
                    if '<head>' in html:
                        html = html.replace('<head>', '<head>' + mock_sdk, 1)
                    elif '<head ' in html:
                        html = re.sub(r'(<head[^>]*>)', r'\1' + mock_sdk, html, count=1)
                    else:
                        html = mock_sdk + html

                    # Fix Defold engine games (e.g. monkey-mart, level-devil) where runApp waits on poki_sdk_loaded
                    html = html.replace('var isPokiSDKInited = false;', 'var isPokiSDKInited = true;')
                    if 'poki_sdk_loaded' in html and 'try { poki_sdk_loaded(); }' not in html:
                        html = re.sub(r'(function\s+poki_sdk_loaded\s*\(\)\s*\{[\s\S]*?\n\t*\})', r'\1\n\ttry { poki_sdk_loaded(); } catch(e) {}', html)

                    # Persist to disk cache so it loads in 0ms on next click
                    try:
                        with open(cached_file, 'w', encoding='utf-8') as f:
                            f.write(html)
                    except Exception:
                        pass

                    self.serve_html(html)
                    return
            except Exception as e:
                print(f"Fetch attempt {attempt+1} failed for {slug}: {e}")
                time.sleep(0.4)

        # Serve clean retry screen (NEVER fake runner game!)
        self.serve_html(GAME_RELOAD_HTML_TEMPLATE.replace('__GAME_TITLE__', slug.replace('-', ' ').title()))

    def serve_html(self, html_str):
        content_bytes = html_str.encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(content_bytes)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('X-Frame-Options', 'ALLOWALL')
        self.end_headers()
        self.wfile.write(content_bytes)

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

if __name__ == '__main__':
    with ThreadedHTTPServer(('', PORT), PrathamGamesHandler) as httpd:
        print(f"Pratham Games Multi-Threaded Server active on port {PORT}...")
        httpd.serve_forever()
