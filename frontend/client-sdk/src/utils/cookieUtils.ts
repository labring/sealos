export const getCookie = (name: string): string | undefined => {
  if (typeof document === 'undefined' || !name) {
    return undefined;
  }

  const cookies: string[] = document.cookie ? document.cookie.split('; ') : [];
  const cookieMap: { [key: string]: string } = {};

  for (let i = 0; i < cookies.length; i++) {
    const [cookieName, cookieValue] = cookies[i].split('=');
    cookieMap[decodeURIComponent(cookieName)] = decodeURIComponent(cookieValue);
  }

  return cookieMap[name];
};
