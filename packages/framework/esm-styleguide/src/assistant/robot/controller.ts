import {
  clipWeight,
  compileClip,
  sampleClip,
  type ClipDef,
  type CompiledClip,
} from './clips.js';
import { GESTURE_LIBRARY, TALK_GESTURES, resolveGesture, type GestureName } from './gestures.js';
import { HAND_SHAPES, handPose, resolveShape, type Curl5, type HandShape, type HandShapeName } from './hands.js';
import {
  JOINT_NAMES,
  REST_POSE,
  clampToLimits,
  createRestPose,
  type JointName,
  type Pose,
  type Side,
  type Vec3,
} from './skeleton.js';

/** Ce que fait l'assistant en ce moment — pilote les comportements automatiques. */
export type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface PlayOptions {
  /** Bras à utiliser pour les gestes à un seul bras. Défaut : gauche (côté +x). */
  side?: Side;
  /** Rejouer en boucle jusqu'à `stopGesture()`. */
  loop?: boolean;
  /** Vitesse de lecture (1 = normale). */
  speed?: number;
}

interface Player {
  id: number;
  clip: CompiledClip;
  time: number;
  speed: number;
  stopping: boolean;
  stopTime: number;
  priority: number;
  resolve: () => void;
  loopOverride: boolean;
}

interface ReachState {
  /** Dernière cible connue (conservée pendant le fondu de relâchement pour éviter un saut). */
  target: Vec3 | null;
  /** Poids de l'IK, 0..1, lissé. */
  weight: number;
  /** La main doit-elle atteindre la cible en ce moment ? */
  active: boolean;
}

export interface ControllerOptions {
  /** Graine du générateur aléatoire (comportements spontanés). Utile pour des tests déterministes. */
  seed?: number;
  /** Comportements spontanés (clignement, regard, gestes en parlant…). Défaut `true`. */
  autoBehaviors?: boolean;
}

const MAX_SPEED = 0.9;
const STRIDE = 0.9;
const TURN_RATE = 3.2;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const damp = (cur: number, goal: number, lambda: number, dt: number) => cur + (goal - cur) * (1 - Math.exp(-lambda * dt));
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const smoothstep = (u: number) => {
  const x = Math.min(1, Math.max(0, u));
  return x * x * (3 - 2 * x);
};

/**
 * Cerveau du robot : décide, à chaque image, de l'angle de chaque articulation.
 *
 * Il ne dépend NI de React NI de WebGL : il lit des commandes (jouer un geste, marcher,
 * regarder, changer d'état) et écrit un résultat dans `pose` (angles lissés) et `root`
 * (position et cap du robot). Le rendu (`Robot.tsx`) n'a qu'à recopier ces valeurs.
 *
 * Ordre de calcul à chaque image (le dernier gagne sur les mêmes articulations) :
 *   1. pose de repos
 *   2. attitude de l'état (écoute : léger penché, etc.)
 *   3. démarche, si le robot marche
 *   4. clips de gestes en cours (avec fondu d'entrée / sortie)
 *   5. couches additives : respiration, balancement, regard
 *   6. butées de chaque articulation, puis lissage exponentiel
 *   7. doigts (forme de main lissée)
 */
export class RobotController {
  /** Angles lissés de toutes les articulations, prêts à être appliqués au rendu. */
  readonly pose: Pose = createRestPose();
  /** Position (m) et cap (rad) du robot sur le sol ; `lift` = hauteur de saut (m). */
  readonly root = { x: 0, z: 0, yaw: 0, lift: 0 };
  /** Fermeture des paupières, 0 (ouvert) à 1 (fermé). */
  blink = 0;
  /** Niveau sonore de la voix, 0..1 : amplifie les mouvements de tête quand l'assistant parle. */
  speechLevel = 0;
  /** Cibles d'atteinte des mains (repère du robot, mètres). Résolues par IK dans le rendu. */
  readonly reach: Record<Side, ReachState> = {
    L: { target: null, weight: 0, active: false },
    R: { target: null, weight: 0, active: false },
  };

  private state: AssistantState = 'idle';
  private time = 0;
  private rand: () => number;
  private autoBehaviors: boolean;
  private players: Player[] = [];
  private nextId = 1;
  private target: Pose = createRestPose();

