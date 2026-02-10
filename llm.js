const { OPENAI_API_KEY, OPENAI_BASE_URL = 'https://api.openai.com/v1', MODEL = 'gpt-4o' } = process.env;

export const callLLM = async ({ messages, tools }) => {
  const body = { model: MODEL, messages };
  if (tools?.length) body.tools = tools;

  const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.choices[0].message;
};
