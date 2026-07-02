export interface GeoJSONFeature {
  type: 'Feature';
  properties: {
    name?: string;
    description?: string;
    styleUrl?: string;
    extendedData?: Record<string, any>;
    style?: {
      iconStyle?: any;
      lineStyle?: any;
      polyStyle?: any;
      labelStyle?: any;
    };
    coordinates?: string;
    altitude?: number;
    heading?: number;
    tilt?: number;
    roll?: number;
    scale?: number;
    [key: string]: any;
  };
  geometry: {
    type: 'Point' | 'LineString' | 'Polygon';
    coordinates: number[] | number[][] | number[][][];
    id?: string;
  };
}

export interface GeoJSONData {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
  metadata?: {
    name?: string;
    description?: string;
    author?: string;
    timestamp?: string;
    [key: string]: any;
  };
}

function findAllPlacemarks(element: Element): Element[] {
  const placemarks: Element[] = [];
  
  if (element.tagName === 'Placemark') {
    placemarks.push(element);
  }
  
  for (let i = 0; i < element.children.length; i++) {
    placemarks.push(...findAllPlacemarks(element.children[i]));
  }
  
  return placemarks;
}

function parseCoordinates(coordinatesStr: string): number[][] {
  return coordinatesStr.trim().split(/\s+/).map(coord => {
    const parts = coord.split(',');
    const lng = parseFloat(parts[0]);
    const lat = parseFloat(parts[1]);
    const alt = parts[2] ? parseFloat(parts[2]) : 0;
    return [lng, lat, alt];
  }).filter(coord => {
    // Filter out invalid coordinates
    const lng = coord[0];
    const lat = coord[1];
    const isValid = !isNaN(lng) && !isNaN(lat) && 
                    isFinite(lng) && isFinite(lat) &&
                    lat >= -90 && lat <= 90 && 
                    lng >= -180 && lng <= 180;
    
    if (!isValid) {
      console.warn(`⚠️ Filtered out invalid coordinate: [${lng}, ${lat}]`);
    }
    
    return isValid;
  });
}

function extractExtendedData(placemark: Element): Record<string, any> {
  const extendedData: Record<string, any> = {};
  const extendedDataElement = placemark.getElementsByTagName('ExtendedData')[0];
  
  if (extendedDataElement) {
    const dataElements = extendedDataElement.getElementsByTagName('Data');
    for (let i = 0; i < dataElements.length; i++) {
      const dataElement = dataElements[i];
      const name = dataElement.getAttribute('name');
      const valueElement = dataElement.getElementsByTagName('value')[0];
      if (name && valueElement) {
        extendedData[name] = valueElement.textContent || '';
      }
    }
  }
  
  return extendedData;
}

