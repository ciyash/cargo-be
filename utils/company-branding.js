export function logoMime(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length > 5 * 1024 * 1024) return null;
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return 'image/jpeg';
  if (buffer.length >= 12 && buffer.toString('ascii',0,4) === 'RIFF' && buffer.toString('ascii',8,12) === 'WEBP') return 'image/webp';
  return null;
}
export function logoLetters(name, custom = '') {
  if (/^[a-z]{2}$/i.test(custom.trim())) return custom.trim().toUpperCase();
  const words = String(name || '').match(/\p{L}+/gu) || ['CN'];
  const letters = words.length > 1 ? Array.from(words[0])[0] + Array.from(words[1])[0] : Array.from(words[0]).slice(0, 2).join('');
  return (letters.length === 1 ? letters + letters : letters).toUpperCase();
}
export function publicBranding(company) {
  return { companyId: String(company._id), name: company.name, logoText: logoLetters(company.name, company.logoText || '') };
}
