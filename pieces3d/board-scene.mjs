import * as THREE from './vendor/three.module.js';
import {localReflections} from './character-studio.js';
import {prepareCharacterModels, createNativeCharacter, animateNativeCharacter, disposeNativeCharacter} from './native-characters.js';

const depthCompression = .6;
const heightProjection = .8;
const attackDuration = .52;
const point = new THREE.Vector3();
function restingAngle({type, side}) {
  const angle = type === 'wolf' ? .84 : type === 'archer' ? .58 : .34;
  return side === 0 ? -angle : angle;
}
const worldX = x => x - 4.5;
const worldZ = y => (y - 4.5 + .25) / depthCompression;
const interpolate = (a, b, progress) => a + (b - a) * progress;

function restingScale(model, piece) {
  // Fit the animated idle pose as projected by the board camera.
  // Using the bind pose here would count the outstretched arms and hide detail.
  let left = Infinity, right = -Infinity, top = 0, bottom = 0;
  model.rotation.y = restingAngle(piece);
  model.updateMatrixWorld(true);
  model.traverse(mesh => {
    if (!mesh.isMesh) return;
    mesh.skeleton?.update();
    const positions = mesh.geometry.getAttribute('position');
    for (let vertex = 0; vertex < positions.count; vertex++) {
      mesh.getVertexPosition(vertex, point).applyMatrix4(mesh.matrixWorld);
      left = Math.min(left, point.x);
      right = Math.max(right, point.x);
      const height = heightProjection * point.y - depthCompression * point.z;
      top = Math.max(top, height);
      bottom = Math.max(bottom, -height);
    }
  });
  const large = piece.type === 'colossus';
  const royal = piece.type === 'king';
  const width = large ? .88 : .78;
  const height = large ? .68 : royal ? .64 : .60;
  return Math.min(width / (right - left), height / top, .22 / bottom);
}

export class BoardScene {
  constructor(board, onStatus, canvas, context, options) {
    this.board = board;
    this.onStatus = onStatus;
    this.pieces = [];
    this.actors = new Map();
    this.scales = new Map();
    this.available = new Set();
    this.attempted = new Set();
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
    this.canvas = canvas;
    this.canvas.className = 'miniature-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');

    this.renderer = new THREE.WebGLRenderer({canvas: this.canvas, context, ...options});
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;

    this.scene = new THREE.Scene();
    this.scene.environment = localReflections();
    this.scene.environmentIntensity = .85;
    this.camera = new THREE.OrthographicCamera(-5, 5, 5, -5, .1, 50);
    this.camera.position.set(0, 13.5, 18);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(new THREE.HemisphereLight(0xe5efff, 0x604b43, 1.35));
    const key = new THREE.DirectionalLight(0xffe6bc, 2.7);
    key.position.set(-4, 7, 6);
    const rim = new THREE.DirectionalLight(0x95c4ff, 1.5);
    rim.position.set(5, 8, -5);
    this.scene.add(key, rim);

