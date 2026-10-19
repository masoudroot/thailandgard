export async function handler(req, res) {
  try {
    const body = await req.json();
    if (!body.field) {
      return res.status(400).json({ error: 'فیلد لازم است' });
    }
    const logger = require('../../lib/logger').Logger.getInstance();
    logger.info('API handler executed successfully');
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'خطای سرور' });
  }
}