  private gazeManual: { yaw: number; pitch: number } | null = null;
  private gazeGoal = { yaw: 0, pitch: 0 };
  private gaze = { yaw: 0, pitch: 0 };
  private nextGlanceAt = 1.5;
  private nextBlinkAt = 2;
  private blinkStart = -10;
  private nextTalkAt = 0;
  private nextNodAt = 3;

  private walkTarget: { x: number; z: number; arriveYaw: number | null; resolve: () => void } | null = null;
  private walkBlend = 0;
  private walkPhase = 0;
  private speed = 0;
  private yawRate = 0;

  private handManual: Record<Side, HandShape | null> = { L: null, R: null };
  private handGoal: Record<Side, HandShape> = { L: HAND_SHAPES.relaxed, R: HAND_SHAPES.relaxed };
  private hand: Record<Side, { curl: Curl5; thumbOut: number }> = {
    L: { curl: [...HAND_SHAPES.relaxed.curl] as Curl5, thumbOut: HAND_SHAPES.relaxed.thumbOut },
    R: { curl: [...HAND_SHAPES.relaxed.curl] as Curl5, thumbOut: HAND_SHAPES.relaxed.thumbOut },
  };

  constructor(options: ControllerOptions = {}) {
    this.rand = mulberry32(options.seed ?? 1);
    this.autoBehaviors = options.autoBehaviors ?? true;
    this.nextBlinkAt = 1.5 + this.rand() * 2;
  }

  // ---------------------------------------------------------------- commandes

  /** Joue un geste de la bibliothèque. La promesse se résout quand il est terminé (ou interrompu). */
  play(name: GestureName, options: PlayOptions = {}): Promise<void> {
    const def = resolveGesture(name, options.side ?? 'L');
    return this.start(def, GESTURE_LIBRARY[name] ? 1 : 1, options);
  }

  /** Joue un clip personnalisé (voir `ClipDef`). */
  playClip(def: ClipDef, options: PlayOptions = {}): Promise<void> {
    return this.start(def, 1, options);
  }

  /** Arrête les gestes en cours (tous, ou seulement `name`) avec un fondu. */
  stopGesture(name?: string): void {
    for (const p of this.players) {
      if (!name || p.clip.name === name) this.beginStop(p);
    }
  }

  get isGesturing(): boolean {
    return this.players.some((p) => !p.stopping && p.priority > 0);
  }

  setState(state: AssistantState): void {
    if (state === this.state) return;
    this.state = state;
    if (state === 'thinking' && this.autoBehaviors) this.play('think', { side: this.rand() > 0.5 ? 'L' : 'R' });
    if (state !== 'speaking') this.speechLevel = 0;
  }

  getState(): AssistantState {
    return this.state;
  }

  /**
   * Oriente le regard (radians, relatif au corps) : `yaw` > 0 vers la gauche du robot (+x),
   * `pitch` > 0 vers le haut. `null` rend la main aux regards spontanés.
   */
  setGaze(gaze: { yaw: number; pitch: number } | null): void {
    this.gazeManual = gaze ? { yaw: gaze.yaw, pitch: gaze.pitch } : null;
  }

  /** Marche jusqu'à (x, z) en mètres. Résolu à l'arrivée ; une nouvelle commande interrompt la précédente. */
  walkTo(x: number, z: number, options: { arriveYaw?: number } = {}): Promise<void> {
    this.walkTarget?.resolve();
    return new Promise<void>((resolve) => {
      this.walkTarget = { x, z, arriveYaw: options.arriveYaw ?? null, resolve };
    });
  }

  stopWalking(): void {
    this.walkTarget?.resolve();
    this.walkTarget = null;
  }

  get isWalking(): boolean {
    return this.walkTarget !== null || this.walkBlend > 0.05;
  }

  /** Tourne sur place vers le cap `yaw` (rad). */
  async turnTo(yaw: number): Promise<void> {
    await this.walkTo(this.root.x, this.root.z, { arriveYaw: yaw });
  }

  /** Tend la main `side` vers un point (repère du robot, m), `null` pour relâcher. */
  reachAt(side: Side, target: Vec3 | null): void {
    const r = this.reach[side];
    r.active = target !== null;
    if (target) r.target = [...target];
  }