    this.active = false;
    this.rendered = false;
    this.lost = false;
    this.frame = null;
    this.lastTime = -Infinity;
    this.loading = false;
    this.dimensions = null;
    this.resize = new ResizeObserver(() => this.requestFrame());
    this.resize.observe(board);
    this.reduced.addEventListener('change', () => this.requestFrame());
    document.addEventListener('visibilitychange', () => this.requestFrame());
    this.canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      this.lost = true;
      this.restorePreviews();
    });
    this.canvas.addEventListener('webglcontextrestored', () => {
      this.lost = false;
      this.dimensions = null;
      this.requestFrame();
    });
  }

  restorePreviews() {
    this.canvas.hidden = true;
    this.rendered = false;
    for (const actor of this.actors.values()) actor.piece.node.classList.remove('mini-live');
    this.onStatus('fallback');
  }

  hide() {
    this.active = false;
    this.rendered = false;
    this.canvas.remove();
    this.clear();
    this.pieces = [];
  }

  remove(id, actor) {
    actor.piece.node.classList.remove('mini-live');
    this.scene.remove(actor.model);
    disposeNativeCharacter(actor.model);
    this.actors.delete(id);
  }

  clear() {
    for (const [id, actor] of this.actors) this.remove(id, actor);
  }

  loadMissing() {
    if (this.loading || !this.active || this.lost) return;
    const missing = [...new Set(this.pieces.map(piece => piece.model))]
      .filter(id => !this.attempted.has(id)).slice(0, 2);
    if (!missing.length) return;
    this.loading = true;
    for (const id of missing) this.attempted.add(id);
    Promise.all(missing.map(async id => {
      if (await prepareCharacterModels('field', [id])) this.available.add(id);
    })).finally(() => {
      this.loading = false;
      if (this.active) this.sync(this.pieces);
    });
  }

  createActor(piece) {
    const context = {
      modelQuality: 'field',
      outfit: (_team, color, metalness) => new THREE.MeshStandardMaterial({
        color: piece.color ?? color, metalness
      })
    };
    const model = createNativeCharacter(piece.model, piece.side === 0 ? 'enemy' : 'ally', context);
    const scaleKey = piece.model + ':' + piece.side;
    if (!this.scales.has(scaleKey)) this.scales.set(scaleKey, restingScale(model, piece));
    model.scale.setScalar(this.scales.get(scaleKey));
    model.position.set(worldX(piece.x), 0, worldZ(piece.y));
    model.rotation.y = restingAngle(piece);
    this.scene.add(model);
    return {model, piece, move: null, strike: null, hitAt: null, deathAt: null};
  }

  sync(pieces, strike = null, reset = false) {
    this.active = true;
    this.pieces = pieces;
    if (!this.canvas.isConnected) this.board.append(this.canvas);
    if (reset) this.clear();
    this.loadMissing();

    const now = performance.now() / 1000;
    const live = new Set(pieces.map(piece => piece.id));
    for (const [id, actor] of this.actors) {
      if (live.has(id)) continue;
      if (this.reduced.matches || reset) this.remove(id, actor);
      else if (actor.deathAt === null) actor.deathAt = now + (strike ? .16 : 0);
    }
    for (const piece of pieces) {
      if (!this.available.has(piece.model)) continue;
      let actor = this.actors.get(piece.id);
      if (actor && (actor.piece.model !== piece.model || actor.piece.color !== piece.color)) {
        this.remove(piece.id, actor);
        actor = null;
      }
      if (!actor) {
        actor = this.createActor(piece);
        this.actors.set(piece.id, actor);
      } else {
        if (piece.x !== actor.piece.x || piece.y !== actor.piece.y) {
          const {x, z} = actor.model.position;
          const endX = worldX(piece.x), endZ = worldZ(piece.y);
          const charge = strike?.id === piece.id && /charge/i.test(strike.kind);
          actor.move = {x, z, at: now, duration: charge ? .55 : .35, angle: Math.atan2(endX - x, endZ - z)};
        }
        if (piece.hp < actor.piece.hp) actor.hitAt = now + .16;
        actor.piece = piece;
        actor.deathAt = null;
        if (this.rendered && !this.lost) piece.node.classList.add('mini-live');
      }
    }

    if (strike && !this.reduced.matches) {
      const attacker = this.actors.get(strike.id);
      if (attacker) {
        const {x, z} = attacker.model.position;
        const dx = worldX(strike.x) - x, dz = worldZ(strike.y) - z;
        attacker.strike = {at: now, angle: dx || dz ? Math.atan2(dx, dz) : attacker.model.rotation.y};
      }
    }
    this.requestFrame();
  }

  requestFrame() {
    if (!this.active || this.lost || document.hidden || this.frame !== null) return;
    this.frame = requestAnimationFrame(time => {
      this.frame = null;
      if (!this.active || this.lost) return;
      if (time - this.lastTime < 32) {
        this.requestFrame();
        return;
      }
      this.lastTime = time;
      try {
        this.draw(time / 1000);
      } catch (error) {
        this.lost = true;
        this.restorePreviews();
        console.warn('O tabuleiro passou para a prévia das miniaturas.', error);
      }
    });
  }

  draw(now) {
    const width = this.board.clientWidth, height = this.board.clientHeight;
    if (!width || !height) return;
    const ratio = Math.min(devicePixelRatio || 1, 1.4, 1050 / Math.max(width, height));
    const dimensions = [width, height, ratio].join(':');
    if (this.dimensions !== dimensions) {
      this.dimensions = dimensions;
      this.renderer.setPixelRatio(ratio);
      this.renderer.setSize(width, height, false);
    }
    const reduced = this.reduced.matches;
    let moving = false;
    for (const [id, actor] of this.actors) {
      if (actor.deathAt !== null && (reduced || now - actor.deathAt >= .73)) {
        this.remove(id, actor);
        continue;
      }
      const {model, piece, move, strike, hitAt, deathAt} = actor;
      let progress = move && !reduced ? Math.min(1, (now - move.at) / move.duration) : 1;
      progress = Math.max(0, progress);
      const walking = progress < 1;
      const attacking = !!strike && !reduced && now - strike.at < attackDuration;
      const stagger = hitAt !== null && !reduced && now >= hitAt && now - hitAt < .22;
      const dying = deathAt !== null && now >= deathAt;
      const endX = worldX(piece.x), endZ = worldZ(piece.y);
      if (walking) {
        const easing = progress * (2 - progress);
        const jump = piece.type === 'wolf' ? Math.sin(Math.PI * progress) * .25 : 0;
        model.position.set(interpolate(move.x, endX, easing), jump, interpolate(move.z, endZ, easing));
      } else {
        model.position.set(endX, 0, endZ);
        actor.move = null;
      }
      const bowOffset = attacking && piece.type === 'archer'
        ? -1.48 * Math.sin(Math.PI * (now - strike.at) / attackDuration) : 0;
      model.rotation.y = attacking ? strike.angle + bowOffset : walking ? move.angle : restingAngle(piece);
      if (!attacking) actor.strike = null;
      if (!stagger && hitAt !== null && now >= hitAt) actor.hitAt = null;
      animateNativeCharacter(model, {
        clock: now, walking, stagger, dying,
        attackId: strike?.at || 0, attackDuration,
        attackPulse: attacking ? attackDuration - (now - strike.at) : 0,
        attackTime: attacking ? now - strike.at : null
      });
      moving ||= walking || attacking || actor.hitAt !== null || deathAt !== null;
    }
    this.renderer.render(this.scene, this.camera);
    this.canvas.hidden = false;
    this.rendered = true;
    const ready = this.pieces.filter(piece => this.actors.has(piece.id)).length;
    for (const piece of this.pieces) piece.node.classList.toggle('mini-live', this.actors.has(piece.id));
    this.onStatus(ready === this.pieces.length ? 'ready' : this.loading ? 'loading' : ready ? 'partial' : 'fallback');
    if (moving) this.requestFrame();
  }
}
