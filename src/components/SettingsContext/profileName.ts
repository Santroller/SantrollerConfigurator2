// The firmware keeps a profile's name in a 32 byte buffer (Santroller/proto/config.options:
// proto.ProfileOpts.name max_size:32), which includes the terminating NUL. A longer name can't be
// decoded, so names are limited to what fits, counted in UTF-8 bytes.
export const MAX_PROFILE_NAME_BYTES = 31;

const encoder = new TextEncoder();

// Shorten a name to at most MAX_PROFILE_NAME_BYTES of UTF-8, never splitting a character
export function truncateProfileName(name: string): string {
  if (encoder.encode(name).length <= MAX_PROFILE_NAME_BYTES) {
    return name;
  }
  let bytes = 0;
  let out = '';
  for (const char of name) {
    const size = encoder.encode(char).length;
    if (bytes + size > MAX_PROFILE_NAME_BYTES) {
      break;
    }
    bytes += size;
    out += char;
  }
  return out;
}
