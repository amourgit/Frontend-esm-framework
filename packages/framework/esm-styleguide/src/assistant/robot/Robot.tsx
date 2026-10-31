import React, { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, type Group, type Object3D } from 'three';
import type { RobotController } from './controller.js';
import { solveArmIK } from './ik.js';
import { useRobotMaterials, type RobotMaterials, type RobotTheme } from './materials.js';
import { Belly, Chest, Foot, ForeArm, Neck, Palm, Pelvis, Phalanx, Shin, Thigh, UpperArm } from './parts/Body.js';
import { Head } from './parts/Head.js';
import { CHILDREN, DIMS, FINGERS, JOINTS, JOINT_NAMES, SIDES, type JointName } from './skeleton.js';

/** Associe chaque articulation à la pièce de corps qu'elle porte. Ajouter une pièce = ajouter une ligne. */
function partFor(name: JointName, m: RobotMaterials, controller: RobotController): ReactNode {
  switch (name) {
    case 'hips':
      return <Pelvis m={m} />;
    case 'spine':
      return <Belly m={m} />;
    case 'chest':
      return <Chest m={m} />;
    case 'neck':
      return <Neck m={m} />;
    case 'head':
      return <Head controller={controller} m={m} />;
    default:
  }
  for (const s of SIDES) {
    if (name === `shoulder${s}`) return <UpperArm m={m} />;
    if (name === `elbow${s}`) return <ForeArm m={m} />;
    if (name === `wrist${s}`) return <Palm m={m} />;
    if (name === `hip${s}`) return <Thigh m={m} />;
    if (name === `knee${s}`) return <Shin m={m} />;
    if (name === `ankle${s}`) return <Foot m={m} />;
    for (const f of FINGERS) {
      if (name === `${f}${s}1`) return <Phalanx m={m} finger={f} segment={1} />;
      if (name === `${f}${s}2`) return <Phalanx m={m} finger={f} segment={2} />;
    }
  }
  return null;
}

function JointNode({
  name,
  registry,
  m,
  controller,
}: {
  name: JointName;
  registry: Map<JointName, Object3D>;
  m: RobotMaterials;
  controller: RobotController;
}) {
  const spec = JOINTS[name];
  return (
    <group
      ref={(o) => {
        if (o) registry.set(name, o);
        else registry.delete(name);
      }}
      name={name}
      position={spec.offset}
    >
      {partFor(name, m, controller)}
      {CHILDREN[name].map((c) => (
        <JointNode key={c} name={c} registry={registry} m={m} controller={controller} />
      ))}
    </group>
  );
}

export interface RobotProps {
  controller: RobotController;
  theme?: RobotTheme;
  position?: [number, number, number];
  scale?: number;
}

const tmpTarget = new Vector3();
const tmpShoulder = new Vector3();

/**
 * Le robot complet. Reçoit un `RobotController` et ne fait que recopier son résultat :
 *  - à chaque image : `controller.update(dt)`, puis angles → articulations, position/cap → groupe racine ;
 *  - ensuite, si une main doit atteindre un point (`controller.reachAt`), résolution IK du bras.
 */
export function Robot({ controller, theme, position = [0, 0, 0], scale = 1 }: RobotProps) {
  const m = useRobotMaterials(theme);
  const registry = useMemo(() => new Map<JointName, Object3D>(), []);
  const rootRef = useRef<Group>(null);

  useEffect(() => {
    // La silhouette doit pouvoir projeter une ombre sur le sol.
    rootRef.current?.traverse((o) => {
      o.frustumCulled = false;
    });
  }, []);

  useFrame((_, dt) => {
    controller.update(dt);
    const root = rootRef.current;
    if (!root) return;
    root.position.set(controller.root.x, controller.root.lift, controller.root.z);
    root.rotation.y = controller.root.yaw;

    for (const n of JOINT_NAMES) {
      const o = registry.get(n);
      if (!o) continue;
      const v = controller.pose[n];
      o.rotation.set(v[0], v[1], v[2], JOINTS[n].order);
    }

    for (const side of SIDES) {
      const r = controller.reach[side];
      if (r.weight < 0.01 || !r.target) continue;
      const chest = registry.get('chest');
      const sh = registry.get(`shoulder${side}`);
      const el = registry.get(`elbow${side}`);
      if (!chest || !sh || !el) continue;
      // La cible est exprimée dans le repère du robot (origine aux pieds, +z devant lui) : on la
      // passe dans le repère du monde, puis dans celui du torse, où vit le solveur.
      chest.updateWorldMatrix(true, false);
      tmpTarget.set(r.target[0], r.target[1], r.target[2]);
      const world = root.localToWorld(tmpTarget);
      const local = chest.worldToLocal(world);
      tmpShoulder.set(...JOINTS[`shoulder${side}`].offset);
      const ik = solveArmIK({ shoulder: tmpShoulder, target: local, side, upper: DIMS.upperArm, fore: DIMS.foreArm });
      sh.quaternion.slerp(ik.shoulder, r.weight);
      el.rotation.x += (ik.elbowX - el.rotation.x) * r.weight;
    }
  });

  return (
    <group position={position} scale={scale}>
      <group ref={rootRef}>
        <JointNode name="hips" registry={registry} m={m} controller={controller} />
      </group>
    </group>
  );
}
