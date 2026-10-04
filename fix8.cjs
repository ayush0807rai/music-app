const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

code = code.replace('onEnded={() => {\\n            handleTrackEnded();\\n          }}', 'onEnded={() => { handleTrackEnded(); }}');
fs.writeFileSync('src/App.jsx', code);
