import { ai, db } from 'hatchable';

export const methods = ['POST'];
export const access = 'public';

export default async function (req, res) {
  const body = req.body || {};
  const reportId = Number(body.reportId);
  if (!Number.isSafeInteger(reportId) || reportId < 1) return res.status(400).json({ error: 'A valid report ID is required.' });
  let imageDataUrl, category;
  try {
    const reportResult = await db.query('SELECT photo_data_url, category FROM environmental_reports WHERE id = $1', [reportId]);
    if (!reportResult.rows.length) return res.status(404).json({ error: 'Report not found.' });
    imageDataUrl = reportResult.rows[0].photo_data_url;
    category = String(reportResult.rows[0].category || 'Unknown').slice(0, 80);
  } catch (error) {
    console.error('EarthSignal report lookup failed', String(error));
    return res.status(500).json({ error: 'Could not load evidence for analysis.' });
  }
  if (typeof imageDataUrl !== 'string' || !/^data:image\/jpeg;base64,/.test(imageDataUrl) || imageDataUrl.length > 7_000_000) return res.status(400).json({ error: 'Stored evidence image is invalid or too large.' });

  const prompt = 'You are EarthSignal, an environmental evidence assistant. Analyze this photo only for visible environmental conditions. The reporter-selected category is: ' + category + '. Return concise JSON with keys: detected_category (one of plastic waste, mixed/illegal dumping, sewage/wastewater, construction debris, water pollution, air pollution, other, unclear), visible_observations (array of 2-4 short statements grounded only in visible evidence), confidence (low, medium, or high), possible_duplicate_guidance (one sentence saying this image alone cannot confirm a duplicate), and safety_note (one sentence). Do not infer the person responsible, exact location, intent, legal violation, health effects, or facts not visible. If uncertain, use unclear/low. This is an assistive description, not an official verification.';

  try {
    const response = await ai.fetch({
      provider: 'openai',
      path: '/v1/chat/completions',
      body: {
        model: 'gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 450,
        messages: [
          { role: 'system', content: 'You carefully describe images for environmental reporting. Never claim to verify an allegation.' },
          { role: 'user', content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageDataUrl, detail: 'low' } }
          ]}
        ]
      },
      purpose: 'earthsignal-image-analysis',
      timeoutMs: 45000
    });
    if (!response.ok) {
      console.error('EarthSignal image analysis provider error', {status: response.status, error: response.error});
      return res.status(response.status === 412 ? 412 : 502).json({
        error: response.status === 412
          ? 'AI setup is required. Configure an AI provider key in your Hatchable project settings.'
          : 'Image analysis is temporarily unavailable. Please try again later.'
      });
    }
    const result = await response.json();
    const text = result.choices?.[0]?.message?.content;
    if (!text) return res.status(502).json({error:'AI returned no analysis.'});
    await db.query('UPDATE environmental_reports SET ai_analysis = $1, updated_at = now() WHERE id = $2', [text, reportId]);
    return res.json({analysis: text, model: result.model || 'gpt-4o-mini'});
  } catch (error) {
    console.error('EarthSignal image analysis failed', String(error));
    return res.status(502).json({error:'Image analysis failed. Check AI setup and try again.'});
  }
}