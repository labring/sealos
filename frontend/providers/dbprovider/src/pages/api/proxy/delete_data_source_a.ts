import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const { id } = req.query;
  if (!id) {
    res.status(400).json({ error: 'Missing id parameter' });
    return;
  }

  const apiUrl = `https://chat2dbgateway.sealosbja.site/api/open/enterprise/delete_data_source_a?id=${id}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
      'Time-Zone': Array.isArray(req.headers['time-zone'])
        ? req.headers['time-zone'][0]
        : req.headers['time-zone'] || 'Asia/Shanghai'
    },
    body: JSON.stringify(req.body)
  });

  const data = await response.json();
  res.status(response.status).json(data);
}
