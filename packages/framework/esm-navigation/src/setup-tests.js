/* eslint-env node */
import { vi } from 'vitest';

global.window.egenBase = '/egen';
global.window.spaBase = '/spa';
global.window.getEgenSpaBase = () => '/egen/spa/';
