import { db } from 'hatchable';

export const methods = ['POST'];
export const access = 'member';

export default async function (req, res) {
  const body = req.body || {};
  const id = Number(body.id), status = body.status;
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'A valid report ID is required.' });
  if (!['Submitted', 'Under review', 'Resolved'].includes(status)) return res.status(400).json({ error: 'Invalid report status.' });
  try {
    const result = await db.query('UPDATE environmental_reports SET status = $1, updated_at = now() WHERE id = $2 RETURNING id, status', [status, id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Report not found.' });
    return res.json({ id: String(result.rows[0].id), status: result.rows[0].status });
  } catch (error) {
    console.error('EarthSignal status update failed', String(error));
    return res.status(500).json({ error: 'Status update failed. Please try again.' });
  }
}