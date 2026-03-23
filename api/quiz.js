export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body;
  const key = process.env.GEMINI_API_KEY;

  if (!key) return res.status(500).json({ error: '서버에 API 키가 설정되지 않았습니다.' });

  try {
    // 💡 수정된 부분: 깨진 URL을 정상화하고 모델명을 정확히 기입했습니다.
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: messages,
          generationConfig: { 
            maxOutputTokens: 2000, // 토큰을 너무 크게 잡으면 무료 티어에서 제한에 빨리 걸립니다.
            temperature: 0.3 
          }
        }),
      }
    );

    const data = await response.json();

    // 💡 할당량 초과 오류(429) 등을 구체적으로 처리합니다.
    if (!response.ok) {
      if (response.status === 429) {
        return res.status(429).json({ error: "현재 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요. (무료 티어 제한)" });
      }
      throw new Error(data.error?.message || "Gemini API 호출 중 오류가 발생했습니다.");
    }

    const text = data.candidates[0].content.parts.map(p => p.text || '').join('');
    res.status(200).json({ text });

  } catch (e) {
    console.error("API Error:", e.message);
    res.status(500).json({ error: e.message });
  }
}