function extractStyle(placemark: Element, kmlDoc: Document): any {
  const style: any = {};
  
  // Check for inline Style element
  const inlineStyle = placemark.getElementsByTagName('Style')[0];
  if (inlineStyle) {
    console.log('📌 Found inline style for placemark');
    return parseStyleElement(inlineStyle);
  }
  
  // Check for styleUrl reference
  const styleUrl = placemark.getElementsByTagName('styleUrl')[0]?.textContent;
  if (styleUrl) {
    const styleId = styleUrl.replace('#', '');
    console.log('📌 Looking for style with id:', styleId);
    
    // First, check StyleMap elements (Google Earth uses StyleMap)
    const styleMaps = kmlDoc.getElementsByTagName('StyleMap');
    for (let i = 0; i < styleMaps.length; i++) {
      const id = styleMaps[i].getAttribute('id');
      if (id === styleId) {
        console.log('✅ Found matching StyleMap:', styleId);
        // Get the normal style from StyleMap
        const pairs = styleMaps[i].getElementsByTagName('Pair');
        for (let j = 0; j < pairs.length; j++) {
          const key = pairs[j].getElementsByTagName('key')[0]?.textContent;
          if (key === 'normal') {
            const normalStyleUrl = pairs[j].getElementsByTagName('styleUrl')[0]?.textContent;
            if (normalStyleUrl) {
              const normalStyleId = normalStyleUrl.replace('#', '');
              console.log('📌 Following normal style:', normalStyleId);
              
              // Look for the normal style in gx:CascadingStyle elements (Google Earth format)
              const allElements = kmlDoc.getElementsByTagName('*');
              for (let k = 0; k < allElements.length; k++) {
                const elem = allElements[k];
                if (elem.localName === 'CascadingStyle') {
                  // Check both 'id' and 'kml:id' attributes
                  const kmlId = elem.getAttribute('kml:id') || elem.getAttributeNS('http://www.opengis.net/kml/2.2', 'id');
                  if (kmlId === normalStyleId) {
                    console.log('✅ Found CascadingStyle with kml:id:', kmlId);
                    const innerStyle = elem.getElementsByTagName('Style')[0];
                    if (innerStyle) {
                      return parseStyleElement(innerStyle);
                    }
                  }
                }
              }
              
              // Also check regular Style elements
              const styles = kmlDoc.getElementsByTagName('Style');
              for (let k = 0; k < styles.length; k++) {
                if (styles[k].getAttribute('id') === normalStyleId) {
                  return parseStyleElement(styles[k]);
                }
              }
            }
          }
        }
      }
    }
    
    // Find the Style element with matching id in Document
    const styles = kmlDoc.getElementsByTagName('Style');
    for (let i = 0; i < styles.length; i++) {
      const id = styles[i].getAttribute('id');
      if (id === styleId) {
        console.log('✅ Found matching style:', styleId);
        return parseStyleElement(styles[i]);
      }
    }
    
    // Also check gx:CascadingStyle elements directly
    const allElements = kmlDoc.getElementsByTagName('*');
    for (let i = 0; i < allElements.length; i++) {
      const elem = allElements[i];
      if (elem.localName === 'CascadingStyle') {
        const kmlId = elem.getAttribute('kml:id') || elem.getAttributeNS('http://www.opengis.net/kml/2.2', 'id');
        if (kmlId === styleId) {
          console.log('✅ Found CascadingStyle with kml:id:', kmlId);
          const innerStyle = elem.getElementsByTagName('Style')[0];
          if (innerStyle) {
            return parseStyleElement(innerStyle);
          }
        }
      }
    }
    
    console.warn('⚠️ Style not found for id:', styleId);
  }
  
  return style;
}

