import express from 'express';
import { requireAuth, AuthenticatedRequest } from './auth';
import { getPool } from './db';

export const scenariosRouter = express.Router();

scenariosRouter.use(requireAuth);

// List scenarios for the current user
scenariosRouter.get('/', async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, type, name, description, config, results, created_at, updated_at
       FROM scenarios
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [user.id]
    );
    res.json({ scenarios: result.rows });
  } catch (err: any) {
    console.error('List scenarios error:', err?.message);
    res.status(500).json({ error: 'Senaryolar listelenemedi.' });
  }
});

// Create a scenario from current config + results snapshot
scenariosRouter.post('/', async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { type, name, description, config, results } = req.body || {};

    if (!type || (type !== 'inference' && type !== 'finetuning')) {
      return res.status(400).json({ error: 'Geçersiz senaryo tipi.' });
    }
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Senaryo adı boş olamaz.' });
    }
    if (!config || !results) {
      return res.status(400).json({ error: 'config ve results zorunludur.' });
    }

    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO scenarios (user_id, type, name, description, config, results)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, type, name, description, config, results, created_at, updated_at`,
      [user.id, type, name.trim(), description || null, JSON.stringify(config), JSON.stringify(results)]
    );
    res.status(201).json({ scenario: result.rows[0] });
  } catch (err: any) {
    console.error('Create scenario error:', err?.message);
    res.status(500).json({ error: 'Senaryo kaydedilemedi.' });
  }
});

// Update a scenario (ownership enforced)
scenariosRouter.put('/:id', async (req, res) => {
  try {
    const user = (req as unknown as AuthenticatedRequest).user;
    const { name, description, config, results } = req.body || {};
    const pool = getPool();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Senaryo adı boş olamaz.' });
    }

    const result = await pool.query(
      `UPDATE scenarios
       SET name = $1, description = $2, config = $3, results = $4, updated_at = now()
       WHERE id = $5 AND user_id = $6
       RETURNING id, type, name, description, config, results, created_at, updated_at`,
      [name.trim(), description || null, JSON.stringify(config || {}), JSON.stringify(results || {}), req.params.id, user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Senaryo bulunamadı.' });
    }
    res.json({ scenario: result.rows[0] });
  } catch (err: any) {
    console.error('Update scenario error:', err?.message);
    res.status(500).json({ error: 'Senaryo güncellenemedi.' });
  }
});

// Delete a scenario (ownership enforced)
scenariosRouter.delete('/:id', async (req, res) => {
  try {
    const user = (req as unknown as AuthenticatedRequest).user;
    const pool = getPool();
    const result = await pool.query(
      `DELETE FROM scenarios WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Senaryo bulunamadı.' });
    }
    res.json({ ok: true });
  } catch (err: any) {
    console.error('Delete scenario error:', err?.message);
    res.status(500).json({ error: 'Senaryo silinemedi.' });
  }
});