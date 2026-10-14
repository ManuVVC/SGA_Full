const fs = require('fs');

let content = fs.readFileSync('src/app/locations/page.tsx', 'utf8');

// The line is: <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
content = content.replace('textAlign="center" sx={{ py: 2 }}', 'align="center" sx={{ py: 2 }}');

fs.writeFileSync('src/app/locations/page.tsx', content, 'utf8');
