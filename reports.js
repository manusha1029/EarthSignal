import { db } from 'hatchable';

export const methods = ['GET', 'POST'];
export const access = 'public';

function present(row) {
  return {
    id: String(row.id), title: row.title, category: row.category,
    location: row.location_label, description: row.description || '',
    photo: row.photo_data_url, lat: Number(row.latitude), lng: Number(row.longitude),
    status: row.status, analysis: row.ai_analysis || '', createdAt: row.created_at
  };
}

export default async function (req, res) {
  try {
    if (req.method === 'GET') {
      const result = await db.query('SELECT id, title, category, location_label, description, photo_data_url, latitude, longitude, status, ai_analysis, created_at FROM environmental_reports ORDER BY created_at DESC LIMIT 100');
      return res.json({ reports: result.rows.map(present) });
    }
    const body = req.body || {};
    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 90) : '';
    const category = typeof body.category === 'string' ? body.category.trim().slice(0, 80) : '';
    const location = typeof body.location === 'string' ? body.location.trim().slice(0, 120) : '';
    const description = typeof body.description === 'string' ? body.description.trim().slice(0, 600) : '';
    const photo = body.photo;
    const lat = Number(body.lat), lng = Number(body.lng);
    if (!title || !category || !location) return res.status(400).json({ error: 'Title, category, and location are required.' });
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) return res.status(400).json({ error: 'A valid map coordinate is required.' });
    if (typeof photo !== 'string' || !/^data:image\/jpeg;base64,/.test(photo) || photo.length > 7_000_000) return res.status(400).json({ error: 'A compressed JPEG evidence photo under 5 MB is required.' });
    const duplicate = await db.query('SELECT id FROM environmental_reports WHERE lower(title) = lower($1) AND lower(category) = lower($2) AND lower(location_label) = lower($3) LIMIT 1', [title, category, location]);
    if (duplicate.rows.length) return res.status(409).json({ error: 'Possible duplicate: a report with this title, category, and location already exists.' });
    const inserted = await db.query('INSERT INTO environmental_reports (title, category, location_label, description, photo_data_url, latitude, longitude) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, title, category, location_label, description, photo_data_url, latitude, longitude, status, ai_analysis, created_at', [title, category, location, description, photo, lat, lng]);
    return res.status(201).json({ report: present(inserted.rows[0]) });
  } catch (error) {
    console.error('EarthSignal reports API failed', String(error));
    return res.status(500).json({ error: 'Reports are temporarily unavailable. Please try again.' });
  }
}