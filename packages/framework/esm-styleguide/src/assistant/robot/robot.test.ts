import { describe, expect, it } from 'vitest';
import { Euler, Quaternion, Vector3 } from 'three';
import { RobotController } from './controller.js';
import { clipWithinLimits, compileClip, mirrorClip, sampleClip } from './clips.js';
import { GESTURE_LIBRARY, GESTURE_NAMES, resolveGesture } from './gestures.js';
import { solveArmIK } from './ik.js';
import {
  CHILDREN,
  DIMS,
  JOINTS,
  JOINT_NAMES,
  REST_POSE,
  clampToLimits,
  mirrorJointName,
  mirrorPose,
  type JointName,
} from './skeleton.js';

describe('skeleton', () => {
  it('chaque articulation a un parent existant et la hiérarchie ne boucle pas', () => {
    for (const n of JOINT_NAMES) {
      let cur: JointName | null = n;
      let hops = 0;
      while (cur) {
        const parent: JointName | null = JOINTS[cur].parent;
        if (parent) expect(JOINTS[parent]).toBeDefined();
        cur = parent;
        expect(++hops).toBeLessThan(20);
      }
    }
    expect(CHILDREN.hips).toContain('spine');
    expect(JOINT_NAMES.length).toBe(37);
  });

  it('le côté droit est le miroir exact du côté gauche', () => {
    for (const n of JOINT_NAMES) {
      const m = mirrorJointName(n);
      if (m === n) continue;
      const a = JOINTS[n];
      const b = JOINTS[m];
      expect(b.offset[0]).toBeCloseTo(-a.offset[0]);
      expect(b.offset[1]).toBeCloseTo(a.offset[1]);
      expect(b.offset[2]).toBeCloseTo(a.offset[2]);
      expect(b.min[1]).toBeCloseTo(-a.max[1]);
      expect(b.max[2]).toBeCloseTo(-a.min[2]);
    }
  });

  it('mirrorPose appliqué deux fois redonne la pose initiale', () => {
    const p = { shoulderL: [-0.4, 0.2, 1.1], head: [0.1, 0.2, 0.3] } as const;
    const twice = mirrorPose(mirrorPose({ shoulderL: [...p.shoulderL], head: [...p.head] }));
    expect(twice.shoulderL).toEqual([...p.shoulderL]);
    expect(twice.head).toEqual([...p.head]);
  });

  it('la pose de repos respecte les butées', () => {
    for (const n of JOINT_NAMES) {
      const v = REST_POSE[n];
      expect(clampToLimits(n, v)).toEqual(v);
    }
  });

  it('les pieds touchent le sol au repos', () => {
    const ankleY = DIMS.hipsHeight - 0.02 - DIMS.thigh - DIMS.shin;
    expect(ankleY).toBeCloseTo(DIMS.ankleHeight, 5);
  });
});

describe('gestes', () => {
  it.each(GESTURE_NAMES)('%s reste dans les butées, des deux côtés', (name) => {
    expect(clipWithinLimits(GESTURE_LIBRARY[name].def)).toEqual([]);
    expect(clipWithinLimits(resolveGesture(name, 'R'))).toEqual([]);
  });

  it('un clip commence et finit à la pose de repos', () => {
    const clip = compileClip(GESTURE_LIBRARY.wave.def);
    const a = sampleClip(clip, 0).pose.shoulderL!;
    const b = sampleClip(clip, clip.duration).pose.shoulderL!;
    expect(a).toEqual([...REST_POSE.shoulderL]);
    expect(b).toEqual([...REST_POSE.shoulderL]);
  });

  it('mirrorClip bascule le geste sur le bras droit', () => {
    const wave = GESTURE_LIBRARY.wave.def;
    const r = mirrorClip(wave);
    const k = r.keys[0]!.pose!;
    expect(k.shoulderR).toBeDefined();
    expect(k.shoulderL).toBeUndefined();
    expect(k.shoulderR![2]).toBeCloseTo(-wave.keys[0]!.pose!.shoulderL![2]);
  });
});

describe('IK du bras', () => {
  const shoulder = new Vector3(...JOINTS.shoulderL.offset);

  function forward(res: ReturnType<typeof solveArmIK>, s: Vector3) {
    const elbow = s.clone().add(new Vector3(0, -DIMS.upperArm, 0).applyQuaternion(res.shoulder));
    const qe = new Quaternion().setFromEuler(new Euler(res.elbowX, 0, 0));
    const fore = new Vector3(0, -DIMS.foreArm, 0).applyQuaternion(res.shoulder.clone().multiply(qe));
    return { elbow, wrist: elbow.clone().add(fore) };
  }

  // Cibles exprimées par rapport à l'épaule (dx est retourné pour le bras droit).
  it.each([
    ['L', [0.2, 0.0, 0.35]],
    ['L', [-0.1, 0.3, 0.3]],
    ['L', [0.35, -0.2, 0.15]],
    ['R', [0.2, 0.1, 0.3]],
    ['R', [-0.15, -0.1, 0.4]],
  ] as const)('le poignet atteint la cible (%s %j)', (side, rel) => {
    const s = new Vector3(...JOINTS[`shoulder${side}`].offset);
    const m = side === 'L' ? 1 : -1;
    const target = s.clone().add(new Vector3(m * rel[0], rel[1], rel[2]));
    const res = solveArmIK({ shoulder: s, target, side });
    expect(res.reachable).toBe(true);
    const { wrist, elbow } = forward(res, s);
    expect(wrist.distanceTo(target)).toBeLessThan(1e-4);
    // le coude reste sous la ligne épaule→poignet (coude naturel)
    expect(elbow.y).toBeLessThanOrEqual(Math.max(s.y, target.y) + 1e-6);
  });

  it('une cible trop loin tend le bras dans sa direction', () => {
    const res = solveArmIK({ shoulder, target: new Vector3(3, 1.2, 0.5), side: 'L' });
    expect(res.reachable).toBe(false);
    expect(res.elbowX).toBeGreaterThan(-0.15);
  });
});