function parseStyleElement(styleElement: Element): any {
  const style: any = {};
  
  // Parse LineStyle
  const lineStyle = styleElement.getElementsByTagName('LineStyle')[0];
  if (lineStyle) {
    const color = lineStyle.getElementsByTagName('color')[0]?.textContent;
    const width = lineStyle.getElementsByTagName('width')[0]?.textContent;
    
    if (color) {
      // KML color format is aabbggrr (alpha, blue, green, red)
      // Convert to #rrggbb
      const hexColor = kmlColorToHex(color);
      const opacity = kmlColorToOpacity(color);
      style.lineColor = hexColor;
      style.lineOpacity = opacity;
      console.log('🎨 LineStyle color:', color, '→', hexColor, `(opacity: ${opacity.toFixed(2)})`);
    }
    if (width) {
      style.lineWidth = parseFloat(width);
      console.log('📏 LineStyle width:', style.lineWidth);
    }
  }
  
  // Parse PolyStyle
  const polyStyle = styleElement.getElementsByTagName('PolyStyle')[0];
  if (polyStyle) {
    const color = polyStyle.getElementsByTagName('color')[0]?.textContent;
    const fill = polyStyle.getElementsByTagName('fill')[0]?.textContent;
    const outline = polyStyle.getElementsByTagName('outline')[0]?.textContent;
    
    if (color) {
      const hexColor = kmlColorToHex(color);
      const opacity = kmlColorToOpacity(color);
      style.polyColor = hexColor;
      style.polyOpacity = opacity;
      console.log('🎨 PolyStyle color:', color, '→', hexColor, `(opacity: ${opacity.toFixed(2)})`);
      
      // IMPORTANT: If no LineStyle but has PolyStyle, use PolyStyle color for lines too
      // This handles cases where polylines use PolyStyle instead of LineStyle
      if (!style.lineColor) {
        style.lineColor = hexColor;
        style.lineOpacity = opacity;
        console.log('📌 Using PolyStyle color for line (no LineStyle found)');
      }
    }
    if (fill) {
      style.polyFill = fill === '1';
    }
    if (outline) {
      style.polyOutline = outline === '1';
    }
  }
  
  // Parse IconStyle
  const iconStyle = styleElement.getElementsByTagName('IconStyle')[0];
  if (iconStyle) {
    const color = iconStyle.getElementsByTagName('color')[0]?.textContent;
    const scale = iconStyle.getElementsByTagName('scale')[0]?.textContent;
    const icon = iconStyle.getElementsByTagName('Icon')[0];
    const href = icon?.getElementsByTagName('href')[0]?.textContent;
    
    if (color) {
      const hexColor = kmlColorToHex(color);
      const opacity = kmlColorToOpacity(color);
      style.iconColor = hexColor;
      style.iconOpacity = opacity;
      console.log('🎨 IconStyle color:', color, '→', hexColor, `(opacity: ${opacity.toFixed(2)})`);
    }
    if (scale) {
      style.iconScale = parseFloat(scale);
    }
    if (href) {
      style.iconHref = href;
    }
  }
  
  console.log('✅ Parsed style:', style);
  return style;
}

function kmlColorToHex(kmlColor: string): string {
  // KML color format: aabbggrr (alpha, blue, green, red)
  // We need to convert to #rrggbb
  
  if (!kmlColor || kmlColor.length < 6) {
    return '#FF6B35'; // Default color
  }
  
  // Remove any whitespace
  kmlColor = kmlColor.trim();
  
  // Extract components (skip alpha if present)
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
    return '#FF6B35'; // Default color
  }
  
  return `#${rr}${gg}${bb}`.toUpperCase();
}

function kmlColorToOpacity(kmlColor: string): number {
  // Extract alpha channel from KML color (aabbggrr format)
  // Alpha is first 2 characters in hex (00-FF)
  // Convert to 0.0-1.0 range
  
  if (!kmlColor || kmlColor.length < 8) {
    return 1.0; // Default full opacity
  }
  
  const alphaHex = kmlColor.substring(0, 2);
  const alphaDecimal = parseInt(alphaHex, 16);
  const opacity = alphaDecimal / 255;
  
  return opacity;
}

