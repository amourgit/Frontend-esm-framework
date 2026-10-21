/** @category CardModal */
import type React from 'react';
import type { Variants } from 'framer-motion';
import type { CardModalAnimationPreset } from './card-modal.types.js';

export const cardModalAnimationPresets: Record<CardModalAnimationPreset, Variants> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.94 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.96 },
  },
  zoom: {
    initial: { opacity: 0, scale: 0.6 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.6 },
  },
  'slide-up': {
    initial: { opacity: 0, y: 48 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 24 },
  },
  'slide-down': {
    initial: { opacity: 0, y: -48 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -24 },
  },
  'slide-left': {
    initial: { opacity: 0, x: 48 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 24 },
  },
  'slide-right': {
    initial: { opacity: 0, x: -48 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -24 },
  },
  warp: {
    initial: { opacity: 0, rotateX: -5, skewY: -1.5, scaleY: 2, scaleX: 0.4, y: 100 },
    animate: {
      opacity: 1,
      rotateX: 0,
      skewY: 0,
      scaleY: 1,
      scaleX: 1,
      y: 0,
      transition: {
        duration: 0.35,
        ease: [0.59, 0, 0.35, 1],
        y: { type: 'spring', visualDuration: 0.7, bounce: 0.2 },
      },
    },
    exit: {
      opacity: 0,
      rotateX: -5,
      skewY: -1.5,
      scaleY: 2,
      scaleX: 0.4,
      y: 100,
      transition: { duration: 0.35, ease: [0.59, 0, 0.35, 1] },
    },
  },
  none: {
    initial: {},
    animate: {},
    exit: {},
  },
};

/** Style inline requis par certains préréglages (perspective 3D pour `warp`). */
export const cardModalPresetStyles: Partial<Record<CardModalAnimationPreset, React.CSSProperties>> = {
  warp: { transformPerspective: 1000, originX: 0.5, originY: 0 } as React.CSSProperties,
};
