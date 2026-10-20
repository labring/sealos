/** Inject namespace into explicit selectors without rewriting quoted PromQL strings. */
export function injectNamespace(query: string, namespace: string): string {
  if (!query.trim()) throw new Error('query is required');
  let result = '';
  let quote = '';
  for (let i = 0; i < query.length; i++) {
    const char = query[i];
    if (quote) {
      result += char;
      if (char === '\\' && quote !== '`') result += query[++i] ?? '';
      else if (char === quote) quote = '';
      continue;
    }
    if ('"\'`'.includes(char)) {
      quote = char;
      result += char;
      continue;
    }
    if (char !== '{') {
      result += char;
      continue;
    }

    const labels: string[] = [];
    let label = '';
    let selectorQuote = '';
    let closed = false;
    for (i++; i < query.length; i++) {
      const current = query[i];
      if (selectorQuote) {
        label += current;
        if (current === '\\' && selectorQuote !== '`') label += query[++i] ?? '';
        else if (current === selectorQuote) selectorQuote = '';
      } else if ('"\'`'.includes(current)) {
        selectorQuote = current;
        label += current;
      } else if (current === ',' || current === '}') {
        if (label.trim()) labels.push(label.trim());
        label = '';
        if (current === '}') {
          closed = true;
          break;
        }
      } else {
        label += current;
      }
    }
    if (!closed) throw new Error('Unclosed PromQL selector');

    let hasNamespace = false;
    const scoped = labels.map((item) => {
      if (item === '$') {
        hasNamespace = true;
        return `namespace=${JSON.stringify(namespace)}`;
      }
      if (/^namespace\s*(?:=~|!~|!=|=)/.test(item)) {
        const match = item.match(/^namespace\s*(=~|=)\s*"((?:[^"\\]|\\.)*)"\s*$/);
        if (!match || JSON.parse(`"${match[2]}"`) !== namespace) {
          throw new Error('namespace selector must match the authenticated namespace');
        }
        hasNamespace = true;
      }
      return item;
    });
    // Collapse an existing namespace matcher plus the legacy $ placeholder.
    let emittedNamespace = false;
    const deduplicated = scoped.filter((item) => {
      if (!/^namespace\s*(?:=~|=)/.test(item)) return true;
      if (emittedNamespace) return false;
      emittedNamespace = true;
      return true;
    });
    if (!hasNamespace) deduplicated.unshift(`namespace=${JSON.stringify(namespace)}`);
    result += `{${deduplicated.join(',')}}`;
  }
  if (quote) throw new Error('Unclosed PromQL string');
  return result;
}
