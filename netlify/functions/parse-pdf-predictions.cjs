// parse-pdf-predictions.js
// Uses Claude Vision API to extract predictions from uploaded PDF
// Handles machine-generated PDFs (Excel exports) and scanned paper sheets

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  try {
    const { pdfBase64, mediaType = 'application/pdf' } = JSON.parse(event.body)

    if (!pdfBase64) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No PDF data provided' }) }
    }

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
    if (!ANTHROPIC_API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) }
    }

    const prompt = `You are parsing a World Cup 2026 predictor sheet. Extract ALL match predictions from this document.

For each match, extract:
- match_number: the match number (1-72 for group stage)
- home_score: the predicted home team score (integer)
- away_score: the predicted away team score (integer)  
- home_team: home team name exactly as written
- away_team: away team name exactly as written
- is_joker: true if there is an X, ✓, tick, or any mark in the Joker column for this match, false otherwise

Also extract group positions if present:
- group_positions: object like {"A": {"Mexico": 1, "Korea Republic": 2, ...}, "B": {...}, ...}

Return ONLY valid JSON in this exact format, no other text:
{
  "predictions": [
    {"match_number": 1, "home_team": "Mexico", "away_team": "South Africa", "home_score": 2, "away_score": 1, "is_joker": false},
    ...
  ],
  "group_positions": {
    "A": {"Mexico": 2, "Korea Republic": 1, "Czechia": 3, "South Africa": 4},
    ...
  }
}

Important:
- Only include matches where BOTH scores are filled in
- Match numbers should match the # column if present
- Joker is true ONLY if explicitly marked with X or similar
- If group positions are not filled in, return empty object for group_positions`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: pdfBase64,
              }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        }]
      })
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Claude API error:', err)
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to parse PDF' }) }
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ''

    // Parse the JSON response
    let parsed
    try {
      const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(clean)
    } catch (e) {
      console.error('Failed to parse Claude response:', text)
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to parse response', raw: text }) }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed)
    }

  } catch (e) {
    console.error('parse-pdf-predictions error:', e)
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) }
  }
}
