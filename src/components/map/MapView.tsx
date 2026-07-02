import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ProjectLocation } from '../../types/map';

interface MapViewProps {
  projects: ProjectLocation[];
  selectedProject: ProjectLocation | null;
  onProjectClick: (project: ProjectLocation) => void;
  onProjectHover: (project: ProjectLocation | null) => void;
  filters: {
    types: string[];
    statuses: string[];
  };
  lineWidthMultiplier?: number;
  stoSizeMultiplier?: number;
  projectMarkerMultiplier?: number;
  onLineWidthChange?: (value: number) => void;
  onStoSizeChange?: (value: number) => void;
  onProjectMarkerChange?: (value: number) => void;
  zoomLevelMode?: 'auto' | 'project' | 'sto' | 'route';
  onZoomLevelModeChange?: (value: 'auto' | 'project' | 'sto' | 'route') => void;
  highlightedSpanId?: string | null;
  onHighlightedSpanIdChange?: (value: string | null) => void;
  mapType?: 'satellite' | 'streets' | 'hybrid' | 'terrain';
  onMapTypeChange?: (value: 'satellite' | 'streets' | 'hybrid' | 'terrain') => void;
  isTimelinePlaying?: boolean;
}

// Zoom level modes
type ZoomLevelMode = 'auto' | 'project' | 'sto' | 'route';

// Map type options
type MapType = 'satellite' | 'streets' | 'hybrid' | 'terrain';

// Status color mapping - Updated colors
const STATUS_COLORS: Record<string, string> = {
  'planning': '#ef4444',      // red
  'survey': '#f59e0b',        // yellow/amber
  'installation': '#10b981',  // green
  'completed': '#EF4444',     // red
  'active': '#10b981',        // green (same as installation)
  'construction': '#f59e0b'   // yellow (same as survey)
};

// Highlight color for selected span/route
const HIGHLIGHT_COLOR = '#EF4444'; // red

// Create flag SVG icon for project markers (triangle shape)
const createFlagIcon = (color: string, size: number = 40): string => {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
    <svg width="${size}" height="${size}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <!-- Flag pole -->
      <line x1="8" y1="5" x2="8" y2="38" stroke="#333" stroke-width="2" stroke-linecap="round"/>
      <!-- Triangle flag -->
      <path d="M 8 5 L 32 12 L 8 19 Z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
      <!-- Shadow effect -->
      <path d="M 8 5 L 32 12 L 8 19 Z" fill="rgba(0,0,0,0.15)" stroke="none"/>
      <!-- Pole base -->
      <circle cx="8" cy="38" r="2" fill="#333"/>
    </svg>
  `)}`;
};

