const pool = require('../config/db');

const Session = {
  // --- CREAR SESIÓN ---
  create: async (userId, branchId, token) => {
    const query = `
      INSERT INTO sessions (user_id, branch_id, token)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, branch_id) 
      DO UPDATE SET token = $3, last_activity = CURRENT_TIMESTAMP
      RETURNING id, user_id, branch_id, token, created_at, last_activity
    `;
    const { rows } = await pool.query(query, [userId, branchId, token]);
    return rows[0];
  },

  // --- BUSCAR SESIÓN ---
  findByUserAndBranch: async (userId, branchId) => {
    const query = `
      SELECT s.*, u.username, u.role, b.name as branch_name 
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      JOIN branches b ON s.branch_id = b.id
      WHERE s.user_id = $1 AND s.branch_id = $2
    `;
    const { rows } = await pool.query(query, [userId, branchId]);
    return rows[0];
  },

  // --- BUSCAR TODAS LAS SESIONES DE UN USUARIO ---
  findByUserId: async (userId) => {
    const query = `
      SELECT s.*, u.username, u.role, b.name as branch_name 
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      JOIN branches b ON s.branch_id = b.id
      WHERE s.user_id = $1
      ORDER BY s.last_activity DESC
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows;
  },

  // --- ACTUALIZAR ACTIVIDAD ---
  updateActivity: async (sessionId) => {
    const query = `
      UPDATE sessions 
      SET last_activity = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const { rows } = await pool.query(query, [sessionId]);
    return rows[0];
  },

  // --- ELIMINAR SESIÓN ---
  delete: async (sessionId) => {
    const query = 'DELETE FROM sessions WHERE id = $1 RETURNING id';
    const { rows } = await pool.query(query, [sessionId]);
    return rows[0];
  },

  // --- ELIMINAR TODAS LAS SESIONES DE UN USUARIO EN UNA SUCURSAL ---
  deleteByUserAndBranch: async (userId, branchId) => {
    const query = 'DELETE FROM sessions WHERE user_id = $1 AND branch_id = $2 RETURNING id';
    const { rows } = await pool.query(query, [userId, branchId]);
    return rows;
  },

  // --- ELIMINAR TODAS LAS SESIONES DE UN USUARIO ---
  deleteByUserId: async (userId) => {
    const query = 'DELETE FROM sessions WHERE user_id = $1 RETURNING id';
    const { rows } = await pool.query(query, [userId]);
    return rows;
  },

  // --- VERIFICAR SI EXISTE SESIÓN ACTIVA EN UNA SUCURSAL (Última actividad hace menos de X minutos) ---
  isActiveInBranch: async (branchId, minAgoThreshold = 30) => {
    const query = `
      SELECT s.*, u.username, u.role
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.branch_id = $1 
      AND s.last_activity > NOW() - INTERVAL '${minAgoThreshold} minutes'
    `;
    const { rows } = await pool.query(query, [branchId]);
    return rows.length > 0 ? rows[0] : null;
  }
};

module.exports = Session;
