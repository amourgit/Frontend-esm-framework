/** @category CardModal */
import type { Variants } from 'framer-motion';
import type { CardModalAnimationPreset } from './card-modal.types';

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
  none: {
    initial: {},
    animate: {},
    exit: {},
  },
};
