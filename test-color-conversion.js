// Test color conversion from KML format
function kmlColorToHex(kmlColor) {
  if (!kmlColor || kmlColor.length < 6) {
    return '#FF6B35';
  }
  
  kmlColor = kmlColor.trim();
  let rr, gg, bb;
  
  if (kmlColor.length === 8) {
    // Format: aabbggrr
    bb = kmlColor.substring(2, 4);
    gg = kmlColor.substring(4, 6);
    rr = kmlColor.substring(6, 8);
  } else if (kmlColor.length === 6) {
    // Format: bbggrr (no alpha)
    bb = kmlColor.substring(0, 2);
    gg = kmlColor.substring(2, 4);
    rr = kmlColor.substring(4, 6);
  } else {
    return '#FF6B35';
  }
  
  return `#${rr}${gg}${bb}`.toUpperCase();
}

// Test with your KML colors
const tests = [
  { name: 'Tanah Lunak (Kuning)', kml: 'ff2dc0fb', expected: 'Yellow/Orange' },
  { name: 'Tanah Berpasir (Hijau)', kml: 'ff3c8e38', expected: 'Green' },
  { name: 'Tanah Berbatu (Merah)', kml: 'ff9f3f30', expected: 'Red/Brown' },
  { name: 'Tanah Keras (Biru)', kml: 'ff2f2fd3', expected: 'Red' },
];

console.log('=== KML Color Conversion Test ===\n');
tests.forEach(test => {
  const result = kmlColorToHex(test.kml);
  console.log(`${test.name}:`);
  console.log(`  KML: ${test.kml}`);
  console.log(`  Hex: ${result}`);
  console.log(`  Expected: ${test.expected}`);
  console.log('');
});
