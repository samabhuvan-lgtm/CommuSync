const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const API_BASE = IS_LOCAL 
  ? 'http://localhost:5001' 
  : '/_/backend';

export const SOCKET_URL = IS_LOCAL 
  ? 'http://localhost:5001' 
  : window.location.origin;

export const SOCKET_OPTIONS = IS_LOCAL 
  ? {} 
  : { path: '/_/backend/socket.io' };
