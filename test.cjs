const fs = require('fs');
const data = fs.readFileSync('static/areas/areas.glb');
const magic = data.readUInt32LE(0);
const jsonChunkLength = data.readUInt32LE(12);
const jsonString = data.toString('utf8', 20, 20 + jsonChunkLength);
const json = JSON.parse(jsonString);
const texts = json.nodes.filter(n => n.name && n.name.startsWith('text')).map(n => ({name: n.name, translation: n.translation, rotation: n.rotation}));
console.log(texts);
