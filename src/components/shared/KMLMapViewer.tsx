import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { X, MapPin, Layers } from 'lucide-react';
import { parseKMLToGeoJSON, GeoJSONData } from '@/utils/kmlToGeoJSON';

interface KMLMapViewerProps {
  kmlData: string;
  onClose: () => void;
}

// KML Structure types for hierarchical display
interface KMLFeature {
  id: string;
  name: string;
  type: 'Point' | 'LineString' | 'Polygon' | 'Folder';
  coordinates?: number[] | number[][];
  properties?: any;
  children?: KMLFeature[];
  style?: {
    lineColor?: string;
    lineWidth?: number;
    fillColor?: string;
    iconColor?: string;
  };
}

interface KMLStructure {
  name: string;
  features: KMLFeature[];
}

// Designator type color mapping (hanya untuk Point/Designator, bukan untuk Route/LineString)
const DESIGNATOR_TYPES = [
  { value: 'BC-TR-C-1', label: 'BC-TR-C-1', color: '#E6194B' }, // Merah
  { value: 'BC-TR-C-3', label: 'BC-TR-C-3', color: '#3CB44B' }, // Hijau
  { value: 'BCTR-KH-3', label: 'BCTR-KH-3', color: '#FFE119' }, // Kuning
  { value: 'BC-TR-S-3', label: 'BC-TR-S-3', color: '#4363D8' }, // Biru
  { value: 'BC-TR-S-4', label: 'BC-TR-S-4', color: '#F58231' }, // Oranye
  { value: 'BM1', label: 'BM1', color: '#911EB4' }, // Ungu
  { value: 'BSS', label: 'BSS', color: '#46F0F0' }, // Cyan
  { value: 'DA', label: 'DA', color: '#F032E6' }, // Magenta
  { value: 'DD-BM-HDPE-40-1', label: 'DD-BM-HDPE-40-1', color: '#BCF60C' }, // Lime
  { value: 'HBPS1', label: 'HBPS1', color: '#FABEBE' }, // Pink muda
  { value: 'HH2', label: 'HH2', color: '#008080' }, // Teal
  { value: 'PP-IN', label: 'PP-IN', color: '#E6BEFF' }, // Lavender
  { value: 'PS7', label: 'PS7', color: '#9A6324' }, // Coklat
  { value: 'PS9', label: 'PS9', color: '#FFFAC8' }, // Krem
  { value: 'PUAS', label: 'PUAS', color: '#800000' }, // Maroon
  { value: 'S3', label: 'S3', color: '#AAFFC3' }, // Mint
  { value: 'SC48', label: 'SC48', color: '#808000' }, // Olive
  { value: 'SLACK-T', label: 'SLACK-T', color: '#FFD8B1' }, // Peach
  { value: 'TC48', label: 'TC48', color: '#000075' }, // Navy
];

// Helper function to get color by designator name
function getColorByDesignator(name: string): string {
  const nameLower = name.toLowerCase().trim();
  
  // Check for exact matches or partial matches
  for (const designator of DESIGNATOR_TYPES) {
    const designatorValue = designator.value.toLowerCase();
    
    // Check if name matches the designator value (exact or contains)
    if (nameLower === designatorValue || nameLower.includes(designatorValue)) {
      return designator.color;
    }
  }
  
  return '#FF6B35'; // Default orange for unknown designators
}

// Helper function to get line info based on color
function getLineInfoFromColor(color: string) {
  // Find matching designator
  const designator = DESIGNATOR_TYPES.find(d => d.color.toLowerCase() === color.toLowerCase());

  if (designator) {
    return {
      jenisGaris: designator.label,   // Designator name
      designatorType: designator.value, // Designator value
      color
    };
  }

  // Fallback for unknown colors
  return { jenisGaris: 'Unknown', designatorType: 'N/A', color };
}

// Helper function to convert KML color (AABBGGRR) to CSS hex color (#RRGGBB)
function kmlColorToHex(kmlColor: string): string {
  if (!kmlColor || kmlColor.length < 6) return '#FF6B35'; // Default color
  
  // KML format: AABBGGRR (8 characters) or BBGGRR (6 characters)
  // We need: #RRGGBB
  
  let color = kmlColor.toLowerCase();
  
  // Remove 'ff' prefix if present (full opacity)
  if (color.length === 8) {
    color = color.substring(2); // Remove AA (opacity)
  }
  
  if (color.length === 6) {
    // Convert BBGGRR to RRGGBB
    const bb = color.substring(0, 2);
    const gg = color.substring(2, 4);
    const rr = color.substring(4, 6);
    return `#${rr}${gg}${bb}`;
  }
  
  return '#FF6B35'; // Default color if format is wrong
}