  /** Convertit un point de la scène (x, y, z) en repère du robot (origine aux pieds, +z devant lui). */
  toRobotFrame(x: number, y: number, z: number): Vec3 {
    const dx = x - this.root.x;
    const dz = z - this.root.z;
    const c = Math.cos(this.root.yaw);
    const s = Math.sin(this.root.yaw);
    return [dx * c - dz * s, y - this.root.lift, dx * s + dz * c];
  }

  /** Tend le bras `side` vers un point (repère du robot) et pointe l'index ; `null` relâche. */
  pointAt(side: Side, target: Vec3 | null): void {
    this.reachAt(side, target);
    this.setHand(side, target ? 'point' : null);
  }

  /** Force la forme d'une main ; `null` rend la main aux gestes. */
  setHand(side: Side, shape: HandShapeName | HandShape | null): void {
    this.handManual[side] = shape ? resolveShape(shape) : null;
  }

  // ------------------------------------------------------------ mise à jour

  update(rawDt: number): void {
    const dt = Math.min(0.05, Math.max(0, rawDt));
    if (dt === 0) return;
    this.time += dt;

    this.runAutoBehaviors();
    this.advancePlayers(dt);

    const t = this.target;
    for (const n of JOINT_NAMES) {
      const r = REST_POSE[n];
      t[n][0] = r[0];
      t[n][1] = r[1];
      t[n][2] = r[2];
    }

    this.applyStateStance(t);
    this.updateLocomotion(dt);
    this.applyGait(t);

    let lift = 0;
    const handVotes: Partial<Record<Side, HandShapeName>> = {};
    for (const p of this.players) {
      const w = clipWeight(p.clip, p.time, p.stopping, p.stopTime);
      if (w <= 0) continue;
      const s = sampleClip(p.clip, p.time);
      for (const [n, v] of Object.entries(s.pose) as [JointName, Vec3][]) {
        const c = t[n];
        c[0] += (v[0] - c[0]) * w;
        c[1] += (v[1] - c[1]) * w;
        c[2] += (v[2] - c[2]) * w;
      }
      lift += s.lift * w;
      if (w > 0.3) Object.assign(handVotes, s.hands);
    }

    this.applyAdditive(t, dt);

    for (const n of JOINT_NAMES) {
      const goal = clampToLimits(n, t[n]);
      const cur = this.pose[n];
      const lambda = n.startsWith('hips') ? 20 : 16;
      cur[0] = damp(cur[0], goal[0], lambda, dt);
      cur[1] = damp(cur[1], goal[1], lambda, dt);
      cur[2] = damp(cur[2], goal[2], lambda, dt);
    }

    this.updateHands(dt, handVotes);

    this.root.lift = damp(this.root.lift, lift + this.walkBob(), 24, dt);
    for (const side of ['L', 'R'] as const) {
      const r = this.reach[side];
      r.weight = damp(r.weight, r.active ? 1 : 0, 7, dt);
      if (!r.active && r.weight < 0.005) {
        r.weight = 0;
        r.target = null;
      }
    }
    this.updateBlink();
  }

  // ------------------------------------------------------------ internes

  private start(def: ClipDef, priority: number, options: PlayOptions): Promise<void> {
    for (const p of this.players) if (p.priority <= priority) this.beginStop(p);
    const clip = compileClip(options.loop ? { ...def, loop: true } : def);
    return new Promise<void>((resolve) => {
      this.players.push({
        id: this.nextId++,
        clip,
        time: 0,
        speed: options.speed ?? 1,
        stopping: false,
        stopTime: 0,
        priority,
        resolve,
        loopOverride: !!options.loop,
      });
    });
  }

  private beginStop(p: Player) {
    if (p.stopping) return;
    p.stopping = true;
    p.stopTime = p.time;
    if (p.clip.fadeOut <= 0) p.clip.fadeOut = 0.15;
  }

  private advancePlayers(dt: number) {
    for (const p of this.players) {
      p.time += dt * p.speed;
      const ended = p.stopping ? p.time - p.stopTime >= p.clip.fadeOut : !p.clip.loop && p.time >= p.clip.duration;
      if (ended) p.resolve();
    }
    this.players = this.players.filter((p) => {
      const ended = p.stopping ? p.time - p.stopTime >= p.clip.fadeOut : !p.clip.loop && p.time >= p.clip.duration;
      return !ended;
    });
  }

