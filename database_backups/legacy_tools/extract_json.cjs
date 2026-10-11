const fs = require('fs');
const readline = require('readline');

async function extractUserJson() {
  const fileStream = fs.createReadStream('C:\\Users\\ayush\\.gemini\\antigravity\\brain\\fbe5348a-8885-4cf3-9b1b-b44ccfc53fdc\\.system_generated\\logs\\transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let targetContent = null;
  for await (const line of rl) {
    if (line.includes('"step_index":8381')) {
      const parsed = JSON.parse(line);
      targetContent = parsed.content;
      break;
    }
  }

  if (targetContent) {
    const firstBrace = targetContent.indexOf('{');
    const lastBrace = targetContent.lastIndexOf('}');
    const jsonStr = targetContent.substring(firstBrace, lastBrace + 1);
    const parsedObj = JSON.parse(jsonStr);
    console.log('Parsed recent_songs count:', parsedObj.recent_songs.length);
    console.log('Parsed artists count:', parsedObj.artists.length);
    fs.writeFileSync('recent_import_data.json', JSON.stringify(parsedObj, null, 2), 'utf8');
    console.log('Successfully saved to recent_import_data.json');
  } else {
    console.error('Could not find recent_songs in transcript');
  }
}
extractUserJson().catch(console.error);
