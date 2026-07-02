import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { X, MapPin } from 'lucide-react';
import { OrbitProgress } from 'react-loading-indicators';
import { parseKMLToGeoJSON, GeoJSONData, extractKMLFromKMZ } from '@/utils/kmlToGeoJSON';
import { getAllDesignatorsV2, DesignatorV2 } from '@/services/designatorService';

interface MapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (longitude: number, latitude: number) => void;
  projectId: string;
  initialLongitude?: number;
  initialLatitude?: number;
  kmlPath?: string;
  linkId?: string;
  kmlData?: any; // NEW: KML data structure from parent (same as TabKML)
  existingCoordinates?: Array<[number, number]>; // NEW: Show existing points from the span
}

// Category color mapping (same as TabKML)
const CATEGORY_COLORS: Record<string, string> = {
  'Kabel': '#E53935',
  'HDPE': '#1E88E5',
  'Cor': '#6D4C41',
  'SITAC': '#8E24AA',
  'Tiang': '#43A047'
};

// Helper function to get color by designator name using category mapping
function getColorByDesignator(name: string, designatorsV2: DesignatorV2[]): string {
  const nameLower = name.toLowerCase().trim();

  const matchingDesignator = designatorsV2.find(d => 
    d.name.toLowerCase() === nameLower || 
    nameLower.includes(d.name.toLowerCase())
  );

  if (matchingDesignator && matchingDesignator.category) {
    const categoryColor = CATEGORY_COLORS[matchingDesignator.category];
    if (categoryColor) {
      return categoryColor;
    }
  }

  return '#FF6B35';
}

// Helper function to convert KML color (AABBGGRR) to CSS hex color (#RRGGBB)
function kmlColorToHex(kmlColor: string): string {
  if (!kmlColor || kmlColor.length < 6) return '#FF6B35';
  
  let color = kmlColor.toLowerCase();
  
  if (color.length === 8) {
    color = color.substring(2);
  }
  
  if (color.length === 6) {
    const bb = color.substring(0, 2);
    const gg = color.substring(2, 4);
    const rr = color.substring(4, 6);
    return `#${rr}${gg}${bb}`;
  }
  
  return '#FF6B35';
}

