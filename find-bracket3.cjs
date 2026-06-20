const fs = require('fs');
const content = fs.readFileSync('src/pages/TeacherDashboard.tsx', 'utf8');
let lines = content.split('\n');
let stack = [];

for(let i=0; i<lines.length; i++) {
  let line = lines[i];
  for(let j=0; j<line.length; j++) {
    let char = line[j];
    if(char === '{') stack.push({line: i+1, col: j+1});
    if(char === '}') {
      if(stack.length === 0) {
        console.log(`Unmatched } at line ${i+1}, col ${j+1}`);
      } else {
        stack.pop();
        if (stack.length === 0 && i > 250) {
           console.log(`Stack reached 0 at line ${i+1}`);
        }
      }
    }
  }
}
