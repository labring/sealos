const api_host = process.env.NEXT_PUBLIC_API_HOST;

async function fetchAPI(query: string = '', variables?: any, method: string = 'GET') {
  const headers = { 'Content-Type': 'application/json' };

  if (method === 'GET' && variables !== undefined) {
    query += '?' + new URLSearchParams(variables).toString();
  }

  const res = await fetch(api_host + query, {
    headers,
    method: method,
    body: method !== 'GET' && variables ? JSON.stringify(variables) : undefined
  });

  const json = await res.json();
  if (json.errors) {
    console.error(json.errors);
    throw new Error('Failed to fetch API');
  }
  return json;
}

export async function fetchGet(query: string = '', variables?: any) {
  return fetchAPI(query, variables, 'GET');
}

export async function fetchPost(query: string = '', variables?: any) {
  return fetchAPI(query, variables, 'POST');
}
