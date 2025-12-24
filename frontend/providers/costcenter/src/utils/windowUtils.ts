/**
 * Opens a URL in a new window.
 * Supports both synchronous URLs (string) and asynchronous URLs (Promise<string>).
 *
 * For async URLs, opens a blank window synchronously, then navigates to the URL
 * once it's resolved. If the promise rejects, the window is closed.
 *
 * Note: We cannot use 'noopener' or 'noreferrer' features as they cause
 * window.open() to return null. Instead, we manually set opener to null for security.
 *
 * @param url - The URL to open, either as a string or a Promise that resolves to a string
 * @param showLoading - If true and url is a Promise, shows a loading indicator in the blank window
 */
export function openInNewWindow(url: string | Promise<string>, showLoading: boolean = false): void {
  // Open blank window synchronously
  const newWindow = window.open('', '_blank');

  if (!newWindow) {
    // Popup blocked or window couldn't be opened
    return;
  }

  // Manually set opener to null for security (replaces noopener feature)
  newWindow.opener = null;

  // If URL is a string, navigate immediately
  if (typeof url === 'string') {
    newWindow.location.href = url;
    return;
  }

  // If URL is a Promise, show loading indicator if requested
  if (showLoading) {
    newWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Loading...</title>
          <style>
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .loader {
              text-align: center;
            }
            .spinner {
              border: 3px solid #f3f3f3;
              border-top: 3px solid #3498db;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin: 0 auto 20px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="loader">
            <div class="spinner"></div>
          </div>
        </body>
      </html>
    `);
    newWindow.document.close();
  }

  // Wait for URL to resolve, then navigate
  Promise.resolve(url)
    .then((targetUrl) => {
      newWindow.location.href = targetUrl;
    })
    .catch(() => {
      newWindow.close();
    });
}
