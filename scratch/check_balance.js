
const fs = require('fs');
const content = fs.readFileSync('/run/media/sharadamarasinghe/01DCB46A126F9D70/gitboxlk/giftboxlk/src/app/[locale]/product/[slug]/product-detail-client.tsx', 'utf8');

function checkBalance(text) {
    const stack = [];
    const pairs = { '{': '}', '(': ')', '[': ']' };
    const opens = Object.keys(pairs);
    const closes = Object.values(pairs);

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (opens.includes(char)) {
            stack.push({ char, line: text.substring(0, i).split('\n').length });
        } else if (closes.includes(char)) {
            const last = stack.pop();
            if (!last || pairs[last.char] !== char) {
                console.log(`Mismatch: found ${char} but expected ${last ? pairs[last.char] : 'nothing'} at line ${text.substring(0, i).split('\n').length}`);
                return false;
            }
        }
    }
    if (stack.length > 0) {
        console.log(`Unclosed: ${stack.map(s => s.char).join(', ')} at lines ${stack.map(s => s.line).join(', ')}`);
        return false;
    }
    console.log('All brackets/braces balanced!');
    return true;
}

checkBalance(content);
