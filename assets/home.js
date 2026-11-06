/* PatGames home v2 — game library + public request board */
(function () {
    'use strict';

    // Request board API (PatGames server on Runable). Change this if the server moves.
    var API_BASE = window.PG_API || 'https://patgame-9me4c4v-preview-4200.runable.site';

    var GAMES = [
        { id: 'tycoon-town', name: 'Tycoon Town', emoji: '🏙️', ver: 'v1.0', isNew: true, color: '#ffc94a', genre: 'Strategy · Board',
          desc: 'Monopoly-style property game: buy streets, build houses and hotels, trade and auction. Up to 6 friends online with a room code, or vs bots.',
          modes: ['online', 'local', 'solo'], players: '2–6P', cats: ['online', 'local', 'strategy'] },
        { id: 'beat-battle', name: 'Beat Battle', emoji: '🎤', ver: 'v1.0', color: '#ff3fbf', genre: 'Rhythm',
          desc: 'Friday Night Funkin\'-style rhythm battles on a neon rooftop. 3 songs, 3 difficulties, solo vs CPU, local 2-player and online 1v1.',
          modes: ['online', 'local', 'solo'], players: '1–2P', cats: ['online', 'local', 'action'] },
        { id: 'spin-rev', name: 'Spin Rev', emoji: '🌀', ver: 'v1.2', color: '#00f0ff', genre: 'Idle · Clicker',
          desc: '150 spinners revealed as you buy, bulk buying, pets, rebirths, ascension and on-device profiles.',
          modes: ['solo'], players: '1P', cats: ['idle'] },
        { id: 'tag', name: 'Tag', emoji: '🏃', ver: 'v1.0', color: '#ff006a', genre: 'Action · Party',
          desc: 'Fast local multiplayer tag for up to 4 players on one keyboard. Chase, dodge, and don\'t be "it" when time runs out!',
          modes: ['local'], players: '2–4P', cats: ['local', 'action'] },
        { id: 'block-breaker', name: 'Block Breaker Idle', emoji: '🧱', ver: 'v1.1', color: '#b400ff', genre: 'Idle · Arcade',
          desc: 'The Big Break Update: 9 ball types, 27 upgrades, missions, achievements, wave events, bosses and overdrive.',
          modes: ['solo'], players: '1P', cats: ['idle'] },
        { id: 'survivor-zombie', name: 'Survivor Zombie', emoji: '🧟', ver: 'v1.0', color: '#00ff88', genre: 'Survival · Co-op',
          desc: 'Chop trees, mine stone, build walls, and survive endless zombie nights — alone or online with friends.',
          modes: ['online', 'solo'], players: '1–4P', cats: ['online', 'action'] },
        { id: 'clicker', name: 'Dog Clicker', emoji: '🐕', ver: 'v1.0', color: '#ffcc00', genre: 'Idle · Clicker',
          desc: 'Click the dog, earn treats! Buy kibble, tennis balls and squeaky toys and build a dog empire.',
          modes: ['solo'], players: '1P', cats: ['idle'] },
        { id: 'backrooms', name: 'Backrooms: No-Clip Room', emoji: '🚪', ver: 'v1.0', color: '#e8c547', genre: 'Horror · Co-op',
          desc: 'Descend the yellow levels with friends, manage your flashlight and sanity, revive downed players, and outrun 12 entities.',
          modes: ['online', 'solo'], players: '1–4P', cats: ['online', 'horror'] }
    ];
    var BY_ID = {};
    GAMES.forEach(function (g) { BY_ID[g.id] = g; });

    var FILTERS = [
        { id: 'all', label: 'All' },
        { id: 'online', label: '🌐 Online' },
        { id: 'local', label: '🎮 Same device' },
        { id: 'idle', label: '⏳ Idle' },
        { id: 'action', label: '⚡ Action' },
        { id: 'strategy', label: '🧠 Strategy' },
        { id: 'horror', label: '👻 Horror' },
        { id: 'fav', label: '★ Favorites' }
    ];
    var MODE_PILL = { online: ['pill-online', '● Online'], local: ['pill-local', '⌨ Same device'], solo: ['pill-solo', '◆ Solo'] };
    var STATUS = { open: 'Open', planned: 'Planned', building: 'In progress', done: 'Done ✓', declined: 'Not planned' };

    // ---------- storage ----------
    function load(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
    function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
    var favs = load('pg_favs', []);
    var recent = load('pg_recent', []);
    var cid = load('pg_cid', null);
    if (!cid) {
        cid = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
        save('pg_cid', cid);
    }
    var params = new URLSearchParams(location.search);
    if (params.get('admin')) { save('pg_admin', params.get('admin')); history.replaceState(null, '', location.pathname + location.hash); }
    var adminKey = load('pg_admin', '');

    // ---------- helpers ----------
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function ago(ms) {
        var s = Math.max(1, Math.round((Date.now() - ms) / 1000));
        if (s < 60) return 'just now';
        var m = Math.round(s / 60); if (m < 60) return m + 'm ago';
        var h = Math.round(m / 60); if (h < 24) return h + 'h ago';
        var d = Math.round(h / 24); if (d < 30) return d + 'd ago';
        return new Date(ms).toLocaleDateString();
    }
    var toastT;
    function toast(msg) {
        var t = $('#toast'); t.textContent = msg; t.classList.add('show');
        clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2600);
    }
    function rpc(path, input) {
        return fetch(API_BASE + '/api/rpc/' + path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ json: input || {} })
        }).then(function (r) {
            return r.json().catch(function () { return {}; }).then(function (body) {
                if (!r.ok) {
                    var msg = (body && body.json && body.json.message) || 'Something went wrong (' + r.status + ')';
                    var err = new Error(msg); err.status = r.status; throw err;
                }
                return body.json;
            });
        });
    }

    // ---------- stats ----------
    var onlineCount = GAMES.filter(function (g) { return g.modes.indexOf('online') >= 0; }).length;
    $('#stats').innerHTML =
        '<div class="stat" style="--c:var(--cyan)"><b>' + GAMES.length + '</b><span>games</span></div>' +
        '<div class="stat" style="--c:var(--green)"><b>' + onlineCount + '</b><span>play online</span></div>' +
        '<div class="stat" style="--c:var(--yellow)"><b id="statReq">—</b><span>requests</span></div>' +
        '<div class="stat" style="--c:var(--pink)"><b>$0</b><span>always free</span></div>';

    // ---------- games ----------
    var filter = 'all', query = '';
    function renderFilters() {
        $('#filters').innerHTML = FILTERS.map(function (f) {
            var n = f.id === 'all' ? GAMES.length : f.id === 'fav' ? favs.length : GAMES.filter(function (g) { return g.cats.indexOf(f.id) >= 0; }).length;
            if (!n && f.id !== 'fav') return '';
            return '<button type="button" role="tab" class="chip' + (filter === f.id ? ' on' : '') + '" data-filter="' + f.id + '" aria-selected="' + (filter === f.id) + '">' + f.label + '<span class="n">' + n + '</span></button>';
        }).join('');
    }
    function cardHtml(g, i) {
        var isFav = favs.indexOf(g.id) >= 0;
        var href = 'games/' + g.id + '/';
        return '<article class="card" style="--c:' + g.color + ';animation-delay:' + (i * 45) + 'ms">' +
            '<a class="card-media" href="' + href + '" data-play="' + g.id + '" aria-label="Play ' + esc(g.name) + '">' +
                '<img src="assets/thumbs/' + g.id + '.jpg" alt="" loading="lazy" width="640" height="400">' +
                '<span class="card-play"><span>▶</span></span>' +
            '</a>' +
            '<div class="card-badges"><span class="ver' + (g.isNew ? ' new' : '') + '">' + g.ver + (g.isNew ? ' · NEW' : '') + '</span>' +
                '<button type="button" class="fav' + (isFav ? ' on' : '') + '" data-fav="' + g.id + '" aria-label="' + (isFav ? 'Unfavorite ' : 'Favorite ') + esc(g.name) + '" aria-pressed="' + isFav + '">' + (isFav ? '★' : '☆') + '</button></div>' +
            '<span class="card-emoji" aria-hidden="true">' + g.emoji + '</span>' +
            '<div class="card-body">' +
                '<h3>' + esc(g.name) + '</h3>' +
                '<div class="genre">' + esc(g.genre) + '</div>' +
                '<p class="desc">' + esc(g.desc) + '</p>' +
                '<div class="tags">' + g.modes.map(function (m) { return '<span class="pill ' + MODE_PILL[m][0] + '">' + MODE_PILL[m][1] + '</span>'; }).join('') +
                    '<span class="pill">' + g.players + '</span></div>' +
                '<div class="card-foot"><a class="play" href="' + href + '" data-play="' + g.id + '">▶ Play</a>' +
                    '<button type="button" class="ask" data-open-request data-game="' + g.id + '" title="Request an update for ' + esc(g.name) + '">💡 Request</button></div>' +
            '</div></article>';
    }
    function renderGames() {
        var q = query.trim().toLowerCase();
        var list = GAMES.filter(function (g) {
            if (filter === 'fav' && favs.indexOf(g.id) < 0) return false;
            if (filter !== 'all' && filter !== 'fav' && g.cats.indexOf(filter) < 0) return false;
            if (q && (g.name + ' ' + g.genre + ' ' + g.desc).toLowerCase().indexOf(q) < 0) return false;
            return true;
        });
        $('#grid').innerHTML = list.map(cardHtml).join('');
        $('#emptyGames').hidden = list.length > 0;
        if (!list.length && filter === 'fav' && !q) $('#emptyGames').firstChild.textContent = 'No favorites yet — tap ☆ on a game. ';
        else $('#emptyGames').firstChild.textContent = 'No games match that. ';
    }
    function renderRecent() {
        var items = recent.map(function (id) { return BY_ID[id]; }).filter(Boolean).slice(0, 4);
        $('#recentWrap').hidden = !items.length;
        $('#recent').innerHTML = items.map(function (g) {
            return '<a class="recent-item" style="--c:' + g.color + '" href="games/' + g.id + '/" data-play="' + g.id + '"><img src="assets/thumbs/' + g.id + '.jpg" alt="" width="54" height="34"><b>' + esc(g.name) + '</b></a>';
        }).join('');
    }
    function markPlayed(id) {
        recent = [id].concat(recent.filter(function (x) { return x !== id; })).slice(0, 6);
        save('pg_recent', recent);
    }

    document.addEventListener('click', function (e) {
        var t = e.target.closest ? e.target : e.target.parentElement;
        var fav = t.closest('[data-fav]');
        if (fav) {
            e.preventDefault();
            var id = fav.getAttribute('data-fav');
            var i = favs.indexOf(id);
            if (i >= 0) favs.splice(i, 1); else favs.push(id);
            save('pg_favs', favs);
            toast(i >= 0 ? 'Removed from favorites' : '★ Added to favorites');
            renderFilters(); renderGames();
            return;
        }
        var play = t.closest('[data-play]');
        if (play) { markPlayed(play.getAttribute('data-play')); return; }
        var f = t.closest('[data-filter]');
        if (f) { filter = f.getAttribute('data-filter'); renderFilters(); renderGames(); return; }
        var open = t.closest('[data-open-request]');
        if (open) { openModal(open.getAttribute('data-game'), open.getAttribute('data-kind')); return; }
        if (t.closest('[data-close]')) { closeModal(); return; }
    });
    $('#search').addEventListener('input', function (e) { query = e.target.value; renderGames(); });
    $('#randomBtn').addEventListener('click', function () {
        var g = GAMES[Math.floor(Math.random() * GAMES.length)];
        toast('🎲 Launching ' + g.name + '…');
        markPlayed(g.id);
        setTimeout(function () { location.href = 'games/' + g.id + '/'; }, 650);
    });
    $('#spotlight').addEventListener('click', function () { markPlayed('tycoon-town'); });

    // ---------- request board ----------
    var items = [], sort = 'top', reqFilter = 'all', isAdmin = false, online = true;
    var REQ_FILTERS = [
        { id: 'all', label: 'All' },
        { id: 'update', label: '🛠 Updates' },
        { id: 'new', label: '✨ New games' },
        { id: 'active', label: '🚧 Planned / in progress' },
        { id: 'done', label: '✓ Done' },
        { id: 'mine', label: 'Mine' }
    ];
    function renderReqFilters() {
        $('#reqFilters').innerHTML = REQ_FILTERS.map(function (f) {
            return '<button type="button" class="chip' + (reqFilter === f.id ? ' on' : '') + '" data-reqfilter="' + f.id + '">' + f.label + '</button>';
        }).join('');
    }
    function reqHtml(r, i) {
        var g = r.game && BY_ID[r.game];
        var gameTag = r.kind === 'new'
            ? '<span class="game-tag" style="--c:#ffd34d">✨ New game idea</span>'
            : g ? '<span class="game-tag" style="--c:' + g.color + '">' + g.emoji + ' ' + esc(g.name) + '</span>'
                : '<span class="game-tag" style="--c:#9a99b3">🛠 ' + esc(r.game || 'Update') + '</span>';
        var admin = isAdmin
            ? '<div class="admin-row" data-admin="' + r.id + '">' +
                '<select aria-label="Status">' + Object.keys(STATUS).map(function (k) { return '<option value="' + k + '"' + (r.status === k ? ' selected' : '') + '>' + STATUS[k] + '</option>'; }).join('') + '</select>' +
                '<input aria-label="Reply" maxlength="300" placeholder="Reply from Pat…" value="' + esc(r.reply) + '">' +
                '<button type="button" data-admin-save>Save</button>' +
                '<button type="button" data-admin-hide>' + (r.hidden ? 'Unhide' : 'Hide') + '</button>' +
              '</div>'
            : '';
        return '<article class="req' + (r.hidden ? ' is-hidden' : '') + '" style="animation-delay:' + Math.min(i, 12) * 30 + 'ms">' +
            '<button type="button" class="vote' + (r.voted ? ' on' : '') + '" data-vote="' + r.id + '" aria-label="' + (r.voted ? 'Remove vote' : 'Vote for this') + '" aria-pressed="' + r.voted + '"><span class="arrow">▲</span><b>' + r.votes + '</b></button>' +
            '<div class="req-main">' +
                '<div class="req-top">' + gameTag + '<span class="st st-' + esc(r.status) + '">' + (STATUS[r.status] || esc(r.status)) + '</span>' + (r.hidden ? '<span class="st st-declined">Hidden</span>' : '') + '</div>' +
                '<h4>' + esc(r.title) + '</h4>' +
                (r.details ? '<p class="req-details">' + esc(r.details) + '</p>' : '') +
                (r.reply ? '<div class="reply"><b>Pat says</b>' + esc(r.reply) + '</div>' : '') +
                '<div class="req-meta"><span>by ' + esc(r.author) + '</span><span>' + ago(r.createdAt) + '</span>' +
                    (r.mine ? '<button type="button" class="del" data-del="' + r.id + '">delete</button>' : '') + '</div>' +
                admin +
            '</div></article>';
    }
    function renderBoard() {
        var board = $('#board');
        if (!online) {
            board.innerHTML = '<div class="board-offline"><b>The request board is taking a nap 😴</b>Couldn\'t reach the server right now. Try again in a bit.<br><button type="button" class="btn btn-ghost" id="retryBoard">↻ Try again</button></div>';
            return;
        }
        var list = items.filter(function (r) {
            if (reqFilter === 'update' || reqFilter === 'new') return r.kind === reqFilter;
            if (reqFilter === 'active') return r.status === 'planned' || r.status === 'building';
            if (reqFilter === 'done') return r.status === 'done';
            if (reqFilter === 'mine') return r.mine;
            return true;
        });
        list.sort(sort === 'top'
            ? function (a, b) { return (b.votes - a.votes) || (b.createdAt - a.createdAt); }
            : function (a, b) { return b.createdAt - a.createdAt; });
        var shown = items.filter(function (r) { return !r.hidden; }).length;
        $('#boardCount').textContent = shown + ' request' + (shown === 1 ? '' : 's') + ' · ' + items.reduce(function (n, r) { return n + (r.hidden ? 0 : r.votes); }, 0) + ' votes';
        $('#statReq').textContent = shown;
        if (!list.length) {
            board.innerHTML = '<div class="board-empty"><b>' + (items.length ? 'Nothing here yet' : 'No requests yet — be the first!') + '</b>Want a new level, a fix, or a whole new game? Ask for it.<br><button type="button" class="btn btn-cta" data-open-request>＋ New request</button></div>';
            return;
        }
        board.innerHTML = list.map(reqHtml).join('');
    }
    function loadBoard() {
        return rpc('requests/list', { clientId: cid, adminKey: adminKey || undefined }).then(function (res) {
            online = true;
            items = res.items || [];
            isAdmin = !!res.admin;
            $('#adminBar').hidden = !isAdmin;
            if (adminKey && !isAdmin) { save('pg_admin', ''); adminKey = ''; }
            renderBoard();
        }).catch(function () { online = false; renderBoard(); });
    }

    $('#board').addEventListener('click', function (e) {
        var v = e.target.closest('[data-vote]');
        if (v) {
            var id = +v.getAttribute('data-vote');
            var r = items.filter(function (x) { return x.id === id; })[0];
            if (!r) return;
            // optimistic
            r.voted = !r.voted; r.votes += r.voted ? 1 : -1;
            renderBoard();
            var nv = $('[data-vote="' + id + '"]'); if (nv) nv.classList.add('pop');
            rpc('requests/vote', { clientId: cid, id: id }).then(function (res) {
                r.votes = res.votes; r.voted = res.voted; renderBoard();
            }).catch(function (err) {
                r.voted = !r.voted; r.votes += r.voted ? 1 : -1; renderBoard(); toast(err.message);
            });
            return;
        }
        var d = e.target.closest('[data-del]');
        if (d) {
            if (!confirm('Delete your request?')) return;
            rpc('requests/remove', { clientId: cid, id: +d.getAttribute('data-del') }).then(function () { toast('Request deleted'); loadBoard(); }).catch(function (err) { toast(err.message); });
            return;
        }
        var row = e.target.closest('[data-admin]');
        if (row && (e.target.closest('[data-admin-save]') || e.target.closest('[data-admin-hide]'))) {
            var rid = +row.getAttribute('data-admin');
            var rr = items.filter(function (x) { return x.id === rid; })[0];
            var input = { adminKey: adminKey, id: rid };
            if (e.target.closest('[data-admin-hide]')) input.hidden = !rr.hidden;
            else { input.status = $('select', row).value; input.reply = $('input', row).value; }
            rpc('requests/moderate', input).then(function () { toast('Saved'); loadBoard(); }).catch(function (err) { toast(err.message); });
            return;
        }
        if (e.target.closest('#retryBoard')) { $('#board').innerHTML = '<div class="board-loading"><span class="spinner"></span> Loading requests…</div>'; loadBoard(); }
    });
    $('#reqFilters').addEventListener('click', function (e) {
        var f = e.target.closest('[data-reqfilter]'); if (!f) return;
        reqFilter = f.getAttribute('data-reqfilter'); renderReqFilters(); renderBoard();
    });
    $$('[data-sort]').forEach(function (b) {
        b.addEventListener('click', function () {
            sort = b.getAttribute('data-sort');
            $$('[data-sort]').forEach(function (x) { x.classList.toggle('on', x === b); });
            renderBoard();
        });
    });
    $('#adminOff').addEventListener('click', function () { save('pg_admin', ''); adminKey = ''; loadBoard(); });

    // ---------- request modal ----------
    var modal = $('#reqModal'), form = $('#reqForm');
    $('#gameSelect').innerHTML = GAMES.map(function (g) { return '<option value="' + g.id + '">' + g.emoji + ' ' + esc(g.name) + '</option>'; }).join('');
    form.author.value = load('pg_author', '');
    function syncKind() {
        var kind = form.querySelector('input[name=kind]:checked').value;
        $('#gameField').hidden = kind !== 'update';
        form.title.placeholder = kind === 'update' ? 'e.g. Add a hard mode to Beat Battle' : 'e.g. A racing game with power-ups';
    }
    function counts() {
        $$('.count', form).forEach(function (c) {
            var el = form[c.getAttribute('data-for')];
            c.textContent = el.value.length + '/' + el.maxLength;
        });
    }
    function openModal(game, kind) {
        form.reset();
        form.author.value = load('pg_author', '');
        var k = kind || 'update';
        form.querySelector('input[name=kind][value=' + k + ']').checked = true;
        if (game && BY_ID[game]) form.game.value = game;
        $('#formError').hidden = true;
        syncKind(); counts();
        modal.hidden = false;
        document.body.style.overflow = 'hidden';
        setTimeout(function () { form.title.focus(); }, 60);
    }
    function closeModal() { modal.hidden = true; document.body.style.overflow = ''; }
    $$('input[name=kind]', form).forEach(function (r) { r.addEventListener('change', syncKind); });
    form.addEventListener('input', counts);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) closeModal(); });
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var err = $('#formError');
        var kind = form.querySelector('input[name=kind]:checked').value;
        var title = form.title.value.trim();
        if (title.length < 4) { err.textContent = 'Give your request a title (at least 4 letters).'; err.hidden = false; form.title.focus(); return; }
        err.hidden = true;
        var btn = $('#submitBtn'); btn.disabled = true; btn.textContent = 'Posting…';
        save('pg_author', form.author.value.trim());
        rpc('requests/create', {
            clientId: cid, kind: kind, game: kind === 'update' ? form.game.value : undefined,
            title: title, details: form.details.value.trim(), author: form.author.value.trim()
        }).then(function () {
            closeModal();
            toast('🎉 Request posted! Everyone can see it now.');
            sort = 'new';
            $$('[data-sort]').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-sort') === 'new'); });
            reqFilter = 'all'; renderReqFilters();
            return loadBoard().then(function () { $('#requests').scrollIntoView({ behavior: 'smooth' }); });
        }).catch(function (er) {
            err.textContent = er.status ? er.message : 'Couldn\'t reach the request server. Check your internet and try again.';
            err.hidden = false;
        }).then(function () { btn.disabled = false; btn.textContent = 'Post request'; });
    });

    // ---------- boot ----------
    renderFilters(); renderGames(); renderRecent(); renderReqFilters();
    loadBoard();
    setInterval(function () { if (!document.hidden && modal.hidden) loadBoard(); }, 45000);
})();
