#!/usr/bin/env node
/**
 * scripts/make-admin-hash.mjs — ساخت هش bcrypt برای ADMIN_PASSWORD_HASH.
 *
 * استفاده:
 *   node scripts/make-admin-hash.mjs "رمز-عبور"
 *
 * خروجی را در کنسول پریزما (Environment) به‌عنوان ADMIN_PASSWORD_HASH ست کنید.
 * رمز هیچ‌جا ذخیره نمی‌شود؛ فقط هش چاپ می‌شود.
 *
 * نکته: اگر رمز در تاریخچه shell بماند، بعداً با `history -d` پاکش کنید
 * یا رمز را از متغیر محیطی بخوانید:
 *   read -s PW && node scripts/make-admin-hash.mjs "$PW"
 */

import { hash } from 'bcryptjs';

const password = process.argv[2];
if (!password) {
  console.error('استفاده: node scripts/make-admin-hash.mjs "رمز-عبور"');
  process.exit(1);
}
if (password.length < 8) {
  console.error('خطا: رمز باید حداقل ۸ کاراکتر باشد.');
  process.exit(1);
}

const h = await hash(password, 12);
console.log(h);
