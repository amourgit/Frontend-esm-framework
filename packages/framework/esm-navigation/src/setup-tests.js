/* eslint-env node */
import { vi } from 'vitest';

global.window.egenBase = '/egen-civitas';
global.window.spaBase = '/spa';
global.window.getEgenSpaBase = () => '/egen-civitas/spa/';