function calculateDistance(coord1: number[], coord2: number[]): number {
  const R = 6371e3;
  const φ1 = coord1[1] * Math.PI / 180;
  const φ2 = coord2[1] * Math.PI / 180;
  const Δφ = (coord2[1] - coord1[1]) * Math.PI / 180;
  const Δλ = (coord2[0] - coord1[0]) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

export function parseKMLToGeoJSON(kmlString: string): GeoJSONData {
  try {
    console.log('🔍 Starting KML parsing...');
    console.log('📄 KML string length:', kmlString.length);
    
    const parser = new DOMParser();
    const kmlDoc = parser.parseFromString(kmlString, 'text/xml');
    
    if (kmlDoc.getElementsByTagName('parsererror').length > 0) {
      throw new Error('Invalid KML format');
    }

    const features: GeoJSONFeature[] = [];
    
    const document = kmlDoc.getElementsByTagName('Document')[0];
    const metadata: any = {};
    if (document) {
      metadata.name = document.getElementsByTagName('name')[0]?.textContent || '';
      metadata.description = document.getElementsByTagName('description')[0]?.textContent || '';
    }
    
    // Log all Style elements found
    const allStyles = kmlDoc.getElementsByTagName('Style');
    console.log(`📋 Found ${allStyles.length} Style elements in KML`);
    
    // Log all CascadingStyle elements
    const allElements = kmlDoc.getElementsByTagName('*');
    let cascadingCount = 0;
    for (let i = 0; i < allElements.length; i++) {
      if (allElements[i].localName === 'CascadingStyle') {
        cascadingCount++;
        const kmlId = allElements[i].getAttribute('kml:id') || allElements[i].getAttributeNS('http://www.opengis.net/kml/2.2', 'id');
        const lineStyle = allElements[i].getElementsByTagName('LineStyle')[0];
        if (lineStyle) {
          const color = lineStyle.getElementsByTagName('color')[0]?.textContent;
          console.log(`  CascadingStyle kml:id="${kmlId}": LineStyle color = ${color}`);
        }
      }
    }
    console.log(`📋 Found ${cascadingCount} CascadingStyle elements in KML`);
    
    // Log all StyleMap elements
    const allStyleMaps = kmlDoc.getElementsByTagName('StyleMap');
    console.log(`📋 Found ${allStyleMaps.length} StyleMap elements in KML`);
    for (let i = 0; i < allStyleMaps.length; i++) {
      const styleMapId = allStyleMaps[i].getAttribute('id');
      console.log(`  StyleMap id="${styleMapId}"`);
    }
    
    const placemarks = findAllPlacemarks(kmlDoc.documentElement);
    console.log(`📍 Found ${placemarks.length} placemarks`);
    
    for (let i = 0; i < placemarks.length; i++) {
      const placemark = placemarks[i];
      const name = placemark.getElementsByTagName('name')[0]?.textContent || 'Unnamed';
      const description = placemark.getElementsByTagName('description')[0]?.textContent || '';
      const styleUrl = placemark.getElementsByTagName('styleUrl')[0]?.textContent || '';
      
      console.log(`\n🔍 Processing placemark "${name}" with styleUrl: ${styleUrl}`);
      
      const extendedData = extractExtendedData(placemark);
      const style = extractStyle(placemark, kmlDoc);
      
      console.log(`📦 Extracted style for "${name}":`, style);
      
      const point = placemark.getElementsByTagName('Point')[0];
      const lineString = placemark.getElementsByTagName('LineString')[0];
      const polygon = placemark.getElementsByTagName('Polygon')[0];
      
      let geometry: GeoJSONFeature['geometry'] | null = null;
      let coordinates = '';
      
      if (point) {
        const coordsElement = point.getElementsByTagName('coordinates')[0];
        if (coordsElement) {
          coordinates = coordsElement.textContent || '';
          const coords = parseCoordinates(coordinates);
          if (coords.length > 0) {
            geometry = {
              type: 'Point',
              coordinates: coords[0]
            };
          }
        }
      } else if (lineString) {
        const coordsElement = lineString.getElementsByTagName('coordinates')[0];
        if (coordsElement) {
          coordinates = coordsElement.textContent || '';
          const coords = parseCoordinates(coordinates);
          if (coords.length > 0) {
            geometry = {
              type: 'LineString',
              coordinates: coords
            };
            
            const distances: number[] = [];
            for (let j = 0; j < coords.length - 1; j++) {
              distances.push(calculateDistance(coords[j], coords[j + 1]));
            }
            extendedData.distances = distances;
            extendedData.totalDistance = distances.reduce((sum, dist) => sum + dist, 0);
          }
        }
      } else if (polygon) {
        const outerBoundary = polygon.getElementsByTagName('outerBoundaryIs')[0];
        const coordsElement = outerBoundary?.getElementsByTagName('coordinates')[0];
        if (coordsElement) {
          coordinates = coordsElement.textContent || '';
          const coords = parseCoordinates(coordinates);
          if (coords.length > 0) {
            geometry = {
              type: 'Polygon',
              coordinates: [coords]
            };
          }
        }
      }
      
      if (geometry) {
        // Flatten style properties for easier access in MapLibre
        const flattenedProperties: any = {
          name,
          description,
          styleUrl,
          extendedData,
          coordinates
        };
        
        // Add flattened style properties
        if (style.lineColor) {
          flattenedProperties.lineColor = style.lineColor;
          console.log(`✅ Feature "${name}" (${geometry.type}) has lineColor:`, style.lineColor);
        }
        if (style.lineWidth) flattenedProperties.lineWidth = style.lineWidth;
        if (style.lineOpacity !== undefined) flattenedProperties.lineOpacity = style.lineOpacity;
        if (style.polyColor) {
          flattenedProperties.polyColor = style.polyColor;
          console.log(`✅ Feature "${name}" (${geometry.type}) has polyColor:`, style.polyColor);
        }
        if (style.polyOpacity !== undefined) flattenedProperties.polyOpacity = style.polyOpacity;
        if (style.polyFill !== undefined) flattenedProperties.polyFill = style.polyFill;
        if (style.polyOutline !== undefined) flattenedProperties.polyOutline = style.polyOutline;
        if (style.iconColor) flattenedProperties.iconColor = style.iconColor;
        if (style.iconOpacity !== undefined) flattenedProperties.iconOpacity = style.iconOpacity;
        if (style.iconScale) flattenedProperties.iconScale = style.iconScale;
        if (style.iconHref) flattenedProperties.iconHref = style.iconHref;
        
        features.push({
          type: 'Feature',
          properties: flattenedProperties,
          geometry
        });
      }
    }
    
    console.log(`✅ Parsed ${features.length} features from KML`);
    console.log(`🎨 Features with colors: ${features.filter(f => f.properties.lineColor || f.properties.polyColor).length}`);
    
    return {
      type: 'FeatureCollection',
      features,
      metadata
    };
  } catch (error) {
    console.error('Error parsing KML:', error);
    throw new Error('Failed to parse KML file');
  }
}

export async function readKMLFile(file: File): Promise<GeoJSONData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const kmlString = e.target?.result as string;
        const geoJSON = parseKMLToGeoJSON(kmlString);
        resolve(geoJSON);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read KML file'));
    };
    
    reader.readAsText(file);
  });
}