export function MapPickerModal({ 
  isOpen, 
  onClose, 
  onLocationSelect, 
  projectId,
  initialLongitude = 0,
  initialLatitude = 0,
  kmlData,
  linkId,
  existingCoordinates = [] // NEW: Default to empty array
}: MapPickerModalProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  const cursorMarker = useRef<maplibregl.Marker | null>(null); // NEW: Cursor follower marker
  const existingMarkers = useRef<maplibregl.Marker[]>([]); // NEW: Store existing point markers
  const [selectedCoords, setSelectedCoords] = useState<{ lng: number; lat: number } | null>(
    initialLongitude && initialLatitude ? { lng: initialLongitude, lat: initialLatitude } : null
  );
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing map...'); // NEW: Loading message
  const [geoJSON, setGeoJSON] = useState<GeoJSONData | null>(null);
  const [designatorsV2, setDesignatorsV2] = useState<DesignatorV2[]>([]);
  const kmlFetchedRef = useRef(false); // NEW: Track if KML has been fetched
  const [isMapFullyRendered, setIsMapFullyRendered] = useState(false); // NEW: Track if map is fully rendered

  const streetsStyle = "https://api.maptiler.com/maps/streets-v2/style.json?key=4Iyrc6TBGKphNJNy3iTH";

  // Reset loading when modal opens (but keep geoJSON if already loaded)
  useEffect(() => {
    if (isOpen) {
      console.log('🔄 MapPickerModal opened');
      // Only reset if we don't have geoJSON yet
      if (!geoJSON) {
        setLoading(true);
        setLoadingMessage('Initializing map...');
      } else {
        console.log('✅ Using cached GeoJSON data');
        setLoading(false);
      }
    }
  }, [isOpen]);

  // Fetch designators v2 data for category mapping
  useEffect(() => {
    const fetchDesignatorsV2 = async () => {
      try {
        const designators = await getAllDesignatorsV2();
        setDesignatorsV2(designators);
      } catch (error) {
        console.error('❌ Error fetching designators v2:', error);
      }
    };

    fetchDesignatorsV2();
  }, []);

  // Fetch KML plan data from kmlData (same as TabKML) - with caching
  useEffect(() => {
    if (!isOpen) {
      console.log('⚠️ MapPickerModal not open, skipping KML fetch');
      return;
    }
    
    // Skip if already fetched
    if (kmlFetchedRef.current && geoJSON) {
      console.log('✅ KML already fetched, using cached data');
      setLoading(false);
      return;
    }
    
    if (!kmlData) {
      console.log('⚠️ No kmlData provided to MapPickerModal');
      setLoading(false);
      setLoadingMessage('');
      return;
    }

    const fetchKMLPlan = async () => {
      try {
        setLoadingMessage('Loading KML plan data...');
        console.log('📡 MapPickerModal - Fetching KML plan from kmlData:', kmlData);
        console.log('📡 MapPickerModal - LinkId for filtering:', linkId);
        
        // Get KML file from kml_project (Plan category)
        if (!kmlData.kml_project || kmlData.kml_project.length === 0) {
          console.warn('⚠️ No KML plan found in kmlData.kml_project');
          console.log('📊 kmlData structure:', Object.keys(kmlData));
          setLoading(false);
          setLoadingMessage('');
          kmlFetchedRef.current = true;
          return;
        }

        console.log('📊 kml_project groups:', kmlData.kml_project.length);
        
        // Find KML file - filter by linkId if provided
        let kmlFile = null;
        
        if (linkId) {
          // Filter by linkId - match process_id with link_{linkId}
          const linkProcessId = `link_${linkId}`;
          console.log('🔍 Filtering KML by linkProcessId:', linkProcessId);
          
          for (const group of kmlData.kml_project) {
            console.log('🔍 Checking group:', group.project_name, 'files:', group.files.length);
            kmlFile = group.files.find((file: any) => {
              console.log('🔍 File:', file.file_name, 'process_id:', file.process_id, 'category:', file.file_category);
              return file.file_category === 'kml' && file.process_id === linkProcessId;
            });
            if (kmlFile) {
              console.log('✅ Found KML for link:', linkProcessId, kmlFile.file_name);
              break;
            }
          }
          
          if (!kmlFile) {
            console.warn('⚠️ No KML found for linkId:', linkId, 'trying without filter...');
            // Fallback: try to get any KML file
            for (const group of kmlData.kml_project) {
              kmlFile = group.files.find((file: any) => file.file_category === 'kml');
              if (kmlFile) {
                console.log('✅ Found fallback KML:', kmlFile.file_name);
                break;
              }
            }
          }
        } else {
          // No linkId - get first KML file
          console.log('🔍 No linkId provided, getting first KML file');
          for (const group of kmlData.kml_project) {
            console.log('🔍 Checking group:', group.project_name, 'files:', group.files.length);
            kmlFile = group.files.find((file: any) => {
              console.log('🔍 File:', file.file_name, 'category:', file.file_category);
              return file.file_category === 'kml';
            });
            if (kmlFile) {
              console.log('✅ Found first KML:', kmlFile.file_name);
              break;
            }
          }
        }

        if (!kmlFile) {
          console.warn('⚠️ No KML file found in kml_project', linkId ? `for link: ${linkId}` : '');
          setLoading(false);
          setLoadingMessage('');
          kmlFetchedRef.current = true;
          return;
        }

        const kmlPath = kmlFile.file_path;
        console.log('📥 Fetching KML plan from path:', kmlPath);
        setLoadingMessage('Downloading KML file...');
        
        // Fetch KML file
        let fileUrl: string;
        const isKMZ = kmlPath.toLowerCase().endsWith('.kmz');
        
        if (kmlPath.startsWith('uploads/')) {
          const pathWithoutUploads = kmlPath.replace('uploads/', '');
          const pathParts = pathWithoutUploads.split('/');
          const filename = pathParts[pathParts.length - 1];
          const category = pathParts.slice(0, -1).join('/');
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
          const baseUrl = apiUrl.replace('/api', '');
          fileUrl = `${baseUrl}/api/files/${category}/${filename}`;
        } else {
          const pathParts = kmlPath.split('/');
          const category = pathParts[0];
          const filename = pathParts.slice(1).join('/');
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
          const baseUrl = apiUrl.replace('/api', '');
          fileUrl = `${baseUrl}/api/files/${category}/${filename}`;
        }
        
        const kmlResponse = await fetch(fileUrl);
        
        if (!kmlResponse.ok) {
          throw new Error(`Failed to fetch KML: ${kmlResponse.status}`);
        }
        
        let kmlContent: string;
        
        if (isKMZ) {
          console.log('📦 Processing KMZ file...');
          setLoadingMessage('Extracting KMZ file...');
          const blob = await kmlResponse.blob();
          const file = new File([blob], kmlPath.split('/').pop() || 'file.kmz', {
            type: 'application/vnd.google-earth.kmz'
          });
          kmlContent = await extractKMLFromKMZ(file);
        } else {
          kmlContent = await kmlResponse.text();
        }
        
        console.log('✅ KML content fetched, length:', kmlContent.length);
        setLoadingMessage('Parsing KML data...');
        
        // Parse KML to GeoJSON
        const parsed = parseKMLToGeoJSON(kmlContent);
        setGeoJSON(parsed);
        kmlFetchedRef.current = true; // Mark as fetched
        
        console.log('✅ KML parsed to GeoJSON:', parsed);
        setLoadingMessage('Rendering map...');
        
        // Small delay to ensure map is ready
        setTimeout(() => {
          setLoading(false);
          setLoadingMessage('');
        }, 500);
      } catch (error) {
        console.error('❌ Error fetching KML plan:', error);
        setLoadingMessage('');
        setLoading(false);
        kmlFetchedRef.current = true;
      }
    };

    fetchKMLPlan();
  }, [isOpen, kmlData, linkId, geoJSON]);

  // Initialize map
  useEffect(() => {
    if (!isOpen || !mapContainer.current || map.current) return;

    console.log('🗺️ Initializing map picker...');
    setLoadingMessage('Initializing map...');

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: streetsStyle,
      center: [106.8456, -6.2088],
      zoom: 12,
      attributionControl: false,
    });

    map.current.on('load', () => {
      console.log('✅ Map loaded');
      
      // If we have initial coordinates, add marker
      if (initialLongitude && initialLatitude && map.current) {
        const coords = { lng: initialLongitude, lat: initialLatitude };
        addMarker(coords);
        map.current.setCenter([coords.lng, coords.lat]);
        map.current.setZoom(15);
      }
      
      // If no KML data, mark as fully rendered and hide loading
      if (!kmlData) {
        setLoading(false);
        setLoadingMessage('');
        // Mark as fully rendered after a short delay to ensure map is stable
        setTimeout(() => {
          setIsMapFullyRendered(true);
          console.log('✅ Map fully rendered (no KML data)');
        }, 500);
      }
    });

    // Add navigation controls
    map.current.addControl(
      new maplibregl.NavigationControl({
        showZoom: true,
        showCompass: true,
      }),
      'top-right'
    );

    // Create cursor follower marker (red transparent circle) - but don't activate yet
    const cursorElement = document.createElement('div');
    cursorElement.style.width = '20px';
    cursorElement.style.height = '20px';
    cursorElement.style.borderRadius = '50%';
    cursorElement.style.backgroundColor = 'rgba(239, 68, 68, 0.4)'; // Red transparent
    cursorElement.style.border = '2px solid rgba(239, 68, 68, 0.8)'; // Red border
    cursorElement.style.pointerEvents = 'none'; // Don't interfere with map clicks
    
    cursorMarker.current = new maplibregl.Marker({
      element: cursorElement,
      anchor: 'center'
    });

    // Cursor marker will be activated only after map is fully rendered
    // Event handlers will be added in a separate effect

    // Click handler to place marker
    map.current.on('click', (e) => {
      const coords = { lng: e.lngLat.lng, lat: e.lngLat.lat };
      setSelectedCoords(coords);
      addMarker(coords);
    });

    return () => {
      if (cursorMarker.current) {
        cursorMarker.current.remove();
        cursorMarker.current = null;
      }
      // Clean up existing markers
      existingMarkers.current.forEach(m => m.remove());
      existingMarkers.current = [];
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [isOpen, initialLongitude, initialLatitude]);

  // Add existing coordinates as markers when map is ready
  useEffect(() => {
    if (!map.current || !existingCoordinates || existingCoordinates.length === 0) return;

    // Wait for map to be fully loaded
    const addExistingMarkers = () => {
      if (!map.current) return;

      console.log('📍 Adding existing coordinates to map:', existingCoordinates);

      // Clear previous existing markers
      existingMarkers.current.forEach(m => m.remove());
      existingMarkers.current = [];

      // Add markers for each existing coordinate
      existingCoordinates.forEach((coord, index) => {
        if (!map.current) return;
        
        const [lng, lat] = coord;
        
        // Skip if coordinates are [0, 0] (not set yet)
        if (lng === 0 && lat === 0) return;

        // Create marker using default MapLibre marker style (same as current selection)
        const existingMarker = new maplibregl.Marker({
          color: '#10B981', // Green color for existing points
          draggable: false
        })
          .setLngLat([lng, lat])
          .addTo(map.current);

        existingMarkers.current.push(existingMarker);
      });

      // Draw line connecting existing points if there are multiple
      if (existingCoordinates.length > 1 && map.current) {
        const validCoords = existingCoordinates.filter(coord => coord[0] !== 0 && coord[1] !== 0);
        
        if (validCoords.length > 1) {
          // Remove existing line source and layer if they exist
          if (map.current.getLayer('existing-line')) {
            map.current.removeLayer('existing-line');
          }
          if (map.current.getSource('existing-line')) {
            map.current.removeSource('existing-line');
          }

          // Add line source and layer
          map.current.addSource('existing-line', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: validCoords
              }
            }
          });

          map.current.addLayer({
            id: 'existing-line',
            type: 'line',
            source: 'existing-line',
            paint: {
              'line-color': '#10B981',
              'line-width': 3,
              'line-dasharray': [2, 2] // Dashed line
            }
          });

          console.log('✅ Added line connecting', validCoords.length, 'existing points');
        }
      }
    };

    // Check if style is already loaded
    if (map.current.isStyleLoaded()) {
      addExistingMarkers();
    } else {
      map.current.once('styledata', addExistingMarkers);
    }

    return () => {
      // Clean up line layer and source
      if (map.current) {
        if (map.current.getLayer('existing-line')) {
          map.current.removeLayer('existing-line');
        }
        if (map.current.getSource('existing-line')) {
          map.current.removeSource('existing-line');
        }
      }
    };
  }, [existingCoordinates, map.current?.isStyleLoaded()]);

  // Separate effect for initial zoom (only runs once when modal opens)
  useEffect(() => {
    if (!map.current || !isOpen) return;

    const handleInitialZoom = () => {
      if (!map.current) return;

      // Don't auto-zoom to specific points
      // Let the KML layer fitBounds handle the initial view
      // This keeps the full polyline KML plan visible
      console.log('📍 Map opened - will fit to KML bounds when loaded');
    };

    // Wait for map to be ready
    if (map.current.isStyleLoaded()) {
      handleInitialZoom();
    } else {
      map.current.once('load', handleInitialZoom);
    }
  }, [isOpen]); // Only depend on isOpen

  // Add KML layer when GeoJSON is loaded
  useEffect(() => {
    if (!map.current || !geoJSON) {
      console.log('⚠️ Cannot add KML layer - map or geoJSON not ready', {
        hasMap: !!map.current,
        hasGeoJSON: !!geoJSON,
        isStyleLoaded: map.current?.isStyleLoaded()
      });
      return;
    }

    // Wait for style to load before adding layers
    const addKMLLayer = () => {
      if (!map.current || !geoJSON) return;
      
      console.log('🗺️ Adding KML layer to map...');
      console.log('📊 GeoJSON features:', geoJSON.features.length);

      try {
        // Process features to add colors based on designator categories
        const processedFeatures = geoJSON.features.map((feature) => {
          const processed = { ...feature };
          
          if (feature.geometry.type === 'LineString') {
            let color = feature.properties.lineColor;
            let width = feature.properties.lineWidth || 4;
            
            // If no color from KML style, use designator-based color
            if (!color) {
              const featureName = feature.properties.name || '';
              color = getColorByDesignator(featureName, designatorsV2);
              console.log(`🎨 Line "${featureName}" -> Color ${color}`);
            } else {
              // Convert KML color to hex
              color = kmlColorToHex(color);
            }
            
            processed.properties = {
              ...feature.properties,
              color,
              width,
            };
          }
          
          return processed;
        });

        const processedGeoJSON = {
          type: 'FeatureCollection' as const,
          features: processedFeatures
        };

        console.log('📊 Processed GeoJSON:', processedGeoJSON);

        // Remove existing layers and source if they exist
        if (map.current.getLayer('kml-lines')) {
          map.current.removeLayer('kml-lines');
          console.log('🗑️ Removed existing kml-lines layer');
        }
        if (map.current.getLayer('kml-points')) {
          map.current.removeLayer('kml-points');
          console.log('🗑️ Removed existing kml-points layer');
        }
        if (map.current.getSource('kml-data')) {
          map.current.removeSource('kml-data');
          console.log('🗑️ Removed existing kml-data source');
        }

        // Add source
        map.current.addSource('kml-data', {
          type: 'geojson',
          data: processedGeoJSON as any
        });
        console.log('✅ Added kml-data source');

        // Add line layer
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
        console.log('✅ Added kml-lines layer');

        // Add point layer
        map.current.addLayer({
          id: 'kml-points',
          type: 'circle',
          source: 'kml-data',
          filter: ['==', '$type', 'Point'],
          paint: {
            'circle-radius': 6,
            'circle-color': '#005EB8',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        });
        console.log('✅ Added kml-points layer');

        // Fit bounds to show all features
        if (geoJSON.features.length > 0) {
          const bounds = new maplibregl.LngLatBounds();
          let pointCount = 0;
          let lineCount = 0;
          
          geoJSON.features.forEach(feature => {
            if (feature.geometry.type === 'Point') {
              bounds.extend(feature.geometry.coordinates as [number, number]);
              pointCount++;
            } else if (feature.geometry.type === 'LineString') {
              (feature.geometry.coordinates as number[][]).forEach(coord => {
                bounds.extend(coord as [number, number]);
              });
              lineCount++;
            }
          });
          
          console.log(`📍 Fitting bounds to ${pointCount} points and ${lineCount} lines`);
          console.log(`📍 Bounds:`, bounds.toArray());
          
          map.current.fitBounds(bounds, { padding: 50, duration: 1000 });
        }

        console.log('✅ KML layer added successfully');
        
        // Mark map as fully rendered after KML layer is added and bounds are fitted
        setTimeout(() => {
          setIsMapFullyRendered(true);
          console.log('✅ Map fully rendered - cursor marker can now be activated');
        }, 1500); // Wait for fitBounds animation to complete
      } catch (error) {
        console.error('❌ Error adding KML layer:', error);
        // Even on error, mark as rendered so cursor works
        setIsMapFullyRendered(true);
      }
    };

    // Check if style is already loaded
    if (map.current.isStyleLoaded()) {
      console.log('✅ Style already loaded, adding KML layer immediately');
      addKMLLayer();
    } else {
      console.log('⏳ Waiting for style to load...');
      map.current.once('styledata', () => {
        console.log('✅ Style loaded, adding KML layer');
        addKMLLayer();
      });
    }
  }, [geoJSON, designatorsV2]);

  // Activate cursor marker only after map is fully rendered
  useEffect(() => {
    if (!map.current || !cursorMarker.current || !isMapFullyRendered) {
      console.log('⏳ Waiting for map to be fully rendered before activating cursor marker');
      return;
    }

    console.log('✅ Activating cursor marker - map is fully rendered');

    let isMouseOverMap = false;

    // Check if mouse is already over the map when cursor marker is activated
    const checkInitialMousePosition = () => {
      if (!mapContainer.current) return;
      
      const rect = mapContainer.current.getBoundingClientRect();
      const mouseX = window.event ? (window.event as MouseEvent).clientX : 0;
      const mouseY = window.event ? (window.event as MouseEvent).clientY : 0;
      
      // Check if mouse is within map bounds
      if (mouseX >= rect.left && mouseX <= rect.right && 
          mouseY >= rect.top && mouseY <= rect.bottom) {
        isMouseOverMap = true;
        console.log('✅ Mouse already over map - cursor marker will be visible');
      }
    };

    checkInitialMousePosition();

    // Add mousemove handler to follow cursor - only when map is fully rendered
    const handleMouseMove = (e: maplibregl.MapMouseEvent) => {
      if (cursorMarker.current && map.current) {
        // Always update position when mouse moves over map
        isMouseOverMap = true;
        cursorMarker.current.setLngLat([e.lngLat.lng, e.lngLat.lat]);
        
        // Add marker to map if not already added
        if (!cursorMarker.current.getElement().parentElement) {
          cursorMarker.current.addTo(map.current);
        }
      }
    };

    // Hide cursor marker when mouse leaves map
    const handleMouseOut = () => {
      isMouseOverMap = false;
      if (cursorMarker.current) {
        cursorMarker.current.remove();
      }
    };

    // Show cursor marker when mouse enters map
    const handleMouseOver = () => {
      isMouseOverMap = true;
      if (cursorMarker.current && map.current) {
        cursorMarker.current.addTo(map.current);
      }
    };

    map.current.on('mousemove', handleMouseMove);
    map.current.on('mouseout', handleMouseOut);
    map.current.on('mouseover', handleMouseOver);

    return () => {
      if (map.current) {
        map.current.off('mousemove', handleMouseMove);
        map.current.off('mouseout', handleMouseOut);
        map.current.off('mouseover', handleMouseOver);
      }
    };
  }, [isMapFullyRendered]);

  const addMarker = (coords: { lng: number; lat: number }) => {
    if (!map.current) return;

    // Remove existing marker
    if (marker.current) {
      marker.current.remove();
    }

    // Create new marker
    marker.current = new maplibregl.Marker({
      color: '#005EB8',
      draggable: true
    })
      .setLngLat([coords.lng, coords.lat])
      .addTo(map.current);

    // Update coordinates when marker is dragged
    marker.current.on('dragend', () => {
      if (marker.current) {
        const lngLat = marker.current.getLngLat();
        setSelectedCoords({ lng: lngLat.lng, lat: lngLat.lat });
      }
    });
  };

  const handleConfirm = () => {
    if (selectedCoords) {
      onLocationSelect(selectedCoords.lng, selectedCoords.lat);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedCoords(null);
    setIsMapFullyRendered(false); // Reset render state
    if (marker.current) {
      marker.current.remove();
      marker.current = null;
    }
    if (cursorMarker.current) {
      cursorMarker.current.remove();
      cursorMarker.current = null;
    }
    // Clean up existing markers
    existingMarkers.current.forEach(m => m.remove());
    existingMarkers.current = [];
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6" style={{ zIndex: 10000 }}>
      <div 
        className="bg-white shadow-2xl flex flex-col relative"
        style={{ 
          width: '90%',
          maxWidth: '1200px',
          height: '80vh',
          borderRadius: '16px',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="p-4 flex items-center justify-between"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 94, 184, 0.95) 0%, rgba(0, 119, 204, 0.95) 100%)',
            flexShrink: 0
          }}
        >
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Pick Location from Map
            </h3>
            <p className="text-sm text-white/90 mt-1">
              Click on the map to select coordinates
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-all"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          <div ref={mapContainer} className="w-full h-full" />
          
          {loading && (
            <div className="absolute inset-0 bg-white/95 flex items-center justify-center backdrop-blur-sm" style={{ zIndex: 1000 }}>
              <div className="text-center">
                <OrbitProgress color="#005EB8" size="medium" text="" textColor="" />
                <p className="text-sm text-gray-600 mt-4 font-medium">{loadingMessage || 'Loading map...'}</p>
              </div>
            </div>
          )}

          {/* Coordinates Display */}
          {selectedCoords && (
            <div 
              className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3"
              style={{ zIndex: 10 }}
            >
              <div className="text-xs font-semibold text-gray-700 mb-1">Selected Coordinates</div>
              <div className="text-sm font-mono text-gray-900">
                <div>Lng: {selectedCoords.lng.toFixed(6)}</div>
                <div>Lat: {selectedCoords.lat.toFixed(6)}</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 flex gap-3 border-t border-gray-200 bg-gray-50" style={{ flexShrink: 0 }}>
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all bg-white hover:bg-gray-50 border-2 border-gray-300 text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedCoords}
            className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all text-white disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: selectedCoords 
                ? 'linear-gradient(135deg, rgba(0, 94, 184, 1) 0%, rgba(0, 119, 204, 1) 100%)'
                : '#9CA3AF',
            }}
          >
            Confirm Location
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
