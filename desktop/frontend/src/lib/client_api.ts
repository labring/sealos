import type { ApiResp } from '../interfaces/api';

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

  const json_data = json as ApiResp;
  if (json_data.code !== 200) {
    throw new Error(json_data.code + ': ' + json_data.message);
  }

  return json_data.data;
}

export async function FetchGet(query: string = '', variables?: {}, headers?: {}) {
  return fetchAPI(query, variables, headers, 'GET');
}

export async function FetchPost(query: string = '', variables?: {}, headers?: {}) {
  return fetchAPI(query, variables, headers, 'POST');
}