  private runAutoBehaviors() {
    if (!this.autoBehaviors) return;
    const now = this.time;
    if (this.state === 'speaking' && !this.isGesturing && now >= this.nextTalkAt) {
      const name = TALK_GESTURES[Math.floor(this.rand() * TALK_GESTURES.length)]!;
      const side: Side = this.rand() > 0.5 ? 'L' : 'R';
      const def = resolveGesture(name, side);
      void this.start(def, 0, { speed: 0.9 + this.rand() * 0.3 });
      this.nextTalkAt = now + def.duration + 0.2 + this.rand() * 1.1;
    }
    if (this.state === 'thinking' && !this.players.some((p) => !p.stopping && p.clip.name === 'think') && this.rand() < 0.02) {
      this.play('think', { side: this.rand() > 0.5 ? 'L' : 'R' });
    }
    if (this.state === 'listening' && !this.isGesturing && now >= this.nextNodAt) {
      void this.start(resolveGesture('nod'), 0, { speed: 0.85 });
      this.nextNodAt = now + 2.8 + this.rand() * 3;
    }
    if (!this.gazeManual && now >= this.nextGlanceAt) {
      const calm = this.state === 'speaking' || this.state === 'listening';
      this.gazeGoal = { yaw: (this.rand() - 0.5) * (calm ? 0.25 : 0.7), pitch: (this.rand() - 0.5) * 0.25 };
      this.nextGlanceAt = now + 1.6 + this.rand() * 3;
    }
    if (now >= this.nextBlinkAt) {
      this.blinkStart = now;
      this.nextBlinkAt = now + 2.2 + this.rand() * 3.8;
    }
  }

  private updateBlink() {
    const bt = this.time - this.blinkStart;
    let b = 0;
    if (bt >= 0 && bt < 0.055) b = bt / 0.055;
    else if (bt < 0.1) b = 1;
    else if (bt < 0.18) b = 1 - (bt - 0.1) / 0.08;
    this.blink = b;
  }

  private applyStateStance(t: Pose) {
    if (this.state === 'listening') {
      t.head[2] += 0.1;
      t.neck[0] += 0.03;
      t.spine[0] += 0.06;
    } else if (this.state === 'thinking') {
      t.head[0] += -0.05;
      t.head[1] += 0.12;
    }
  }

