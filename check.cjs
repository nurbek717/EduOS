const fs = require('fs');
const content = fs.readFileSync('src/pages/TeacherDashboard.tsx', 'utf8');
let open = 0;
let lines = content.split('\n');
let braceCounts = { '{': 0, '(': 0, '[': 0, '<': 0 };

for(let i=0; i<lines.length; i++) {
  let line = lines[i];
  for(let char of line) {
    if(char === '{') braceCounts['{']++;
    if(char === '}') braceCounts['{']--;
    if(char === '(') braceCounts['(']++;
    if(char === ')') braceCounts['(']--;
    if(char === '[') braceCounts['[']++;
    if(char === ']') braceCounts['[']--;
  }
}
console.log(braceCounts);