// Helper function to parse KML structure from XML
function parseKMLStructure(kmlContent: string): KMLStructure | null {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlContent, 'text/xml');
    
    const documentNode = xmlDoc.querySelector('Document');
    if (!documentNode) return null;
    
    const documentName = documentNode.querySelector(':scope > name')?.textContent || 'KML Document';
    
    // Parse styles from Document (including Style, gx:CascadingStyle, and StyleMap)
    const styles = new Map<string, any>();
    
    // Query for all style-related elements
    const styleSelectors = [
      'Style[id]',
      'gx\\:CascadingStyle[kml\\:id]',
      'gx\\:CascadingStyle[id]',
      'StyleMap[id]'
    ];
    
    const styleNodes = documentNode.querySelectorAll(styleSelectors.join(', '));
    
    styleNodes.forEach(styleNode => {
      // Get style ID from either 'id' or 'kml:id' attribute
      let styleId = styleNode.getAttribute('id') || styleNode.getAttribute('kml:id');
      if (!styleId) return;
      
      const style: any = {};
      
      // For StyleMap, get the normal style reference
      if (styleNode.nodeName === 'StyleMap') {
        const normalPair = Array.from(styleNode.querySelectorAll('Pair')).find(pair => 
          pair.querySelector('key')?.textContent === 'normal'
        );
        if (normalPair) {
          const styleUrl = normalPair.querySelector('styleUrl')?.textContent;
          if (styleUrl) {
            const refStyleId = styleUrl.replace('#', '');
            style.reference = refStyleId;
          }
        }
      } else {
        // For Style or gx:CascadingStyle
        let actualStyleNode = styleNode;
        
        // For gx:CascadingStyle, look for nested Style
        if (styleNode.nodeName === 'gx:CascadingStyle') {
          const nestedStyle = styleNode.querySelector('Style');
          if (nestedStyle) {
            actualStyleNode = nestedStyle;
          }
        }
        
        // Parse LineStyle
        const lineStyle = actualStyleNode.querySelector('LineStyle');
        if (lineStyle) {
          const colorNode = lineStyle.querySelector('color');
          const widthNode = lineStyle.querySelector('width');
          
          if (colorNode) {
            const kmlColor = colorNode.textContent || '';
            style.lineColor = kmlColorToHex(kmlColor);
          }
          if (widthNode) {
            style.lineWidth = parseFloat(widthNode.textContent || '2');
          }
        }
        
        // Parse PolyStyle
        const polyStyle = actualStyleNode.querySelector('PolyStyle');
        if (polyStyle) {
          const colorNode = polyStyle.querySelector('color');
          if (colorNode) {
            style.fillColor = kmlColorToHex(colorNode.textContent || '');
          }
        }
        
        // Parse IconStyle
        const iconStyle = actualStyleNode.querySelector('IconStyle');
        if (iconStyle) {
          const colorNode = iconStyle.querySelector('color');
          if (colorNode) {
            style.iconColor = kmlColorToHex(colorNode.textContent || '');
          }
        }
      }
      
      styles.set(styleId, style);
    });
    
    // Resolve StyleMap references
    styles.forEach((style, id) => {
      if (style.reference) {
        const refStyle = styles.get(style.reference);
        if (refStyle) {
          styles.set(id, { ...refStyle });
        }
      }
    });
    
    const features: KMLFeature[] = [];
    let featureId = 0;
    
    // Recursive function to parse folders and placemarks with style inheritance
    function parseNode(node: Element, parentPath: string = '', inheritedStyle: any = {}): KMLFeature | null {
      const nodeName = node.nodeName;
      
      if (nodeName === 'Folder') {
        const name = node.querySelector(':scope > name')?.textContent || 'Unnamed Folder';
        const id = `${parentPath}/folder-${featureId++}`;
        
        // Check if folder has a styleUrl (for inheritance)
        const folderStyleUrl = node.querySelector(':scope > styleUrl')?.textContent;
        let folderStyle = { ...inheritedStyle };
        
        if (folderStyleUrl) {
          const styleId = folderStyleUrl.replace('#', '');
          const style = styles.get(styleId);
          if (style) {
            folderStyle = { ...folderStyle, ...style };
          }
        }
        
        const children: KMLFeature[] = [];
        const childNodes = Array.from(node.children);
        
        for (const child of childNodes) {
          if (child.nodeName === 'Folder' || child.nodeName === 'Placemark') {
            const parsed = parseNode(child, id, folderStyle); // Pass inherited style
            if (parsed) children.push(parsed);
          }
        }
        
        return {
          id,
          name,
          type: 'Folder',
          children
        };
      } else if (nodeName === 'Placemark') {
        const name = node.querySelector(':scope > name')?.textContent || 'Unnamed';
        const description = node.querySelector(':scope > description')?.textContent || '';
        const id = `${parentPath}/placemark-${featureId++}`;
        
        // Get style from styleUrl or inherit from parent
        const styleUrl = node.querySelector(':scope > styleUrl')?.textContent;
        let featureStyle: any = { ...inheritedStyle }; // Start with inherited style
        
        if (styleUrl) {
          const styleId = styleUrl.replace('#', '');
          const style = styles.get(styleId);
          if (style) {
            featureStyle = { ...featureStyle, ...style }; // Override with own style
          }
        }
        
        // Determine geometry type
        let type: 'Point' | 'LineString' | 'Polygon' = 'Point';
        let coordinates: any = null;
        
        if (node.querySelector('Point')) {
          type = 'Point';
          const coordText = node.querySelector('Point coordinates')?.textContent?.trim();
          if (coordText) {
            const [lon, lat, alt] = coordText.split(',').map(Number);
            coordinates = [lon, lat, alt || 0];
          }
        } else if (node.querySelector('LineString')) {
          type = 'LineString';
          const coordText = node.querySelector('LineString coordinates')?.textContent?.trim();
          if (coordText) {
            coordinates = coordText.split(/\s+/).map(coord => {
              const [lon, lat, alt] = coord.split(',').map(Number);
              return [lon, lat, alt || 0];
            });
          }
        } else if (node.querySelector('Polygon')) {
          type = 'Polygon';
          const coordText = node.querySelector('Polygon outerBoundaryIs LinearRing coordinates')?.textContent?.trim();
          if (coordText) {
            coordinates = coordText.split(/\s+/).map(coord => {
              const [lon, lat, alt] = coord.split(',').map(Number);
              return [lon, lat, alt || 0];
            });
          }
        }
        
        return {
          id,
          name,
          type,
          coordinates,
          properties: { description },
          style: featureStyle
        };
      }
      
      return null;
    }
    
    // Parse direct children of Document
    const childNodes = Array.from(documentNode.children);
    for (const child of childNodes) {
      if (child.nodeName === 'Folder' || child.nodeName === 'Placemark') {
        const parsed = parseNode(child, 'root', {}); // Start with no inherited style
        if (parsed) features.push(parsed);
      }
    }
    
    return {
      name: documentName,
      features
    };
  } catch (error) {
    console.error('Error parsing KML structure:', error);
    return null;
  }
}