  private updateLocomotion(dt: number) {
    const w = this.walkTarget;
    const yawBefore = this.root.yaw;
    let moving = false;
    if (w) {
      const dx = w.x - this.root.x;
      const dz = w.z - this.root.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.04) {
        const want = Math.atan2(dx, dz);
        const err = wrapAngle(want - this.root.yaw);
        this.root.yaw += Math.max(-TURN_RATE * dt, Math.min(TURN_RATE * dt, err));
        const facing = smoothstep(1 - Math.abs(wrapAngle(want - this.root.yaw)) / 0.9);
        const v = Math.min(MAX_SPEED, 0.25 + dist * 1.6) * facing;
        this.speed = damp(this.speed, v, 8, dt);
        const step = Math.min(this.speed * dt, dist);
        this.root.x += Math.sin(this.root.yaw) * step;
        this.root.z += Math.cos(this.root.yaw) * step;
        moving = this.speed > 0.05;
      } else if (w.arriveYaw !== null) {
        const err = wrapAngle(w.arriveYaw - this.root.yaw);
        if (Math.abs(err) > 0.03) {
          this.root.yaw += Math.max(-TURN_RATE * dt, Math.min(TURN_RATE * dt, err));
        } else {
          this.finishWalk();
        }
        this.speed = damp(this.speed, 0, 8, dt);
      } else {
        this.finishWalk();
        this.speed = damp(this.speed, 0, 8, dt);
      }
    } else {
      this.speed = damp(this.speed, 0, 8, dt);
    }
    // Tourner sur place fait faire de petits pas : la vitesse de rotation compte comme un déplacement.
    this.yawRate = wrapAngle(this.root.yaw - yawBefore) / dt;
    const turning = Math.abs(this.yawRate) > 0.5;
    this.walkBlend = damp(this.walkBlend, moving || turning ? 1 : 0, 6, dt);
    if (this.walkBlend > 0.01) {
      const travelled = this.speed * dt + (turning ? Math.abs(this.yawRate) * dt * 0.1 : 0);
      this.walkPhase += (travelled / STRIDE) * Math.PI * 2;
    }
  }

  private finishWalk() {
    const w = this.walkTarget;
    this.walkTarget = null;
    w?.resolve();
  }

  private walkBob(): number {
    return this.walkBlend * 0.018 * Math.abs(Math.sin(this.walkPhase));
  }

  private applyGait(t: Pose) {
    const b = this.walkBlend;
    if (b < 0.01) return;
    const ph = this.walkPhase;
    const s = Math.sin(ph);
    const c = Math.cos(ph);
    const effective = this.speed + Math.abs(this.yawRate) * 0.1;
    const amp = 0.5 * Math.min(1, 0.4 + effective / MAX_SPEED);
    const mix = (j: JointName, v: Vec3) => {
      const a = t[j];
      a[0] += (v[0] - a[0]) * b;
      a[1] += (v[1] - a[1]) * b;
      a[2] += (v[2] - a[2]) * b;
    };
    for (const side of ['L', 'R'] as const) {
      const sg = side === 'L' ? 1 : -1;
      const m = side === 'L' ? 1 : -1;
      const phase = sg * s;
      const swing = sg * c;
      const hipX = -amp * phase;
      const kneeX = 0.12 + 0.85 * Math.max(0, swing) * (amp / 0.5);
      mix(`hip${side}`, [hipX, 0, m * 0.03]);
      mix(`knee${side}`, [kneeX, 0, 0]);
      mix(`ankle${side}`, [-(hipX + kneeX) * 0.8, 0, 0]);
      mix(`shoulder${side}`, [amp * 0.8 * phase, 0, m * 0.1]);
      mix(`elbow${side}`, [-0.28 - 0.3 * Math.max(0, -phase), 0, 0]);
    }
    mix('spine', [0.05, -0.1 * s, 0]);
    mix('chest', [0, 0.14 * s, 0]);
    mix('hips', [0, 0.1 * s, 0.03 * c]);
  }

  private applyAdditive(t: Pose, dt: number) {
    const time = this.time;
    // Respiration et petit balancement : le corps ne reste jamais figé.
    const breath = Math.sin(time * 1.55);
    t.chest[0] += breath * 0.014;
    t.spine[0] += breath * 0.008;
    t.shoulderL[2] += breath * 0.012;
    t.shoulderR[2] -= breath * 0.012;
    t.hips[1] += Math.sin(time * 0.43) * 0.025 * (1 - this.walkBlend);
    t.hips[2] += Math.sin(time * 0.31 + 0.7) * 0.012 * (1 - this.walkBlend); // transfert de poids d'un pied sur l'autre
    t.head[2] += Math.sin(time * 0.71 + 1.1) * 0.014;

    // Voix : la tête accompagne le volume.
    if (this.state === 'speaking') {
      const k = 0.02 + this.speechLevel * 0.1;
      t.head[0] += Math.sin(time * 7.3) * k * 0.6 + Math.sin(time * 3.1) * k;
      t.head[1] += Math.sin(time * 2.3) * k * 1.5;
    }

    // Regard : le goal est soit imposé, soit spontané.
    const goal = this.gazeManual ?? this.gazeGoal;
    this.gaze.yaw = damp(this.gaze.yaw, goal.yaw, 9, dt);
    this.gaze.pitch = damp(this.gaze.pitch, goal.pitch, 9, dt);
    const { yaw, pitch } = this.gaze;
    t.head[1] += yaw * 0.55;
    t.neck[1] += yaw * 0.3;
    t.chest[1] += yaw * 0.12;
    t.head[0] += -pitch * 0.6;
    t.neck[0] += -pitch * 0.3;
  }

  private updateHands(dt: number, votes: Partial<Record<Side, HandShapeName>>) {
    for (const side of ['L', 'R'] as const) {
      const goal = this.handManual[side] ?? (votes[side] ? HAND_SHAPES[votes[side]!] : HAND_SHAPES.relaxed);
      this.handGoal[side] = goal;
      const h = this.hand[side];
      for (let i = 0; i < 5; i++) h.curl[i] = damp(h.curl[i]!, goal.curl[i]!, 18, dt);
      h.thumbOut = damp(h.thumbOut, goal.thumbOut, 18, dt);
      const p = handPose(side, h.curl, h.thumbOut);
      for (const [n, v] of Object.entries(p) as [JointName, Vec3][]) {
        this.pose[n][0] = v[0];
        this.pose[n][1] = v[1];
        this.pose[n][2] = v[2];
      }
    }
  }
}