describe('contrôleur', () => {
  const run = (c: RobotController, seconds: number, step = 1 / 60) => {
    for (let t = 0; t < seconds; t += step) c.update(step);
  };

  it('toutes les articulations restent dans leurs butées pendant les gestes', () => {
    const c = new RobotController({ seed: 7 });
    const violations: string[] = [];
    for (const name of GESTURE_NAMES) {
      void c.play(name);
      for (let i = 0; i < 180; i++) {
        c.update(1 / 60);
        for (const n of JOINT_NAMES) {
          const v = c.pose[n];
          const lim = JOINTS[n];
          for (let a = 0; a < 3; a++) {
            if (v[a]! < lim.min[a]! - 1e-6 || v[a]! > lim.max[a]! + 1e-6) violations.push(`${name}:${n}[${a}]=${v[a]}`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('play() se résout à la fin du geste', async () => {
    const c = new RobotController();
    let done = false;
    void c.play('nod').then(() => (done = true));
    run(c, 0.3);
    expect(done).toBe(false);
    run(c, 1.5);
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('un salut lève le bras gauche puis le baisse', () => {
    const c = new RobotController({ autoBehaviors: false });
    void c.play('wave');
    run(c, 0.9);
    expect(c.pose.shoulderL[2]).toBeGreaterThan(0.8);
    run(c, 2);
    expect(c.pose.shoulderL[2]).toBeLessThan(0.2);
  });

  it('wave avec side=R utilise le bras droit', () => {
    const c = new RobotController({ autoBehaviors: false });
    void c.play('wave', { side: 'R' });
    run(c, 0.9);
    expect(c.pose.shoulderR[2]).toBeLessThan(-0.8);
    expect(Math.abs(c.pose.shoulderL[2])).toBeLessThan(0.3);
  });

  it('walkTo amène le robot au but et résout la promesse', async () => {
    const c = new RobotController({ autoBehaviors: false });
    let arrived = false;
    void c.walkTo(1, 2).then(() => (arrived = true));
    run(c, 6);
    await Promise.resolve();
    expect(arrived).toBe(true);
    expect(Math.hypot(c.root.x - 1, c.root.z - 2)).toBeLessThan(0.06);
  });

  it('en marchant, les jambes bougent en opposition', () => {
    const c = new RobotController({ autoBehaviors: false });
    void c.walkTo(0, 4);
    let minL = 0;
    let maxL = 0;
    let sumProduct = 0;
    for (let i = 0; i < 240; i++) {
      c.update(1 / 60);
      if (i > 60) {
        minL = Math.min(minL, c.pose.hipL[0]);
        maxL = Math.max(maxL, c.pose.hipL[0]);
        sumProduct += c.pose.hipL[0] * c.pose.hipR[0];
      }
    }
    expect(maxL - minL).toBeGreaterThan(0.5);
    expect(sumProduct).toBeLessThan(0);
  });

  it('le robot revient en position debout après la marche', () => {
    const c = new RobotController({ autoBehaviors: false });
    void c.walkTo(0, 1);
    run(c, 8);
    expect(Math.abs(c.pose.hipL[0])).toBeLessThan(0.05);
    expect(c.pose.kneeL[0]).toBeLessThan(0.05);
  });

  it('setGaze tourne la tête vers la cible', () => {
    const c = new RobotController({ autoBehaviors: false });
    c.setGaze({ yaw: 0.8, pitch: 0 });
    run(c, 1);
    expect(c.pose.head[1]).toBeGreaterThan(0.3);
    expect(c.pose.neck[1]).toBeGreaterThan(0.1);
  });

  it("l'état 'speaking' déclenche des gestes d'accompagnement", () => {
    const c = new RobotController({ seed: 3 });
    c.setState('speaking');
    let moved = 0;
    for (let i = 0; i < 600; i++) {
      c.update(1 / 60);
      moved = Math.max(moved, Math.abs(c.pose.shoulderL[0] - REST_POSE.shoulderL[0]), Math.abs(c.pose.shoulderR[0] - REST_POSE.shoulderR[0]));
    }
    expect(moved).toBeGreaterThan(0.25);
  });

  it('même graine, même comportement', () => {
    const a = new RobotController({ seed: 11 });
    const b = new RobotController({ seed: 11 });
    a.setState('speaking');
    b.setState('speaking');
    for (let i = 0; i < 400; i++) {
      a.update(1 / 60);
      b.update(1 / 60);
    }
    expect(a.pose.shoulderL).toEqual(b.pose.shoulderL);
  });

  it('les mains se ferment quand on force un poing', () => {
    const c = new RobotController({ autoBehaviors: false });
    c.setHand('L', 'fist');
    run(c, 1);
    expect(Math.abs(c.pose.indexL1[2])).toBeGreaterThan(1.2);
    c.setHand('L', null);
    run(c, 1);
    expect(Math.abs(c.pose.indexL1[2])).toBeLessThan(0.5);
  });

  it('les clignements de paupières arrivent et restent entre 0 et 1', () => {
    const c = new RobotController({ seed: 5 });
    let max = 0;
    for (let i = 0; i < 60 * 10; i++) {
      c.update(1 / 60);
      expect(c.blink).toBeGreaterThanOrEqual(0);
      expect(c.blink).toBeLessThanOrEqual(1);
      max = Math.max(max, c.blink);
    }
    expect(max).toBeGreaterThan(0.9);
  });
});
