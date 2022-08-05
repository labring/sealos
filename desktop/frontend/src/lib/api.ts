const api_host = process.env.NEXT_PUBLIC_API_HOST;

async function fetchAPI(query: string = '', variables?: {}, headers?: {}, method: string = 'GET') {
  let req_headers = { 'Content-Type': 'application/json' };
  if (headers) {
    req_headers = { ...req_headers, ...headers };
  }

  if (method === 'GET' && variables !== undefined) {
    query += '?' + new URLSearchParams(variables).toString();
  }

  const res = await fetch(api_host + query, {
    headers: req_headers,
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

export async function fetchGet(query: string = '', variables?: {}, headers?: {}) {
  return fetchAPI(query, variables, headers, 'GET');
}

export async function fetchPost(query: string = '', variables?: {}, headers?: {}) {
  return fetchAPI(query, variables, headers, 'POST');
}
