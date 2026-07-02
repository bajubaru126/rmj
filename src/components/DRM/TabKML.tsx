import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin, Layers, X, ImageIcon, ChevronRight, ChevronDown, Folder, FolderOpen, Eye, EyeOff } from 'lucide-react';
import { parseKMLToGeoJSON, extractKMLFromKMZ, GeoJSONData } from '@/utils/kmlToGeoJSON';
import { OrbitProgress } from 'react-loading-indicators';
import { surveyService, SurveyResponse } from '@/services/surveyService';
import { API_CONFIG } from '@/config/api';
import { getAllDesignatorsV2, DesignatorV2 } from '@/services/designatorService';
import { redlineService, Span, SpanItem } from '@/services/redlineService';
import { installationOcrService, type InstallationOcr } from '@/services/installationService';
import { useAuth } from '@/context/AuthContext';

interface KMLFile {
  id: any;
  process_id: string;
  project_id: any;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_category: string;
  keterangan: string;
  status: string;
  created_at: string;
}

interface KMLProjectGroup {
  project_name: string;
  files: KMLFile[];
}

interface KMLSurveyGroup {
  item_id: string;
  item_name: string;
  files: KMLFile[];
}

interface KMLSpanGroup {
  span_name: string;
  files: KMLFile[];
}

interface KMLLinkGroup {
  link_name: string;
  files: KMLFile[];
}

interface KMLSurveyRecordGroup {
  item_id: string;
  item_name: string;
  files: KMLFile[];
}

interface KMLData {
  kml_project: KMLProjectGroup[];
  kml_survey: KMLSurveyGroup[];
  kml_span: KMLSpanGroup[];
  kml_link?: KMLLinkGroup[]; // New: KML files grouped by link
  kml_installation?: KMLFile[]; // New: KML files from installation
  survey_record?: KMLSurveyRecordGroup[]; // New: GeoJSON files from mobile survey
  survey_kml_tracking?: KMLSurveyRecordGroup[]; // New: GeoJSON tracking files from mobile survey
  installation_record?: KMLSurveyRecordGroup[]; // New: GeoJSON files from installation OCR records
}

