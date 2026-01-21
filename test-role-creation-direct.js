const { v4: uuidv4 } = require('uuid');

// Test the enhanced UUID generation locally
function generateHybridId() {
  const baseId = uuidv4();
  const timestampComponent = Date.now().toString(36);
  const randomComponent = Math.random().toString(36).substr(2, 5);
  const hybridId = `${baseId.substr(0, 8)}-${timestampComponent}-${randomComponent}-${baseId.substr(-12)}`;
  return hybridId;
}

console.log('Testing enhanced UUID generation:');
console.log('Generated IDs:');
for (let i = 0; i < 10; i++) {
  const id = generateHybridId();
  console.log(`${i + 1}. ${id} (length: ${id.length})`);
}

// Test for collisions in a larger set
console.log('\nTesting for collisions in 1000 IDs...');
const ids = new Set();
let collisions = 0;

for (let i = 0; i < 1000; i++) {
  const id = generateHybridId();
  if (ids.has(id)) {
    collisions++;
    console.log(`Collision detected: ${id}`);
  } else {
    ids.add(id);
  }
}

console.log(`Generated ${ids.size} unique IDs out of 1000 attempts`);
console.log(`Collisions detected: ${collisions}`);
console.log(`Success rate: ${((1000 - collisions) / 1000 * 100).toFixed(2)}%`);