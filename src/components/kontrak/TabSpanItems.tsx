import { useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';
import { X } from 'lucide-react';
import { spanService } from '@/services/spanService';
import maplibregl from 'maplibre-gl';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import '@/styles/ag-grid-custom.css';
import 'maplibre-gl/dist/maplibre-gl.css';

// Register AG Grid modules
ModuleRegistry.registerModules([AllEnterpriseModule]);

// Jenis tanah di Indonesia dengan warna garis
const SOIL_TYPES = [
  { value: 'tanah-liat', label: 'Tanah Liat (Clay)', color: '#8B4513' },
  { value: 'tanah-berpasir', label: 'Tanah Berpasir (Sandy)', color: '#F4A460' },
  { value: 'tanah-lempung', label: 'Tanah Lempung (Loam)', color: '#D2691E' },
  { value: 'tanah-humus', label: 'Tanah Humus (Humus)', color: '#654321' },
  { value: 'tanah-kapur', label: 'Tanah Kapur (Limestone)', color: '#F5F5DC' },
  { value: 'tanah-gambut', label: 'Tanah Gambut (Peat)', color: '#2F4F4F' },
  { value: 'tanah-laterit', label: 'Tanah Laterit (Laterite)', color: '#CD5C5C' },
  { value: 'tanah-aluvial', label: 'Tanah Aluvial (Alluvial)', color: '#DAA520' },
  { value: 'tanah-vulkanik', label: 'Tanah Vulkanik (Volcanic)', color: '#696969' },
  { value: 'tanah-podsolik', label: 'Tanah Podsolik (Podzolic)', color: '#BC8F8F' },
];

// Component untuk menampilkan map dengan garis dari From ke To
function SpanItemLineMap({ longitudeFrom, latitudeFrom, longitudeTo, latitudeTo, soilType }: {
  longitudeFrom: number;
  latitudeFrom: number;
  longitudeTo: number;
  latitudeTo: number;
  soilType?: string;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Get line color based on soil type
  const getLineColor = () => {
    if (!soilType) return '#f97316'; // Default orange
    const soil = SOIL_TYPES.find(s => s.value === soilType);
    return soil ? soil.color : '#f97316';
  };

  const lineColor = getLineColor();

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Calculate center point
    const centerLng = (longitudeFrom + longitudeTo) / 2;
    const centerLat = (latitudeFrom + latitudeTo) / 2;

    try {
      // Initialize map
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
        center: [centerLng, centerLat],
        zoom: 13,
      });

      mapRef.current = map;

      map.on('load', () => {
        // Add markers for Point From and To
        new maplibregl.Marker({ color: '#22c55e' })
          .setLngLat([longitudeFrom, latitudeFrom])
          .setPopup(new maplibregl.Popup().setHTML('<strong>Point From</strong>'))
          .addTo(map);

        new maplibregl.Marker({ color: '#ef4444' })
          .setLngLat([longitudeTo, latitudeTo])
          .setPopup(new maplibregl.Popup().setHTML('<strong>Point To</strong>'))
          .addTo(map);

        // Add line between points
        map.addSource('line', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [
                [longitudeFrom, latitudeFrom],
                [longitudeTo, latitudeTo],
              ],
            },
          },
        });

        map.addLayer({
          id: 'line',
          type: 'line',
          source: 'line',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': lineColor,
            'line-width': 3,
          },
        });

        // Fit bounds to show both points
        const bounds = new maplibregl.LngLatBounds();
        bounds.extend([longitudeFrom, latitudeFrom]);
        bounds.extend([longitudeTo, latitudeTo]);
        map.fitBounds(bounds, { padding: 50 });
      });
    } catch (error) {
      console.error('Error initializing map:', error);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [longitudeFrom, latitudeFrom, longitudeTo, latitudeTo, lineColor]);

  return (
    <div 
      ref={mapContainerRef} 
      style={{ width: '100%', height: '192px' }}
      className="rounded-lg bg-gray-100"
    />
  );
}

interface SpanItemRowData {
  id: string;
  item_name: string;
  distance_from: number;
  distance_to: number;
  length: number; // Auto-calculated by backend
  latitude_from?: number;
  longitude_from?: number;
  latitude_to?: number;
  longitude_to?: number;
  soil_type?: string;
  [key: string]: string | number | undefined;
}

// Extended interface for detailed span item from API
interface SpanItemDetailResponse {
  id: any;
  span_id: any;
  item_name: string | null;
  distance_from?: number;
  distance_to?: number;
  length?: number;
  latitude_from?: number;
  longitude_from?: number;
  latitude_to?: number;
  longitude_to?: number;
  soil_type?: string;
  offset?: number | null;
  depth?: number | null;
  date?: string;
  location?: string;
  ss_link?: string;
  latitude?: number;
  longitude?: number;
  created_at?: string;
  updated_at?: string | null;
}