export function KMLMapViewer({ kmlData, onClose }: KMLMapViewerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [geoJSON, setGeoJSON] = useState<GeoJSONData | null>(null);
  const [kmlStructure, setKmlStructure] = useState<KMLStructure | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [featureCount, setFeatureCount] = useState({ points: 0, lines: 0, polygons: 0 });
  const [selectedLine, setSelectedLine] = useState<any>(null);
  const [legendVisible, setLegendVisible] = useState<boolean>(true);

  // MapTiler streets style with 3D buildings support
  const streetsStyle = "https://api.maptiler.com/maps/streets-v2/style.json?key=4Iyrc6TBGKphNJNy3iTH";

  useEffect(() => {
    if (!kmlData) return;

    try {
      console.log('🗺️ Parsing KML data...');
      
      // Parse KML structure for style information
      const structure = parseKMLStructure(kmlData);
      if (structure) {
        setKmlStructure(structure);
      }
      
      // Parse to GeoJSON for map display
      const parsed = parseKMLToGeoJSON(kmlData);
      console.log('✅ KML parsed successfully:', parsed);
      
      setGeoJSON(parsed);

      // Count features by type
      const counts = { points: 0, lines: 0, polygons: 0 };
      parsed.features.forEach(feature => {
        if (feature.geometry.type === 'Point') counts.points++;
        else if (feature.geometry.type === 'LineString') counts.lines++;
        else if (feature.geometry.type === 'Polygon') counts.polygons++;
      });
      setFeatureCount(counts);
      console.log('📊 Feature counts:', counts);
    } catch (err) {
      setError('Failed to parse KML file');
      console.error('❌ KML parsing error:', err);
    }
  }, [kmlData]);

  useEffect(() => {
    if (!mapContainer.current || !geoJSON || map.current) return;

    console.log('🗺️ Initializing map...');
    setLoading(true);

    try {
      // Initialize map with 3D capabilities
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: streetsStyle, // Use MapTiler streets with 3D buildings
        center: [106.8456, -6.2088], // Default to Jakarta
        zoom: 12,
        pitch: 0,
        bearing: 0,
        hash: true,
        touchZoomRotate: true,
        attributionControl: false,
        maxZoom: 22, // Enable maximum zoom level
        minZoom: 0, // Set minimum zoom level
        maxPitch: 85, // Allow more pitch for 3D-like views
        maxBounds: undefined, // Remove bounds restriction for better zoom
        failIfMajorPerformanceCaveat: false, // Allow on lower-end devices
      } as any);

      map.current.on('load', () => {
        console.log('✅ Map loaded successfully');
        if (!map.current || !geoJSON) return;

        try {
          // Process GeoJSON features to add color property from KML styles
          const processedFeatures = geoJSON.features.map((feature, index) => {
            const processed = { ...feature };
            
            if (feature.geometry.type === 'LineString') {
              // Priority 1: Try to get color from KML structure style
              let color: string | null = null;
              let width = 4;
              
              // Try to find matching KML feature to get style from KML structure
              if (kmlStructure) {
                const findFeatureStyle = (features: KMLFeature[]): any => {
                  for (const kmlFeature of features) {
                    if (kmlFeature.type === 'LineString' && kmlFeature.name === feature.properties.name) {
                      // Match by coordinates
                      if (kmlFeature.coordinates && Array.isArray(kmlFeature.coordinates)) {
                        const kmlCoords = kmlFeature.coordinates as number[][];
                        const gjCoords = feature.geometry.coordinates as number[][];
                        if (kmlCoords.length === gjCoords.length && kmlCoords.length > 0) {
                          const match = Math.abs(kmlCoords[0][0] - gjCoords[0][0]) < 0.000001 &&
                                       Math.abs(kmlCoords[0][1] - gjCoords[0][1]) < 0.000001;
                          if (match && kmlFeature.style) {
                            return kmlFeature.style;
                          }
                        }
                      }
                    }
                    if (kmlFeature.children) {
                      const childStyle = findFeatureStyle(kmlFeature.children);
                      if (childStyle) return childStyle;
                    }
                  }
                  return null;
                };
                
                const kmlStyle = findFeatureStyle(kmlStructure.features);
                if (kmlStyle && kmlStyle.lineColor) {
                  color = kmlStyle.lineColor;
                  console.log(`🎨 Priority 1: Using KML structure style color for "${feature.properties.name}": ${color}`);
                  if (kmlStyle.lineWidth) {
                    width = kmlStyle.lineWidth;
                  }
                }
              }
              
              // Priority 2: Check if color already exists from GeoJSON parsing (kmlToGeoJSON.ts)
              if (!color && feature.properties.lineColor) {
                color = feature.properties.lineColor;
                console.log(`🎨 Priority 2: Using GeoJSON parsed color for "${feature.properties.name}": ${color}`);
                if (feature.properties.lineWidth) {
                  width = feature.properties.lineWidth;
                }
              }
              
              // Priority 3: Fallback to default colors only if no color found from KML
              if (!color) {
                // Count how many LineStrings we've seen so far
                const lineStringIndex = geoJSON.features
                  .slice(0, index)
                  .filter(f => f.geometry.type === 'LineString').length;
                
                if (lineStringIndex === 0) {
                  // First LineString (span utama/lama) - use red as default
                  color = '#D32F2F'; // Merah untuk span utama
                  console.log(`🎨 Priority 3 (Fallback): First LineString "${feature.properties.name}" using default red: ${color}`);
                } else {
                  // Second and subsequent LineStrings (span baru) - use yellow
                  color = '#FBC02D'; // Kuning untuk span baru
                  console.log(`🎨 Priority 3 (Fallback): Additional LineString "${feature.properties.name}" using default yellow: ${color}`);
                }
              }
              
              processed.properties = {
                ...feature.properties,
                color: color,
                width: width,
                designator: feature.properties.name
              };
              
              console.log(`✅ Feature "${feature.properties.name}" final color: ${color}, width: ${width}`);
            }
            
            return processed;
          });
          
          const processedGeoJSON = {
            type: 'FeatureCollection' as const,
            features: processedFeatures
          };
          
          console.log('✅ Processed', processedFeatures.length, 'features with KML colors');

          // Add GeoJSON source
          map.current.addSource('kml-data', {
            type: 'geojson',
            data: processedGeoJSON as any
          });

          console.log('✅ GeoJSON source added');

          // Add layers for different geometry types
          // Points
          map.current.addLayer({
            id: 'kml-points',
            type: 'circle',
            source: 'kml-data',
            filter: ['==', '$type', 'Point'],
            paint: {
              'circle-radius': 8,
              'circle-color': '#005EB8',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff'
            }
          });

          // Lines - using data-driven styling like MapView.tsx
          map.current.addLayer({
            id: 'kml-lines',
            type: 'line',
            source: 'kml-data',
            filter: ['==', ['geometry-type'], 'LineString'],
            paint: {
              'line-color': ['get', 'color'],
              'line-width': ['get', 'width']
            }
          });
          
          console.log('✅ kml-lines layer added with data-driven styling');
          
          // Add invisible buffer layer for easier clicking (wider hit area)
          map.current.addLayer({
            id: 'kml-lines-buffer',
            type: 'line',
            source: 'kml-data',
            filter: ['==', ['geometry-type'], 'LineString'],
            paint: {
              'line-color': 'transparent',
              'line-width': 15, // Wider invisible line for easier clicking
              'line-opacity': 0
            }
          });
          
          console.log('✅ kml-lines-buffer layer added for easier clicking');

          // Polygons - use color from KML style if available
          map.current.addLayer({
            id: 'kml-polygons-fill',
            type: 'fill',
            source: 'kml-data',
            filter: ['==', '$type', 'Polygon'],
            paint: {
              'fill-color': [
                'coalesce',
                ['get', 'polyColor'],
                '#4ECDC4' // Default color
              ],
              'fill-opacity': [
                'coalesce',
                ['get', 'polyOpacity'],
                0.3
              ]
            }
          });

          map.current.addLayer({
            id: 'kml-polygons-outline',
            type: 'line',
            source: 'kml-data',
            filter: ['==', '$type', 'Polygon'],
            paint: {
              'line-color': [
                'coalesce',
                ['get', 'polyColor'],
                '#4ECDC4' // Default color
              ],
              'line-width': 2,
              'line-opacity': [
                'coalesce',
                ['get', 'polyOpacity'],
                1.0
              ]
            }
          });
          
          console.log('✅ kml-polygons layers added with color expression');

          console.log('✅ All layers added');

          // Fit bounds to show all features
          if (geoJSON.features.length > 0) {
            const bounds = new maplibregl.LngLatBounds();
            geoJSON.features.forEach(feature => {
              if (feature.geometry.type === 'Point') {
                bounds.extend(feature.geometry.coordinates as [number, number]);
              } else if (feature.geometry.type === 'LineString') {
                (feature.geometry.coordinates as number[][]).forEach(coord => {
                  bounds.extend(coord as [number, number]);
                });
              } else if (feature.geometry.type === 'Polygon') {
                (feature.geometry.coordinates[0] as number[][]).forEach(coord => {
                  bounds.extend(coord as [number, number]);
                });
              }
            });
            map.current.fitBounds(bounds, { padding: 50 });
            console.log('✅ Map bounds fitted');
          }

          // Helper function to calculate line length in meters
          const calculateLineLength = (coordinates: number[][]): number => {
            let totalDistance = 0;
            for (let i = 0; i < coordinates.length - 1; i++) {
              const [lon1, lat1] = coordinates[i];
              const [lon2, lat2] = coordinates[i + 1];
              
              const R = 6371e3; // Earth's radius in meters
              const φ1 = (lat1 * Math.PI) / 180;
              const φ2 = (lat2 * Math.PI) / 180;
              const Δφ = ((lat2 - lat1) * Math.PI) / 180;
              const Δλ = ((lon2 - lon1) * Math.PI) / 180;

              const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                       Math.cos(φ1) * Math.cos(φ2) *
                       Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              
              totalDistance += R * c;
            }
            return totalDistance;
          };

          // Click handler for polylines (use buffer layer for easier clicking)
          map.current.on('click', 'kml-lines-buffer', (e) => {
            if (!e.features || !e.features[0]) return;
            const feature = e.features[0];
            const coordinates = (feature.geometry as any).coordinates;
            const properties = feature.properties || {};
            
            // Calculate line length
            const lengthMeters = calculateLineLength(coordinates);
            const lengthKm = (lengthMeters / 1000).toFixed(2);
            const lengthDisplay = lengthMeters < 1000 
              ? `${Math.round(lengthMeters)} m` 
              : `${lengthKm} km`;
            
            // Get color from feature properties (already assigned during processing)
            const lineColor = properties.color || '#FF6B35';
            
            // Get line info based on color
            const lineInfo = getLineInfoFromColor(lineColor);
            
            // Set selected line data
            setSelectedLine({
              name: properties.name || 'Unnamed Line',
              length: lengthDisplay,
              jenisGaris: lineInfo.jenisGaris,
              designatorType: lineInfo.designatorType,
              color: lineInfo.color,
              description: properties.description || ''
            });
          });

          // Cursor handlers for polylines (use buffer layer)
          map.current.on('mouseenter', 'kml-lines-buffer', () => {
            if (map.current) map.current.getCanvas().style.cursor = 'pointer';
          });
          map.current.on('mouseleave', 'kml-lines-buffer', () => {
            if (map.current) map.current.getCanvas().style.cursor = '';
          });

          // Cursor handlers for polylines
          map.current.on('mouseenter', 'kml-lines', () => {
            if (map.current) map.current.getCanvas().style.cursor = 'pointer';
          });
          map.current.on('mouseleave', 'kml-lines', () => {
            if (map.current) map.current.getCanvas().style.cursor = '';
          });

          setLoading(false);
        } catch (err) {
          console.error('❌ Error adding layers:', err);
          setError('Failed to render map layers');
          setLoading(false);
        }
      });

      map.current.on('error', (e) => {
        console.error('❌ Map error:', e);
      });

      // Add navigation controls with 3D pitch visualization
      map.current.addControl(
        new maplibregl.NavigationControl({
          showZoom: true,
          showCompass: true,
          visualizePitch: true,
        }),
        'top-right'
      );

      // Add custom legend control with toggle functionality
      const legendContainer = document.createElement('div');
      legendContainer.className = 'maplibregl-ctrl';
      
      // Legend content div
      const legendDiv = document.createElement('div');
      legendDiv.className = 'maplibregl-ctrl-group';
      legendDiv.style.cssText = `
        background: white;
        padding: 12px;
        border-radius: 4px;
        box-shadow: 0 0 0 2px rgba(0,0,0,.1);
        font-family: system-ui, -apple-system, sans-serif;
        max-width: 280px;
        max-height: 500px;
        overflow-y: auto;
        display: ${legendVisible ? 'block' : 'none'};
      `;

      legendDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <h4 style="margin: 0; font-size: 14px; font-weight: 600; color: #374151;">Jenis Designator</h4>
          <button id="legend-close-btn" style="background: none; border: none; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; color: #6B7280; hover: color: #374151;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12px;">
          ${DESIGNATOR_TYPES.map(designator => `
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 20px; height: 4px; background-color: ${designator.color}; border-radius: 2px;"></div>
              <span style="color: #374151; line-height: 1.4;">${designator.label}</span>
            </div>
          `).join('')}
        </div>
      `;
      
      // Legend toggle button (icon)
      const legendToggleBtn = document.createElement('button');
      legendToggleBtn.className = 'maplibregl-ctrl-group';
      legendToggleBtn.style.cssText = `
        background: white;
        border: none;
        cursor: pointer;
        padding: 8px;
        border-radius: 4px;
        box-shadow: 0 0 0 2px rgba(0,0,0,.1);
        display: ${legendVisible ? 'none' : 'flex'};
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
      `;
      legendToggleBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      `;
      legendToggleBtn.title = 'Show Legend';
      
      // Toggle functionality
      const toggleLegend = () => {
        const isVisible = legendDiv.style.display !== 'none';
        legendDiv.style.display = isVisible ? 'none' : 'block';
        legendToggleBtn.style.display = isVisible ? 'flex' : 'none';
        setLegendVisible(!isVisible);
      };
      
      // Add click handler to close button
      legendDiv.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.id === 'legend-close-btn' || target.closest('#legend-close-btn')) {
          toggleLegend();
        }
      });
      
      // Add click handler to toggle button
      legendToggleBtn.addEventListener('click', toggleLegend);
      
      legendContainer.appendChild(legendDiv);
      legendContainer.appendChild(legendToggleBtn);

      // Add legend to map
      const legendControl = {
        onAdd: function () {
          return legendContainer;
        },
        onRemove: function () {
          if (legendContainer.parentNode) {
            legendContainer.parentNode.removeChild(legendContainer);
          }
        }
      };

      map.current.addControl(legendControl as any, 'top-left');

      // Enable Ctrl+Drag for pitch control (3D view)
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey) {
          if (map.current) {
            map.current.dragRotate.enable();
          }
        }
      };

      const handleKeyUp = (e: KeyboardEvent) => {
        if (!e.ctrlKey && !e.metaKey) {
          // Ctrl released
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);

      // Cleanup event listeners
      const cleanup = () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      };

      return cleanup;

    } catch (err) {
      console.error('❌ Map initialization error:', err);
      setError('Failed to initialize map');
      setLoading(false);
    }

    return () => {
      console.log('🗑️ Cleaning up map...');
      map.current?.remove();
      map.current = null;
    };
  }, [geoJSON, kmlStructure]);

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 max-w-md">
          <h3 className="text-lg font-bold text-red-600 mb-2">Error</h3>
          <p className="text-gray-700">{error}</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">KML Map Preview</h3>
              <p className="text-xs text-gray-500">
                {geoJSON?.metadata?.name || 'KML File'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Stats */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-gray-600" />
            <span className="text-gray-700">
              <strong>{geoJSON?.features.length || 0}</strong> features
            </span>
          </div>
          {featureCount.points > 0 && (
            <span className="text-gray-700">
              <strong>{featureCount.points}</strong> points
            </span>
          )}
          {featureCount.lines > 0 && (
            <span className="text-gray-700">
              <strong>{featureCount.lines}</strong> lines
            </span>
          )}
          {featureCount.polygons > 0 && (
            <span className="text-gray-700">
              <strong>{featureCount.polygons}</strong> polygons
            </span>
          )}
        </div>

        {/* Map Container with Side Panel */}
        <div className="flex-1 flex relative" style={{ minHeight: '500px' }}>
          {/* Map */}
          <div className="flex-1 relative">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-sm text-gray-600">Loading map...</p>
                </div>
              </div>
            )}
            <div ref={mapContainer} className="absolute inset-0" style={{ width: '100%', height: '100%' }} />
          </div>

          {/* KML Evidence Panel */}
          {selectedLine && (
            <div className="w-80 bg-white border-l border-gray-200 shadow-lg flex flex-col">
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-[#003A70] to-[#005EB8]">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-white text-sm font-semibold uppercase">DESIGNATOR INFORMATION</h3>
                  </div>
                  <button
                    onClick={() => setSelectedLine(null)}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                    title="Close"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4">
                <div className="space-y-4">
                  {/* Map Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-3 text-sm">
                      {/* Designator Name(s) - Support multiple names */}
                      {selectedLine.name && (
                        <div className="pb-3 border-b border-gray-200">
                          <span className="text-gray-600 block mb-2">Designator:</span>
                          <div className="flex flex-wrap gap-2">
                            {selectedLine.name.split(',').map((name: string, idx: number) => (
                              <span 
                                key={idx}
                                className="px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg"
                              >
                                {name.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Designator Type:</span>
                        <span className="text-gray-900 font-semibold">{selectedLine.designatorType}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Length:</span>
                        <span className="text-gray-900 font-semibold">{selectedLine.length}</span>
                      </div>
                    </div>
                  </div>

                  {selectedLine.description && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-xs text-gray-600 mb-2 uppercase tracking-wide">Description</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">{selectedLine.description}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
