import { describe, expect, it } from 'vitest';
import { MAX_PROFILE_NAME_BYTES, truncateProfileName } from './profileName';

const utf8Length = (s: string) => new TextEncoder().encode(s).length;

describe('truncateProfileName', () => {
  it('leaves names that fit alone', () => {
    expect(truncateProfileName('')).toBe('');
    expect(truncateProfileName('Guitar')).toBe('Guitar');
    expect(truncateProfileName('n'.repeat(31))).toBe('n'.repeat(31));
  });

  it('cuts longer names to 31 bytes', () => {
    expect(truncateProfileName('My favourite guitar for Clone Hero')).toBe(
      'My favourite guitar for Clone H'
    );
    expect(truncateProfileName('a'.repeat(32))).toBe('a'.repeat(31));
  });

  it('counts UTF-8 bytes and never splits a character', () => {
    // é is 2 bytes, so the 31st byte would be half of it
    expect(truncateProfileName(`${'x'.repeat(30)}éz`)).toBe('x'.repeat(30));
    // 🎸 is 4 bytes (a surrogate pair in JS)
    expect(truncateProfileName(`${'x'.repeat(28)}🎸`)).toBe('x'.repeat(28));
    expect(truncateProfileName(`${'x'.repeat(27)}🎸yy`)).toBe(`${'x'.repeat(27)}🎸`);
    const name = truncateProfileName('ギターのプロファイルの名前です');
    expect(utf8Length(name)).toBeLessThanOrEqual(MAX_PROFILE_NAME_BYTES);
    expect(name).toBe('ギターのプロファイル');
  });
});
