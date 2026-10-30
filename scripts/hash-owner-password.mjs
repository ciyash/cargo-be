import bcrypt from 'bcryptjs';
let password = '';
process.stdin.setEncoding('utf8');
for await (const chunk of process.stdin) password += chunk;
password = password.replace(/\r?\n$/, '');
if (password.length < 12) throw new Error('Use an owner password of at least 12 characters');
console.log(await bcrypt.hash(password, 12));
