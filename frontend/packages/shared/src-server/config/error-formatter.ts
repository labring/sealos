import { ZodError } from 'zod';
import * as pc from 'picocolors';

/**
 * Options for pretty printing errors.
 */
export interface PrettyPrintOptions {
  /** Include error code in output */
  showCode?: boolean;
  /** Indentation string */
  indent?: string;
}

/**
 * Create a horizontal separator line.
 */
function separator(char: string = '─', length: number = 60): string {
  return pc.dim(char.repeat(length));
}

/**
 * Calculate the display width of a number with dot and space (without ANSI color codes).
 * Format: "1. " = 3 chars, "10. " = 4 chars
 */
function numberWidth(num: number): number {
  return String(num).length + 2; // +1 for dot, +1 for space (e.g., "1. " = 3 chars)
}

/**
 * Pretty print Zod validation errors in a human-readable format with colors.
 */
export function prettyPrintErrors(
  error: ZodError | Error,
  options: PrettyPrintOptions = {}
): string {
  const { showCode = true, indent = '    ' } = options;

  // Handle non-Zod errors
  if (!(error instanceof ZodError)) {
    return `${pc.red('✗')} ${pc.bold('Error')}: ${error.message}${
      error.stack ? '\n' + error.stack : ''
    }`;
  }

  const lines: string[] = [];

  // Header with separator
  lines.push(pc.red('✗ Configuration validation errors'));
  lines.push(separator());
  lines.push('');

  // Calculate max issue number width for alignment (with at least one separating space)
  const maxIssueNum = error.issues.length;
  const maxIssueNumWidth = numberWidth(maxIssueNum) + 1;

  error.issues.forEach((issue, index) => {
    const path = issue.path.length > 0 ? issue.path.join(pc.dim('.')) : pc.dim('<root>');
    const code = showCode ? pc.gray(` [${issue.code}]`) : '';
    const issueNum = pc.yellow(`${index + 1}. `);
    const issueNumWidth = numberWidth(index + 1);
    const padding = ' '.repeat(maxIssueNumWidth - issueNumWidth);
    const fieldPrefix = `${issueNum}${padding}`;
    const spacePrefix = ' '.repeat(maxIssueNumWidth);

    lines.push(`${fieldPrefix}${pc.bold('Field')}: ${pc.cyan(path)}${code}`);
    lines.push(`${spacePrefix}${pc.bold('Message')}: ${pc.red(issue.message)}`);

    // Add received value if available
    if ('received' in issue && issue.received !== undefined) {
      const receivedStr = JSON.stringify(issue.received);
      lines.push(`${spacePrefix}${pc.bold('Received')}: ${pc.red(receivedStr)}`);
    }

    // Add expected value if available
    if ('expected' in issue && issue.expected !== undefined) {
      const expectedStr = JSON.stringify(issue.expected);
      lines.push(`${spacePrefix}${pc.bold('Expected')}: ${pc.green(expectedStr)}`);
    }

    // Add valid values if available
    if ('values' in issue && issue.values !== undefined) {
      const valuesStr = JSON.stringify(issue.values);
      lines.push(`${spacePrefix}${pc.bold('Valid values')}: ${pc.green(valuesStr)}`);
    }

    // Add union errors if available
    if (issue.code === 'invalid_union' && 'unionErrors' in issue) {
      const unionErrors = issue.unionErrors as ZodError[];
      lines.push(`${spacePrefix}${pc.bold('Union errors')}:`);
      unionErrors.forEach((unionErr: ZodError, uIdx: number) => {
        lines.push(`${spacePrefix}${indent}${pc.yellow(`Option ${uIdx + 1}`)}:`);
        unionErr.issues.forEach((subIssue) => {
          const subPath =
            subIssue.path.length > 0 ? subIssue.path.join(pc.dim('.')) : pc.dim('<root>');
          lines.push(
            `${spacePrefix}${indent}${indent}${pc.dim('─')} ${subPath}: ${pc.red(subIssue.message)}`
          );
        });
      });
    }

    // Add separator between issues (except last one)
    if (index < error.issues.length - 1) {
      lines.push('');
      lines.push(separator('·', 40));
      lines.push('');
    }
  });

  // Footer with summary
  lines.push('');
  lines.push(separator());
  lines.push(`${pc.red('✗')} ${pc.bold('Total errors')}: ${pc.red(String(error.issues.length))}`);

  return lines.join('\n');
}

/**
 * Format Zod error for logging (compact one-line format).
 */
export function formatErrorCompact(error: ZodError | Error): string {
  if (!(error instanceof ZodError)) {
    return `Error: ${error.message}`;
  }

  const issues = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : '<root>';
    return `${path}: ${issue.message}`;
  });

  return `Validation failed: ${issues.join('; ')}`;
}
