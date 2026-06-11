const fs = require('fs');
const data = fs.readFileSync('static/areas/areas.glb');
const jsonChunkLength = data.readUInt32LE(12);
const jsonString = data.toString('utf8', 20, 20 + jsonChunkLength);
const json = JSON.parse(jsonString);
const node = json.nodes.find(n => n.name === 'refControlsInteractivePoint');
console.log(node);