interface TabKMLProps {
  kmlFileName: string;
  kmlFileContent: string;
  kmlPath?: string;
  kmlData?: KMLData; // New prop for structured KML data from API
  projectId?: string; // Project ID to fetch survey data
  linkId?: string; // Link ID to filter survey KML files
  defaultCategory?: 'plan' | 'survey' | 'span' | 'drm' | 'installation'; // New prop to set default category
  onPreview: () => void;
  onRefetchData?: () => void; // New: Callback to refetch KML and Survey data
  markAsDoneButton?: React.ReactNode; // Optional Mark as Done button from wrapper
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

// Category color mapping
const CATEGORY_COLORS: Record<string, string> = {
  'Kabel': '#E53935',
  'HDPE': '#1E88E5',
  'Cor': '#6D4C41',
  'SITAC': '#8E24AA',
  'Tiang': '#43A047'
};

// Designator type color mapping (DEPRECATED - kept for backward compatibility)
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

// Helper function to group multiple designators based on redline data
function groupMultipleDesignators(
  pointFeatures: any[],
  redlineData: Span[],
  spanName?: string
): Map<string, { designators: string[]; coordinates: number[]; batchId: string | null; redline: number }> {
  const groupedDesignators = new Map<string, { designators: string[]; coordinates: number[]; batchId: string | null; redline: number }>();
  
  if (!redlineData || redlineData.length === 0 || !spanName) {
    console.log('⚠️ No redline data or span name provided, skipping grouping');
    return groupedDesignators;
  }
  
  // Find matching span in redline data
  const matchingSpan = redlineData.find(span => span.span_name === spanName);
  if (!matchingSpan) {
    console.log(`⚠️ No matching span found in redline data for "${spanName}"`);
    return groupedDesignators;
  }
  
  console.log(`📊 Grouping designators for span "${spanName}" with ${matchingSpan.span_items.length} items`);
  
  // Log all span items to see their batch_id and is_multiple status
  console.log(`📋 All span items:`, matchingSpan.span_items.map(item => ({
    name: item.item_name,
    is_multiple: item.is_multiple,
    batch_id: item.batch_id,
    redline: item.redline
  })));
  
  // Group span items by batch_id (for multiple designators at same location)
  const batchGroups = new Map<string, SpanItem[]>();
  const singleItems: SpanItem[] = [];
  
  matchingSpan.span_items.forEach(item => {
    console.log(`  Processing item "${item.item_name}": is_multiple=${item.is_multiple}, batch_id=${item.batch_id}`);
    
    if (item.is_multiple && item.batch_id) {
      if (!batchGroups.has(item.batch_id)) {
        batchGroups.set(item.batch_id, []);
        console.log(`    ✅ Created new batch group: ${item.batch_id}`);
      }
      batchGroups.get(item.batch_id)!.push(item);
      console.log(`    ✅ Added to batch group ${item.batch_id}, now has ${batchGroups.get(item.batch_id)!.length} items`);
    } else {
      singleItems.push(item);
      console.log(`    ➡️ Added to single items (is_multiple=${item.is_multiple}, batch_id=${item.batch_id})`);
    }
  });
  
  console.log(`  📦 Found ${batchGroups.size} batch groups and ${singleItems.length} single items`);
  
  // Process batch groups (multiple designators)
  batchGroups.forEach((items, batchId) => {
    const designatorNames = items.map(item => item.item_name).filter((name): name is string => name !== null);
    const firstItem = items[0];
    
    // Find matching point feature by designator name
    const matchingFeature = pointFeatures.find(f => 
      designatorNames.some(name => f.properties.name === name)
    );
    
    if (matchingFeature) {
      const coord = matchingFeature.geometry.coordinates as number[];
      groupedDesignators.set(batchId, {
        designators: designatorNames,
        coordinates: coord,
        batchId: batchId,
        redline: firstItem.redline
      });
      console.log(`  ✅ Grouped ${designatorNames.length} designators at batch ${batchId}:`, designatorNames);
    }
  });
  
  // Process single items
  singleItems.forEach(item => {
    if (!item.item_name) return;
    const matchingFeature = pointFeatures.find(f => f.properties.name === item.item_name);
    if (matchingFeature) {
      const coord = matchingFeature.geometry.coordinates as number[];
      const uniqueKey = `single_${item.item_name}`;
      groupedDesignators.set(uniqueKey, {
        designators: [item.item_name],
        coordinates: coord,
        batchId: null,
        redline: item.redline
      });
    }
  });
  
  return groupedDesignators;
}

// Helper function to calculate distance between two groups using redline data
function calculateDistanceBetweenGroups(
  group1Redline: number,
  group2Redline: number
): number {
  return Math.abs(group2Redline - group1Redline);
}

// Helper function to get color by designator name using category mapping
function getColorByDesignator(name: string, designatorsV2: DesignatorV2[]): string {
  const nameLower = name.toLowerCase().trim();

  // Find matching designator in v2 data
  const matchingDesignator = designatorsV2.find(d => 
    d.name.toLowerCase() === nameLower || 
    nameLower.includes(d.name.toLowerCase())
  );

  if (matchingDesignator && matchingDesignator.category) {
    const categoryColor = CATEGORY_COLORS[matchingDesignator.category];
    if (categoryColor) {
      console.log(`🎨 Designator "${name}" -> Category "${matchingDesignator.category}" -> Color ${categoryColor}`);
      return categoryColor;
    }
  }

  // Fallback to old designator type mapping for backward compatibility
  for (const designator of DESIGNATOR_TYPES) {
    const designatorValue = designator.value.toLowerCase();
    if (nameLower === designatorValue || nameLower.includes(designatorValue)) {
      console.log(`🎨 Designator "${name}" -> Fallback color ${designator.color}`);
      return designator.color;
    }
  }

  console.log(`⚠️ Designator "${name}" -> Default color (no match)`);
  return '#FF6B35'; // Default orange for unknown designators
}

// Helper function to get line info based on designator name
function getLineInfoFromColor(color: string, designatorsV2: DesignatorV2[] = [], designatorName?: string) {
  // If designator name is provided, try to find by name first
  if (designatorName && designatorsV2.length > 0) {
    const nameLower = designatorName.toLowerCase().trim();
    const matchingDesignator = designatorsV2.find(d => 
      d.name.toLowerCase() === nameLower || 
      nameLower.includes(d.name.toLowerCase())
    );

    if (matchingDesignator) {
      return {
        jenisGaris: matchingDesignator.name,   // Designator name
        category: matchingDesignator.category || 'N/A', // Category from designator
        color
      };
    }
  }

  // Fallback: try to find by color in DESIGNATOR_TYPES
  const fallbackDesignator = DESIGNATOR_TYPES.find(d => d.color.toLowerCase() === color.toLowerCase());
  if (fallbackDesignator) {
    return {
      jenisGaris: fallbackDesignator.label,
      category: 'N/A', // No category in fallback
      color
    };
  }

  // Fallback for unknown colors
  return { jenisGaris: 'Unknown', category: 'N/A', color };
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
    
    console.log(`📐 Found ${styleNodes.length} style nodes in KML`);
    
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
            console.log(`📎 StyleMap "${styleId}" references "${refStyleId}"`);
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
            console.log(`🎨 Style "${styleId}" LineStyle: ${kmlColor} -> ${style.lineColor}`);
          }
          if (widthNode) {
            style.lineWidth = parseFloat(widthNode.textContent || '2');
            console.log(`📏 Style "${styleId}" LineWidth: ${style.lineWidth}`);
          }
        }
        
        // Parse PolyStyle
        const polyStyle = actualStyleNode.querySelector('PolyStyle');
        if (polyStyle) {
          const colorNode = polyStyle.querySelector('color');
          if (colorNode) {
            style.fillColor = kmlColorToHex(colorNode.textContent || '');
            console.log(`🎨 Style "${styleId}" PolyStyle: ${style.fillColor}`);
          }
        }
        
        // Parse IconStyle
        const iconStyle = actualStyleNode.querySelector('IconStyle');
        if (iconStyle) {
          const colorNode = iconStyle.querySelector('color');
          if (colorNode) {
            style.iconColor = kmlColorToHex(colorNode.textContent || '');
            console.log(`🎨 Style "${styleId}" IconStyle: ${style.iconColor}`);
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
          console.log(`✅ Resolved StyleMap "${id}" -> "${style.reference}"`);
        } else {
          console.warn(`⚠️ StyleMap "${id}" references unknown style "${style.reference}"`);
        }
      }
    });
    
    console.log(`📊 Total styles parsed: ${styles.size}`, Array.from(styles.keys()));
    
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
            console.log(`📁 Folder "${name}" has style "${styleId}" for inheritance:`, folderStyle);
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
            console.log(`✅ Placemark "${name}" using own style "${styleId}":`, featureStyle);
          }
        } else if (Object.keys(inheritedStyle).length > 0) {
          console.log(`📥 Placemark "${name}" inheriting style from parent:`, featureStyle);
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

export function TabKML({ kmlFileName, kmlFileContent, kmlPath, kmlData, projectId, linkId, defaultCategory, onRefetchData, markAsDoneButton }: TabKMLProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapSectionRef = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [geoJSON, setGeoJSON] = useState<GeoJSONData | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [featureCount, setFeatureCount] = useState({ points: 0, lines: 0, polygons: 0 });
  const [selectedLine, setSelectedLine] = useState<any>(null);
  const [fetchingKML, setFetchingKML] = useState<boolean>(false);
  const [legendVisible, setLegendVisible] = useState<boolean>(true);
  const [selectedKMLPath, setSelectedKMLPath] = useState<string | undefined>(kmlPath);
  const [selectedKMLName, setSelectedKMLName] = useState<string>('');
  const [kmlStructure, setKmlStructure] = useState<KMLStructure | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [structurePanelVisible, setStructurePanelVisible] = useState<boolean>(true);
  const [hiddenFeatures, setHiddenFeatures] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<'plan' | 'survey' | 'span' | 'drm' | 'installation'>(defaultCategory || 'plan');
  const [surveyData, setSurveyData] = useState<SurveyResponse[]>([]);
  const [selectedLink, setSelectedLink] = useState<string>(''); // New: Selected SS/Link
  const [availableLinks, setAvailableLinks] = useState<string[]>([]); // New: Available SS/Links
  const [selectedGeoJSONs, setSelectedGeoJSONs] = useState<string[]>([]); // Changed to array for multiple selection
  const [selectedSurveyItemId, setSelectedSurveyItemId] = useState<string>(''); // Track selected survey item_id
  const [geoJSONData, setGeoJSONData] = useState<GeoJSONData | null>(null); // Store parsed GeoJSON data
  const [fetchingGeoJSON, setFetchingGeoJSON] = useState<boolean>(false); // Loading state for GeoJSON
  const [showGeoJSONDropdown, setShowGeoJSONDropdown] = useState<boolean>(false); // Toggle dropdown visibility
  const [mapReady, setMapReady] = useState<boolean>(false); // Track if map is initialized and ready
  const [designatorsV2, setDesignatorsV2] = useState<DesignatorV2[]>([]); // Store designators v2 data for category mapping
  const [redlineData, setRedlineData] = useState<any[]>([]); // Store redline data for multiple designator grouping
  const [installationRecords, setInstallationRecords] = useState<KMLSurveyRecordGroup[]>([]); // Store installation OCR GeoJSON records

  // ── Sub Phase state (untuk Installation KML by sub phase) ────────────────
  const { token: authToken } = useAuth();
  const SUB_PHASE_OPTIONS = [
    { value: 'ijin_kerja',       label: 'Ijin Kerja' },
    { value: 'penggalian_hdpe', label: 'Penggalian Tanah & HDPE' },
    { value: 'mh_jembatan',     label: 'MH & Jembatan' },
    { value: 'penarikan_kabel', label: 'Penarikan Kabel' },
    { value: 'joint_terminasi', label: 'Joint & Terminasi' },
    { value: 'tiang',           label: 'Tiang' },
  ] as const;
  const [selectedSubPhase, setSelectedSubPhase] = useState<string>('penggalian_hdpe');
  const [subPhaseKmlFiles, setSubPhaseKmlFiles] = useState<any[]>([]); // KML files from sub-phase endpoint
  const [subPhaseGeoJsonGroups, setSubPhaseGeoJsonGroups] = useState<KMLSurveyRecordGroup[]>([]); // GeoJSON from sub-phase endpoint
  const [loadingSubPhaseKml, setLoadingSubPhaseKml] = useState<boolean>(false);

  // MapTiler streets style with 3D buildings support
  const streetsStyle = "https://api.maptiler.com/maps/streets-v2/style.json?key=4Iyrc6TBGKphNJNy3iTH";

  // Handle KML selection change
  const handleKMLChange = (filePath: string, fileName: string) => {
    setSelectedKMLPath(filePath);
    setSelectedKMLName(fileName);
    // Reset map state
    setGeoJSON(null);
    setSelectedLine(null);
    if (map.current) {
      map.current.remove();
      map.current = null;
      setMapReady(false); // Reset map ready state
    }
  };

  // Extract available links from kmlData when it changes
  useEffect(() => {
    if (!kmlData) return;
    
    const linksMap = new Map<string, string>(); // Map<link_id, link_name>
    
    // Extract links from process_id in kml_project files
    if (kmlData.kml_project && kmlData.kml_project.length > 0) {
      kmlData.kml_project.forEach(group => {
        group.files.forEach(file => {
          // Extract link ID from process_id (format: "link_xxxxx")
          if (file.process_id && file.process_id.startsWith('link_')) {
            const linkId = file.process_id;
            // Use keterangan to get link name (e.g., "KML planned for SS#01")
            let linkName = file.keterangan || linkId;
            
            // Extract SS/Link name from keterangan
            // Format: "KML planned for SS#01" -> "SS#01"
            const match = linkName.match(/for\s+(.+)$/i);
            if (match) {
              linkName = match[1].trim();
            }
            
            linksMap.set(linkId, linkName);
          }
        });
      });
    }
    
    // Note: kml_survey files are NOT added to linksMap here
    // Survey files will be filtered by matching their ss_link with existing links from kml_project
    // Survey data contains ss_link that references the link ID from kml_project
    
    
    // Also check kml_span for additional links
    if (kmlData.kml_span && kmlData.kml_span.length > 0) {
      kmlData.kml_span.forEach(group => {
        group.files.forEach(file => {
          if (file.process_id && file.process_id.startsWith('link_')) {
            const linkId = file.process_id;
            let linkName = file.keterangan || linkId;
            const match = linkName.match(/for\s+(.+)$/i);
            if (match) {
              linkName = match[1].trim();
            }
            if (!linksMap.has(linkId)) {
              linksMap.set(linkId, linkName);
            }
          }
        });
      });
    }
    
    // Convert map to array of link names (sorted)
    const linkArray = Array.from(linksMap.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([, name]) => name);
    
    setAvailableLinks(linkArray);
    
    console.log('📋 Available SS/Links:', linkArray);
    console.log('📋 Links Map:', Array.from(linksMap.entries()));
    
    // If linkId prop is provided, auto-select that link and set category to 'survey'
    if (linkId) {
      // Find the link name for this linkId
      const linkProcessId = `link_${linkId}`;
      const linkName = linksMap.get(linkProcessId);
      
      if (linkName) {
        console.log('✅ Auto-selected link from prop:', linkName, '(ID:', linkId, ')');
        setSelectedLink(linkName);
        setSelectedCategory(defaultCategory || 'survey'); // Auto-select survey category for Survey page unless overridden
        
        // If defaultCategory is 'installation', auto-load first kml_installation file
        if (defaultCategory === 'installation') {
          if (kmlData.kml_installation && kmlData.kml_installation.length > 0) {
            const firstFile = kmlData.kml_installation[0];
            console.log('✅ Auto-loading first installation KML file:', firstFile.file_name);
            setSelectedKMLPath(firstFile.file_path);
            setSelectedKMLName(firstFile.file_name);
          }
          return; // skip survey auto-load
        }

        // Auto-load LATEST survey KML file for this link (sorted by created_at DESC)
        if (kmlData.kml_survey && kmlData.kml_survey.length > 0 && surveyData.length > 0) {
          // Find all survey KML files that belong to this link
          const matchingSurveyGroups: Array<{ group: any; file: any; createdAt: string }> = [];
          
          for (const group of kmlData.kml_survey) {
            const spanItemsId = group.item_id;
            const matchingSurvey = surveyData.find(survey => {
              const surveyId = typeof survey.id.id === 'string' 
                ? survey.id.id 
                : survey.id.id.String;
              return surveyId === spanItemsId;
            });
            
            if (matchingSurvey) {
              const ssLinkId = typeof matchingSurvey.ss_link === 'string'
                ? matchingSurvey.ss_link
                : (matchingSurvey.ss_link as any).id.String;
              
              if (ssLinkId === linkId && group.files.length > 0) {
                // Add all files from this group
                group.files.forEach((file: any) => {
                  matchingSurveyGroups.push({
                    group,
                    file,
                    createdAt: file.created_at
                  });
                });
              }
            }
          }
          
          // Sort by created_at DESC (newest first)
          matchingSurveyGroups.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          
          // Select the newest file
          if (matchingSurveyGroups.length > 0) {
            const latestEntry = matchingSurveyGroups[0];
            console.log('✅ Auto-loading LATEST survey KML file:', latestEntry.file.file_name, 'created at:', latestEntry.createdAt);
            setSelectedKMLPath(latestEntry.file.file_path);
            setSelectedKMLName(latestEntry.file.file_name);
            setSelectedSurveyItemId(latestEntry.group.item_id);
            
            // Don't auto-select GeoJSON - let user select manually
            // GeoJSON select will default to "-- Select GeoJSON --"
          }
        }
      }
    } else {
      // Auto-select first link if available and no linkId prop
      if (linkArray.length > 0 && !selectedLink) {
        const firstLink = linkArray[0];
        setSelectedLink(firstLink);
        console.log('✅ Auto-selected first link:', firstLink);
        
        // If defaultCategory is 'installation', auto-load first kml_installation file
        if (defaultCategory === 'installation') {
          if (kmlData.kml_installation && kmlData.kml_installation.length > 0) {
            const firstFile = kmlData.kml_installation[0];
            console.log('✅ Auto-loading first installation KML file:', firstFile.file_name);
            setSelectedKMLPath(firstFile.file_path);
            setSelectedKMLName(firstFile.file_name);
          }
          return; // skip plan auto-load
        }

        // Auto-load first KML file from first link
        // Find first file for this link in kml_project (Plan category)
        if (kmlData.kml_project && kmlData.kml_project.length > 0) {
          for (const group of kmlData.kml_project) {
            const firstFile = group.files.find(file => {
              let linkName = file.keterangan || '';
              const match = linkName.match(/for\s+(.+)$/i);
              if (match) {
                linkName = match[1].trim();
              }
              return linkName === firstLink && file.file_category === 'kml';
            });
            
            if (firstFile) {
              console.log('✅ Auto-loading first KML file:', firstFile.file_name);
              setSelectedKMLPath(firstFile.file_path);
              setSelectedKMLName(firstFile.file_name);
              break;
            }
          }
        }
      }
    }
  }, [kmlData, linkId, surveyData]);

  // Auto scroll to map when tab is opened and KML file exists
  useEffect(() => {
    if ((kmlFileContent || kmlPath) && mapSectionRef.current) {
      // Small delay to ensure DOM is fully rendered
      const timer = setTimeout(() => {
        mapSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [kmlFileContent, kmlPath]);

  // Fetch survey data when projectId is provided
  useEffect(() => {
    const fetchSurveyData = async () => {
      if (!projectId) return;

      try {
        console.log('📡 Fetching survey data for project:', projectId);
        const surveys = await surveyService.getSurveysByProjectId(projectId);
        console.log('✅ Survey data fetched:', surveys);
        setSurveyData(surveys);
      } catch (error) {
        console.error('❌ Error fetching survey data:', error);
      }
    };

    fetchSurveyData();
  }, [projectId]);

  // Fetch installation OCR GeoJSON records when linkId is provided (non-installation category only)
  useEffect(() => {
    const fetchInstallationRecords = async () => {
      // For 'installation' category we now use the sub-phase endpoint instead
      if (!linkId || defaultCategory !== 'installation') return;

      try {
        console.log('📡 Fetching installation OCR records for link:', linkId);
        const { data } = await installationOcrService.getAll({ link_id: linkId }, null);
        
        const groups: KMLSurveyRecordGroup[] = [];
        
        for (const ocr of data) {
          const ocrId = typeof ocr.id === 'string' ? ocr.id : (ocr.id as any);
          const itemName = ocr.designator || ocr.keterangan || `Installation Record ${ocrId}`;
          const files: KMLFile[] = [];
          
          if (ocr.documents) {
            for (const doc of ocr.documents) {
              if (
                doc.file_path &&
                (doc.file_path.includes('geojson') ||
                  doc.file_name?.toLowerCase().endsWith('.geojson') ||
                  doc.file_type === 'application/geo+json')
              ) {
                files.push({
                  id: { id: { String: doc.file_path } },
                  process_id: ocrId,
                  project_id: ocr.project_id,
                  file_path: doc.file_path,
                  file_name: doc.file_name || doc.file_path.split('/').pop() || 'geojson',
                  file_type: doc.file_type || 'application/geo+json',
                  file_size: doc.file_size || 0,
                  file_category: 'installation_record',
                  keterangan: `Installation record - ${itemName}`,
                  status: 'active',
                  created_at: ocr.created_at || new Date().toISOString(),
                } as any);
              }
            }
          }
          
          if (files.length > 0) {
            groups.push({ item_id: ocrId, item_name: itemName, files });
          }
        }
        
        console.log('✅ Installation OCR records built:', groups.length, 'groups');
        setInstallationRecords(groups);
      } catch (error) {
        console.error('❌ Error fetching installation OCR records:', error);
        setInstallationRecords([]);
      }
    };

    fetchInstallationRecords();
  }, [linkId, defaultCategory]);

  // Fetch KML files by sub-phase when category is 'installation' and sub phase changes
  useEffect(() => {
    const fetchSubPhaseKml = async () => {
      if (selectedCategory !== 'installation' || !selectedSubPhase) return;
      setLoadingSubPhaseKml(true);
      try {
        const params: { project_id?: string; link_id?: string } = {};
        if (projectId) params.project_id = projectId;
        if (linkId) params.link_id = linkId;

        const result = await installationOcrService.getKmlBySubPhase(
          selectedSubPhase,
          params,
          authToken
        );

        // Build flat KML file list and GeoJSON groups from data
        const kmlFiles: any[] = [];
        const geoJsonGroups: KMLSurveyRecordGroup[] = [];

        for (const group of (result?.data ?? [])) {
          const ocrId = group.installation_ocr_id ?? 'unknown';
          const files: KMLFile[] = [];

          for (const file of (group.files ?? [])) {
            if (
              file.file_path &&
              (file.file_type === 'geojson' ||
               file.file_name?.toLowerCase().endsWith('.geojson') ||
               file.file_category === 'installation_record')
            ) {
              files.push({
                id: { id: { String: file.file_path } },
                process_id: ocrId,
                project_id: file.project_id ?? '',
                file_path: file.file_path,
                file_name: file.file_name || file.file_path.split('/').pop() || 'geojson',
                file_type: file.file_type || 'application/geo+json',
                file_size: file.file_size || 0,
                file_category: 'installation_record',
                keterangan: file.keterangan ?? '',
                status: file.status ?? 'active',
                created_at: file.created_at || new Date().toISOString(),
              } as any);
            } else if (
              file.file_path &&
              (file.file_type === 'kml' ||
               file.file_name?.toLowerCase().endsWith('.kml') ||
               file.file_category === 'kml')
            ) {
              kmlFiles.push(file);
            }
          }

          if (files.length > 0) {
            geoJsonGroups.push({ item_id: ocrId, item_name: ocrId, files });
          }
        }

        console.log(`✅ Sub-phase KML (${selectedSubPhase}): ${kmlFiles.length} KML, ${geoJsonGroups.length} GeoJSON groups`);
        setSubPhaseKmlFiles(kmlFiles);
        setSubPhaseGeoJsonGroups(geoJsonGroups);

        // Auto-select first KML file if available
        if (kmlFiles.length > 0) {
          setSelectedKMLPath(kmlFiles[0].file_path);
          setSelectedKMLName(kmlFiles[0].file_name || kmlFiles[0].file_path.split('/').pop() || '');
        } else {
          setSelectedKMLPath(undefined);
          setSelectedKMLName('');
        }
        setSelectedGeoJSONs([]);
      } catch (err) {
        console.error('❌ Error fetching sub-phase KML:', err);
        setSubPhaseKmlFiles([]);
        setSubPhaseGeoJsonGroups([]);
      } finally {
        setLoadingSubPhaseKml(false);
      }
    };

    fetchSubPhaseKml();
  }, [selectedCategory, selectedSubPhase, projectId, linkId, authToken]);

  // Auto refetch data when onRefetchData callback is provided
  // This will be triggered by parent component after data changes (create/edit/delete operations)
  useEffect(() => {
    if (onRefetchData) {
      console.log('🔄 Auto refetch enabled - will refetch on data changes');
    }
  }, [onRefetchData]);

  // Auto refetch when kmlData changes (indicates new data from parent)
  useEffect(() => {
    if (kmlData && onRefetchData) {
      console.log('📊 KML data updated, checking if refetch needed');
      // Data has been updated by parent, no need to refetch again
      // This effect is just for logging
    }
  }, [kmlData, onRefetchData]);

  // Fetch designators v2 data for category mapping
  useEffect(() => {
    const fetchDesignatorsV2 = async () => {
      try {
        console.log('📡 Fetching designators v2 for category mapping...');
        const designators = await getAllDesignatorsV2();
        console.log('✅ Designators v2 fetched:', designators.length, 'items');
        setDesignatorsV2(designators);
      } catch (error) {
        console.error('❌ Error fetching designators v2:', error);
      }
    };

    fetchDesignatorsV2();
  }, []);

  // Fetch redline data for multiple designator grouping
  useEffect(() => {
    const fetchRedlineData = async () => {
      if (!projectId) {
        console.log('⚠️ No project ID, skipping redline fetch');
        return;
      }

      try {
        console.log('📡 Fetching redline data for project:', projectId);
        const spans = await redlineService.getRedlineByProject(projectId);
        console.log('✅ Redline data fetched:', spans.length, 'spans');
        setRedlineData(spans);
      } catch (error) {
        console.error('❌ Error fetching redline data:', error);
        setRedlineData([]);
      }
    };

    fetchRedlineData();
  }, [projectId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showGeoJSONDropdown && !target.closest('.relative')) {
        setShowGeoJSONDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showGeoJSONDropdown]);

  // Fetch GeoJSON from backend when selectedGeoJSONs changes
  useEffect(() => {
    const fetchGeoJSONFromBackend = async () => {
      if (!selectedGeoJSONs || selectedGeoJSONs.length === 0) {
        console.log('⚠️ No GeoJSON selected, clearing geoJSONData');
        setGeoJSONData(null);
        return;
      }

      console.log('🔄 Starting GeoJSON fetch for:', selectedGeoJSONs);
      setFetchingGeoJSON(true);

      try {
        // Fetch all selected GeoJSON files
        const allFeatures: any[] = [];
        
        for (const geoJSONPath of selectedGeoJSONs) {
          console.log('📡 Fetching GeoJSON from backend:', geoJSONPath);

          // Determine source type from path
          const isTrackingSource = geoJSONPath.includes('kml_tracking');
          const isInstallationSource = geoJSONPath.includes('installation_record') || geoJSONPath.includes('installation_ocr');
          const sourceType = isTrackingSource 
            ? 'survey_kml_tracking' 
            : isInstallationSource 
              ? 'installation_record' 
              : 'survey_record';

          // Parse path from backend
          // Example: "uploads/geojson/survey_record_1770609278461.geojson"
          // Example: "uploads/geojson/kml_tracking/survey_kml_tracking_1772771282669.geojson"
          const pathWithoutUploads = geoJSONPath.replace('uploads/', '');
          const pathParts = pathWithoutUploads.split('/');
          const filename = pathParts[pathParts.length - 1];
          const category = pathParts.slice(0, -1).join('/');

          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
          const baseUrl = apiUrl.replace('/api', '');
          const fileUrl = `${baseUrl}/api/files/${category}/${filename}`;

          console.log('📥 Fetching GeoJSON:', {
            originalPath: geoJSONPath,
            category,
            filename,
            fileUrl,
            sourceType
          });

          const response = await fetch(fileUrl);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Response error body:', errorText);
            throw new Error(`Failed to fetch GeoJSON: ${response.status} ${response.statusText}`);
          }

          const geoJSONContent = await response.text();
          console.log('✅ GeoJSON fetched successfully, length:', geoJSONContent.length);

          // Parse GeoJSON
          const parsed = JSON.parse(geoJSONContent);
          console.log('✅ GeoJSON parsed:', {
            type: parsed.type,
            featuresCount: parsed.features?.length || 0,
            features: parsed.features,
            sourceType
          });

          // Collect features from this GeoJSON and add source property
          if (parsed.features && Array.isArray(parsed.features)) {
            const featuresWithSource = parsed.features.map((feature: any) => ({
              ...feature,
              properties: {
                ...feature.properties,
                geojson_source: sourceType // Add source identifier
              }
            }));
            allFeatures.push(...featuresWithSource);
          }
        }

        // Combine all features into one GeoJSON
        const combinedGeoJSON: GeoJSONData = {
          type: 'FeatureCollection',
          features: allFeatures
        };

        console.log('✅ Combined GeoJSON:', {
          totalFeatures: allFeatures.length,
          sources: selectedGeoJSONs.length
        });

        setGeoJSONData(combinedGeoJSON);
        setFetchingGeoJSON(false);
        console.log('✅ GeoJSON data set to state');
      } catch (err) {
        console.error('❌ Error fetching GeoJSON from backend:', err);
        setError(`Failed to load GeoJSON file: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setFetchingGeoJSON(false);
      }
    };

    fetchGeoJSONFromBackend();
  }, [selectedGeoJSONs]);

  // Fetch KML/KMZ from backend if selectedKMLPath is provided
  useEffect(() => {
    const fetchKMLFromBackend = async () => {
      if (!selectedKMLPath) return;

      setFetchingKML(true);
      setError('');

      try {
        // Parse path from backend
        // Example: "uploads/kml/planned/kml_planned_1769004235113.kml"
        // or: "kml/project_span_123.kmz"

        let fileUrl: string;
        const isKMZ = selectedKMLPath.toLowerCase().endsWith('.kmz');

        if (selectedKMLPath.startsWith('uploads/')) {
          // New format from upload response: "uploads/kml/planned/kml_planned_1769004235113.kml"
          // Remove "uploads/" prefix and construct URL
          const pathWithoutUploads = selectedKMLPath.replace('uploads/', '');
          const pathParts = pathWithoutUploads.split('/');

          // Join all parts as category/filename structure
          // "kml/planned/kml_planned_1769004235113.kml" -> category: "kml/planned", filename: "kml_planned_1769004235113.kml"
          const filename = pathParts[pathParts.length - 1];
          const category = pathParts.slice(0, -1).join('/');

          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
          const baseUrl = apiUrl.replace('/api', ''); // Remove /api if exists
          fileUrl = `${baseUrl}/api/files/${category}/${filename}`;

          console.log(`📥 Fetching ${isKMZ ? 'KMZ' : 'KML'} (new format):`, {
            originalPath: selectedKMLPath,
            category,
            filename,
            fileUrl,
            isKMZ
          });
        } else {
          // Old format: "kml/project_span_123.kml" or "kml/project_span_123.kmz"
          const pathParts = selectedKMLPath.split('/');
          const category = pathParts[0];
          const filename = pathParts.slice(1).join('/');

          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
          const baseUrl = apiUrl.replace('/api', ''); // Remove /api if exists
          fileUrl = `${baseUrl}/api/files/${category}/${filename}`;

          console.log(`📥 Fetching ${isKMZ ? 'KMZ' : 'KML'} (old format):`, {
            originalPath: selectedKMLPath,
            category,
            filename,
            fileUrl,
            isKMZ
          });
        }

        const response = await fetch(fileUrl);

        console.log('📡 Response received:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Response error body:', errorText);
          throw new Error(`Failed to fetch ${isKMZ ? 'KMZ' : 'KML'}: ${response.status} ${response.statusText}`);
        }

        let kmlContent: string;

        if (isKMZ) {
          // Handle KMZ file - need to extract KML from it
          console.log('📦 Processing KMZ file...');
          const blob = await response.blob();
          const file = new File([blob], selectedKMLPath.split('/').pop() || 'file.kmz', {
            type: 'application/vnd.google-earth.kmz'
          });

          // Extract KML from KMZ
          kmlContent = await extractKMLFromKMZ(file);
          console.log('✅ KML extracted from KMZ successfully, length:', kmlContent.length);
        } else {
          // Handle regular KML file
          kmlContent = await response.text();
          console.log('✅ KML fetched successfully, length:', kmlContent.length);
        }

        // Parse KML structure for hierarchical display
        const structure = parseKMLStructure(kmlContent);
        if (structure) {
          setKmlStructure(structure);
          // Auto-expand root folders
          const rootFolderIds = structure.features
            .filter(f => f.type === 'Folder')
            .map(f => f.id);
          setExpandedFolders(new Set(rootFolderIds));
        }

        // Parse the KML content to GeoJSON
        console.log('🔄 Parsing KML to GeoJSON...');
        const parsed = parseKMLToGeoJSON(kmlContent);
        console.log('✅ KML parsed to GeoJSON:', {
          featuresCount: parsed.features.length,
          featureTypes: parsed.features.map(f => f.geometry.type)
        });
        setGeoJSON(parsed);

        const counts = { points: 0, lines: 0, polygons: 0 };
        parsed.features.forEach(feature => {
          if (feature.geometry.type === 'Point') counts.points++;
          else if (feature.geometry.type === 'LineString') counts.lines++;
          else if (feature.geometry.type === 'Polygon') counts.polygons++;
        });
        setFeatureCount(counts);

        setFetchingKML(false);
      } catch (err) {
        console.error('❌ Error fetching KML/KMZ from backend:', err);
        setError(`Failed to load KML/KMZ file: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setFetchingKML(false);
      }
    };

    // Only fetch from backend if selectedKMLPath is provided and no kmlFileContent
    if (selectedKMLPath && !kmlFileContent) {
      fetchKMLFromBackend();
    }
  }, [selectedKMLPath, kmlFileContent]);

  useEffect(() => {
    if (!kmlFileContent) return;

    const parseKMLContent = async () => {
      try {
        setLoading(true);

        // Check if content is base64 encoded KMZ (starts with data:application or is binary)
        const isKMZ = kmlFileContent.startsWith('data:application/vnd.google-earth.kmz') ||
          kmlFileContent.startsWith('data:application/zip') ||
          kmlFileContent.includes('PK\x03\x04') ||
          kmlFileName?.toLowerCase().endsWith('.kmz');

        let kmlString = kmlFileContent;

        if (isKMZ) {
          console.log('📦 Detected KMZ content, extracting...');
          // Convert base64 to blob if needed
          let blob: Blob;
          if (kmlFileContent.startsWith('data:')) {
            const base64Data = kmlFileContent.split(',')[1];
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            blob = new Blob([bytes], { type: 'application/vnd.google-earth.kmz' });
          } else {
            blob = new Blob([kmlFileContent], { type: 'application/vnd.google-earth.kmz' });
          }

          const file = new File([blob], 'temp.kmz', { type: 'application/vnd.google-earth.kmz' });
          kmlString = await extractKMLFromKMZ(file);
          console.log('✅ KML extracted from KMZ, length:', kmlString.length);
        } else {
          // Regular KML content
          console.log('📄 Parsing KML content...');
        }

        // Parse KML structure for hierarchical display
        const structure = parseKMLStructure(kmlString);
        if (structure) {
          setKmlStructure(structure);
          // Auto-expand root folders
          const rootFolderIds = structure.features
            .filter(f => f.type === 'Folder')
            .map(f => f.id);
          setExpandedFolders(new Set(rootFolderIds));
        }

        // Parse to GeoJSON for map display
        const parsed = parseKMLToGeoJSON(kmlString);
        setGeoJSON(parsed);

        // Count features
        if (parsed) {
          const counts = { points: 0, lines: 0, polygons: 0 };
          parsed.features.forEach(feature => {
            if (feature.geometry.type === 'Point') counts.points++;
            else if (feature.geometry.type === 'LineString') counts.lines++;
            else if (feature.geometry.type === 'Polygon') counts.polygons++;
          });
          setFeatureCount(counts);
        }

        setLoading(false);
      } catch (err) {
        setError('Failed to parse KML/KMZ file');
        console.error('❌ KML/KMZ parsing error:', err);
        setLoading(false);
      }
    };

    parseKMLContent();
  }, [kmlFileContent, kmlFileName]);

  useEffect(() => {
    if (!mapContainer.current || !geoJSON || map.current) return;

    setLoading(true);
    let loadingTimeout: NodeJS.Timeout | null = null;

    try {
      // Process GeoJSON features BEFORE map initialization
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
              // Define color palette for subsequent spans (excluding red for main span)
              const spanColors = [
                '#FBC02D', // Kuning (Yellow)
                '#43A047', // Hijau (Green)
                '#1E88E5', // Biru (Blue)
                '#FB8C00', // Oranye (Orange)
                '#8E24AA', // Ungu (Purple)
                '#00ACC1', // Cyan
                '#7CB342', // Lime Green
                '#F4511E', // Deep Orange
                '#5E35B1', // Deep Purple
                '#00897B', // Teal
              ];
              
              // Get previous span's color to avoid adjacent spans having same color
              const previousLineStrings = geoJSON.features
                .slice(0, index)
                .filter(f => f.geometry.type === 'LineString');
              
              let previousColor: string | null = null;
              if (previousLineStrings.length > 0) {
                const prevFeature = previousLineStrings[previousLineStrings.length - 1];
                previousColor = prevFeature.properties?.lineColor || prevFeature.properties?.color;
              }
              
              // Select color from palette, avoiding previous color
              let selectedColorIndex = (lineStringIndex - 1) % spanColors.length;
              color = spanColors[selectedColorIndex];
              
              // If selected color matches previous color, use next color in palette
              if (previousColor && color === previousColor) {
                selectedColorIndex = (selectedColorIndex + 1) % spanColors.length;
                color = spanColors[selectedColorIndex];
                console.log(`🎨 Adjusted color to avoid duplicate with previous span: ${color}`);
              }
              
              console.log(`🎨 Priority 3 (Fallback): LineString #${lineStringIndex} "${feature.properties.name}" using color: ${color} (index: ${selectedColorIndex})`);
            }
          }
          
          processed.properties = {
            ...feature.properties,
            color: color,
            width: width,
            designator: feature.properties.name
          };
          
          console.log(`✅ Feature "${feature.properties.name}" final color: ${color}, width: ${width}`);
        } else if (feature.geometry.type === 'Point') {
          processed.properties = { ...feature.properties };
        } else if (feature.geometry.type === 'Polygon') {
          processed.properties = { ...feature.properties };
        }

        return processed;
      });

      // Map KML structure IDs to GeoJSON features BEFORE map initialization
      const featureIdMap = new Map<string, any>();
      
      const mapFeatureIds = (kmlFeatures: KMLFeature[], geoJsonFeatures: any[]) => {
        kmlFeatures.forEach(kmlFeature => {
          if (kmlFeature.type !== 'Folder') {
            const matchingGeoJson = geoJsonFeatures.find(gf => {
              if (gf.properties.name !== kmlFeature.name) return false;
              
              if (kmlFeature.type === 'Point' && gf.geometry.type === 'Point') {
                const kmlCoord = kmlFeature.coordinates as number[];
                const gjCoord = gf.geometry.coordinates;
                return Math.abs(kmlCoord[0] - gjCoord[0]) < 0.000001 && 
                       Math.abs(kmlCoord[1] - gjCoord[1]) < 0.000001;
              } else if (kmlFeature.type === 'LineString' && gf.geometry.type === 'LineString') {
                const kmlCoords = kmlFeature.coordinates as number[][];
                const gjCoords = gf.geometry.coordinates;
                if (kmlCoords.length !== gjCoords.length) return false;
                return Math.abs(kmlCoords[0][0] - gjCoords[0][0]) < 0.000001 &&
                       Math.abs(kmlCoords[0][1] - gjCoords[0][1]) < 0.000001 &&
                       Math.abs(kmlCoords[kmlCoords.length-1][0] - gjCoords[gjCoords.length-1][0]) < 0.000001 &&
                       Math.abs(kmlCoords[kmlCoords.length-1][1] - gjCoords[gjCoords.length-1][1]) < 0.000001;
              } else if (kmlFeature.type === 'Polygon' && gf.geometry.type === 'Polygon') {
                const kmlCoords = kmlFeature.coordinates as number[][];
                const gjCoords = gf.geometry.coordinates[0];
                if (kmlCoords.length !== gjCoords.length) return false;
                return Math.abs(kmlCoords[0][0] - gjCoords[0][0]) < 0.000001 &&
                       Math.abs(kmlCoords[0][1] - gjCoords[0][1]) < 0.000001;
              }
              return false;
            });
            
            if (matchingGeoJson) {
              matchingGeoJson.properties.kmlId = kmlFeature.id;
              featureIdMap.set(kmlFeature.id, matchingGeoJson);
              console.log(`✅ Mapped ${kmlFeature.type} "${kmlFeature.name}" with ID: ${kmlFeature.id}`);
            }
          }
          
          if (kmlFeature.children) {
            mapFeatureIds(kmlFeature.children, geoJsonFeatures);
          }
        });
      };
      
      if (kmlStructure) {
        mapFeatureIds(kmlStructure.features, processedFeatures);
        console.log(`📊 Total features mapped: ${featureIdMap.size}`);
        
        // Debug: Log all features with their kmlId
        processedFeatures.forEach(f => {
          if (f.properties.kmlId) {
            console.log(`🔍 Feature "${f.properties.name}" (${f.geometry.type}) has kmlId: ${f.properties.kmlId}`);
          } else {
            console.log(`⚠️ Feature "${f.properties.name}" (${f.geometry.type}) has NO kmlId`);
          }
        });
      }

      const processedGeoJSON = {
        type: 'FeatureCollection' as const,
        features: processedFeatures
      };

      // NOW initialize the map with processed data
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: streetsStyle, // Use MapTiler streets with 3D buildings
        center: [106.8456, -6.2088],
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

      // Add timeout fallback to ensure loading state is cleared
      loadingTimeout = setTimeout(() => {
        console.warn('⚠️ Map loading timeout - forcing loading state to false');
        setLoading(false);
      }, 10000); // 10 second timeout

      map.current.on('load', () => {
        if (loadingTimeout) clearTimeout(loadingTimeout); // Clear timeout if map loads successfully
        if (!map.current || !geoJSON) return;

        try {
          // Data is already processed above, just add source and layers
          map.current.addSource('kml-data', {
            type: 'geojson',
            data: processedGeoJSON as any
          });

          // Helper function to calculate distance between two points in meters
          const calculateSegmentDistance = (coord1: number[], coord2: number[]): number => {
            const [lon1, lat1] = coord1;
            const [lon2, lat2] = coord2;

            const R = 6371e3; // Earth's radius in meters
            const φ1 = (lat1 * Math.PI) / 180;
            const φ2 = (lat2 * Math.PI) / 180;
            const Δφ = ((lat2 - lat1) * Math.PI) / 180;
            const Δλ = ((lon2 - lon1) * Math.PI) / 180;

            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            return R * c;
          };

          // Helper function to format distance
          const formatDistance = (meters: number): string => {
            if (meters < 1000) {
              return `${Math.round(meters)} m`;
            }
            return `${(meters / 1000).toFixed(2)} km`;
          };

          // Helper function to check if two coordinates are close (within threshold)
          // const areCoordinatesClose = (coord1: number[], coord2: number[], threshold = 0.00001): boolean => {
          //   const [lon1, lat1] = coord1;
          //   const [lon2, lat2] = coord2;
          //   return Math.abs(lon1 - lon2) < threshold && Math.abs(lat1 - lat2) < threshold;
          // };

          // Helper function to sort designators by their position along a span
          const sortDesignatorsBySpanPosition = (
            designators: any[], 
            spanCoords: number[][]
          ): any[] => {
            return designators.map(designator => {
              const coord = designator.geometry.coordinates as number[];
              
              // Find closest point on span and calculate distance from span start
              let minDist = Infinity;
              let closestSegmentIndex = 0;
              let distanceAlongSpan = 0;
              
              // Find which segment of the span is closest to this designator
              for (let i = 0; i < spanCoords.length - 1; i++) {
                const segmentStart = spanCoords[i];
                const segmentEnd = spanCoords[i + 1];
                
                // Calculate perpendicular distance from point to line segment
                const A = coord[0] - segmentStart[0];
                const B = coord[1] - segmentStart[1];
                const C = segmentEnd[0] - segmentStart[0];
                const D = segmentEnd[1] - segmentStart[1];
                
                const dot = A * C + B * D;
                const lenSq = C * C + D * D;
                let param = -1;
                
                if (lenSq !== 0) param = dot / lenSq;
                
                let xx, yy;
                
                if (param < 0) {
                  xx = segmentStart[0];
                  yy = segmentStart[1];
                } else if (param > 1) {
                  xx = segmentEnd[0];
                  yy = segmentEnd[1];
                } else {
                  xx = segmentStart[0] + param * C;
                  yy = segmentStart[1] + param * D;
                }
                
                const dx = coord[0] - xx;
                const dy = coord[1] - yy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < minDist) {
                  minDist = dist;
                  closestSegmentIndex = i;
                  
                  // Calculate distance from span start to this point
                  distanceAlongSpan = 0;
                  for (let j = 0; j < i; j++) {
                    distanceAlongSpan += calculateSegmentDistance(spanCoords[j], spanCoords[j + 1]);
                  }
                  // Add partial distance within the closest segment
                  if (param >= 0 && param <= 1) {
                    distanceAlongSpan += param * calculateSegmentDistance(segmentStart, segmentEnd);
                  }
                }
              }
              
              return {
                ...designator,
                distanceAlongSpan,
                closestSegmentIndex
              };
            }).sort((a, b) => a.distanceAlongSpan - b.distanceAlongSpan);
          };
          
          // Create custom pin markers for Point features (designators only)
          const designatorMarkers: maplibregl.Marker[] = [];
          
          // First, collect all Point features
          let pointFeatures = processedFeatures.filter(f => f.geometry.type === 'Point');
          
          // Try to find the span for each designator group based on KML structure
          // Group designators by their parent folder (span)
          if (kmlStructure) {
            console.log('📍 Grouping and sorting designators by their parent span folder...');
            
            const groupDesignatorsBySpan = (features: KMLFeature[]): Map<string, { span: any; designators: any[] }> => {
              const spanGroups = new Map<string, { span: any; designators: any[] }>();
              
              const processFolder = (folder: KMLFeature) => {
                if (folder.type === 'Folder' && folder.children) {
                  // Find span in this folder
                  const spanInFolder = folder.children.find(child => child.type === 'LineString');
                  
                  // Find designators in this folder (direct or in Designator subfolder)
                  let designatorsInFolder: any[] = folder.children.filter(child => child.type === 'Point');
                  
                  // Also check in nested Designator folder
                  const designatorFolder = folder.children.find(
                    child => child.type === 'Folder' && 
                    child.name.toLowerCase().includes('designator')
                  );
                  if (designatorFolder && designatorFolder.children) {
                    const nestedDesignators = designatorFolder.children.filter(child => child.type === 'Point');
                    designatorsInFolder = [...designatorsInFolder, ...nestedDesignators];
                  }
                  
                  // If this folder has both span and designators, group them
                  if (spanInFolder && designatorsInFolder.length > 0) {
                    spanGroups.set(folder.name, {
                      span: spanInFolder,
                      designators: designatorsInFolder
                    });
                    console.log(`✅ Found span group "${folder.name}" with ${designatorsInFolder.length} designators`);
                  }
                  
                  // Recursively process child folders
                  folder.children.forEach(child => {
                    if (child.type === 'Folder') {
                      processFolder(child);
                    }
                  });
                }
              };
              
              features.forEach(feature => {
                if (feature.type === 'Folder') {
                  processFolder(feature);
                }
              });
              
              return spanGroups;
            };
            
            const spanGroups = groupDesignatorsBySpan(kmlStructure.features);
            
            // Sort designators within each span group
            const sortedPointFeatures: any[] = [];
            spanGroups.forEach((group, spanName) => {
              const spanCoords = group.span.coordinates as number[][];
              const sortedDesignators = sortDesignatorsBySpanPosition(
                group.designators.map(d => {
                  // Find matching feature in processedFeatures
                  return processedFeatures.find(f => 
                    f.geometry.type === 'Point' && 
                    f.properties.name === d.name
                  );
                }).filter(Boolean),
                spanCoords
              );
              console.log(`✅ Sorted ${sortedDesignators.length} designators in span "${spanName}"`);
              sortedPointFeatures.push(...sortedDesignators);
            });
            
            // Add any remaining designators that weren't grouped (fallback)
            const groupedNames = new Set(sortedPointFeatures.map(f => f.properties.name));
            const ungroupedDesignators = pointFeatures.filter(f => !groupedNames.has(f.properties.name));
            if (ungroupedDesignators.length > 0) {
              console.warn(`⚠️ Found ${ungroupedDesignators.length} ungrouped designators, adding to end`);
              sortedPointFeatures.push(...ungroupedDesignators);
            }
            
            pointFeatures = sortedPointFeatures;
            console.log('✅ All designators sorted by their parent span:', pointFeatures.map(f => f.properties.name));
          } else {
            // Fallback: Try to find a single main span to sort all designators
            console.warn('⚠️ No KML structure available, using fallback sorting');
            const mainSpan = processedFeatures.find(f => f.geometry.type === 'LineString');
            if (mainSpan) {
              const spanCoords = mainSpan.geometry.coordinates as number[][];
              console.log('📍 Sorting designators by position along main span...');
              pointFeatures = sortDesignatorsBySpanPosition(pointFeatures, spanCoords);
              console.log('✅ Designators sorted by span position:', pointFeatures.map(f => f.properties.name));
            } else {
              console.warn('⚠️ No span found, using original KML order');
            }
          }
          
          // Track which batch_ids have already been processed to avoid duplicate markers
          const processedBatchIds = new Set<string>();
          
          // Pre-process to find all designators and group by batch_id from survey data
          const batchGroups = new Map<string, { names: string[]; coord: number[]; feature: any }>();
          
          // Helper function to find matching survey by coordinates (more accurate than name only)
          const findMatchingSurvey = (name: string, coord: number[]) => {
            // First try to match by name AND coordinates (within 10 meters tolerance)
            const coordMatch = surveyData.find(survey => {
              if (survey.item_name?.toLowerCase() !== name.toLowerCase()) return false;
              if (!survey.latitude || !survey.longitude) return false;
              
              // Calculate distance between coordinates
              const R = 6371e3; // Earth's radius in meters
              const φ1 = (coord[1] * Math.PI) / 180;
              const φ2 = (survey.latitude * Math.PI) / 180;
              const Δφ = ((survey.latitude - coord[1]) * Math.PI) / 180;
              const Δλ = ((survey.longitude - coord[0]) * Math.PI) / 180;

              const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                       Math.cos(φ1) * Math.cos(φ2) *
                       Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              const distance = R * c;
              
              return distance < 10; // Within 10 meters
            });
            
            return coordMatch;
          };
          
          pointFeatures.forEach((feature) => {
            const name = feature.properties.name || 'Unknown';
            const coord = feature.geometry.coordinates as number[];
            
            // Find matching survey data by coordinates
            const matchingSurvey = findMatchingSurvey(name, coord) as any;
            
            if (matchingSurvey && matchingSurvey.is_multiple && matchingSurvey.batch_id) {
              const batchId = matchingSurvey.batch_id;
              
              if (!batchGroups.has(batchId)) {
                batchGroups.set(batchId, {
                  names: [name],
                  coord: coord,
                  feature: feature
                });
              } else {
                // Add to existing batch group
                batchGroups.get(batchId)!.names.push(name);
              }
            }
          });
          
          console.log(`📦 Found ${batchGroups.size} batch groups:`, Array.from(batchGroups.entries()).map(([id, group]) => `${id}: ${group.names.join(', ')}`));
          
          pointFeatures.forEach((feature, currentIndex) => {
            const coord = feature.geometry.coordinates as number[];
            const name = feature.properties.name || 'Unknown';
            const kmlId = feature.properties.kmlId; // Get unique KML ID
            
            // Check if this designator belongs to a batch that was already processed
            // Use coordinate-based matching to handle duplicate names
            const matchingSurvey = findMatchingSurvey(name, coord) as any;
            
            if (matchingSurvey && matchingSurvey.is_multiple && matchingSurvey.batch_id) {
              const batchId = matchingSurvey.batch_id;
              
              if (processedBatchIds.has(batchId)) {
                console.log(`⏭️ Skipping "${name}" at [${coord[1].toFixed(6)}, ${coord[0].toFixed(6)}] - already processed as part of batch ${batchId}`);
                return; // Skip this marker, already created for this batch
              }
              
              // Mark this batch as processed
              processedBatchIds.add(batchId);
              console.log(`✅ Processing batch ${batchId} with designators: ${batchGroups.get(batchId)?.names.join(', ')}`);
            }
            
            // Validate coordinates
            const lon = coord[0];
            const lat = coord[1];
            
            // Check if coordinates are valid
            if (!isFinite(lon) || !isFinite(lat) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
              console.warn(`⚠️ Invalid coordinates for "${name}": [${lon}, ${lat}] - Skipping marker`);
              return; // Skip this marker
            }
            
            // Determine displayLabel based on batch
            let displayLabel = name;
            let isMultiple = false;
            
            if (matchingSurvey && matchingSurvey.is_multiple && matchingSurvey.batch_id) {
              const batchGroup = batchGroups.get(matchingSurvey.batch_id);
              if (batchGroup && batchGroup.names.length > 1) {
                displayLabel = batchGroup.names.join(', ');
                isMultiple = true;
                console.log(`✅ Multiple designators for marker: ${displayLabel}`);
              }
            }
            
            // Get color based on designator name and category
            const color = getColorByDesignator(name, designatorsV2);

            // Create custom pin marker element
            const markerEl = document.createElement('div');
            markerEl.className = 'custom-marker';
            markerEl.setAttribute('data-name', name); // Keep for backward compatibility
            markerEl.setAttribute('data-kml-id', kmlId || ''); // Add unique KML ID
            markerEl.style.cursor = 'pointer';

            // Check if this is HH2 designator (special square marker with diagonal line)
            const isHH2 = name.toUpperCase().includes('HH2') || name.toUpperCase() === 'HH 2';
            
            // Check if this is PUAS designator (special pushpin/thumbtack marker)
            const isPUAS = name.toUpperCase().includes('PUAS');

            // Create marker HTML based on type
            if (isHH2) {
              // Special square marker for HH2
              markerEl.innerHTML = `
                <div style="
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  position: relative;
                ">
                  <!-- Label above marker -->
                  <div style="
                    background: ${isMultiple ? '#FEF3C7' : 'white'};
                    color: #374151;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 600;
                    white-space: nowrap;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    margin-bottom: 4px;
                    border: 2px solid ${color};
                  ">
                    ${displayLabel}
                  </div>
                  <!-- Square marker with white circle (like standard designator) -->
                  <svg width="32" height="32" viewBox="0 0 32 32" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); display: block;">
                    <!-- Outer square with border -->
                    <rect x="4" y="4" width="24" height="24" 
                          fill="${color}" 
                          stroke="white" 
                          stroke-width="2"
                          rx="2"/>
                    <!-- White circle in center (like pin marker) -->
                    <circle cx="16" cy="16" r="5" fill="white" opacity="0.9"/>
                  </svg>
                </div>
              `;
            } else if (isPUAS) {
              // Special pushpin/thumbtack marker for PUAS
              markerEl.innerHTML = `
                <div style="
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  position: relative;
                ">
                  <!-- Label above marker -->
                  <div style="
                    background: ${isMultiple ? '#FEF3C7' : 'white'};
                    color: #374151;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 600;
                    white-space: nowrap;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    margin-bottom: 4px;
                    border: 2px solid ${color};
                  ">
                    ${displayLabel}
                  </div>
                  <!-- Pushpin/Thumbtack marker -->
                  <svg width="36" height="44" viewBox="0 0 36 44" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); display: block;">
                    <!-- Pin needle (bottom part) - drawn first so it appears behind -->
                    <line x1="18" y1="26" x2="18" y2="42" 
                          stroke="white" 
                          stroke-width="2"
                          stroke-linecap="round"/>
                    <!-- Pin neck (connecting part) -->
                    <rect x="16" y="24" width="4" height="4" 
                          fill="${color}" 
                          stroke="white" 
                          stroke-width="1"/>
                    <!-- Pin head (top circular part) - drawn last so it covers the needle -->
                    <circle cx="18" cy="13" r="12" 
                            fill="${color}" 
                            stroke="white" 
                            stroke-width="2"/>
                  </svg>
                </div>
              `;
            } else {
              // Standard pin marker for other designators
              markerEl.innerHTML = `
                <div style="
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  position: relative;
                ">
                  <!-- Label above pin -->
                  <div style="
                    background: ${isMultiple ? '#FEF3C7' : 'white'};
                    color: #374151;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 600;
                    white-space: nowrap;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    margin-bottom: 4px;
                    border: 2px solid ${color};
                  ">
                    ${displayLabel}
                  </div>
                  <!-- Pin marker -->
                  <svg width="32" height="40" viewBox="0 0 32 40" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); display: block;">
                    <path d="M16 0C9.373 0 4 5.373 4 12c0 8 12 28 12 28s12-20 12-28c0-6.627-5.373-12-12-12z" 
                          fill="${color}" 
                          stroke="white" 
                          stroke-width="2"/>
                    <circle cx="16" cy="12" r="5" fill="white" opacity="0.9"/>
                  </svg>
                </div>
              `;
            }

            // Create marker with appropriate anchor based on type
            const marker = new maplibregl.Marker({
              element: markerEl,
              anchor: 'bottom' // Bottom anchor for both types so marker sits on the coordinate point
            })
              .setLngLat([coord[0], coord[1]])
              .addTo(map.current!);

            // Add click handler to marker
            markerEl.addEventListener('click', () => {
              // Find the span (LineString) that contains this designator
              // Look for span inside SPAN folder, not the main/plan span
              let spanStartCoord: number[] | null = null;
              let spanEndCoord: number[] | null = null;
              let spanName: string | undefined = undefined;
              
              // Try to find parent span from KML structure
              // Priority: Find span in the same folder as the designator (inside SPAN or Designator folder)
              if (kmlStructure) {
                const findDesignatorSpan = (features: KMLFeature[], targetDesignatorName: string, depth: number = 0): { span: any; spanName: string } | null => {
                  for (const kmlFeature of features) {
                    if (kmlFeature.type === 'Folder' && kmlFeature.children) {
                      // First, check if THIS folder directly contains the designator
                      // Look in direct children
                      let hasDesignator = kmlFeature.children.some(
                        child => child.type === 'Point' && child.name === targetDesignatorName
                      );
                      
                      // Also check in nested Designator folder
                      let designatorFolder: KMLFeature | undefined;
                      if (!hasDesignator) {
                        designatorFolder = kmlFeature.children.find(
                          child => child.type === 'Folder' && 
                          child.name.toLowerCase().includes('designator')
                        );
                        if (designatorFolder && designatorFolder.children) {
                          hasDesignator = designatorFolder.children.some(
                            child => child.type === 'Point' && child.name === targetDesignatorName
                          );
                        }
                      }
                      
                      // If this folder contains the designator, look for span in the same folder
                      if (hasDesignator) {
                        // First, try to find span in the parent folder (same level as Designator folder)
                        let spanInFolder = kmlFeature.children.find(child => child.type === 'LineString');
                        
                        // If not found at parent level, check inside Designator folder
                        if (!spanInFolder && designatorFolder && designatorFolder.children) {
                          spanInFolder = designatorFolder.children.find(child => child.type === 'LineString');
                        }
                        
                        if (spanInFolder) {
                          console.log(`✅ Found designator "${targetDesignatorName}" in folder "${kmlFeature.name}" at depth ${depth}`);
                          return { 
                            span: spanInFolder, 
                            spanName: kmlFeature.name // Use the folder name that contains both designator and span
                          };
                        } else {
                          console.warn(`⚠️ Found designator "${targetDesignatorName}" in folder "${kmlFeature.name}" but no span found in the same folder`);
                        }
                      }
                      
                      // Recursively search in children folders
                      const result = findDesignatorSpan(kmlFeature.children, targetDesignatorName, depth + 1);
                      if (result) return result;
                    }
                  }
                  return null;
                };
                
                const result = findDesignatorSpan(kmlStructure.features, name);
                if (result && result.span) {
                  const spanCoords = result.span.coordinates as number[][];
                  if (spanCoords && spanCoords.length >= 2) {
                    spanStartCoord = spanCoords[0];
                    spanEndCoord = spanCoords[spanCoords.length - 1];
                    spanName = result.spanName;
                    console.log(`✅ Found span for designator "${name}": ${spanName}`);
                  }
                }
              }
              
              // Fallback: Find LineString features (spans) by proximity
              // ONLY use this if KML structure search failed completely
              // Prioritize shorter spans (sub-spans) over longer main spans
              if (!spanStartCoord || !spanEndCoord) {
                console.warn(`⚠️ Fallback: Finding span by proximity for designator "${name}" - KML structure search failed`);
                const lineFeatures = processedFeatures.filter(f => f.geometry.type === 'LineString');
                
                // Calculate distance and length for each span
                const spansWithDistance = lineFeatures.map(lineFeature => {
                  const lineCoords = lineFeature.geometry.coordinates as number[][];
                  if (lineCoords.length >= 2) {
                    // Calculate minimum distance from designator to any point on the span
                    let minDistance = Infinity;
                    for (const lineCoord of lineCoords) {
                      const dist = calculateSegmentDistance(coord, lineCoord);
                      if (dist < minDistance) {
                        minDistance = dist;
                      }
                    }
                    
                    // Calculate span length
                    let spanLength = 0;
                    for (let i = 0; i < lineCoords.length - 1; i++) {
                      spanLength += calculateSegmentDistance(lineCoords[i], lineCoords[i + 1]);
                    }
                    
                    return { 
                      lineFeature, 
                      distance: minDistance, 
                      coords: lineCoords,
                      spanLength: spanLength
                    };
                  }
                  return { lineFeature, distance: Infinity, coords: [], spanLength: Infinity };
                }).filter(item => item.coords.length >= 2);
                
                // Sort by distance first, then by span length (prefer shorter spans)
                // This prioritizes sub-spans over main spans when distances are similar
                spansWithDistance.sort((a, b) => {
                  // If distance difference is small (< 50m), prefer shorter span
                  if (Math.abs(a.distance - b.distance) < 50) {
                    return a.spanLength - b.spanLength;
                  }
                  // Otherwise, use closest span
                  return a.distance - b.distance;
                });
                
                if (spansWithDistance.length > 0) {
                  const closest = spansWithDistance[0];
                  spanStartCoord = closest.coords[0];
                  spanEndCoord = closest.coords[closest.coords.length - 1];
                  spanName = closest.lineFeature.properties.name;
                  console.warn(`⚠️ Using fallback span for designator "${name}": ${spanName} (distance: ${formatDistance(closest.distance)}, length: ${formatDistance(closest.spanLength)})`);
                  console.warn(`⚠️ This may not be the correct span! Please check KML structure.`);
                }
              }
              
              // Calculate distances to adjacent designators based on span path (not straight line)
              const adjacentDesignators: { designatorName: string; distance: string; direction: string }[] = [];
              
              // Find the span LineString that contains this designator
              let spanLineCoords: number[][] | null = null;
              
              // Try to find span from KML structure first - MUST use same folder structure
              if (kmlStructure) {
                const findSpanCoords = (features: KMLFeature[]): number[][] | null => {
                  for (const kmlFeature of features) {
                    if (kmlFeature.type === 'Folder' && kmlFeature.children) {
                      // Check if this folder contains the designator (direct or in Designator subfolder)
                      let hasDesignator = kmlFeature.children.some(
                        child => child.type === 'Point' && child.name === name
                      );
                      
                      // Also check in nested Designator folder
                      let designatorFolder: KMLFeature | undefined;
                      if (!hasDesignator) {
                        designatorFolder = kmlFeature.children.find(
                          child => child.type === 'Folder' && 
                          child.name.toLowerCase().includes('designator')
                        );
                        if (designatorFolder && designatorFolder.children) {
                          hasDesignator = designatorFolder.children.some(
                            child => child.type === 'Point' && child.name === name
                          );
                        }
                      }
                      
                      if (hasDesignator) {
                        // Find span in the same folder (parent level)
                        let spanInFolder = kmlFeature.children.find(child => child.type === 'LineString');
                        
                        // If not found at parent level, check inside Designator folder
                        if (!spanInFolder && designatorFolder && designatorFolder.children) {
                          spanInFolder = designatorFolder.children.find(child => child.type === 'LineString');
                        }
                        
                        if (spanInFolder && spanInFolder.coordinates) {
                          console.log(`✅ Found span coordinates for designator "${name}" in folder "${kmlFeature.name}"`);
                          return spanInFolder.coordinates as number[][];
                        } else {
                          console.warn(`⚠️ Found designator "${name}" in folder "${kmlFeature.name}" but no span coordinates found`);
                        }
                      }
                      
                      // Recursively search in children
                      const result = findSpanCoords(kmlFeature.children);
                      if (result) return result;
                    }
                  }
                  return null;
                };
                
                spanLineCoords = findSpanCoords(kmlStructure.features);
              }
              
              // Fallback: Find closest LineString from GeoJSON
              // ONLY use this if KML structure search failed
              if (!spanLineCoords) {
                console.warn(`⚠️ Fallback: Finding span coordinates by proximity for designator "${name}" - KML structure search failed`);
                const lineFeatures = processedFeatures.filter(f => f.geometry.type === 'LineString');
                const spansWithDistance = lineFeatures.map(lineFeature => {
                  const lineCoords = lineFeature.geometry.coordinates as number[][];
                  let minDistance = Infinity;
                  for (const lineCoord of lineCoords) {
                    const dist = calculateSegmentDistance(coord, lineCoord);
                    if (dist < minDistance) {
                      minDistance = dist;
                    }
                  }
                  
                  // Calculate span length
                  let spanLength = 0;
                  for (let i = 0; i < lineCoords.length - 1; i++) {
                    spanLength += calculateSegmentDistance(lineCoords[i], lineCoords[i + 1]);
                  }
                  
                  return { lineCoords, distance: minDistance, spanLength };
                }).filter(item => item.lineCoords.length >= 2);
                
                // Sort by distance first, then by span length (prefer shorter spans)
                spansWithDistance.sort((a, b) => {
                  // If distance difference is small (< 50m), prefer shorter span
                  if (Math.abs(a.distance - b.distance) < 50) {
                    return a.spanLength - b.spanLength;
                  }
                  return a.distance - b.distance;
                });
                
                if (spansWithDistance.length > 0) {
                  spanLineCoords = spansWithDistance[0].lineCoords;
                  console.warn(`⚠️ Using fallback span coordinates (distance: ${formatDistance(spansWithDistance[0].distance)}, length: ${formatDistance(spansWithDistance[0].spanLength)})`);
                  console.warn(`⚠️ This may not be the correct span! Please check KML structure.`);
                }
              }
              
              // Calculate distances using redline data if available
              // Group multiple designators first
              const designatorGroups = groupMultipleDesignators(pointFeatures, redlineData, spanName);
              
              console.log(`📦 Designator groups for span "${spanName}":`, Array.from(designatorGroups.entries()).map(([key, group]) => ({
                key,
                designators: group.designators,
                batchId: group.batchId,
                redline: group.redline
              })));
              
              // Find current designator's group
              let currentGroup: { designators: string[]; coordinates: number[]; batchId: string | null; redline: number } | null = null;
              let currentGroupKey: string | null = null;
              
              for (const [key, group] of designatorGroups.entries()) {
                if (group.designators.includes(name)) {
                  currentGroup = group;
                  currentGroupKey = key;
                  console.log(`✅ Found current group for "${name}": key="${key}", designators=[${group.designators.join(', ')}], batchId=${group.batchId}`);
                  break;
                }
              }
              
              // Calculate distances based on redline data
              if (currentGroup && designatorGroups.size > 0) {
                console.log(`📏 Calculating distances using redline data for "${name}"`);
                console.log(`  Current group:`, currentGroup.designators, `at redline ${currentGroup.redline}m`);
                
                // Convert groups to array and sort by redline
                const sortedGroups = Array.from(designatorGroups.entries())
                  .sort((a, b) => a[1].redline - b[1].redline);
                
                console.log(`📊 Sorted groups (${sortedGroups.length} total):`, sortedGroups.map(([, group], idx) => 
                  `${idx}: ${group.designators.join(', ')} (redline: ${group.redline}m, batchId: ${group.batchId})`
                ));
                
                const currentGroupIndex = sortedGroups.findIndex(([key]) => key === currentGroupKey);
                console.log(`📍 Current group index: ${currentGroupIndex} (key: ${currentGroupKey})`);
                
                if (currentGroupIndex >= 0 && currentGroupIndex < sortedGroups.length - 1) {
                  const [, nextGroup] = sortedGroups[currentGroupIndex + 1];
                  console.log(`➡️ Next group: designators=[${nextGroup.designators.join(', ')}], batchId=${nextGroup.batchId}, redline=${nextGroup.redline}m`);
                }
                
                // PERBAIKAN: Jarak dari titik sebelumnya ke titik ini (bukan dari span start)
                // Untuk designator pertama: jarak dari span start ke designator pertama
                if (currentGroupIndex === 0) {
                  // Jarak dari span start ke designator pertama adalah nilai redline designator pertama
                  const distanceFromStart = currentGroup.redline;
                  adjacentDesignators.push({
                    designatorName: spanName ? `${spanName} (Start)` : 'Span Start',
                    distance: formatDistance(distanceFromStart),
                    direction: 'previous'
                  });
                  console.log(`  ✅ Distance from Span Start to first designator: ${formatDistance(distanceFromStart)}`);
                } else {
                  // Untuk designator lainnya: jarak dari designator sebelumnya ke designator ini
                  const [, prevGroup] = sortedGroups[currentGroupIndex - 1];
                  const distance = calculateDistanceBetweenGroups(prevGroup.redline, currentGroup.redline);
                  const prevGroupLabel = prevGroup.designators.length > 1
                    ? prevGroup.designators.join(', ')
                    : prevGroup.designators[0];
                  
                  adjacentDesignators.push({
                    designatorName: prevGroupLabel,
                    distance: formatDistance(distance),
                    direction: 'previous'
                  });
                  console.log(`  ✅ Distance from ${prevGroupLabel} to current: ${formatDistance(distance)}`);
                }
                
                // PERBAIKAN: Jarak dari titik ini ke titik berikutnya
                if (currentGroupIndex < sortedGroups.length - 1) {
                  const [, nextGroup] = sortedGroups[currentGroupIndex + 1];
                  const distance = calculateDistanceBetweenGroups(currentGroup.redline, nextGroup.redline);
                  const nextGroupLabel = nextGroup.designators.length > 1
                    ? nextGroup.designators.join(', ')
                    : nextGroup.designators[0];
                  
                  adjacentDesignators.push({
                    designatorName: nextGroupLabel,
                    distance: formatDistance(distance),
                    direction: 'next'
                  });
                  console.log(`  ✅ Distance from current to ${nextGroupLabel}: ${formatDistance(distance)}`);
                } else {
                  // Untuk designator terakhir: jarak dari designator terakhir ke span end adalah 0
                  // karena perhitungan sudah stop di titik terakhir
                  adjacentDesignators.push({
                    designatorName: spanName ? `${spanName} (End)` : 'Span End',
                    distance: '0 m',
                    direction: 'next'
                  });
                  console.log(`  ✅ Distance from last designator to Span End: 0 m (stop at last point)`);
                }
              } else {
                // Fallback: Calculate distances along the span path (old method)
                console.warn(`⚠️ No redline data available for "${name}", using fallback calculation`);
                
                // Helper function to find previous/next designator that's not in the same batch
                const findPrevDifferentBatch = (startIndex: number): { feature: any; index: number } | null => {
                  const currentSurvey = findMatchingSurvey(name, coord) as any;
                  const currentBatchId = currentSurvey?.batch_id;
                  
                  for (let i = startIndex - 1; i >= 0; i--) {
                    const feature = pointFeatures[i];
                    const featureName = feature.properties.name || 'Unknown';
                    const featureCoord = feature.geometry.coordinates as number[];
                    const featureSurvey = findMatchingSurvey(featureName, featureCoord) as any;
                    
                    // If no batch_id or different batch_id, this is a different designator
                    if (!currentBatchId || !featureSurvey?.batch_id || featureSurvey.batch_id !== currentBatchId) {
                      return { feature, index: i };
                    }
                  }
                  return null;
                };
                
                const findNextDifferentBatch = (startIndex: number): { feature: any; index: number } | null => {
                  const currentSurvey = findMatchingSurvey(name, coord) as any;
                  const currentBatchId = currentSurvey?.batch_id;
                  
                  for (let i = startIndex + 1; i < pointFeatures.length; i++) {
                    const feature = pointFeatures[i];
                    const featureName = feature.properties.name || 'Unknown';
                    const featureCoord = feature.geometry.coordinates as number[];
                    const featureSurvey = findMatchingSurvey(featureName, featureCoord) as any;
                    
                    // If no batch_id or different batch_id, this is a different designator
                    if (!currentBatchId || !featureSurvey?.batch_id || featureSurvey.batch_id !== currentBatchId) {
                      return { feature, index: i };
                    }
                  }
                  return null;
                };
                
                if (spanLineCoords) {
                  console.log(`📏 Calculating distances along span path for "${name}"`);
                  
                  // For first designator: distance from span start to designator
                  if (currentIndex === 0 && spanStartCoord) {
                    const distanceFromStart = calculateDistanceAlongPath(spanLineCoords, spanStartCoord, coord);
                    adjacentDesignators.push({
                      designatorName: 'Span Start',
                      distance: formatDistance(distanceFromStart),
                      direction: 'start'
                    });
                    console.log(`  ✅ Distance from Span Start: ${formatDistance(distanceFromStart)}`);
                  }
                  
                  // Previous designator (skip same batch)
                  const prevResult = findPrevDifferentBatch(currentIndex);
                  if (prevResult) {
                    const prevFeature = prevResult.feature;
                    const prevCoord = prevFeature.geometry.coordinates as number[];
                    const prevName = prevFeature.properties.name || 'Unknown';
                    
                    // Try to get length from previous survey data first
                    const prevSurvey = findMatchingSurvey(prevName, prevCoord) as any;
                    let distance: number;
                    let distanceSource = 'calculated';
                    
                    if (prevSurvey && prevSurvey.length !== null && prevSurvey.length !== undefined) {
                      // Use length from previous survey data
                      distance = prevSurvey.length;
                      distanceSource = 'survey data';
                      console.log(`  📊 Using length from previous survey data: ${distance}m`);
                    } else {
                      // Fallback to calculated distance
                      distance = calculateDistanceAlongPath(spanLineCoords, prevCoord, coord);
                      console.log(`  📏 Calculated distance along path: ${distance}m`);
                    }
                    
                    adjacentDesignators.push({
                      designatorName: prevName,
                      distance: formatDistance(distance),
                      direction: 'previous'
                    });
                    console.log(`  ✅ Distance from ${prevName} (${distanceSource}, skipped ${currentIndex - prevResult.index - 1} same-batch designators): ${formatDistance(distance)}`);
                  }
                  
                  // Next designator (skip same batch)
                  const nextResult = findNextDifferentBatch(currentIndex);
                  if (nextResult) {
                    const nextFeature = nextResult.feature;
                    const nextCoord = nextFeature.geometry.coordinates as number[];
                    const nextName = nextFeature.properties.name || 'Unknown';
                    
                    // Try to get length from survey data first (more accurate than calculated distance)
                    const currentSurvey = findMatchingSurvey(name, coord) as any;
                    let distance: number;
                    let distanceSource = 'calculated';
                    
                    if (currentSurvey && currentSurvey.length !== null && currentSurvey.length !== undefined) {
                      // Use length from survey data (this is the redline length)
                      distance = currentSurvey.length;
                      distanceSource = 'survey data';
                      console.log(`  📊 Using length from survey data: ${distance}m`);
                    } else {
                      // Fallback to calculated distance
                      distance = calculateDistanceAlongPath(spanLineCoords, coord, nextCoord);
                      console.log(`  📏 Calculated distance along path: ${distance}m`);
                    }
                    
                    adjacentDesignators.push({
                      designatorName: nextName,
                      distance: formatDistance(distance),
                      direction: 'next'
                    });
                    console.log(`  ✅ Distance to ${nextName} (${distanceSource}, skipped ${nextResult.index - currentIndex - 1} same-batch designators): ${formatDistance(distance)}`);
                  }
                
                // For last designator: distance from designator to span end
                if (currentIndex === pointFeatures.length - 1 && spanEndCoord) {
                  const distanceToEnd = calculateDistanceAlongPath(spanLineCoords, coord, spanEndCoord);
                  adjacentDesignators.push({
                    designatorName: 'Span End',
                    distance: formatDistance(distanceToEnd),
                    direction: 'end'
                  });
                  console.log(`  ✅ Distance to Span End: ${formatDistance(distanceToEnd)}`);
                }
              } else {
                // Fallback to straight-line distance if span path not found
                console.warn('⚠️ Span path not found, using straight-line distance');
                
                // For first designator: distance from span start to designator
                if (currentIndex === 0 && spanStartCoord) {
                  const distanceFromStart = calculateSegmentDistance(spanStartCoord, coord);
                  adjacentDesignators.push({
                    designatorName: 'Span Start',
                    distance: formatDistance(distanceFromStart),
                    direction: 'start'
                  });
                }
                
                // Previous designator (if exists)
                if (currentIndex > 0) {
                  const prevFeature = pointFeatures[currentIndex - 1];
                  const prevCoord = prevFeature.geometry.coordinates as number[];
                  const prevName = prevFeature.properties.name || 'Unknown';
                  const distance = calculateSegmentDistance(coord, prevCoord);
                  
                  adjacentDesignators.push({
                    designatorName: prevName,
                    distance: formatDistance(distance),
                    direction: 'previous'
                  });
                }
                
                // Next designator (if exists)
                if (currentIndex < pointFeatures.length - 1) {
                  const nextFeature = pointFeatures[currentIndex + 1];
                  const nextCoord = nextFeature.geometry.coordinates as number[];
                  const nextName = nextFeature.properties.name || 'Unknown';
                  const distance = calculateSegmentDistance(coord, nextCoord);
                  
                  adjacentDesignators.push({
                    designatorName: nextName,
                    distance: formatDistance(distance),
                    direction: 'next'
                  });
                }
                
                // For last designator: distance from designator to span end
                if (currentIndex === pointFeatures.length - 1 && spanEndCoord) {
                  const distanceToEnd = calculateSegmentDistance(coord, spanEndCoord);
                  adjacentDesignators.push({
                    designatorName: 'Span End',
                    distance: formatDistance(distanceToEnd),
                    direction: 'end'
                  });
                }
              } // End of fallback straight-line calculation
            } // End of redline data check

              // Get line info based on color and designator name
              const lineInfo = getLineInfoFromColor(color, designatorsV2, name);

              // For multiple designators, get all survey data in the batch
              const batchSurveys: any[] = [];
              const allEvidencePhotos: any[] = [];
              
              if (matchingSurvey && (matchingSurvey as any).is_multiple && (matchingSurvey as any).batch_id) {
                // Get all surveys with the same batch_id
                const batchId = (matchingSurvey as any).batch_id;
                surveyData.forEach(survey => {
                  if ((survey as any).batch_id === batchId) {
                    batchSurveys.push(survey);
                    
                    // Collect all evidence photos from all surveys in batch
                    if (survey.evidences) {
                      survey.evidences.forEach(evidence => {
                        allEvidencePhotos.push({
                          url: `${API_CONFIG.BASE_URL.replace('/api', '')}/api/files/${evidence.file_path.replace('uploads/', '')}`,
                          fileName: evidence.file_name,
                          fileType: evidence.file_type
                        });
                      });
                    }
                  }
                });
                console.log(`📦 Found ${batchSurveys.length} surveys in batch ${batchId}`);
              } else {
                // Single designator - use its own survey data
                const matchingSurvey = findMatchingSurvey(name, coord);
                if (matchingSurvey) {
                  batchSurveys.push(matchingSurvey);
                  
                  // Prepare evidence photos from survey data
                  if (matchingSurvey.evidences) {
                    matchingSurvey.evidences.forEach(evidence => {
                      allEvidencePhotos.push({
                        url: `${API_CONFIG.BASE_URL.replace('/api', '')}/api/files/${evidence.file_path.replace('uploads/', '')}`,
                        fileName: evidence.file_name,
                        fileType: evidence.file_type
                      });
                    });
                  }
                }
              }

              // Format survey date (use first survey's date)
              const surveyDate = batchSurveys.length > 0 && batchSurveys[0].date
                ? new Date(batchSurveys[0].date).toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : null;

              // Get length from survey data (use first survey's length)
              const surveyLength = batchSurveys.length > 0 && batchSurveys[0].length
                ? `${batchSurveys[0].length} m`
                : null;

              // Set selected line data with adjacent designators and survey data
              // Use displayLabel which already contains all names for multiple designators
              setSelectedLine({
                name: displayLabel, // Use displayLabel instead of just name
                isDesignator: true,
                isMultiple: isMultiple, // Add flag to indicate if this is multiple
                nearbyDesignators: adjacentDesignators,
                currentIndex: currentIndex + 1, // 1-based index for display
                totalDesignators: pointFeatures.length,
                jenisGaris: lineInfo.jenisGaris,
                category: lineInfo.category,
                color: lineInfo.color,
                description: feature.properties.description || '',
                coordinates: `${coord[1].toFixed(6)}, ${coord[0].toFixed(6)}`,
                length: surveyLength,
                spanName: spanName,
                evidencePhotos: allEvidencePhotos, // Use all evidence photos from batch
                surveyDate: surveyDate,
                evidenceCount: allEvidencePhotos.length // Use total count from batch
              });
            });

            designatorMarkers.push(marker);
          });

          console.log(`✅ Added ${designatorMarkers.length} designator markers`);

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

          // Lines - using data-driven styling like KMLMapViewer
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

          map.current.addLayer({
            id: 'kml-polygons-fill',
            type: 'fill',
            source: 'kml-data',
            filter: ['==', '$type', 'Polygon'],
            paint: {
              'fill-color': '#4ECDC4',
              'fill-opacity': 0.3
            }
          });

          map.current.addLayer({
            id: 'kml-polygons-outline',
            type: 'line',
            source: 'kml-data',
            filter: ['==', '$type', 'Polygon'],
            paint: {
              'line-color': '#4ECDC4',
              'line-width': 2
            }
          });

          if (geoJSON.features.length > 0) {
            const bounds = new maplibregl.LngLatBounds();
            let validCoordCount = 0;
            
            geoJSON.features.forEach(feature => {
              if (feature.geometry.type === 'Point') {
                const coord = feature.geometry.coordinates as [number, number];
                // Validate coordinate before extending bounds
                if (isFinite(coord[0]) && isFinite(coord[1]) && 
                    coord[1] >= -90 && coord[1] <= 90 && 
                    coord[0] >= -180 && coord[0] <= 180) {
                  bounds.extend(coord);
                  validCoordCount++;
                } else {
                  console.warn(`⚠️ Invalid Point coordinate: [${coord[0]}, ${coord[1]}]`);
                }
              } else if (feature.geometry.type === 'LineString') {
                (feature.geometry.coordinates as number[][]).forEach(coord => {
                  // Validate coordinate before extending bounds
                  if (isFinite(coord[0]) && isFinite(coord[1]) && 
                      coord[1] >= -90 && coord[1] <= 90 && 
                      coord[0] >= -180 && coord[0] <= 180) {
                    bounds.extend(coord as [number, number]);
                    validCoordCount++;
                  } else {
                    console.warn(`⚠️ Invalid LineString coordinate: [${coord[0]}, ${coord[1]}]`);
                  }
                });
              } else if (feature.geometry.type === 'Polygon') {
                (feature.geometry.coordinates[0] as number[][]).forEach(coord => {
                  // Validate coordinate before extending bounds
                  if (isFinite(coord[0]) && isFinite(coord[1]) && 
                      coord[1] >= -90 && coord[1] <= 90 && 
                      coord[0] >= -180 && coord[0] <= 180) {
                    bounds.extend(coord as [number, number]);
                    validCoordCount++;
                  } else {
                    console.warn(`⚠️ Invalid Polygon coordinate: [${coord[0]}, ${coord[1]}]`);
                  }
                });
              }
            });
            
            // Only fit bounds if we have valid coordinates
            if (validCoordCount > 0) {
              map.current.fitBounds(bounds, { padding: 50 });
              console.log(`✅ Map bounds set with ${validCoordCount} valid coordinates`);
            } else {
              console.warn('⚠️ No valid coordinates found, using default center');
              map.current.setCenter([106.8456, -6.2088]);
              map.current.setZoom(12);
            }
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

          // Helper function to calculate distance along a LineString path between two points
          const calculateDistanceAlongPath = (
            lineCoords: number[][], 
            startPoint: number[], 
            endPoint: number[],
            threshold: number = 0.0001 // ~11 meters tolerance
          ): number => {
            // Find closest points on the line to start and end points
            let startIndex = -1;
            let endIndex = -1;
            let minStartDist = Infinity;
            let minEndDist = Infinity;

            lineCoords.forEach((coord, index) => {
              const distToStart = Math.sqrt(
                Math.pow(coord[0] - startPoint[0], 2) + 
                Math.pow(coord[1] - startPoint[1], 2)
              );
              const distToEnd = Math.sqrt(
                Math.pow(coord[0] - endPoint[0], 2) + 
                Math.pow(coord[1] - endPoint[1], 2)
              );

              if (distToStart < minStartDist) {
                minStartDist = distToStart;
                startIndex = index;
              }
              if (distToEnd < minEndDist) {
                minEndDist = distToEnd;
                endIndex = index;
              }
            });

            // If points are not on the line (too far), return straight-line distance as fallback
            if (minStartDist > threshold || minEndDist > threshold) {
              console.warn('⚠️ Points not on line path, using straight-line distance');
              return calculateSegmentDistance(startPoint, endPoint);
            }

            // Ensure startIndex < endIndex
            if (startIndex > endIndex) {
              [startIndex, endIndex] = [endIndex, startIndex];
            }

            // Calculate distance along the path
            let pathDistance = 0;
            for (let i = startIndex; i < endIndex; i++) {
              pathDistance += calculateSegmentDistance(lineCoords[i], lineCoords[i + 1]);
            }

            return pathDistance;
          };

          // Click handler for polylines (use buffer layer for easier clicking)
          map.current.on('click', 'kml-lines-buffer', (e) => {
            if (!e.features || !e.features[0]) return;
            const feature = e.features[0];
            const properties = feature.properties || {};
            const spanName = properties.name || 'Unnamed Span';

            // Find ALL segments with the same span name to calculate full length
            const allSegments = processedFeatures.filter(f => 
              f.geometry.type === 'LineString' && 
              f.properties.name === spanName
            );

            // Calculate total length from all segments
            let totalLengthMeters = 0;
            allSegments.forEach(segment => {
              const coords = segment.geometry.coordinates as number[][];
              totalLengthMeters += calculateLineLength(coords);
            });

            const lengthDisplay = formatDistance(totalLengthMeters);

            // Set selected line data - ONLY show span name and length
            setSelectedLine({
              name: spanName,
              totalLength: lengthDisplay,
              isSpan: true, // Flag to indicate this is a span/polyline click
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

          setLoading(false);
          setMapReady(true); // Mark map as ready for GeoJSON layers
        } catch (err) {
          console.error('❌ Error adding layers:', err);
          console.error('Error details:', {
            message: err instanceof Error ? err.message : 'Unknown error',
            stack: err instanceof Error ? err.stack : undefined,
            geoJSON: geoJSON ? `${geoJSON.features.length} features` : 'null'
          });
          setError(`Failed to render map layers: ${err instanceof Error ? err.message : 'Unknown error'}`);
          setLoading(false);
        }
      });

      map.current.addControl(
        new maplibregl.NavigationControl({
          showZoom: true,
          showCompass: true,
          visualizePitch: true,
        }),
        'top-right'
      );

      // Add custom controls container for structure button and legend (side by side)
      const controlsContainer = document.createElement('div');
      controlsContainer.className = 'maplibregl-ctrl';
      controlsContainer.style.cssText = `
        display: flex;
        gap: 10px;
        align-items: flex-start;
      `;

      // Structure toggle button (icon) - will be on the left
      const structureContainer = document.createElement('div');
      structureContainer.id = 'structure-control-container';
      
      const structureToggleBtn = document.createElement('button');
      structureToggleBtn.className = 'maplibregl-ctrl-group';
      structureToggleBtn.id = 'structure-toggle-btn';
      structureToggleBtn.style.cssText = `
        background: white;
        border: none;
        cursor: pointer;
        padding: 8px;
        border-radius: 8px;
        box-shadow: 0 0 0 2px rgba(0,0,0,.1);
        display: ${structurePanelVisible ? 'none' : 'flex'};
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
      `;
      structureToggleBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
          <path d="M2 17l10 5 10-5"></path>
          <path d="M2 12l10 5 10-5"></path>
        </svg>
      `;
      structureToggleBtn.title = 'Show KML Structure';
      
      structureToggleBtn.addEventListener('click', () => {
        setStructurePanelVisible(true);
      });
      
      structureContainer.appendChild(structureToggleBtn);

      // Legend container - will be on the right
      const legendContainer = document.createElement('div');

      // Legend content div
      const legendDiv = document.createElement('div');
      legendDiv.className = 'maplibregl-ctrl-group';
      legendDiv.style.cssText = `
        background: white;
        padding: 12px;
        border-radius: 8px;
        box-shadow: 0 0 0 2px rgba(0,0,0,.1);
        font-family: system-ui, -apple-system, sans-serif;
        max-width: 280px;
        max-height: 500px;
        overflow-y: auto;
        display: ${legendVisible ? 'block' : 'none'};
      `;

      legendDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <h4 style="margin: 0; font-size: 14px; font-weight: 600; color: #374151;">Kategori Designator</h4>
          <button id="legend-close-btn" style="background: none; border: none; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; color: #6B7280; hover: color: #374151;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12px;">
          ${Object.entries(CATEGORY_COLORS).map(([category, color]) => `
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 20px; height: 4px; background-color: ${color}; border-radius: 2px;"></div>
              <span style="color: #374151; line-height: 1.4;">${category}</span>
            </div>
          `).join('')}
        </div>
        ${geoJSONData ? `
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #E5E7EB;">
            <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #374151;">GeoJSON Survey</h4>
            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 20px; height: 4px; background-color: #9333EA; border-radius: 2px;"></div>
                <span style="color: #374151; line-height: 1.4;">Survey Record</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 20px; height: 4px; background-color: #1E40AF; border-radius: 2px;"></div>
                <span style="color: #374151; line-height: 1.4;">Survey KML Tracking</span>
              </div>
            </div>
          </div>
        ` : ''}
      `;

      // Legend toggle button (icon)
      const legendToggleBtn = document.createElement('button');
      legendToggleBtn.className = 'maplibregl-ctrl-group';
      legendToggleBtn.style.cssText = `
        background: white;
        border: none;
        cursor: pointer;
        padding: 8px;
        border-radius: 8px;
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

      // Add both to the horizontal container
      controlsContainer.appendChild(structureContainer);
      controlsContainer.appendChild(legendContainer);

      // Add the combined control to map
      const combinedControl = {
        onAdd: function () {
          return controlsContainer;
        },
        onRemove: function () {
          if (controlsContainer.parentNode) {
            controlsContainer.parentNode.removeChild(controlsContainer);
          }
        }
      };
      
      map.current.addControl(combinedControl as any, 'top-left');

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
      if (loadingTimeout) clearTimeout(loadingTimeout);
      map.current?.remove();
      map.current = null;
      setMapReady(false); // Reset map ready state on cleanup
    };
  }, [geoJSON, kmlStructure]);

  // Update feature visibility when hiddenFeatures changes
  useEffect(() => {
    if (!map.current || !geoJSON || !kmlStructure) return;

    // Update layer visibility based on hidden features
    const updateLayerVisibility = () => {
      if (!map.current) return;

      // Get all feature KML IDs that should be hidden
      const hiddenKmlIds = new Set<string>();
      
      const collectHiddenIds = (features: KMLFeature[]) => {
        features.forEach(feature => {
          if (hiddenFeatures.has(feature.id)) {
            hiddenKmlIds.add(feature.id);
            console.log(`🚫 Hiding feature: ${feature.name} (${feature.type}) - ID: ${feature.id}`);
            // If folder is hidden, hide all children too
            if (feature.children) {
              const addChildrenIds = (children: KMLFeature[]) => {
                children.forEach(child => {
                  hiddenKmlIds.add(child.id);
                  console.log(`🚫 Hiding child: ${child.name} (${child.type}) - ID: ${child.id}`);
                  if (child.children) addChildrenIds(child.children);
                });
              };
              addChildrenIds(feature.children);
            }
          } else if (feature.children) {
            collectHiddenIds(feature.children);
          }
        });
      };

      collectHiddenIds(kmlStructure.features);
      
      const hiddenIdsArray = Array.from(hiddenKmlIds);
      console.log(`📋 Total hidden IDs: ${hiddenIdsArray.length}`, hiddenIdsArray);

      // Update point layer filter using kmlId
      if (map.current.getLayer('kml-points')) {
        if (hiddenIdsArray.length > 0) {
          const pointFilter: any = [
            'all',
            ['==', '$type', 'Point'],
            ['!', ['in', ['get', 'kmlId'], ['literal', hiddenIdsArray]]]
          ];
          map.current.setFilter('kml-points', pointFilter);
        } else {
          // Reset to show all points
          map.current.setFilter('kml-points', ['==', '$type', 'Point']);
        }
        console.log('✅ Updated kml-points filter');
      }

      // Update line layers filter using kmlId
      if (map.current.getLayer('kml-lines')) {
        if (hiddenIdsArray.length > 0) {
          // Use case expression to check if kmlId is in hidden list
          const lineFilter: any = [
            'all',
            ['==', ['geometry-type'], 'LineString'],
            ['!', ['in', ['get', 'kmlId'], ['literal', hiddenIdsArray]]]
          ];
          map.current.setFilter('kml-lines', lineFilter);
          
          // Also update buffer layer
          map.current.setFilter('kml-lines-buffer', lineFilter);
        } else {
          // Reset to show all lines
          const defaultFilter: any = ['==', ['geometry-type'], 'LineString'];
          map.current.setFilter('kml-lines', defaultFilter);
          map.current.setFilter('kml-lines-buffer', defaultFilter);
        }
        console.log('✅ Updated kml-lines filter with', hiddenIdsArray.length, 'hidden IDs');
      }

      // Update polygon layers filter using kmlId
      if (map.current.getLayer('kml-polygons-fill')) {
        if (hiddenIdsArray.length > 0) {
          const polygonFilter: any = [
            'all',
            ['==', '$type', 'Polygon'],
            ['!', ['in', ['get', 'kmlId'], ['literal', hiddenIdsArray]]]
          ];
          map.current.setFilter('kml-polygons-fill', polygonFilter);
          map.current.setFilter('kml-polygons-outline', polygonFilter);
        } else {
          // Reset to show all polygons
          map.current.setFilter('kml-polygons-fill', ['==', '$type', 'Polygon']);
          map.current.setFilter('kml-polygons-outline', ['==', '$type', 'Polygon']);
        }
        console.log('✅ Updated kml-polygons filter');
      }

      // Update custom markers visibility using kmlId
      const markers = document.querySelectorAll('.custom-marker');
      let hiddenMarkerCount = 0;
      markers.forEach((markerEl) => {
        const markerKmlId = markerEl.getAttribute('data-kml-id');
        if (markerKmlId && hiddenKmlIds.has(markerKmlId)) {
          (markerEl as HTMLElement).style.display = 'none';
          hiddenMarkerCount++;
        } else {
          (markerEl as HTMLElement).style.display = 'flex';
        }
      });
      console.log(`✅ Updated ${hiddenMarkerCount} markers visibility`);
    };

    updateLayerVisibility();
  }, [hiddenFeatures, geoJSON, kmlStructure]);

  // Update structure button visibility when structurePanelVisible changes
  useEffect(() => {
    const structureBtn = document.getElementById('structure-toggle-btn');
    if (structureBtn) {
      structureBtn.style.display = structurePanelVisible ? 'none' : 'flex';
    }
  }, [structurePanelVisible]);

  // Add GeoJSON layer to map when geoJSONData is available AND map is ready
  useEffect(() => {
    console.log('🔄 GeoJSON layer useEffect triggered, geoJSONData:', geoJSONData ? `${geoJSONData.features?.length || 0} features` : 'null', 'map:', map.current ? 'exists' : 'null', 'mapReady:', mapReady);
    
    if (!map.current || !geoJSONData || !mapReady) {
      console.log('⚠️ Skipping GeoJSON layer - map:', map.current ? 'exists' : 'null', 'data:', geoJSONData ? 'exists' : 'null', 'mapReady:', mapReady);
      return;
    }

    const mapInstance = map.current;
    console.log('✅ Map and GeoJSON data ready, adding layers...');

    // Wait for map to be fully loaded
    const addGeoJSONLayer = () => {
      if (!mapInstance.isStyleLoaded()) {
        console.log('⏳ Map style not loaded yet, waiting...');
        mapInstance.once('styledata', addGeoJSONLayer);
        return;
      }

      console.log('✅ Map style loaded, proceeding with layer addition');

      try {
        // Remove existing GeoJSON layers if they exist
        if (mapInstance.getLayer('geojson-points')) {
          mapInstance.removeLayer('geojson-points');
        }
        if (mapInstance.getLayer('geojson-lines')) {
          mapInstance.removeLayer('geojson-lines');
        }
        if (mapInstance.getLayer('geojson-polygons-fill')) {
          mapInstance.removeLayer('geojson-polygons-fill');
        }
        if (mapInstance.getLayer('geojson-polygons-outline')) {
          mapInstance.removeLayer('geojson-polygons-outline');
        }
        if (mapInstance.getSource('geojson-data')) {
          mapInstance.removeSource('geojson-data');
        }

        // Add GeoJSON source
        mapInstance.addSource('geojson-data', {
          type: 'geojson',
          data: geoJSONData as any
        });

        console.log('✅ Added GeoJSON source with', geoJSONData.features?.length || 0, 'features');

        // Add polygon fill layer (if any polygons)
        mapInstance.addLayer({
          id: 'geojson-polygons-fill',
          type: 'fill',
          source: 'geojson-data',
          filter: ['==', '$type', 'Polygon'],
          paint: {
            'fill-color': '#FF6B35',
            'fill-opacity': 0.3
          }
        });

        // Add polygon outline layer
        mapInstance.addLayer({
          id: 'geojson-polygons-outline',
          type: 'line',
          source: 'geojson-data',
          filter: ['==', '$type', 'Polygon'],
          paint: {
            'line-color': '#FF6B35',
            'line-width': 2
          }
        });

        // Add line layer with conditional color based on source
        mapInstance.addLayer({
          id: 'geojson-lines',
          type: 'line',
          source: 'geojson-data',
          filter: ['==', ['geometry-type'], 'LineString'],
          paint: {
            'line-color': [
              'case',
              ['==', ['get', 'geojson_source'], 'survey_kml_tracking'],
              '#1E40AF', // Dark blue color for survey_kml_tracking
              '#9333EA'  // Purple color for survey_record (default)
            ],
            'line-width': 3,
            'line-opacity': 0.8
          }
        });

        // DO NOT add point layer for GeoJSON - we only want lines
        // Points are already shown as custom markers from KML

        console.log('✅ Added GeoJSON layers to map (lines only, no points)');

        // Fit map to GeoJSON bounds if features exist
        if (geoJSONData.features && geoJSONData.features.length > 0) {
          console.log('📍 Fitting map to GeoJSON bounds...');
          const bounds = new maplibregl.LngLatBounds();
          let validCoordCount = 0;

          geoJSONData.features.forEach(feature => {
            if (feature.geometry.type === 'Point') {
              const coord = feature.geometry.coordinates as number[];
              if (isFinite(coord[0]) && isFinite(coord[1]) && 
                  coord[1] >= -90 && coord[1] <= 90 && 
                  coord[0] >= -180 && coord[0] <= 180) {
                bounds.extend(coord as [number, number]);
                validCoordCount++;
              }
            } else if (feature.geometry.type === 'LineString') {
              (feature.geometry.coordinates as number[][]).forEach(coord => {
                if (isFinite(coord[0]) && isFinite(coord[1]) && 
                    coord[1] >= -90 && coord[1] <= 90 && 
                    coord[0] >= -180 && coord[0] <= 180) {
                  bounds.extend(coord as [number, number]);
                  validCoordCount++;
                }
              });
            } else if (feature.geometry.type === 'Polygon') {
              (feature.geometry.coordinates[0] as number[][]).forEach(coord => {
                if (isFinite(coord[0]) && isFinite(coord[1]) && 
                    coord[1] >= -90 && coord[1] <= 90 && 
                    coord[0] >= -180 && coord[0] <= 180) {
                  bounds.extend(coord as [number, number]);
                  validCoordCount++;
                }
              });
            }
          });

          if (validCoordCount > 0) {
            mapInstance.fitBounds(bounds, { padding: 100, duration: 1000 });
            console.log(`✅ Fitted map to GeoJSON bounds with ${validCoordCount} valid coordinates`);
          }
        }

        // Add click handlers for GeoJSON features (lines only)
        mapInstance.on('click', 'geojson-lines', (e) => {
          if (!e.features || !e.features[0]) return;
          const feature = e.features[0];
          const properties = feature.properties || {};
          const coordinates = (feature.geometry as any).coordinates;

          console.log('Clicked GeoJSON line:', properties);

          // Calculate line length
          let totalDistance = 0;
          for (let i = 0; i < coordinates.length - 1; i++) {
            const [lon1, lat1] = coordinates[i];
            const [lon2, lat2] = coordinates[i + 1];
            const R = 6371e3;
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
          const lengthDisplay = totalDistance < 1000 
            ? `${Math.round(totalDistance)} m` 
            : `${(totalDistance / 1000).toFixed(2)} km`;

          // Show popup
          new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="padding: 8px;">
                <h4 style="margin: 0 0 8px 0; font-weight: 600; color: #9333EA;">Survey Track (GeoJSON)</h4>
                <p style="margin: 4px 0; font-size: 12px;"><strong>Length:</strong> ${lengthDisplay}</p>
                ${properties.name ? `<p style="margin: 4px 0; font-size: 12px;"><strong>Name:</strong> ${properties.name}</p>` : ''}
                ${properties.description ? `<p style="margin: 4px 0; font-size: 12px;"><strong>Description:</strong> ${properties.description}</p>` : ''}
              </div>
            `)
            .addTo(mapInstance);
        });

        // Cursor handlers for lines
        mapInstance.on('mouseenter', 'geojson-lines', () => {
          mapInstance.getCanvas().style.cursor = 'pointer';
        });
        mapInstance.on('mouseleave', 'geojson-lines', () => {
          mapInstance.getCanvas().style.cursor = '';
        });

      } catch (err) {
        console.error('❌ Error adding GeoJSON layers:', err);
      }
    };

    addGeoJSONLayer();

    // Cleanup function
    return () => {
      if (mapInstance && mapInstance.getStyle()) {
        try {
          if (mapInstance.getLayer('geojson-lines')) {
            mapInstance.removeLayer('geojson-lines');
          }
          if (mapInstance.getLayer('geojson-polygons-fill')) {
            mapInstance.removeLayer('geojson-polygons-fill');
          }
          if (mapInstance.getLayer('geojson-polygons-outline')) {
            mapInstance.removeLayer('geojson-polygons-outline');
          }
          if (mapInstance.getSource('geojson-data')) {
            mapInstance.removeSource('geojson-data');
          }
        } catch (err) {
          console.error('Error cleaning up GeoJSON layers:', err);
        }
      }
    };
  }, [geoJSONData, mapReady]);

  if (!kmlFileContent && !kmlPath && !kmlData) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="text-center py-12">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No KML/KMZ file uploaded</p>
          <p className="text-xs text-gray-400 mt-1">Upload a KML or KMZ file when creating the contract</p>
        </div>
      </div>
    );
  }

  if (fetchingKML) {
    const isKMZ = kmlPath?.toLowerCase().endsWith('.kmz');
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="text-center py-12">
          <OrbitProgress color="#005EB8" size="medium" text="" textColor="" />
          <p className="text-sm text-gray-600 mt-4">{`Loading ${isKMZ ? 'KMZ' : 'KML'} file from server...`}</p>
          {isKMZ && <p className="text-xs text-gray-500 mt-2">Extracting KML from KMZ archive...</p>}
          <p className="text-xs text-gray-400 mt-1">{kmlPath}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="text-center py-12">
          <MapPin className="w-12 h-12 text-red-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-red-600 mb-2">Error Loading Map</h3>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  // Helper function to toggle folder expansion
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  // Helper function to toggle feature visibility
  const toggleFeatureVisibility = (featureId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent click handlers
    
    setHiddenFeatures(prev => {
      const newSet = new Set(prev);
      if (newSet.has(featureId)) {
        newSet.delete(featureId);
      } else {
        newSet.add(featureId);
      }
      return newSet;
    });
  };

  // Helper function to check if feature or any parent is hidden
  const isFeatureVisible = (featureId: string): boolean => {
    return !hiddenFeatures.has(featureId);
  };

  // Helper function to handle feature click from structure panel
  const handleFeatureClick = (feature: KMLFeature) => {
    if (feature.type === 'Folder') {
      toggleFolder(feature.id);
      return;
    }

    if (!map.current || !feature.coordinates) return;

    // Fly to feature location
    if (feature.type === 'Point') {
      const [lon, lat] = feature.coordinates as number[];
      map.current.flyTo({
        center: [lon, lat],
        zoom: 18,
        duration: 1000
      });
    } else if (feature.type === 'LineString') {
      const coords = feature.coordinates as number[][];
      const bounds = new maplibregl.LngLatBounds();
      coords.forEach(coord => bounds.extend(coord as [number, number]));
      map.current.fitBounds(bounds, { padding: 100, duration: 1000 });
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

    // Helper function to format distance
    const formatDistance = (meters: number): string => {
      if (meters < 1000) {
        return `${Math.round(meters)} m`;
      }
      return `${(meters / 1000).toFixed(2)} km`;
    };

    // Simulate click to show info panel
    // Find matching GeoJSON feature and set selectedLine
    if (geoJSON) {
      const matchingFeature = geoJSON.features.find(f => f.properties.name === feature.name);
      if (matchingFeature) {
        if (feature.type === 'Point') {
          const coord = feature.coordinates as number[];
          const color = getColorByDesignator(feature.name, designatorsV2);
          const lineInfo = getLineInfoFromColor(color, designatorsV2, feature.name);
          
          // Find matching survey data for this designator
          const matchingSurvey = surveyData.find(survey => 
            survey.item_name?.toLowerCase() === feature.name.toLowerCase()
          );

          // Prepare evidence photos from survey data
          const evidencePhotos = matchingSurvey?.evidences?.map(evidence => ({
            url: `${API_CONFIG.BASE_URL.replace('/api', '')}/api/files/${evidence.file_path.replace('uploads/', '')}`,
            fileName: evidence.file_name,
            fileType: evidence.file_type
          })) || [];

          // Format survey date
          const surveyDate = matchingSurvey?.date 
            ? new Date(matchingSurvey.date).toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            : null;
          
          // Get length from survey data
          const surveyLength = matchingSurvey?.length 
            ? `${matchingSurvey.length} m`
            : null;
          
          setSelectedLine({
            name: feature.name,
            isDesignator: true,
            category: lineInfo.category,
            jenisGaris: lineInfo.jenisGaris,
            color: lineInfo.color,
            description: feature.properties?.description || '',
            coordinates: `${coord[1].toFixed(6)}, ${coord[0].toFixed(6)}`,
            length: surveyLength,
            evidencePhotos: evidencePhotos,
            surveyDate: surveyDate,
            evidenceCount: evidencePhotos.length
          });
        } else if (feature.type === 'LineString') {
          // Find ALL segments with the same span name from geoJSON to calculate full length
          const spanName = feature.name;
          const allSegments = geoJSON.features.filter(f => 
            f.geometry.type === 'LineString' && 
            f.properties.name === spanName
          );

          // Calculate total length from all segments
          let totalLengthMeters = 0;
          allSegments.forEach(segment => {
            const coords = segment.geometry.coordinates as number[][];
            totalLengthMeters += calculateLineLength(coords);
          });

          const lengthDisplay = formatDistance(totalLengthMeters);
          
          // Set selected line data - ONLY show span name and length (same as map click)
          setSelectedLine({
            name: spanName,
            totalLength: lengthDisplay,
            isSpan: true, // Flag to indicate this is a span/polyline click
            description: feature.properties?.description || ''
          });
        }
      }
    }
  };

  // Recursive component to render KML structure tree
  const renderFeatureTree = (features: KMLFeature[], level: number = 0) => {
    return features.map(feature => {
      const isFolder = feature.type === 'Folder';
      const isExpanded = expandedFolders.has(feature.id);
      const hasChildren = isFolder && feature.children && feature.children.length > 0;
      const isVisible = isFeatureVisible(feature.id);

      // Calculate indentation - 24px per level for clear hierarchy
      const indentPx = level * 24;

      // Get icon based on type
      const getIcon = () => {
        if (isFolder) {
          return isExpanded ? (
            <FolderOpen className="w-4 h-4 text-blue-600" />
          ) : (
            <Folder className="w-4 h-4 text-blue-500" />
          );
        }
        switch (feature.type) {
          case 'Point':
            return <MapPin className="w-4 h-4 text-blue-500" />;
          case 'LineString':
            return (
              <svg width="16" height="16" viewBox="0 0 16 16" className="text-green-600">
                <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="2" />
              </svg>
            );
          case 'Polygon':
            return <div className="w-4 h-4 border-2 border-purple-500 rounded" />;
          default:
            return null;
        }
      };

      return (
        <div key={feature.id}>
          <div
            className={`flex items-center gap-2 py-1.5 px-2 hover:bg-blue-50 cursor-pointer rounded-sm transition-colors group relative ${
              !isVisible ? 'opacity-50' : ''
            }`}
            style={{ paddingLeft: `${indentPx + 8}px` }}
            onClick={() => handleFeatureClick(feature)}
          >
            {/* Indentation guide line for nested items */}
            {level > 0 && (
              <div 
                className="absolute left-0 top-0 bottom-0 w-px bg-gray-200"
                style={{ left: `${(level - 1) * 24 + 20}px` }}
              />
            )}
            
            {isFolder ? (
              <span className="flex-shrink-0 z-10">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-gray-700" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-700" />
                )}
              </span>
            ) : (
              <span className="w-4 flex-shrink-0" />
            )}
            
            <span className="flex-shrink-0 z-10">{getIcon()}</span>
            
            <span className="text-sm text-gray-800 truncate flex-1 group-hover:text-gray-900 font-medium z-10" title={feature.name}>
              {feature.name}
            </span>
            
            {/* Eye button for visibility toggle */}
            <button
              onClick={(e) => toggleFeatureVisibility(feature.id, e)}
              className="flex-shrink-0 p-1 rounded hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity z-10"
              title={isVisible ? "Sembunyikan fitur" : "Tampilkan fitur"}
            >
              {isVisible ? (
                <Eye className="w-4 h-4 text-gray-600" />
              ) : (
                <EyeOff className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
          {isFolder && isExpanded && hasChildren && (
            <div>{renderFeatureTree(feature.children!, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col" style={{ height: '950px' }}>
      <div className="flex-shrink-0 bg-white rounded-lg p-4 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ fontWeight: 600 }}>
            {(selectedKMLPath?.toLowerCase().endsWith('.kmz') || kmlFileName?.toLowerCase().endsWith('.kmz'))
              ? 'KMZ File Information'
              : 'KML File Information'}
          </h3>
          
          {/* KML File Selector with SS/Link, Category and File Selection */}
          {kmlData && (
            <div className="flex items-center gap-3 flex-wrap">
              {/* SS/Link Selector - FIRST */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700 font-medium whitespace-nowrap">SS/Link:</label>
                <select
                  value={selectedLink}
                  onChange={(e) => {
                    setSelectedLink(e.target.value);
                    // Reset file path when link changes, but keep the name
                    setSelectedKMLPath(undefined);
                    // Reset GeoJSON selection when link changes
                    setSelectedGeoJSONs([]);
                    setShowGeoJSONDropdown(false);
                    // Don't reset name to avoid showing "Unknown"
                  }}
                  className={`px-3 py-2 text-sm font-medium border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white hover:border-green-400 transition-colors shadow-sm ${
                    linkId ? 'opacity-50 cursor-not-allowed border-gray-300' : 'border-green-300 cursor-pointer'
                  }`}
                  style={{ minWidth: '200px' }}
                  disabled={!!linkId}
                  title={linkId ? 'SS/Link is pre-selected for this view' : ''}
                >
                  <option value="">-- Select SS/Link --</option>
                  {availableLinks.map((link) => (
                    <option key={link} value={link}>
                      {link}
                    </option>
                  ))}
                </select>
                {linkId && (
                  <span className="text-xs text-gray-500 italic">(Pre-selected)</span>
                )}
              </div>

              {/* Category Selector - SECOND */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700 font-medium whitespace-nowrap">Category:</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    const newCategory = e.target.value as 'plan' | 'survey' | 'span' | 'drm' | 'installation';
                    setSelectedCategory(newCategory);
                    // Reset file path when category changes, but keep the name
                    setSelectedKMLPath(undefined);
                    // Reset GeoJSON selection when category changes
                    setSelectedGeoJSONs([]);
                    setShowGeoJSONDropdown(false);
                    // Don't reset name to avoid showing "Unknown"
                  }}
                  className={`px-3 py-2 text-sm font-medium border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-blue-400 transition-colors shadow-sm ${
                    !selectedLink ? 'opacity-50 cursor-not-allowed border-gray-300' : 'border-blue-300 cursor-pointer'
                  }`}
                  disabled={!selectedLink}
                  title={!selectedLink ? 'Please select SS/Link first' : ''}
                >
                  <option value="plan">📋 Plan</option>
                  <option value="survey">🔍 Survey</option>
                  <option value="span" style={{ display: 'none' }}>📏 Span</option>
                  <option value="drm">📐 DRM</option>
                  <option value="installation">🔧 Installation</option>
                </select>
              </div>

              {/* Sub Phase Selector — only for installation category */}
              {selectedCategory === 'installation' && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700 font-medium whitespace-nowrap">Sub Phase:</label>
                  <select
                    value={selectedSubPhase}
                    onChange={(e) => {
                      setSelectedSubPhase(e.target.value);
                      // reset file + geojson selections when sub-phase changes
                      setSelectedKMLPath(undefined);
                      setSelectedKMLName('');
                      setSelectedGeoJSONs([]);
                    }}
                    className="px-3 py-2 text-sm font-medium border-2 border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white hover:border-emerald-400 transition-colors cursor-pointer shadow-sm"
                    style={{ minWidth: '200px' }}
                  >
                    {SUB_PHASE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {loadingSubPhaseKml && (
                    <span className="text-xs text-emerald-600 italic">Loading...</span>
                  )}
                </div>
              )}

              {/* File Selector based on SS/Link and Category - THIRD */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700 font-medium whitespace-nowrap">File:</label>
                <select
                  value={selectedKMLPath || ''}
                  onChange={(e) => {
                    const selectedOption = e.target.options[e.target.selectedIndex];
                    const fileName = selectedOption.getAttribute('data-filename') || '';
                    const itemId = selectedOption.getAttribute('data-item-id') || '';
                    handleKMLChange(e.target.value, fileName);
                    // Reset GeoJSON selection when file changes
                    setSelectedGeoJSONs([]);
                    setShowGeoJSONDropdown(false);
                    // Store item_id for GeoJSON filtering
                    setSelectedSurveyItemId(itemId);
                  }}
                  className="px-4 py-2 text-sm font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-gray-400 transition-colors cursor-pointer shadow-sm"
                  style={{ minWidth: '280px' }}
                  disabled={!selectedLink || !selectedCategory}
                >
                  <option value="">-- Select File --</option>
                  
                  {/* Plan/Project KML Files - filtered by selected link */}
                  {selectedCategory === 'plan' && selectedLink && kmlData.kml_project && (
                    <>
                      {kmlData.kml_project.map((group) =>
                        group.files
                          .filter(file => {
                            // Extract link name from keterangan
                            let linkName = file.keterangan || '';
                            const match = linkName.match(/for\s+(.+)$/i);
                            if (match) {
                              linkName = match[1].trim();
                            }
                            // Match with selected link
                            return linkName === selectedLink && file.file_category === 'kml';
                          })
                          .map((file) => (
                            <option
                              key={file.id.id.String}
                              value={file.file_path}
                              data-filename={file.file_name}
                            >
                              {file.file_name}
                            </option>
                          ))
                      )}
                    </>
                  )}
                  
                  {/* Survey KML Files - filtered by selected link using ss_link from surveyData */}
                  {selectedCategory === 'survey' && selectedLink && kmlData.kml_survey && surveyData.length > 0 && (
                    <>
                      {kmlData.kml_survey
                        .filter(group => {
                          // Find matching survey in surveyData by span_items ID
                          // KML survey has process_id like "span_items_7kqs65fzrz5seb0xhuo2"
                          // Survey data has id like {"tb": "span_items", "id": {"String": "7kqs65fzrz5seb0xhuo2"}}
                          
                          // Extract span_items ID from item_id
                          const spanItemsId = group.item_id; // This is the span_items ID
                          
                          // Find matching survey in surveyData
                          const matchingSurvey = surveyData.find(survey => {
                            const surveyId = typeof survey.id.id === 'string' 
                              ? survey.id.id 
                              : survey.id.id.String;
                            return surveyId === spanItemsId;
                          });
                          
                          if (!matchingSurvey) {
                            console.log(`⚠️ No matching survey found for item_id: ${spanItemsId}`);
                            return false;
                          }
                          
                          // Get ss_link from survey
                          const ssLinkId = typeof matchingSurvey.ss_link === 'string'
                            ? matchingSurvey.ss_link
                            : (matchingSurvey.ss_link as any).id.String;
                          
                          // Find link name from kml_project files by matching process_id with link ID
                          let linkNameForSurvey = '';
                          
                          if (kmlData.kml_project) {
                            for (const projectGroup of kmlData.kml_project) {
                              const matchingFile = projectGroup.files.find(file => {
                                // Extract link ID from process_id (format: "link_eou8v7hvctv473ea16cu")
                                const linkId = file.process_id.replace('link_', '');
                                return linkId === ssLinkId;
                              });
                              
                              if (matchingFile) {
                                // Extract link name from keterangan
                                let linkName = matchingFile.keterangan || '';
                                const match = linkName.match(/for\s+(.+)$/i);
                                if (match) {
                                  linkNameForSurvey = match[1].trim();
                                }
                                break;
                              }
                            }
                          }
                          
                          console.log(`📋 Survey "${group.item_name}" (ID: ${spanItemsId}) belongs to link: ${linkNameForSurvey} (ss_link: ${ssLinkId})`);
                          
                          // Match with selected link
                          return linkNameForSurvey === selectedLink;
                        })
                        .map((group) =>
                          group.files.map((file) => (
                            <option
                              key={file.id.id.String}
                              value={file.file_path}
                              data-filename={file.file_name}
                              data-item-id={group.item_id}
                            >
                              {group.item_name} - {file.file_name}
                            </option>
                          ))
                        )}
                    </>
                  )}

                  {/* Span KML Files - filtered by selected link */}
                  {selectedCategory === 'span' && selectedLink && kmlData.kml_span && (
                    <>
                      {kmlData.kml_span.map((group) =>
                        group.files
                          .filter(file => {
                            // Extract link name from keterangan
                            let linkName = file.keterangan || '';
                            const match = linkName.match(/for\s+(.+)$/i);
                            if (match) {
                              linkName = match[1].trim();
                            }
                            // Match with selected link
                            return linkName === selectedLink && file.file_category === 'kml';
                          })
                          .map((file) => (
                            <option
                              key={file.id.id.String}
                              value={file.file_path}
                              data-filename={file.file_name}
                            >
                              {file.file_name}
                            </option>
                          ))
                      )}
                    </>
                  )}

                  {/* Installation KML Files — dari sub-phase endpoint */}
                  {selectedCategory === 'installation' && (
                    <>
                      {subPhaseKmlFiles.map((file, idx) => (
                        <option
                          key={file.file_path ?? `install-${idx}`}
                          value={file.file_path}
                          data-filename={file.file_name}
                        >
                          {file.file_name || file.file_path?.split('/').pop()}
                        </option>
                      ))}
                      {!loadingSubPhaseKml && subPhaseKmlFiles.length === 0 && (
                        <option value="" disabled>Belum ada KML untuk sub phase ini</option>
                      )}
                    </>
                  )}
                </select>
              </div>

              {/* GeoJSON Selector - FOURTH (only for survey category) */}
              {selectedCategory === 'survey' && (
                <div className="flex items-center gap-2 relative">
                  <label className="text-sm text-gray-700 font-medium whitespace-nowrap">GeoJSON:</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        console.log('🔍 GeoJSON Dropdown Clicked:', {
                          kmlData: kmlData,
                          selectedSurveyItemId,
                          survey_record: kmlData?.survey_record,
                          survey_kml_tracking: kmlData?.survey_kml_tracking
                        });
                        setShowGeoJSONDropdown(!showGeoJSONDropdown);
                      }}
                      className="px-4 py-2 text-sm font-medium border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white hover:border-purple-400 transition-colors cursor-pointer shadow-sm flex items-center gap-2"
                      style={{ minWidth: '250px' }}
                      disabled={!selectedKMLPath || !selectedSurveyItemId}
                    >
                      <span className="flex-1 text-left">
                        {selectedGeoJSONs.length === 0 
                          ? '-- Select GeoJSON --' 
                          : `${selectedGeoJSONs.length} selected`}
                      </span>
                      <svg 
                        className={`w-4 h-4 transition-transform ${showGeoJSONDropdown ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* Dropdown with checkboxes */}
                    {showGeoJSONDropdown && (
                      <div className="absolute z-50 mt-1 w-full bg-white border-2 border-purple-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {/* Survey Record Section */}
                        {kmlData?.survey_record && selectedSurveyItemId && (
                          <>
                            <div className="px-3 py-2 bg-purple-50 border-b border-purple-200 text-xs font-semibold text-purple-700">
                              Survey Record
                            </div>
                            {(() => {
                              const filteredRecords = kmlData.survey_record.filter(record => record.item_id === selectedSurveyItemId);
                              
                              return filteredRecords.flatMap(record =>
                                record.files.map(file => {
                                  const isChecked = selectedGeoJSONs.includes(file.file_path);
                                  return (
                                    <label
                                      key={file.id.id.String}
                                      className="flex items-center gap-2 px-3 py-2 hover:bg-purple-50 cursor-pointer border-b border-gray-100"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedGeoJSONs([...selectedGeoJSONs, file.file_path]);
                                          } else {
                                            setSelectedGeoJSONs(selectedGeoJSONs.filter(path => path !== file.file_path));
                                          }
                                        }}
                                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                      />
                                      <span className="text-sm text-gray-700">
                                        {record.item_name} - {file.file_name}
                                      </span>
                                    </label>
                                  );
                                })
                              );
                            })()}
                          </>
                        )}
                        
                        {/* Survey KML Tracking Section */}
                        {kmlData?.survey_kml_tracking && selectedSurveyItemId && (
                          <>
                            {(() => {
                              const filteredTracking = kmlData.survey_kml_tracking.filter((tracking: any) => tracking.item_id === selectedSurveyItemId);
                              
                              if (filteredTracking.length === 0) return null;
                              
                              return (
                                <>
                                  <div className="px-3 py-2 bg-blue-50 border-b border-blue-200 text-xs font-semibold text-blue-700">
                                    Survey KML Tracking
                                  </div>
                                  {filteredTracking.flatMap((tracking: any) =>
                                    tracking.files.map((file: any) => {
                                      const isChecked = selectedGeoJSONs.includes(file.file_path);
                                      return (
                                        <label
                                          key={file.id.id.String}
                                          className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setSelectedGeoJSONs([...selectedGeoJSONs, file.file_path]);
                                              } else {
                                                setSelectedGeoJSONs(selectedGeoJSONs.filter(path => path !== file.file_path));
                                              }
                                            }}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                          />
                                          <span className="text-sm text-gray-700">
                                            {tracking.item_name} - {file.file_name}
                                          </span>
                                        </label>
                                      );
                                    })
                                  )}
                                </>
                              );
                            })()}
                          </>
                        )}
                        
                        {/* No data message */}
                        {(!kmlData?.survey_record || kmlData.survey_record.filter(r => r.item_id === selectedSurveyItemId).length === 0) &&
                         (!kmlData?.survey_kml_tracking || kmlData.survey_kml_tracking.filter((t: any) => t.item_id === selectedSurveyItemId).length === 0) && (
                          <div className="px-3 py-2 text-sm text-gray-500 italic">
                            No GeoJSON files available
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {fetchingGeoJSON && (
                    <span className="text-xs text-purple-600 italic">Loading...</span>
                  )}
                </div>
              )}

              {/* GeoJSON Selector - For installation category */}
              {selectedCategory === 'installation' && (
                <div className="flex items-center gap-2 relative">
                  <label className="text-sm text-gray-700 font-medium whitespace-nowrap">GeoJSON:</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowGeoJSONDropdown(!showGeoJSONDropdown)}
                      className="px-4 py-2 text-sm font-medium border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white hover:border-purple-400 transition-colors cursor-pointer shadow-sm flex items-center gap-2"
                      style={{ minWidth: '250px' }}
                    >
                      <span className="flex-1 text-left">
                        {selectedGeoJSONs.length === 0
                          ? '-- Select GeoJSON --'
                          : `${selectedGeoJSONs.length} selected`}
                      </span>
                      <svg
                        className={`w-4 h-4 transition-transform ${showGeoJSONDropdown ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Dropdown */}
                    {showGeoJSONDropdown && (
                      <div className="absolute z-50 mt-1 bg-white border-2 border-purple-300 rounded-lg shadow-lg max-h-64 overflow-y-auto" style={{ minWidth: '320px' }}>

                        {/* Survey Record Section */}
                        <div className="px-3 py-2 bg-purple-50 border-b border-purple-200 text-xs font-semibold text-purple-700">
                          Survey Record
                        </div>
                        {(() => {
                          const surveyFiles = kmlData?.survey_record?.flatMap(r => r.files) ?? [];
                          if (surveyFiles.length === 0) {
                            return (
                              <div className="px-3 py-2 text-sm text-gray-400 italic">
                                No GeoJSON files available
                              </div>
                            );
                          }
                          return (kmlData?.survey_record ?? []).flatMap(record =>
                            record.files.map(file => {
                              const isChecked = selectedGeoJSONs.includes(file.file_path);
                              return (
                                <label
                                  key={file.file_path}
                                  className="flex items-center gap-2 px-3 py-2 hover:bg-purple-50 cursor-pointer border-b border-gray-100"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={e => {
                                      if (e.target.checked) {
                                        setSelectedGeoJSONs([...selectedGeoJSONs, file.file_path]);
                                      } else {
                                        setSelectedGeoJSONs(selectedGeoJSONs.filter(p => p !== file.file_path));
                                      }
                                    }}
                                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                  />
                                  <span className="text-sm text-gray-700 truncate">
                                    {record.item_name} — {file.file_name}
                                  </span>
                                </label>
                              );
                            })
                          );
                        })()}

                        {/* Installation Record Section (from sub-phase) */}
                        <div className="px-3 py-2 bg-emerald-50 border-b border-emerald-200 border-t border-t-gray-200 text-xs font-semibold text-emerald-700">
                          Installation Record — {SUB_PHASE_OPTIONS.find(o => o.value === selectedSubPhase)?.label ?? selectedSubPhase}
                        </div>
                        {subPhaseGeoJsonGroups.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-400 italic">
                            {loadingSubPhaseKml ? 'Loading...' : 'No GeoJSON files available'}
                          </div>
                        ) : (
                          subPhaseGeoJsonGroups.flatMap(record =>
                            record.files.map(file => {
                              const isChecked = selectedGeoJSONs.includes(file.file_path);
                              return (
                                <label
                                  key={file.file_path}
                                  className="flex items-center gap-2 px-3 py-2 hover:bg-emerald-50 cursor-pointer border-b border-gray-100"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={e => {
                                      if (e.target.checked) {
                                        setSelectedGeoJSONs([...selectedGeoJSONs, file.file_path]);
                                      } else {
                                        setSelectedGeoJSONs(selectedGeoJSONs.filter(p => p !== file.file_path));
                                      }
                                    }}
                                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                  />
                                  <span className="text-sm text-gray-700 truncate">
                                    {record.item_name} — {file.file_name}
                                  </span>
                                </label>
                              );
                            })
                          )
                        )}
                      </div>
                    )}
                  </div>
                  {fetchingGeoJSON && (
                    <span className="text-xs text-purple-600 italic">Loading...</span>
                  )}
                </div>
              )}
              
              {/* Mark as Done Button */}
              {markAsDoneButton}
            </div>
          )}
        </div>

        <p className="text-sm text-gray-600 mb-2">
          File: <span className="font-medium text-gray-900">
            {selectedKMLName || kmlFileName
              ? (selectedKMLName || kmlFileName).split('/').pop()
              : (selectedKMLPath ? selectedKMLPath.split('/').pop() : 'No file selected')
            }
          </span>
        </p>
        {selectedKMLPath?.toLowerCase().endsWith('.kmz') && (
          <p className="text-xs text-blue-600 mb-2">
            📦 KMZ archive - KML extracted automatically
          </p>
        )}
        {/* {kmlPath && (
          <p className="text-xs text-gray-500 mb-2">
            Path: <span className="font-mono">{kmlPath}</span>
          </p>
        )} */}

        <div ref={mapSectionRef} className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden" style={{ minHeight: '800px' }}>
          {geoJSON && (
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-4 text-xs flex-shrink-0">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-gray-600" />
                <span className="text-gray-700">
                  <strong>{geoJSON.features.length || 0}</strong> features
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
          )}

          <div className="flex flex-1" style={{ minHeight: '750px' }}>
            {/* KML Structure Panel */}
            {kmlStructure && structurePanelVisible && (
              <div className="w-72 bg-white border-r border-gray-200 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-blue-600" />
                      <h3 className="text-sm font-bold text-gray-800">KML Structure</h3>
                    </div>
                    <button
                      onClick={() => setStructurePanelVisible(false)}
                      className="p-1 hover:bg-white/50 rounded transition-colors"
                      title="Hide Structure"
                    >
                      <X className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 font-medium truncate" title={kmlStructure.name}>
                    📄 {kmlStructure.name}
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto p-2 bg-gray-50">
                  {renderFeatureTree(kmlStructure.features)}
                </div>
              </div>
            )}

            {/* Map Container */}
            <div className="relative flex-1" style={{ borderRadius: '12px', overflow: 'hidden' }}>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                  <div className="text-center">
                    <OrbitProgress color="#005EB8" size="medium" text="" textColor="" />
                    <p className="text-sm text-gray-600 mt-4">Loading map...</p>
                  </div>
                </div>
              )}
              <div ref={mapContainer} className="absolute inset-0" style={{ width: '100%', height: '100%' }} />
            </div>

            {/* KML Evidence Panel */}
            {selectedLine && (
              <div className="w-80 bg-white border-l border-gray-200 shadow-lg flex flex-col" style={{ borderRadius: '12px 0 0 12px', overflow: 'hidden' }}>
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-[#003A70] to-[#005EB8]">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-white text-sm font-semibold uppercase">
                        {selectedLine.isSpan ? 'SPAN INFORMATION' : 'DESIGNATOR INFORMATION'}
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedLine(null)}
                      className="p-1 hover:bg-white/10 rounded transition-colors ml-2"
                      title="Close"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-4">
                  <div className="space-y-4">
                    {/* Span Information - Show when isSpan is true */}
                    {selectedLine.isSpan ? (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="space-y-3 text-sm">
                          {/* Span Name */}
                          {selectedLine.name && (
                            <div className="pb-3 border-b border-gray-200">
                              <span className="text-gray-600 block mb-2">Span Name:</span>
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
                          {selectedLine.totalLength && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Length:</span>
                              <span className="text-gray-900 font-semibold">{selectedLine.totalLength}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Designator Information - Detailed display for point designator */
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
                          {selectedLine.currentIndex && selectedLine.totalDesignators && (
                            <div className="flex justify-between items-center">
                            <span className="text-gray-600">Position:</span>
                            <span className="text-gray-900 font-semibold">
                              {selectedLine.currentIndex} of {selectedLine.totalDesignators}
                            </span>
                          </div>
                        )}
                        {selectedLine.coordinates && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Coordinates:</span>
                            <span className="text-gray-900 font-mono text-xs">{selectedLine.coordinates}</span>
                          </div>
                        )}
                        {selectedLine.length && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Length:</span>
                            <span className="text-gray-900 font-semibold">{selectedLine.length}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    )}

                    {/* Adjacent Designators - Based on KML order - Only show for designators */}
                    {!selectedLine.isSpan && selectedLine.nearbyDesignators && selectedLine.nearbyDesignators.length > 0 && (
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <h4 className="text-xs text-blue-800 mb-3 uppercase tracking-wide font-semibold">
                          {selectedLine.spanName ? `SPAN: ${selectedLine.spanName}` : 'SPAN INFORMATION'}
                        </h4>
                        <div className="space-y-2">
                          {selectedLine.nearbyDesignators.map((nearby: any, idx: number) => (
                            <div key={idx} className="bg-white rounded p-3 shadow-sm">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  {nearby.direction === 'previous' ? (
                                    <div className="flex items-center gap-1 text-gray-600 mb-1">
                                      <span className="text-xs">←</span>
                                      <span className="text-xs font-medium">Previous:</span>
                                    </div>
                                  ) : nearby.direction === 'next' ? (
                                    <div className="flex items-center gap-1 text-gray-600 mb-1">
                                      <span className="text-xs">→</span>
                                      <span className="text-xs font-medium">Next:</span>
                                    </div>
                                  ) : null}
                                  <span className="text-sm text-gray-900 font-semibold block">
                                    {nearby.designatorName}
                                  </span>
                                </div>
                                <span className="text-sm font-bold text-blue-600 whitespace-nowrap">{nearby.distance}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Evidence Photos - Only show for designators */}
                    {!selectedLine.isSpan && (
                      <div className="glass-card rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs text-gray-600">Evidence Photos ({selectedLine.evidenceCount || 0})</h4>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {selectedLine.evidencePhotos && selectedLine.evidencePhotos.length > 0 ? (
                              selectedLine.evidencePhotos.map((photo: any, idx: number) => (
                                <div key={idx} className="aspect-square bg-gray-100 rounded overflow-hidden">
                                  <img 
                                    src={photo.url} 
                                    alt={photo.fileName}
                                    className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => window.open(photo.url, '_blank')}
                                    onError={(e) => {
                                      // Fallback to placeholder if image fails to load
                                      (e.target as HTMLImageElement).style.display = 'none';
                                      (e.target as HTMLImageElement).parentElement!.innerHTML = `
                                        <div class="w-full h-full flex items-center justify-center">
                                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400">
                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                            <polyline points="21 15 16 10 5 21"></polyline>
                                          </svg>
                                        </div>
                                      `;
                                    }}
                                  />
                                </div>
                              ))
                            ) : (
                              // Show placeholder when no evidence photos
                              [1, 2, 3, 4].map(i => (
                                <div key={i} className="aspect-square bg-gray-100 rounded flex items-center justify-center">
                                  <ImageIcon className="w-8 h-8 text-gray-400" />
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                    )}

                    {/* Survey Date - Show for designators */}
                    {!selectedLine.isSpan && selectedLine.surveyDate && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-xs text-gray-600 mb-2 uppercase tracking-wide">Survey Date</h4>
                        <p className="text-sm text-gray-700 leading-relaxed">{selectedLine.surveyDate}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