// Map style configurations
const getMapStyle = (mapType: MapType) => {
  const baseStyle: any = {
    version: 8,
    sources: {},
    layers: []
  };

  switch (mapType) {
    case 'satellite':
      // Pure satellite without any labels or POI
      baseStyle.sources['satellite'] = {
        type: 'raster',
        tiles: [
          'https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
          'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        ],
        tileSize: 256,
      };
      baseStyle.layers.push({
        id: 'satellite',
        type: 'raster',
        source: 'satellite',
        minzoom: 0,
        maxzoom: 22,
      });
      break;

    case 'streets':
      // Streets with roads but minimal POI
      baseStyle.sources['streets'] = {
        type: 'raster',
        tiles: [
          'https://mt0.google.com/vt/lyrs=r&x={x}&y={y}&z={z}',
          'https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}',
        ],
        tileSize: 256,
      };
      baseStyle.layers.push({
        id: 'streets',
        type: 'raster',
        source: 'streets',
        minzoom: 0,
        maxzoom: 22,
      });
      break;

    case 'hybrid':
      // Satellite + roads only (minimal labels, no POI)
      baseStyle.sources['satellite'] = {
        type: 'raster',
        tiles: [
          'https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
          'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        ],
        tileSize: 256,
      };
      baseStyle.sources['roads'] = {
        type: 'raster',
        tiles: [
          // Use 'y' parameter for roads only overlay (no POI)
          'https://mt0.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        ],
        tileSize: 256,
      };
      baseStyle.layers.push({
        id: 'satellite',
        type: 'raster',
        source: 'satellite',
        minzoom: 0,
        maxzoom: 22,
      });
      baseStyle.layers.push({
        id: 'roads',
        type: 'raster',
        source: 'roads',
        minzoom: 0,
        maxzoom: 22,
        paint: {
          'raster-opacity': 0.8
        }
      });
      break;

    case 'terrain':
      // Terrain view
      baseStyle.sources['terrain'] = {
        type: 'raster',
        tiles: [
          'https://mt0.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
          'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
        ],
        tileSize: 256,
      };
      baseStyle.layers.push({
        id: 'terrain',
        type: 'raster',
        source: 'terrain',
        minzoom: 0,
        maxzoom: 22,
      });
      break;
  }

  return baseStyle;
};

// Load flag images into map
const loadFlagIcons = async (map: maplibregl.Map) => {
  const statuses = ['planning', 'survey', 'installation', 'completed', 'active', 'construction'];
  const colors = [
    STATUS_COLORS.planning, 
    STATUS_COLORS.survey, 
    STATUS_COLORS.installation, 
    STATUS_COLORS.completed,
    STATUS_COLORS.active,
    STATUS_COLORS.construction
  ];
  
  for (let i = 0; i < statuses.length; i++) {
    const status = statuses[i];
    const color = colors[i];
    const iconName = `flag-${status}`;
    
    if (!map.hasImage(iconName)) {
      const img = new Image(40, 40);
      img.src = createFlagIcon(color, 40);
      
      await new Promise<void>((resolve) => {
        img.onload = () => {
          try {
            map.addImage(iconName, img);
            console.log(`✓ Loaded icon: ${iconName}`);
            resolve();
          } catch (error) {
            console.warn(`Failed to add image ${iconName}:`, error);
            resolve(); // Continue even if one fails
          }
        };
        img.onerror = () => {
          console.warn(`Failed to load image ${iconName}`);
          resolve(); // Continue even if one fails
        };
      });
    }
  }
};

export function MapView({ 
  projects, 
  selectedProject, 
  onProjectClick, 
  onProjectHover, 
  filters,
  lineWidthMultiplier: externalLineWidth,
  stoSizeMultiplier: externalStoSize,
  projectMarkerMultiplier: externalProjectMarker,
  zoomLevelMode: externalZoomLevelMode,
  onZoomLevelModeChange,
  highlightedSpanId: externalHighlightedSpanId,
  onHighlightedSpanIdChange,
  mapType: externalMapType,
  onMapTypeChange,
  isTimelinePlaying = false
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Map<string, maplibregl.Marker>>(new Map());
  const projectMarkers = useRef<Map<string, maplibregl.Marker>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);
  const [lineWidthMultiplier, setLineWidthMultiplier] = useState(externalLineWidth || 1.5);
  const [stoSizeMultiplier, setStoSizeMultiplier] = useState(externalStoSize || 1.5);
  const [projectMarkerMultiplier, setProjectMarkerMultiplier] = useState(externalProjectMarker || 1.5);
  const [isRendering, setIsRendering] = useState(false);
  const layersCreated = useRef(false);
  const [zoomLevelMode, setZoomLevelMode] = useState<ZoomLevelMode>(externalZoomLevelMode || 'auto');
  const [highlightedSpanId, setHighlightedSpanId] = useState<string | null>(externalHighlightedSpanId || null);
  const [mapType, setMapType] = useState<MapType>(externalMapType || 'hybrid');
  const [forceLayerRecreation, setForceLayerRecreation] = useState(0);
  const initialZoomMode = useRef<ZoomLevelMode>(externalZoomLevelMode || 'auto');

  // Sync with external state if provided
  useEffect(() => {
    if (externalLineWidth !== undefined) setLineWidthMultiplier(externalLineWidth);
  }, [externalLineWidth]);

  useEffect(() => {
    if (externalStoSize !== undefined) setStoSizeMultiplier(externalStoSize);
  }, [externalStoSize]);

  useEffect(() => {
    if (externalProjectMarker !== undefined) setProjectMarkerMultiplier(externalProjectMarker);
  }, [externalProjectMarker]);

  useEffect(() => {
    if (externalZoomLevelMode !== undefined) setZoomLevelMode(externalZoomLevelMode);
  }, [externalZoomLevelMode]);

  useEffect(() => {
    if (externalHighlightedSpanId !== undefined) setHighlightedSpanId(externalHighlightedSpanId);
  }, [externalHighlightedSpanId]);

  useEffect(() => {
    if (externalMapType !== undefined) setMapType(externalMapType);
  }, [externalMapType]);

  // Notify parent of changes
  useEffect(() => {
    if (onZoomLevelModeChange) onZoomLevelModeChange(zoomLevelMode);
    // Update initial ref for future layer recreations
    initialZoomMode.current = zoomLevelMode;
  }, [zoomLevelMode, onZoomLevelModeChange]);

  useEffect(() => {
    if (onHighlightedSpanIdChange) onHighlightedSpanIdChange(highlightedSpanId);
  }, [highlightedSpanId, onHighlightedSpanIdChange]);

  useEffect(() => {
    if (onMapTypeChange) onMapTypeChange(mapType);
  }, [mapType, onMapTypeChange]);

  // Memoize filtered projects
  const filteredProjects = useMemo(() => {
    const filtered = projects.filter(project => {
      const typeMatch = filters.types.length === 0 || filters.types.includes(project.type);
      const statusMatch = filters.statuses.length === 0 || filters.statuses.includes(project.status);
      return typeMatch && statusMatch; // Remove routes requirement - show all projects
    });
    return filtered;
  }, [projects, filters.types, filters.statuses]);

  // Memoize project center points for Level 1 (low zoom)
  const projectCenterFeatures = useMemo(() => {
    const features = filteredProjects.map(project => {
      let totalLat = 0;
      let totalLng = 0;
      let pointCount = 0;

      if (project.routes && project.routes.length > 0) {
        project.routes.forEach(route => {
          route.coordinates.forEach(coord => {
            totalLng += coord[0];
            totalLat += coord[1];
            pointCount++;
          });
        });
      }

      const centerLng = pointCount > 0 ? totalLng / pointCount : project.location.lng;
      const centerLat = pointCount > 0 ? totalLat / pointCount : project.location.lat;

      return {
        type: 'Feature' as const,
        properties: {
          projectId: project.id,
          projectName: project.name,
          projectStatus: project.status,
          projectType: project.type,
          progress: project.details.progress,
          color: STATUS_COLORS[project.status] || '#6b7280'
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [centerLng, centerLat]
        }
      };
    });
    return features;
  }, [filteredProjects]);

  // Memoize route features
  const allRouteFeatures = useMemo(() => {
    const routeFeatures: any[] = [];
    
    filteredProjects.forEach(project => {
      if (!project.routes) return;
      
      project.routes.forEach(route => {
        routeFeatures.push({
          type: 'Feature' as const,
          properties: {
            projectId: project.id,
            projectName: project.name,
            projectStatus: project.status,
            projectType: project.type,
            routeId: route.id,
            routeName: route.name,
            stoFrom: route.stoFrom,
            stoTo: route.stoTo,
            designator: route.designator,
            color: route.color,
            length: route.length,
            description: route.description || ''
          },
          geometry: {
            type: 'LineString' as const,
            coordinates: route.coordinates
          }
        });
      });
    });
    
    return routeFeatures;
  }, [filteredProjects]);

  // Memoize route label features (midpoint of each route)
  const routeLabelFeatures = useMemo(() => {
    const labelFeatures: any[] = [];
    
    filteredProjects.forEach(project => {
      if (!project.routes) return;
      
      project.routes.forEach(route => {
        // Calculate midpoint of the route
        const midIndex = Math.floor(route.coordinates.length / 2);
        const midPoint = route.coordinates[midIndex];
        
        labelFeatures.push({
          type: 'Feature' as const,
          properties: {
            routeId: route.id,
            designator: route.designator,
            color: route.color
          },
          geometry: {
            type: 'Point' as const,
            coordinates: midPoint
          }
        });
      });
    });
    
    return labelFeatures;
  }, [filteredProjects]);

  // Memoize STO features for Level 2 (medium zoom)
  const stoFeatures = useMemo(() => {
    const stoMap = new Map<string, any>();
    
    filteredProjects.forEach(project => {
      if (!project.routes) return;
      
      project.routes.forEach(route => {
        const coords = route.coordinates;
        
        // Start STO
        const startKey = `${route.stoFrom}-${coords[0][0]}-${coords[0][1]}`;
        if (!stoMap.has(startKey)) {
          stoMap.set(startKey, {
            type: 'Feature',
            properties: {
              type: 'sto',
              projectId: project.id,
              projectName: project.name,
              projectStatus: project.status,
              stoName: route.stoFrom,
              color: STATUS_COLORS[project.status] || '#6b7280',
              routeCount: 1
            },
            geometry: {
              type: 'Point',
              coordinates: coords[0]
            }
          });
        } else {
          const existing = stoMap.get(startKey);
          existing.properties.routeCount++;
        }
        
        // End STO
        const endKey = `${route.stoTo}-${coords[coords.length - 1][0]}-${coords[coords.length - 1][1]}`;
        if (!stoMap.has(endKey)) {
          stoMap.set(endKey, {
            type: 'Feature',
            properties: {
              type: 'sto',
              projectId: project.id,
              projectName: project.name,
              projectStatus: project.status,
              stoName: route.stoTo,
              color: STATUS_COLORS[project.status] || '#6b7280',
              routeCount: 1
            },
            geometry: {
              type: 'Point',
              coordinates: coords[coords.length - 1]
            }
          });
        } else {
          const existing = stoMap.get(endKey);
          existing.properties.routeCount++;
        }
      });
    });
    
    return Array.from(stoMap.values());
  }, [filteredProjects]);

  // Memoize endpoint features for Level 3 (high zoom)
  const endpointFeatures = useMemo(() => {
    const features: any[] = [];
    
    filteredProjects.forEach(project => {
      if (!project.routes) return;
      
      project.routes.forEach(route => {
        const coords = route.coordinates;
        
        features.push({
          type: 'Feature',
          properties: {
            type: 'endpoint',
            position: 'start',
            projectId: project.id,
            projectName: project.name,
            routeId: route.id,
            routeName: route.name,
            stoName: route.stoFrom,
            color: route.color
          },
          geometry: {
            type: 'Point',
            coordinates: coords[0]
          }
        });
        
        features.push({
          type: 'Feature',
          properties: {
            type: 'endpoint',
            position: 'end',
            projectId: project.id,
            projectName: project.name,
            routeId: route.id,
            routeName: route.name,
            stoName: route.stoTo,
            color: route.color
          },
          geometry: {
            type: 'Point',
            coordinates: coords[coords.length - 1]
          }
        });
      });
    });
    
    return features;
  }, [filteredProjects]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: getMapStyle(mapType),
      center: [118.0, -2.0],
      zoom: 5,
      pitch: 0,
      bearing: 0,
      refreshExpiredTiles: false,
      renderWorldCopies: false,
    });

    requestAnimationFrame(() => {
      if (map.current) {
        map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
        map.current.addControl(new maplibregl.FullscreenControl(), 'top-right');
      }
    });

    map.current.on('load', () => {
      setMapLoaded(true);
      console.log('✅ Map loaded and ready');
    });

    return () => {
      markers.current.forEach(marker => marker.remove());
      markers.current.clear();
      projectMarkers.current.forEach(marker => marker.remove());
      projectMarkers.current.clear();
      map.current?.remove();
      map.current = null;
    };
  }, [mapType]);

  // Change map style when mapType changes (after initial load)
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const currentCenter = map.current.getCenter();
    const currentZoom = map.current.getZoom();
    const currentBearing = map.current.getBearing();
    const currentPitch = map.current.getPitch();

    console.log('🔄 Changing map style to:', mapType);

    // Reset layer flag before style change
    layersCreated.current = false;

    map.current.setStyle(getMapStyle(mapType));

    // Wait for style to load, then restore view and recreate layers
    const onStyleLoad = () => {
      if (!map.current) return;
      
      console.log('✅ Style loaded, restoring view');
      map.current.setCenter(currentCenter);
      map.current.setZoom(currentZoom);
      map.current.setBearing(currentBearing);
      map.current.setPitch(currentPitch);
      
      // Force layer recreation by incrementing counter
      layersCreated.current = false;
      setForceLayerRecreation(prev => prev + 1);
    };

    map.current.once('style.load', onStyleLoad);

    return () => {
      if (map.current) {
        map.current.off('style.load', onStyleLoad);
      }
    };
  }, [mapType, mapLoaded]);

  // HIERARCHICAL LAYER SYSTEM - Create all layers on map load
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Reset layers if data changes
    if (layersCreated.current && projectCenterFeatures.length > 0) {
      layersCreated.current = false;
    }

    if (layersCreated.current) return;

    setIsRendering(true);

    const createLayers = async () => {
      if (!map.current) return;

      // Get current zoom mode at the time of layer creation
      const currentMode = initialZoomMode.current;

      // LEVEL 1: PROJECT MARKERS (Zoom 0-8)
      if (projectCenterFeatures.length > 0) {
        // Remove existing layers if they exist
        if (map.current.getLayer('project-markers-hitarea')) map.current.removeLayer('project-markers-hitarea');
        if (map.current.getLayer('project-labels')) map.current.removeLayer('project-labels');
        if (map.current.getLayer('project-markers')) map.current.removeLayer('project-markers');
        if (map.current.getSource('project-centers')) map.current.removeSource('project-centers');
        
        // Load flag icons first
        await loadFlagIcons(map.current);
        
        map.current.addSource('project-centers', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: projectCenterFeatures
          }
        });

        // Use symbol layer with flag icons instead of circles
        map.current.addLayer({
          id: 'project-markers',
          type: 'symbol',
          source: 'project-centers',
          minzoom: 0,
          maxzoom: 9,  // Hide when zooming to STO/route level
          layout: {
            'icon-image': [
              'concat',
              'flag-',
              ['get', 'projectStatus']
            ],
            'icon-size': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 0.6 * projectMarkerMultiplier,
              5, 0.8 * projectMarkerMultiplier,
              8, 1.0 * projectMarkerMultiplier
            ],
            'icon-anchor': 'bottom',
            'icon-allow-overlap': true,
            'icon-ignore-placement': false,
            'visibility': (currentMode === 'project' || currentMode === 'auto') ? 'visible' : 'none'
          }
        });

        map.current.addLayer({
          id: 'project-labels',
          type: 'symbol',
          source: 'project-centers',
          minzoom: 6,
          maxzoom: 9,  // Hide when zooming to STO/route level
          layout: {
            'text-field': ['get', 'projectName'],
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 12,
            'text-offset': [0, 0.5],
            'text-anchor': 'top',
            'visibility': (currentMode === 'project' || currentMode === 'auto') ? 'visible' : 'none'
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#000000',
            'text-halo-width': 2
          }
        });

        // Hitarea for interaction
        map.current.addLayer({
          id: 'project-markers-hitarea',
          type: 'circle',
          source: 'project-centers',
          minzoom: 0,
          maxzoom: 9,  // Hide when zooming to STO/route level
          layout: {
            'visibility': (currentMode === 'project' || currentMode === 'auto') ? 'visible' : 'none'
          },
          paint: {
            'circle-radius': 25,
            'circle-color': 'transparent',
            'circle-opacity': 0
          }
        });
      }

      // LEVEL 2: STO POINTS (Zoom 9-12)
      if (stoFeatures.length > 0) {
        map.current.addSource('sto-points', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: stoFeatures
          }
        });

        map.current.addLayer({
          id: 'sto-markers',
          type: 'circle',
          source: 'sto-points',
          minzoom: currentMode === 'auto' ? 9 : 0,
          maxzoom: currentMode === 'auto' ? 13 : 22,
          layout: {
            'visibility': (currentMode === 'sto' || currentMode === 'auto') ? 'visible' : 'none'
          },
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              9, 6 * stoSizeMultiplier,
              11, 10 * stoSizeMultiplier,
              12, 14 * stoSizeMultiplier
            ],
            'circle-color': ['get', 'color'],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.85
          }
        });

        map.current.addLayer({
          id: 'sto-labels',
          type: 'symbol',
          source: 'sto-points',
          minzoom: 10,
          maxzoom: currentMode === 'auto' ? 13 : 22,
          layout: {
            'text-field': ['get', 'stoName'],
            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Regular'],
            'text-size': 11,
            'text-offset': [0, 1.5],
            'text-anchor': 'top',
            'visibility': (currentMode === 'sto' || currentMode === 'auto') ? 'visible' : 'none'
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#000000',
            'text-halo-width': 1.5
          }
        });

        map.current.addLayer({
          id: 'sto-markers-hitarea',
          type: 'circle',
          source: 'sto-points',
          minzoom: currentMode === 'auto' ? 9 : 0,
          maxzoom: currentMode === 'auto' ? 13 : 22,
          layout: {
            'visibility': (currentMode === 'sto' || currentMode === 'auto') ? 'visible' : 'none'
          },
          paint: {
            'circle-radius': 20,
            'circle-color': 'transparent',
            'circle-opacity': 0
          }
        });
      }

      // LEVEL 3: ROUTES & ENDPOINTS (Zoom 13+)
      if (allRouteFeatures.length > 0) {
        map.current.addSource('all-project-routes', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: allRouteFeatures
          }
        });

        map.current.addLayer({
          id: 'all-project-routes',
          type: 'line',
          source: 'all-project-routes',
          minzoom: currentMode === 'auto' ? 13 : 0,
          maxzoom: 22,
          layout: {
            'visibility': (currentMode === 'route' || currentMode === 'auto') ? 'visible' : 'none'
          },
          paint: {
            'line-color': [
              'case',
              ['==', ['get', 'routeId'], highlightedSpanId || ''],
              HIGHLIGHT_COLOR,
              ['get', 'color']
            ],
            'line-width': [
              'interpolate',
              ['exponential', 2],
              ['zoom'],
              13, 3 * lineWidthMultiplier,
              15, 5 * lineWidthMultiplier,
              18, 8 * lineWidthMultiplier
            ],
            'line-opacity': 1
          }
        });

        map.current.addLayer({
          id: 'all-project-routes-buffer',
          type: 'line',
          source: 'all-project-routes',
          minzoom: currentMode === 'auto' ? 13 : 0,
          maxzoom: 22,
          layout: {
            'visibility': (currentMode === 'route' || currentMode === 'auto') ? 'visible' : 'none'
          },
          paint: {
            'line-color': 'transparent',
            'line-width': 15,
            'line-opacity': 0
          }
        });
      }

      if (endpointFeatures.length > 0) {
        map.current.addSource('route-endpoints', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: endpointFeatures
          }
        });

        map.current.addLayer({
          id: 'route-endpoints',
          type: 'circle',
          source: 'route-endpoints',
          minzoom: currentMode === 'auto' ? 13 : 0,
          maxzoom: 22,
          layout: {
            'visibility': (currentMode === 'route' || currentMode === 'auto') ? 'visible' : 'none'
          },
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              13, 4 * stoSizeMultiplier,
              15, 6 * stoSizeMultiplier,
              18, 10 * stoSizeMultiplier
            ],
            'circle-color': [
              'case',
              ['==', ['get', 'routeId'], highlightedSpanId || ''],
              HIGHLIGHT_COLOR,
              ['get', 'color']
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.9
          }
        });

        map.current.addLayer({
          id: 'route-endpoints-hitarea',
          type: 'circle',
          source: 'route-endpoints',
          minzoom: currentMode === 'auto' ? 13 : 0,
          maxzoom: 22,
          layout: {
            'visibility': (currentMode === 'route' || currentMode === 'auto') ? 'visible' : 'none'
          },
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              13, 15,
              15, 20,
              18, 30
            ],
            'circle-color': 'transparent',
            'circle-opacity': 0
          }
        });
      }

      // Route labels (soil type designator)
      if (routeLabelFeatures.length > 0) {
        map.current.addSource('route-labels', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: routeLabelFeatures
          }
        });

        map.current.addLayer({
          id: 'route-labels',
          type: 'symbol',
          source: 'route-labels',
          minzoom: 9,  // Show from zoom 9+ (when routes become visible)
          maxzoom: 22,
          layout: {
            'text-field': ['get', 'designator'],
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 10,
            'text-anchor': 'center',
            'text-offset': [0, -0.5],
            'visibility': (currentMode === 'route' || currentMode === 'auto') ? 'visible' : 'none',
            'symbol-placement': 'point'
          },
          paint: {
            'text-color': ['get', 'color'],
            'text-halo-color': '#ffffff',
            'text-halo-width': 2
          }
        });
      }

      console.log('✅ Hierarchical layers created');
      layersCreated.current = true;
      setIsRendering(false);

      setupInteractionHandlers();
      
      // Trigger initial visibility update based on zoom level mode
      setTimeout(() => {
        if (map.current && zoomLevelMode !== 'auto') {
          console.log('🔄 Applying initial zoom level mode:', zoomLevelMode);
          // Force re-render by toggling a dummy state
          setZoomLevelMode(prev => prev);
        }
      }, 100);
    };

    // Call async function with small delay
    setTimeout(() => {
      createLayers();
    }, 100);
  }, [mapLoaded, projectCenterFeatures, stoFeatures, allRouteFeatures, endpointFeatures, routeLabelFeatures, lineWidthMultiplier, stoSizeMultiplier, projectMarkerMultiplier, forceLayerRecreation]);

  // Setup all interaction handlers
  const setupInteractionHandlers = useCallback(() => {
    if (!map.current) return;

    // LEVEL 1: Project Marker Interactions
    map.current.on('click', 'project-markers-hitarea', (e) => {
      if (!e.features || !e.features[0]) return;
      const props = e.features[0].properties;
      const project = projects.find(p => p.id === props.projectId);
      
      if (project && map.current) {
        onProjectClick(project);
        
        const bounds = new maplibregl.LngLatBounds();
        if (project.routes) {
          project.routes.forEach(route => {
            route.coordinates.forEach(coord => {
              bounds.extend(coord as [number, number]);
            });
          });
        }
        
        map.current.fitBounds(bounds, {
          padding: 100,
          duration: 1500,
          zoom: 10,
          essential: true
        });
      }
    });

    map.current.on('mouseenter', 'project-markers-hitarea', (e) => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      if (e.features && e.features[0]) {
        const props = e.features[0].properties;
        const project = projects.find(p => p.id === props.projectId);
        if (project) onProjectHover(project);
      }
    });

    map.current.on('mouseleave', 'project-markers-hitarea', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
      onProjectHover(null);
    });

    // LEVEL 2: STO Interactions
    let stoPopup: maplibregl.Popup | null = null;

    map.current.on('click', 'sto-markers-hitarea', (e) => {
      if (!e.features || !e.features[0] || !map.current) return;
      const props = e.features[0].properties;
      
      map.current.flyTo({
        center: e.lngLat,
        zoom: 15,
        duration: 1500,
        essential: true
      });

      if (stoPopup) stoPopup.remove();
      stoPopup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: true,
        maxWidth: '250px'
      })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div style="padding: 8px;">
            <h3 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #1f2937;">
              📍 ${props.stoName}
            </h3>
            <div style="font-size: 11px; color: #6b7280; line-height: 1.4;">
              <div><strong>Project:</strong> ${props.projectName}</div>
              <div><strong>Routes:</strong> ${props.routeCount}</div>
            </div>
            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #e5e7eb;">
              <div style="font-size: 10px; color: #EF4444; text-align: center; font-weight: 600;">
                Zooming to route details...
              </div>
            </div>
          </div>
        `)
        .addTo(map.current);

      setTimeout(() => {
        if (stoPopup) stoPopup.remove();
      }, 3000);
    });

    map.current.on('mouseenter', 'sto-markers-hitarea', (e) => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      
      if (e.features && e.features[0]) {
        const props = e.features[0].properties;
        
        if (stoPopup) stoPopup.remove();
        stoPopup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          maxWidth: '220px',
          offset: 15
        })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="padding: 6px;">
              <h3 style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #1f2937;">
                📍 ${props.stoName}
              </h3>
              <div style="font-size: 10px; color: #6b7280; line-height: 1.4;">
                <div><strong>Project:</strong> ${props.projectName}</div>
                <div><strong>Routes:</strong> ${props.routeCount}</div>
              </div>
              <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #e5e7eb;">
                <div style="font-size: 9px; color: #9ca3af; text-align: center;">
                  Click to view route details
                </div>
              </div>
            </div>
          `)
          .addTo(map.current!);
      }
    });

    map.current.on('mouseleave', 'sto-markers-hitarea', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
      if (stoPopup) {
        stoPopup.remove();
        stoPopup = null;
      }
    });

    // LEVEL 3: Route & Endpoint Interactions
    let routePopup: maplibregl.Popup | null = null;

    map.current.on('mouseenter', 'all-project-routes-buffer', (e) => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      
      if (e.features && e.features[0]) {
        const props = e.features[0].properties;
        const project = projects.find(p => p.id === props.projectId);
        if (project) onProjectHover(project);
      }
    });

    map.current.on('mouseleave', 'all-project-routes-buffer', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
      onProjectHover(null);
    });

    map.current.on('click', 'all-project-routes-buffer', (e) => {
      if (!e.features || !e.features[0]) return;
      const props = e.features[0].properties;
      
      // Toggle highlight
      if (highlightedSpanId === props.routeId) {
        setHighlightedSpanId(null);
      } else {
        setHighlightedSpanId(props.routeId);
      }
      
      const project = projects.find(p => p.id === props.projectId);
      if (project) {
        onProjectClick(project);
      }
    });

    map.current.on('click', 'route-endpoints-hitarea', (e) => {
      if (!e.features || !e.features[0]) return;
      const props = e.features[0].properties;
      
      // Toggle highlight
      if (highlightedSpanId === props.routeId) {
        setHighlightedSpanId(null);
      } else {
        setHighlightedSpanId(props.routeId);
      }
      
      const project = projects.find(p => p.id === props.projectId);
      
      if (project) {
        onProjectClick(project);
      }

      if (routePopup) routePopup.remove();
      routePopup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: true,
        maxWidth: '250px'
      })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div style="padding: 6px;">
            <h3 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #1f2937;">
              ${props.position === 'start' ? '🟢' : '🔴'} ${props.stoName}
            </h3>
            <div style="font-size: 11px; color: #6b7280; line-height: 1.4;">
              <div><strong>Project:</strong> ${props.projectName}</div>
              <div><strong>Route:</strong> ${props.routeName}</div>
            </div>
          </div>
        `)
        .addTo(map.current!);

      setTimeout(() => {
        if (routePopup) routePopup.remove();
      }, 3000);
    });

    map.current.on('mouseenter', 'route-endpoints-hitarea', (e) => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      
      if (e.features && e.features[0]) {
        const props = e.features[0].properties;
        const project = projects.find(p => p.id === props.projectId);
        if (project) onProjectHover(project);
      }
    });

    map.current.on('mouseleave', 'route-endpoints-hitarea', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
      onProjectHover(null);
    });
  }, [projects, onProjectClick, onProjectHover]);

  // Auto-zoom to projects when data is loaded
  useEffect(() => {
    if (!map.current || !mapLoaded || filteredProjects.length === 0) return;
    
    // Skip auto-zoom if timeline is playing to prevent map movement
    if (isTimelinePlaying) return;
    
    // Calculate bounds of all projects
    const bounds = new maplibregl.LngLatBounds();
    let hasValidCoords = false;

    filteredProjects.forEach(project => {
      if (project.location.lat && project.location.lng) {
        bounds.extend([project.location.lng, project.location.lat]);
        hasValidCoords = true;
      }
    });

    if (hasValidCoords) {
      setTimeout(() => {
        if (map.current) {
          map.current.fitBounds(bounds, {
            padding: 100,
            duration: 2000,
            maxZoom: 7, // Stay at project marker zoom level
            essential: true
          });
        }
      }, 500);
    }
  }, [mapLoaded, filteredProjects, isTimelinePlaying]);

  // Update layer visibility when zoom level mode changes
  useEffect(() => {
    if (!map.current || !mapLoaded || !layersCreated.current) {
      console.log('⏸️ Skipping layer update:', { 
        hasMap: !!map.current, 
        mapLoaded, 
        layersCreated: layersCreated.current 
      });
      return;
    }

    console.log('🔄 Updating layer visibility for mode:', zoomLevelMode);

    // Helper function to safely update layer visibility and zoom range
    const updateLayer = (layerId: string, config: { visible: boolean; minZoom?: number; maxZoom?: number }) => {
      if (map.current && map.current.getLayer(layerId)) {
        // Set visibility
        map.current.setLayoutProperty(layerId, 'visibility', config.visible ? 'visible' : 'none');
        
        // Set zoom range if visible
        if (config.visible && config.minZoom !== undefined && config.maxZoom !== undefined) {
          map.current.setLayerZoomRange(layerId, config.minZoom, config.maxZoom);
        }
        
        console.log(`  ✓ ${layerId}: ${config.visible ? 'visible' : 'hidden'} (${config.minZoom}-${config.maxZoom})`);
        return true;
      } else {
        console.warn(`  ✗ Layer not found: ${layerId}`);
        return false;
      }
    };

    // Update project markers visibility
    const showProject = zoomLevelMode === 'project' || zoomLevelMode === 'auto';
    updateLayer('project-markers', {
      visible: showProject,
      minZoom: 0,
      maxZoom: 9  // Hide when zooming to STO/route level
    });
    updateLayer('project-labels', {
      visible: showProject,
      minZoom: 6,
      maxZoom: 9  // Hide when zooming to STO/route level
    });
    updateLayer('project-markers-hitarea', {
      visible: showProject,
      minZoom: 0,
      maxZoom: 9  // Hide when zooming to STO/route level
    });

    // Update STO markers visibility
    const showSTO = zoomLevelMode === 'sto' || zoomLevelMode === 'auto';
    updateLayer('sto-markers', {
      visible: showSTO,
      minZoom: zoomLevelMode === 'sto' ? 0 : 9,
      maxZoom: zoomLevelMode === 'sto' ? 22 : 13
    });
    updateLayer('sto-labels', {
      visible: showSTO,
      minZoom: zoomLevelMode === 'sto' ? 10 : 10,
      maxZoom: zoomLevelMode === 'sto' ? 22 : 13
    });
    updateLayer('sto-markers-hitarea', {
      visible: showSTO,
      minZoom: zoomLevelMode === 'sto' ? 0 : 9,
      maxZoom: zoomLevelMode === 'sto' ? 22 : 13
    });

    // Update route visibility
    const showRoute = zoomLevelMode === 'route' || zoomLevelMode === 'auto';
    updateLayer('all-project-routes', {
      visible: showRoute,
      minZoom: zoomLevelMode === 'route' ? 0 : 13,
      maxZoom: 22
    });
    updateLayer('all-project-routes-buffer', {
      visible: showRoute,
      minZoom: zoomLevelMode === 'route' ? 0 : 13,
      maxZoom: 22
    });
    updateLayer('route-endpoints', {
      visible: showRoute,
      minZoom: zoomLevelMode === 'route' ? 0 : 13,
      maxZoom: 22
    });
    updateLayer('route-endpoints-hitarea', {
      visible: showRoute,
      minZoom: zoomLevelMode === 'route' ? 0 : 13,
      maxZoom: 22
    });
    
    // Update route labels visibility
    updateLayer('route-labels', {
      visible: showRoute,
      minZoom: 9,  // Always show from zoom 9+ when routes are visible
      maxZoom: 22
    });

    // Force map to re-render
    if (map.current) {
      map.current.triggerRepaint();
      console.log('✅ Layer visibility updated and map repainted');
    }
  }, [zoomLevelMode, mapLoaded]);

  // Update highlight colors when highlightedSpanId changes
  useEffect(() => {
    if (!map.current || !mapLoaded || !layersCreated.current) return;

    if (map.current.getLayer('all-project-routes')) {
      map.current.setPaintProperty('all-project-routes', 'line-color', [
        'case',
        ['==', ['get', 'routeId'], highlightedSpanId || ''],
        HIGHLIGHT_COLOR,
        ['get', 'color']
      ]);
    }

    if (map.current.getLayer('route-endpoints')) {
      map.current.setPaintProperty('route-endpoints', 'circle-color', [
        'case',
        ['==', ['get', 'routeId'], highlightedSpanId || ''],
        HIGHLIGHT_COLOR,
        ['get', 'color']
      ]);
    }
  }, [highlightedSpanId, mapLoaded]);

  // When project is selected, zoom to it
  useEffect(() => {
    if (!selectedProject || !map.current || !mapLoaded) return;

    requestAnimationFrame(() => {
      if (selectedProject.routes && selectedProject.routes.length > 0) {
        // Zoom to routes bounds
        const bounds = new maplibregl.LngLatBounds();
        selectedProject.routes.forEach(route => {
          route.coordinates.forEach(coord => {
            bounds.extend(coord as [number, number]);
          });
        });
        map.current?.fitBounds(bounds, {
          padding: 80,
          duration: 1000,
          pitch: 45,
          essential: true
        });
      } else {
        // Fallback: zoom to project location if no routes
        map.current?.flyTo({
          center: [selectedProject.location.lng, selectedProject.location.lat],
          zoom: 12,
          duration: 1000,
          pitch: 45,
          essential: true
        });
      }
    });
  }, [selectedProject, mapLoaded]);

  // Update data sources when filters change
  useEffect(() => {
    if (!map.current || !mapLoaded || !layersCreated.current) return;

    const projectSource = map.current.getSource('project-centers') as maplibregl.GeoJSONSource;
    if (projectSource && projectCenterFeatures.length > 0) {
      projectSource.setData({
        type: 'FeatureCollection',
        features: projectCenterFeatures
      });
    }

    const stoSource = map.current.getSource('sto-points') as maplibregl.GeoJSONSource;
    if (stoSource && stoFeatures.length > 0) {
      stoSource.setData({
        type: 'FeatureCollection',
        features: stoFeatures
      });
    }

    const routeSource = map.current.getSource('all-project-routes') as maplibregl.GeoJSONSource;
    if (routeSource && allRouteFeatures.length > 0) {
      routeSource.setData({
        type: 'FeatureCollection',
        features: allRouteFeatures
      });
    }

    const endpointSource = map.current.getSource('route-endpoints') as maplibregl.GeoJSONSource;
    if (endpointSource && endpointFeatures.length > 0) {
      endpointSource.setData({
        type: 'FeatureCollection',
        features: endpointFeatures
      });
    }
  }, [projectCenterFeatures, stoFeatures, allRouteFeatures, endpointFeatures, mapLoaded]);

  // Update line width when multiplier changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    if (map.current.getLayer('all-project-routes')) {
      map.current.setPaintProperty('all-project-routes', 'line-width', [
        'interpolate',
        ['exponential', 2],
        ['zoom'],
        13, 3 * lineWidthMultiplier,
        15, 5 * lineWidthMultiplier,
        18, 8 * lineWidthMultiplier
      ]);
    }
  }, [lineWidthMultiplier, mapLoaded]);

  // Update STO point size when multiplier changes (for route endpoints at zoom 13+)
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    if (map.current.getLayer('route-endpoints')) {
      map.current.setPaintProperty('route-endpoints', 'circle-radius', [
        'interpolate',
        ['linear'],
        ['zoom'],
        13, 4 * stoSizeMultiplier,
        15, 6 * stoSizeMultiplier,
        18, 10 * stoSizeMultiplier
      ]);
    }

    // Also update STO markers at zoom 9-12
    if (map.current.getLayer('sto-markers')) {
      map.current.setPaintProperty('sto-markers', 'circle-radius', [
        'interpolate',
        ['linear'],
        ['zoom'],
        9, 6 * stoSizeMultiplier,
        11, 10 * stoSizeMultiplier,
        12, 14 * stoSizeMultiplier
      ]);
    }
  }, [stoSizeMultiplier, mapLoaded]);

  // Update project marker size when multiplier changes (for zoom 0-8)
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    if (map.current.getLayer('project-markers')) {
      // Update icon size for symbol layer (not circle-radius)
      map.current.setLayoutProperty('project-markers', 'icon-size', [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, 0.6 * projectMarkerMultiplier,
        5, 0.8 * projectMarkerMultiplier,
        8, 1.0 * projectMarkerMultiplier
      ]);
    }
  }, [projectMarkerMultiplier, mapLoaded]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
}
