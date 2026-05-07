// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { parseDotenvEnvs, stringifyDotenvEnvs, type DotenvEnv } from '@/utils/dotenvEnv';

const toObject = (envs: DotenvEnv[]) =>
  envs.reduce<Record<string, string>>((acc, { key, value }) => {
    acc[key] = value;
    return acc;
  }, {});

const dotenvReferenceInput = [
  'BASIC=basic',
  '',
  '# previous line intentionally left blank',
  'AFTER_LINE=after_line',
  'EMPTY=',
  "EMPTY_SINGLE_QUOTES=''",
  'EMPTY_DOUBLE_QUOTES=""',
  'EMPTY_BACKTICKS=``',
  "SINGLE_QUOTES='single_quotes'",
  "SINGLE_QUOTES_SPACED='    single quotes    '",
  'DOUBLE_QUOTES="double_quotes"',
  'DOUBLE_QUOTES_SPACED="    double quotes    "',
  'DOUBLE_QUOTES_INSIDE_SINGLE=\'double "quotes" work inside single quotes\'',
  'SINGLE_QUOTES_INSIDE_DOUBLE="single \'quotes\' work inside double quotes"',
  'BACKTICKS=`backticks`',
  'BACKTICKS_SPACED=`    backticks    `',
  'DOUBLE_AND_SINGLE_QUOTES_INSIDE_BACKTICKS=`double "quotes" and single \'quotes\' work inside backticks`',
  'EXPAND_NEWLINES="expand\\nnew\\nlines"',
  'DONT_EXPAND_UNQUOTED=dontexpand\\nnewlines',
  "DONT_EXPAND_SQUOTED='dontexpand\\nnewlines'",
  '# COMMENTS=work',
  'INLINE_COMMENTS=inline comments # work #very #well',
  "INLINE_COMMENTS_SINGLE_QUOTES='inline comments outside of #singlequotes' # work",
  'INLINE_COMMENTS_DOUBLE_QUOTES="inline comments outside of #doublequotes" # work',
  'INLINE_COMMENTS_BACKTICKS=`inline comments outside of #backticks` # work',
  'INLINE_COMMENTS_SPACE=inline comments start with a#number sign. no space required.',
  'EQUAL_SIGNS=equals==',
  'RETAIN_INNER_QUOTES={"foo": "bar"}',
  'RETAIN_INNER_QUOTES_AS_STRING=\'{"foo": "bar"}\'',
  'RETAIN_INNER_QUOTES_AS_BACKTICKS=`{"foo": "bar\'s"}`',
  'TRIM_SPACE_FROM_UNQUOTED=    some spaced out string',
  'USERNAME=therealnerdybeast@example.tld',
  '    SPACED_KEY = parsed',
  'export EXPORT_IS_DECLARED=parsed',
  'export   EXPORT_IS_DECLARED_WITH_SPACING=parsed',
  'export EXPORT_IS_DECLARED_WITH_SOME_VALUE=some_value',
  'export EXPORT_IS_DECLARED_WITH_SOME_VALUE_SPACED=some_value',
  'export   EXPORT_IS_DECLARED_WITH_SOME_VALUE_AND_SPACING  =some_value'
].join('\n');

const multilineReferenceInput = [
  'MULTI_DOUBLE_QUOTED="THIS',
  'IS',
  'A',
  'MULTILINE',
  'STRING"',
  '',
  "MULTI_SINGLE_QUOTED='THIS",
  'IS',
  'A',
  'MULTILINE',
  "STRING'",
  '',
  'MULTI_BACKTICKED=`THIS',
  'IS',
  'A',
  '"MULTILINE\'S"',
  'STRING`',
  '',
  'MULTI_PEM_DOUBLE_QUOTED="-----BEGIN PUBLIC KEY-----',
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnNl1tL3QjKp3DZWM0T3u',
  'LgGJQwu9WqyzHKZ6WIA5T+7zPjO1L8l3S8k8YzBrfH4mqWOD1GBI8Yjq2L1ac3Y/',
  '-----END PUBLIC KEY-----"'
].join('\n');

