const fs = require('fs');
const data = fs.readFileSync('static/areas/areas.glb');
const jsonChunkLength = data.readUInt32LE(12);
const jsonString = data.toString('utf8', 20, 20 + jsonChunkLength);
const json = JSON.parse(jsonString);
const items = json.nodes.filter(n => n.name && (n.name.toLowerCase().includes('bench') || n.name.toLowerCase().includes('sword') || n.name.toLowerCase().includes('path'))).map(n => ({name: n.name, translation: n.translation}));
console.log(items);