// Function to extract KML from KMZ (zipped KML)
export async function extractKMLFromKMZ(file: File): Promise<string> {
  const JSZip = (await import('jszip')).default;
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(arrayBuffer);
        
        // Find the KML file in the zip (usually doc.kml or *.kml)
        let kmlFile = zipContent.file('doc.kml');
        
        // If doc.kml not found, find any .kml file
        if (!kmlFile) {
          const kmlFiles = Object.keys(zipContent.files).filter(name => 
            name.toLowerCase().endsWith('.kml') && !name.startsWith('__MACOSX')
          );
          
          if (kmlFiles.length === 0) {
            throw new Error('No KML file found in KMZ archive');
          }
          
          kmlFile = zipContent.file(kmlFiles[0]);
        }
        
        if (!kmlFile) {
          throw new Error('Could not extract KML from KMZ');
        }
        
        const kmlString = await kmlFile.async('string');
        resolve(kmlString);
      } catch (error) {
        console.error('Error extracting KMZ:', error);
        reject(new Error('Failed to extract KML from KMZ file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read KMZ file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

// Function to read both KML and KMZ files
export async function readKMLOrKMZFile(file: File): Promise<GeoJSONData> {
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.kmz')) {
    console.log('📦 Detected KMZ file, extracting...');
    const kmlString = await extractKMLFromKMZ(file);
    return parseKMLToGeoJSON(kmlString);
  } else if (fileName.endsWith('.kml')) {
    console.log('📄 Detected KML file, parsing...');
    return readKMLFile(file);
  } else {
    throw new Error('Unsupported file format. Please upload a KML or KMZ file.');
  }
}
