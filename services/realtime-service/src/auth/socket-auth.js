import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function authenticateSocket(socket, next) {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace('Bearer ', '');

  if (!token) {
    return next(new Error('AUTH_MISSING: No token provided'));
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    socket.data.userId   = payload.userId;
    socket.data.role     = payload.role;
    socket.data.venueId  = payload.venueId || 'default';
    socket.data.email    = payload.email;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new Error('AUTH_EXPIRED: Token has expired'));
    }
    return next(new Error('AUTH_INVALID: Token is invalid'));
  }
}

export function requireManagerRole(socket, next) {
  const MANAGER_ROLES = ['SECURITY_LEAD', 'VENUE_MANAGER', 'SUPER_ADMIN'];
  if (!MANAGER_ROLES.includes(socket.data.role)) {
    return next(new Error('FORBIDDEN: Manager role required'));
  }
  next();
}

export function isManagerRole(role) {
  return ['SECURITY_LEAD', 'VENUE_MANAGER', 'SUPER_ADMIN'].includes(role);
}
