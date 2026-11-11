/* The original board buttons still handle every action and accessibility label. */
(() => {
  'use strict';

  const models = {
    guardian: 'guardiao', colossus: 'colosso', wolf: 'lobo',
    scout: 'batedor', soldier: 'soldado', archer: 'arqueiro'
  };
  const attacks = new Set([
    'hit', 'wolfHit', 'line', 'area', 'mark', 'execute', 'charge', 'fieldCharge', 'smash',
    'copyHit', 'copyWolfHit', 'copyLine', 'copyArea', 'copyCharge'
  ]);
  const modelFor = ({type, side}) => type === 'king' ? (side === 0 ? 'rei-sangue' : 'rei') : models[type];
  const preview = (piece) => '/pieces3d/previews/' + modelFor(piece) +
    (piece.type === 'king' ? '' : '-' + piece.side) + '.webp';
  const preferenceKey = 'khar-thal-board-visual';
  const graphicsOptions = {alpha: true, antialias: true, powerPreference: 'low-power'};

  function attack(id, kind, x, y) {
    return attacks.has(kind) && id != null && Number.isInteger(x) && Number.isInteger(y)
      ? {id, kind, x, y} : null;
  }

  function create(board, toggle, repaint) {
    if (!board || !toggle) return null;
    const installedWebApp = window.matchMedia?.('(display-mode: standalone)').matches;
    let enabled = /KharTallAndroid\//.test(navigator.userAgent) || !!installedWebApp;
    try {
      const preference = localStorage.getItem(preferenceKey);
      if (preference === '3d' || preference === 'classic') enabled = preference === '3d';
    } catch {}
    let scene = null;
    let loading = false;
    let unavailable = false;
    let snapshot = [];

    function status(state) {
      if (!enabled) return;
      const label = {
        ready: 'Peças 3D', loading: 'Carregando peças 3D',
        partial: 'Peças 3D · carregamento parcial', fallback: 'Miniaturas renderizadas'
      }[state];
      if (toggle.textContent !== label) toggle.textContent = label;
      toggle.title = state === 'fallback' ? 'Visualização renderizada dos modelos' : '';
    }

    function applyMode() {
      board.classList.toggle('kt-board-3d', enabled);
      toggle.setAttribute('aria-pressed', String(enabled));
      if (enabled) status(unavailable ? 'fallback' : 'ready');
      else {
        scene?.hide();
        toggle.textContent = 'Peças 3D';
        toggle.title = '';
      }
    }

    toggle.hidden = false;
    toggle.onclick = () => {
      enabled = !enabled;
      try { localStorage.setItem(preferenceKey, enabled ? '3d' : 'classic'); } catch {}
      applyMode();
      repaint();
    };
    applyMode();

    return {
      piece(piece, node, skinId) {
        if (!enabled) return null;
        node.classList.add('kt-miniature');
        const figure = document.createElement('span');
        figure.className = 'mini-figure mini-' + piece.type;
        figure.setAttribute('aria-hidden', 'true');
        const image = new Image();
        image.src = preview(piece);
        image.alt = '';
        image.draggable = false;
        figure.append(image);
        node.append(figure);
        const skin = window.KharTallSkins?.findSkin(skinId);
        const {id, type, side, x, y, hp} = piece;
        return {id, type, side, x, y, hp, node, model: modelFor(piece), color: skin?.color ?? null};
      },

      paint(pieces, strike, reset) {
        if (!enabled) return;
        snapshot = pieces;
        if (scene) {
          scene.sync(snapshot, strike, reset);
          return;
        }
        if (unavailable || loading) return;
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('webgl2', graphicsOptions);
        if (!context) {
          unavailable = true;
          status('fallback');
          return;
        }
        loading = true;
        status('loading');
        import('/pieces3d/board-scene.mjs').then(({BoardScene}) => {
          scene = new BoardScene(board, status, canvas, context, graphicsOptions);
          if (enabled) scene.sync(snapshot, null, true);
        }).catch(() => {
          unavailable = true;
          status('fallback');
        }).finally(() => { loading = false; });
      }
    };
  }

  window.KharTallBoardView = {create, attack};
})();
