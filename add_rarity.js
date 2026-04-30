const fs = require('fs');
const path = require('path');
let code = fs.readFileSync(path.join(__dirname, 'prototype/js/cards.js'), 'utf8');

const rarities = {
  ext1001: 'common', ext1002: 'common', ext1003: 'common', ext1004: 'common',
  ext1005: 'uncommon', ext1006: 'common', ext1008: 'uncommon',
  ext1011: 'common', ext1012: 'common', ext1022: 'uncommon', ext1023: 'common',
  ext2001: 'uncommon', ext2002: 'uncommon', ext2004: 'uncommon',
  ext2006: 'uncommon', ext2011: 'uncommon', ext2013: 'uncommon',
  cd101: 'uncommon', cd102: 'rare', cd103: 'common', cd104: 'uncommon',
  cd105: 'rare', cd106: 'uncommon', cd107: 'uncommon', cd108: 'uncommon',
  cdH01: 'rare', cdH02: 'uncommon', cdH03: 'uncommon',
  cdH04: 'rare', cdH05: 'uncommon', cdH06: 'rare',
  cd201: 'uncommon', cd202: 'rare', cd203: 'common',
  cd204: 'rare', cd205: 'rare', cd206: 'uncommon',
  cd301: 'uncommon', cd302: 'epic', cd303: 'epic', cd304: 'rare', cd305: 'rare',
};

let changed = 0;
for (const [key, rarity] of Object.entries(rarities)) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(
    '(libraryKey: "' + escaped + '",[\\s\\S]*?cost: \\d+,\\n)([ ]+)(type: "(?:atk|skl)",)',
    'g'
  );
  const prev = code;
  code = code.replace(regex, (m, before, indent, typeLine) => {
    changed++;
    return before + indent + typeLine + '\n' + indent + 'rarity: "' + rarity + '",';
  });
  if (code === prev) console.warn('No match for', key);
}
fs.writeFileSync(path.join(__dirname, 'prototype/js/cards.js'), code, 'utf8');
console.log('Added rarity to', changed, 'cards');
