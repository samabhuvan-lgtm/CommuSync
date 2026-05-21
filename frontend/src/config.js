const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Allow configuring via environment variables, defaulting to current routes
const PROD_API_BASE = import.meta.env.VITE_API_BASE || '/_/backend';
const PROD_SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;
const PROD_SOCKET_PATH = import.meta.env.VITE_SOCKET_PATH || '/_/backend/socket.io';

export const API_BASE = IS_LOCAL 
  ? 'http://localhost:5001' 
  : PROD_API_BASE;

export const SOCKET_URL = IS_LOCAL 
  ? 'http://localhost:5001' 
  : PROD_SOCKET_URL;

export const SOCKET_OPTIONS = IS_LOCAL 
  ? {} 
  : { path: PROD_SOCKET_PATH };