interface TabSpanItemsProps {
  spanItems: any[];
  spanName: string;
  loading?: boolean;
}

export function TabSpanItems({ spanItems, spanName, loading }: TabSpanItemsProps) {
  const [selectedRow, setSelectedRow] = useState<SpanItemRowData | null>(null);
  const [selectedItemDetail, setSelectedItemDetail] = useState<SpanItemDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [rowData, setRowData] = useState<SpanItemRowData[]>([]);

  // Convert API data to grid format
  useEffect(() => {
    const formattedData: SpanItemRowData[] = spanItems.map((item, index) => {
      // Extract ID properly - handle nested object format {tb: "span_items", id: {String: "abc"}} or {tb: "span_items", id: "abc"}
      let extractedId = `item-${index}`;
      if (item.id) {
        if (typeof item.id === 'string') {
          extractedId = item.id;
        } else if (item.id.id) {
          // Handle nested format
          if (typeof item.id.id === 'string') {
            extractedId = item.id.id;
          } else if (item.id.id.String) {
            extractedId = item.id.id.String;
          }
        }
      }
      
      console.log('🔍 [TabSpanItems] Raw item.id:', JSON.stringify(item.id));
      console.log('✅ [TabSpanItems] Extracted ID:', extractedId);
      
      return {
        id: extractedId,
        item_name: item.item_name || '-',
        distance_from: item.distance_from || 0,
        distance_to: item.distance_to || 0,
        length: item.length || 0, // Use length from backend
        latitude_from: item.latitude_from,
        longitude_from: item.longitude_from,
        latitude_to: item.latitude_to,
        longitude_to: item.longitude_to,
        soil_type: item.soil_type || '-',
      };
    });
    setRowData(formattedData);
  }, [spanItems]);

  // Fetch detailed span item data when row is clicked
  const handleRowClick = async (itemId: string, rowData: SpanItemRowData) => {
    setSelectedRow(rowData);
    setLoadingDetail(true);
    
    try {
      console.log('🔍 Fetching span item detail for ID:', itemId);
      const detailData = await spanService.getSpanItemById(itemId);
      console.log('✅ Span item detail fetched:', detailData);
      
      // Convert SpanItemResponse to SpanItemDetailResponse format
      const convertedDetail: SpanItemDetailResponse = {
        ...detailData,
        distance_from: rowData.distance_from,
        distance_to: rowData.distance_to,
        length: rowData.length,
        latitude_from: rowData.latitude_from,
        longitude_from: rowData.longitude_from,
        latitude_to: rowData.latitude_to,
        longitude_to: rowData.longitude_to,
        soil_type: detailData.soil_type || rowData.soil_type,
      };
      
      setSelectedItemDetail(convertedDetail);
    } catch (error) {
      console.error('❌ Failed to fetch span item detail:', error);
      // Still show basic data from row if API fails
      setSelectedItemDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Column definitions
  const columnDefs: ColDef[] = [
    { field: 'item_name', headerName: 'ITEM NAME', width: 200 },
    { 
      field: 'distance_from', 
      headerName: 'DISTANCE FROM (m)', 
      width: 150,
      valueFormatter: (params) => params.value?.toFixed(2) || '0.00'
    },
    { 
      field: 'distance_to', 
      headerName: 'DISTANCE TO (m)', 
      width: 150,
      valueFormatter: (params) => params.value?.toFixed(2) || '0.00'
    },
    { 
      field: 'latitude_from', 
      headerName: 'LAT FROM', 
      width: 120,
      valueFormatter: (params) => params.value ? params.value.toFixed(6) : '-'
    },
    { 
      field: 'longitude_from', 
      headerName: 'LON FROM', 
      width: 120,
      valueFormatter: (params) => params.value ? params.value.toFixed(6) : '-'
    },
    { 
      field: 'latitude_to', 
      headerName: 'LAT TO', 
      width: 120,
      valueFormatter: (params) => params.value ? params.value.toFixed(6) : '-'
    },
    { 
      field: 'longitude_to', 
      headerName: 'LON TO', 
      width: 120,
      valueFormatter: (params) => params.value ? params.value.toFixed(6) : '-'
    },
    { field: 'soil_type', headerName: 'SOIL TYPE', width: 150 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-3 text-gray-600">Loading span items...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-2">
      <div className={`flex-1 bg-white rounded-lg shadow-sm`} style={{ height: '600px' }}>
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900" style={{fontWeight : 600}}>Span Items - {spanName}</h3>
              <p className="text-xs text-gray-500 mt-1">
                Total Items: <span className="font-medium text-gray-700">{rowData.length}</span>
              </p>
            </div>
          </div>
        </div>
        <div className="ag-theme-quartz" style={{ height: 'calc(100% - 100px)', width: '100%' }}>
          <style>{`
            .ag-theme-quartz .ag-row {
              border-bottom: 1px solid #E5E7EB;
            }
            .ag-theme-quartz .ag-row:hover {
              background-color: #F9FAFB !important;
              cursor: pointer;
            }
            .ag-theme-quartz .ag-cell {
              font-size: 13px;
              color: #1F2937;
            }
            .ag-theme-quartz .ag-row:focus,
            .ag-theme-quartz .ag-cell:focus {
              outline: 0 !important;
              box-shadow: none !important;
            }
          `}</style>
          <AgGridReact
            rowData={rowData}
            columnDefs={columnDefs}
            animateRows={true}
            suppressCellFocus={true}
            theme={themeQuartz}
            onCellClicked={(event) => {
              if (event.data) {
                handleRowClick(event.data.id, event.data);
              }
            }}
            defaultColDef={{
              sortable: true,
              filter: true,
              resizable: true,
              suppressSizeToFit: true,
            }}
            rowHeight={42}
            headerHeight={44}
            suppressClickEdit={true}
            suppressHorizontalScroll={false}
          />
        </div>
      </div>

      {selectedRow && (
        <div className="w-80 bg-white border border-gray-200 shadow-lg flex flex-col rounded-lg" style={{ height: '600px' }}>
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-[#003A70] to-[#005EB8]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white text-sm font-semibold">Item Detail</h3>
                <p className="text-xs text-blue-100 mt-1">{selectedRow.item_name}</p>
              </div>
              <button
                onClick={() => setSelectedRow(null)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loadingDetail ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
                <span className="ml-3 text-sm text-gray-600">Loading details...</span>
              </div>
            ) : (
              <>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-xs font-semibold text-gray-700 mb-3">Item Information</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Item Name:</span>
                      <span className="text-gray-900 font-medium">{selectedItemDetail?.item_name || selectedRow.item_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Distance From:</span>
                      <span className="text-gray-900 font-medium">{(selectedItemDetail?.distance_from || selectedRow.distance_from).toFixed(2)} m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Distance To:</span>
                      <span className="text-gray-900 font-medium">{(selectedItemDetail?.distance_to || selectedRow.distance_to).toFixed(2)} m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Length:</span>
                      <span className="text-gray-900 font-medium">
                        {(selectedItemDetail?.length || selectedRow.length || 0).toFixed(2)} m
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Soil Type:</span>
                      <span className="text-gray-900 font-medium">{selectedItemDetail?.soil_type || selectedRow.soil_type}</span>
                    </div>
                  </div>
                </div>

                {/* Map with Line from From to To */}
                {((selectedItemDetail?.latitude_from || selectedRow.latitude_from) && 
                  (selectedItemDetail?.longitude_from || selectedRow.longitude_from) &&
                  (selectedItemDetail?.latitude_to || selectedRow.latitude_to) &&
                  (selectedItemDetail?.longitude_to || selectedRow.longitude_to)) && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-xs font-semibold text-gray-700 mb-3">Location Map</h4>
                    <SpanItemLineMap
                      longitudeFrom={selectedItemDetail?.longitude_from || selectedRow.longitude_from || 0}
                      latitudeFrom={selectedItemDetail?.latitude_from || selectedRow.latitude_from || 0}
                      longitudeTo={selectedItemDetail?.longitude_to || selectedRow.longitude_to || 0}
                      latitudeTo={selectedItemDetail?.latitude_to || selectedRow.latitude_to || 0}
                      soilType={selectedItemDetail?.soil_type || selectedRow.soil_type}
                    />
                    <div className="mt-2 bg-white px-3 py-2 rounded text-xs border border-gray-200">
                      <div className="text-gray-600">
                        Point From: {(selectedItemDetail?.latitude_from || selectedRow.latitude_from)?.toFixed(6)}, {(selectedItemDetail?.longitude_from || selectedRow.longitude_from)?.toFixed(6)}
                      </div>
                      <div className="text-gray-600">
                        Point To: {(selectedItemDetail?.latitude_to || selectedRow.latitude_to)?.toFixed(6)}, {(selectedItemDetail?.longitude_to || selectedRow.longitude_to)?.toFixed(6)}
                      </div>
                      {(selectedItemDetail?.soil_type || selectedRow.soil_type) && (
                        <div className="text-gray-600 mt-1">
                          Soil Type: <span className="font-medium">{SOIL_TYPES.find(s => s.value === (selectedItemDetail?.soil_type || selectedRow.soil_type))?.label || (selectedItemDetail?.soil_type || selectedRow.soil_type)}</span>
                          <span 
                            className="inline-block w-4 h-4 ml-2 rounded" 
                            style={{ backgroundColor: SOIL_TYPES.find(s => s.value === (selectedItemDetail?.soil_type || selectedRow.soil_type))?.color || '#f97316' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
