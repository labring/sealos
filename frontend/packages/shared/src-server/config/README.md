# Config module

## Usage

```typescript
import { readConfig, prettyPrintErrors } from '@sealos/shared/server/config';
import type { ConfigResult } from '@sealos/shared/server/config';

// For example, configText can be loaded with fs module

// Defaults to YAML parsing (async)
const result = await readConfig(configText, AppConfigSchema);

// Or use custom parser
const result = await readConfig(configText, AppConfigSchema, JSON.parse);

if (result.error) {
  console.error(prettyPrintErrors(result.error.details));
  process.exit(1);
}

console.log(result.data);
```