describe('dotenv environment variable parser', () => {
  describe('dotenv-compatible parsing', () => {
    const parsed = toObject(parseDotenvEnvs(dotenvReferenceInput));

    it('parses basic values, blank lines, and empty quoted values', () => {
      expect(parsed.BASIC).toBe('basic');
      expect(parsed.AFTER_LINE).toBe('after_line');
      expect(parsed.EMPTY).toBe('');
      expect(parsed.EMPTY_SINGLE_QUOTES).toBe('');
      expect(parsed.EMPTY_DOUBLE_QUOTES).toBe('');
      expect(parsed.EMPTY_BACKTICKS).toBe('');
      expect(parsed.COMMENTS).toBeUndefined();
    });

    it('removes surrounding quotes while preserving inner spacing and quotes', () => {
      expect(parsed.SINGLE_QUOTES).toBe('single_quotes');
      expect(parsed.SINGLE_QUOTES_SPACED).toBe('    single quotes    ');
      expect(parsed.DOUBLE_QUOTES).toBe('double_quotes');
      expect(parsed.DOUBLE_QUOTES_SPACED).toBe('    double quotes    ');
      expect(parsed.BACKTICKS).toBe('backticks');
      expect(parsed.BACKTICKS_SPACED).toBe('    backticks    ');
      expect(parsed.DOUBLE_QUOTES_INSIDE_SINGLE).toBe('double "quotes" work inside single quotes');
      expect(parsed.SINGLE_QUOTES_INSIDE_DOUBLE).toBe("single 'quotes' work inside double quotes");
      expect(parsed.DOUBLE_AND_SINGLE_QUOTES_INSIDE_BACKTICKS).toBe(
        'double "quotes" and single \'quotes\' work inside backticks'
      );
      expect(parsed.RETAIN_INNER_QUOTES).toBe('{"foo": "bar"}');
      expect(parsed.RETAIN_INNER_QUOTES_AS_STRING).toBe('{"foo": "bar"}');
      expect(parsed.RETAIN_INNER_QUOTES_AS_BACKTICKS).toBe('{"foo": "bar\'s"}');
    });

    it('matches dotenv newline escape and comment behavior', () => {
      expect(parsed.EXPAND_NEWLINES).toBe('expand\nnew\nlines');
      expect(parsed.DONT_EXPAND_UNQUOTED).toBe('dontexpand\\nnewlines');
      expect(parsed.DONT_EXPAND_SQUOTED).toBe('dontexpand\\nnewlines');
      expect(parsed.INLINE_COMMENTS).toBe('inline comments');
      expect(parsed.INLINE_COMMENTS_SINGLE_QUOTES).toBe('inline comments outside of #singlequotes');
      expect(parsed.INLINE_COMMENTS_DOUBLE_QUOTES).toBe('inline comments outside of #doublequotes');
      expect(parsed.INLINE_COMMENTS_BACKTICKS).toBe('inline comments outside of #backticks');
      expect(parsed.INLINE_COMMENTS_SPACE).toBe('inline comments start with a');
    });

    it('keeps values with equals signs, trims unquoted values, and supports export', () => {
      expect(parsed.EQUAL_SIGNS).toBe('equals==');
      expect(parsed.TRIM_SPACE_FROM_UNQUOTED).toBe('some spaced out string');
      expect(parsed.USERNAME).toBe('therealnerdybeast@example.tld');
      expect(parsed.SPACED_KEY).toBe('parsed');
      expect(parsed.EXPORT_IS_DECLARED).toBe('parsed');
      expect(parsed.EXPORT_IS_DECLARED_WITH_SPACING).toBe('parsed');
      expect(parsed.EXPORT_IS_DECLARED_WITH_SOME_VALUE).toBe('some_value');
      expect(parsed.EXPORT_IS_DECLARED_WITH_SOME_VALUE_SPACED).toBe('some_value');
      expect(parsed.EXPORT_IS_DECLARED_WITH_SOME_VALUE_AND_SPACING).toBe('some_value');
    });

    it('normalizes dotenv-supported line endings', () => {
      const expected = { SERVER: 'localhost', PASSWORD: 'password', DB: 'tests' };

      expect(toObject(parseDotenvEnvs('SERVER=localhost\rPASSWORD=password\rDB=tests\r'))).toEqual(
        expected
      );
      expect(toObject(parseDotenvEnvs('SERVER=localhost\nPASSWORD=password\nDB=tests\n'))).toEqual(
        expected
      );
      expect(
        toObject(parseDotenvEnvs('SERVER=localhost\r\nPASSWORD=password\r\nDB=tests\r\n'))
      ).toEqual(expected);
    });

    it('parses multiline quoted values from dotenv reference cases', () => {
      const multiline = toObject(parseDotenvEnvs(multilineReferenceInput));
      const multiPem = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnNl1tL3QjKp3DZWM0T3u
LgGJQwu9WqyzHKZ6WIA5T+7zPjO1L8l3S8k8YzBrfH4mqWOD1GBI8Yjq2L1ac3Y/
-----END PUBLIC KEY-----`;

      expect(multiline.MULTI_DOUBLE_QUOTED).toBe('THIS\nIS\nA\nMULTILINE\nSTRING');
      expect(multiline.MULTI_SINGLE_QUOTED).toBe('THIS\nIS\nA\nMULTILINE\nSTRING');
      expect(multiline.MULTI_BACKTICKED).toBe('THIS\nIS\nA\n"MULTILINE\'S"\nSTRING');
      expect(multiline.MULTI_PEM_DOUBLE_QUOTED).toBe(multiPem);
    });
  });

  describe('applaunchpad editor compatibility', () => {
    it('keeps existing editor shorthand forms compatible', () => {
      expect(
        parseDotenvEnvs(`
          mongoUrl=127.0.0.1:8000
          redisUrl:127.0.0.0:8001
          - env1 =test
          'QUOTED_KEY'=quoted-key
        `)
      ).toEqual([
        { key: 'mongoUrl', value: '127.0.0.1:8000' },
        { key: 'redisUrl', value: '127.0.0.0:8001' },
        { key: 'env1', value: 'test' },
        { key: 'QUOTED_KEY', value: 'quoted-key' }
      ]);
    });

    it('preserves duplicate keys as separate form entries', () => {
      expect(parseDotenvEnvs('DUP=one\nDUP=two')).toEqual([
        { key: 'DUP', value: 'one' },
        { key: 'DUP', value: 'two' }
      ]);
    });

    it('serializes multiline values with dotenv-compatible quotes', () => {
      expect(
        stringifyDotenvEnvs([
          { key: 'PLAIN', value: 'value' },
          { key: 'MULTI', value: 'line1\nline2' },
          { key: 'HASH', value: 'value # with hash' }
        ])
      ).toBe(`PLAIN=value
MULTI='line1
line2'
HASH='value # with hash'`);
    });
  });
});
