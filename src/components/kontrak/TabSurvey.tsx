import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Sparkles, X, Upload, Trash2, MapPin, Navigation, Tag, Edit, Search, CheckCircle } from 'lucide-react';
import { OrbitProgress } from 'react-loading-indicators';
import { Toast } from '@/components/ui/Toast';
import { MapPickerModal } from '@/components/modals/span/MapPickerModal';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import '@/styles/ag-grid-custom.css';
import { surveyService, SurveyResponse } from '@/services/surveyService';
import { authService } from '@/services/authService';
import { designatorV2Service, type DesignatorV2 } from '@/services/designatorV2Service';

// Register AG Grid modules
ModuleRegistry.registerModules([AllEnterpriseModule]);

// Custom Cell Renderer for Submitted By column
const SubmittedByCellRenderer = (props: any) => {
  const submitVia = props.data?.submit_via;
  const createdByUsername = props.data?.created_by_username;
  const createdBy = props.data?.created_by;

  // Try to get username from multiple sources
  let username = 'Unknown';

  if (createdByUsername) {
    username = createdByUsername;
  } else if (createdBy) {
    // If created_by is an object with id, try to extract it
    if (typeof createdBy === 'object' && createdBy.id) {
      const userId = typeof createdBy.id === 'string' ? createdBy.id : createdBy.id.String;
      // Use the user ID as fallback (you might want to fetch user details separately)
      username = `User ${userId.substring(0, 8)}...`;
    } else if (typeof createdBy === 'string') {
      username = createdBy;
    }
  }

  // Format device name
  const device = submitVia ? submitVia.charAt(0).toUpperCase() + submitVia.slice(1) : 'Unknown';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      height: '100%',
      padding: '4px 0'
    }}>
      <div style={{
        fontWeight: 600,
        color: '#1f2937',
        fontSize: '0.875rem',
        lineHeight: '1.25'
      }}>
        {username}
      </div>
      <div style={{
        fontSize: '0.75rem',
        color: '#6b7280',
        lineHeight: '1.25',
        marginTop: '2px'
      }}>
        submitted by {device}
      </div>
    </div>
  );
};

interface TabSurveyProps {
  contractId: string;
  contractName: string;
  linkId?: string; // NEW: Optional link ID for fetching spans
  onDataChanged?: () => void; // NEW: Callback when survey data changes (create/edit/delete)
}

export function TabSurvey({ contractName, contractId, linkId, onDataChanged }: TabSurveyProps) {
  const [showAddSurveyModal, setShowAddSurveyModal] = useState(false);
  const [showEditSurveyModal, setShowEditSurveyModal] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<SurveyResponse | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'automatic'>('manual');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSurveys, setIsLoadingSurveys] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  const [surveyForm, setSurveyForm] = useState({
    date: '',
    location: '',
    latitude: '',
    longitude: '',
    designators: [] as string[], // Multiple designators - will be sent as item_name array to backend
    span: '', // Selected Span ID
    ssLink: '', // Selected SS/Link ID
  });
  
  // Autocomplete state
  const [designatorSearchQuery, setDesignatorSearchQuery] = useState('');
  const [showDesignatorDropdown, setShowDesignatorDropdown] = useState(false);
  
  // Table search state
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [evidencePhotos, setEvidencePhotos] = useState<File[]>([]);
  const [evidenceVideos, setEvidenceVideos] = useState<File[]>([]); // NEW: Video evidence
  const [isDragging, setIsDragging] = useState(false);
  const [surveyData, setSurveyData] = useState<SurveyResponse[]>([]);
  const [designatorsV2, setDesignatorsV2] = useState<DesignatorV2[]>([]);
  const [selectedDesignators, setSelectedDesignators] = useState<string[]>([]);
  const [isLoadingDesignators, setIsLoadingDesignators] = useState(false)
  const [spans, setSpans] = useState<any[]>([]); // Available Spans
  const [isLoadingSpans, setIsLoadingSpans] = useState(false); // Loading state
  const [links, setLinks] = useState<any[]>([]); // NEW: Available SS/Links
  const [isLoadingLinks, setIsLoadingLinks] = useState(false); // NEW: Loading state for links
  const [kmlData, setKmlData] = useState<any>(null); // NEW: KML data for MapPickerModal
  const [isLoadingKml, setIsLoadingKml] = useState(false); // NEW: Loading state for KML data

  // Ref for dropdown - NOT NEEDED ANYMORE
  // const spanDropdownRef = useRef<HTMLDivElement>(null);

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [surveyToDelete, setSurveyToDelete] = useState<SurveyResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Ref for designator dropdown
  const designatorDropdownRef = useRef<HTMLDivElement>(null);

  // Filter survey data based on search query
  const filteredSurveyData = surveyData.filter((survey) => {
    if (!tableSearchQuery) return true;
    
    // Search in item_name (designator)
    const itemName = survey.item_name || '';
    return itemName.toLowerCase().includes(tableSearchQuery.toLowerCase());
  });

  // Fetch surveys and designators on component mount
  useEffect(() => {
    console.log('🔄 TabSurvey mounted, fetching data...');
    fetchSurveys();
    fetchDesignatorsV2(); // Fetch designators V2
    fetchSpans(); // Fetch spans
    fetchLinks(); // Fetch links
    fetchKMLData(); // Fetch KML data
  }, [contractId, linkId]); // Re-fetch when contractId or linkId changes

  // Sync selectedDesignators with surveyForm.designators
  useEffect(() => {
    setSurveyForm(prev => ({ ...prev, designators: selectedDesignators }));
  }, [selectedDesignators]);

  // Auto-fill SS/Link when linkId is provided
  useEffect(() => {
    if (linkId && links.length > 0) {
      console.log('🔄 Auto-filling SS/Link with linkId:', linkId);
      setSurveyForm(prev => ({ ...prev, ssLink: linkId }));
    }
  }, [linkId, links]);

  // Close designator dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (designatorDropdownRef.current && !designatorDropdownRef.current.contains(event.target as Node)) {
        setShowDesignatorDropdown(false);
      }
    };

    if (showDesignatorDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDesignatorDropdown]);

  // Filter spans based on selected SS/Link
  const filteredSpans = spans.filter(span => {
    // If no link is selected, show all spans
    if (!surveyForm.ssLink) return true;
    
    // Check if span has link_id that matches selected SS/Link
    const spanLinkId = (span as any).link_id;
    
    if (spanLinkId) {
      // Extract link ID from nested structure
      let linkIdStr = '';
      
      if (typeof spanLinkId === 'string') {
        linkIdStr = spanLinkId;
      } else if (typeof spanLinkId === 'object' && spanLinkId.id) {
        // Handle structure: {tb: "link", id: {String: "xxx"}}
        const nestedId = spanLinkId.id;
        if (typeof nestedId === 'string') {
          linkIdStr = nestedId;
        } else if (typeof nestedId === 'object' && nestedId.String) {
          linkIdStr = nestedId.String;
        }
      }
      
      console.log(`🔍 Comparing span link_id "${linkIdStr}" with selected link "${surveyForm.ssLink}"`);
      return linkIdStr === surveyForm.ssLink;
    }
    
    // If span doesn't have link_id, show it (backward compatibility)
    return true;
  });

  const fetchDesignatorsV2 = async () => {
    setIsLoadingDesignators(true);
    try {
      const data = await designatorV2Service.getAllDesignators();
      setDesignatorsV2(data);
      console.log('✅ Loaded', data.length, 'designators v2');
    } catch (error) {
      console.error('Error fetching designators v2:', error);
      setToastMessage('Failed to load designators. Please try again.');
      setToastType('error');
      setShowToast(true);
    } finally {
      setIsLoadingDesignators(false);
    }
  };

  const fetchSpans = async () => {
    setIsLoadingSpans(true);
    try {
      const { spanService } = await import('@/services/spanService');
      
      // Use link_id if available, otherwise fall back to project_id only
      let data;
      if (linkId) {
        console.log('📡 Fetching spans with link_id:', linkId);
        data = await spanService.getSpansByProjectIdAndLinkId(contractId, linkId);
      } else {
        console.log('📡 Fetching spans without link_id (all spans for project)');
        data = await spanService.getSpansByProjectId(contractId);
      }
      
      console.log('✅ Loaded', data.length, 'spans');
      setSpans(data);
    } catch (error) {
      console.error('Error fetching spans:', error);
      setToastMessage('Failed to load Spans. Please try again.');
      setToastType('error');
      setShowToast(true);
    } finally {
      setIsLoadingSpans(false);
    }
  };

  const fetchLinks = async () => {
    setIsLoadingLinks(true);
    try {
      const { linkService } = await import('@/services/linkService');
      const token = authService.getToken();
      const data = await linkService.getLinksByProjectId(contractId, token);
      console.log('✅ Loaded', data.length, 'links');
      setLinks(data);
    } catch (error) {
      console.error('Error fetching links:', error);
      setToastMessage('Failed to load SS/Links. Please try again.');
      setToastType('error');
      setShowToast(true);
    } finally {
      setIsLoadingLinks(false);
    }
  };

  const fetchKMLData = async () => {
    setIsLoadingKml(true);
    try {
      const { default: axios } = await import('axios');
      const token = authService.getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
      
      // Fetch KML data from project
      const response = await axios.get(`${apiUrl}/projects/${contractId}/kml`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ KML data fetched for TabSurvey:', response.data);
      setKmlData(response.data);
    } catch (error) {
      console.error('❌ Error fetching KML data:', error);
      setToastMessage('Failed to load map data. Please try again.');
      setToastType('error');
      setShowToast(true);
    } finally {
      setIsLoadingKml(false);
    }
  };

  const fetchSurveys = async () => {
    setIsLoadingSurveys(true);
    try {
      // Use new endpoint to get surveys by project ID
      const surveys = await surveyService.getSurveysByProjectId(contractId);
      console.log('✅ Surveys fetched for project:', contractId);
      console.log('✅ Total surveys:', surveys.length, 'items');
      console.log('📋 First survey:', surveys[0]);
      
      // Filter surveys by linkId if provided
      let filteredSurveys = surveys;
      if (linkId) {
        filteredSurveys = surveys.filter(survey => {
          const surveyLinkId = typeof survey.ss_link === 'string'
            ? survey.ss_link
            : (survey.ss_link as any)?.id?.String || (survey.ss_link as any)?.id;
          
          console.log(`🔍 Comparing survey link "${surveyLinkId}" with selected link "${linkId}"`);
          return surveyLinkId === linkId;
        });
        console.log(`✅ Filtered surveys: ${filteredSurveys.length} out of ${surveys.length} surveys match link ${linkId}`);
      }
      
      setSurveyData(filteredSurveys);
    } catch (error) {
      console.error('Error fetching surveys:', error);
      setToastMessage('Failed to load surveys. Please try again.');
      setToastType('error');
      setShowToast(true);
    } finally {
      setIsLoadingSurveys(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setEvidencePhotos([...evidencePhotos, ...newFiles]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setEvidencePhotos(evidencePhotos.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
      setEvidencePhotos([...evidencePhotos, ...files]);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessAI(file);
    }
  };

  const handleProcessAI = async (file: File) => {
    setIsProcessing(true);
    setAiResult(null);

    try {
      const { aiService } = await import('@/services/aiService');
      const { authService } = await import('@/services/authService');

      const token = authService.getToken();

      console.log('🔄 Starting AI analysis...');
      console.log('📁 File:', file.name, 'Size:', file.size, 'Type:', file.type);
      console.log('🔑 Token available:', !!token);
      if (token) {
        console.log('🔑 Token preview:', token.substring(0, 20) + '...');
      }

      // Upload image first to get ss_link
      let uploadedImageUrl = '';
      try {
        console.log('📤 Uploading evidence file...');
        console.log('📤 Calling surveyService.uploadEvidence with token:', !!token);
        const uploadedEvidence = await surveyService.uploadEvidence(file, token);
        uploadedImageUrl = uploadedEvidence.file_path || uploadedEvidence.url || '';
        console.log('✅ Image uploaded successfully:', uploadedImageUrl);
        console.log('✅ Upload response:', uploadedEvidence);
      } catch (uploadError) {
        console.error('❌ Failed to upload image:', uploadError);
        console.error('❌ Upload error details:', {
          message: uploadError instanceof Error ? uploadError.message : 'Unknown',
          stack: uploadError instanceof Error ? uploadError.stack : undefined
        });
        setAiResult({
          error: `Failed to upload image: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`
        });
        setIsProcessing(false);
        return;
      }

      // Analyze image with AI
      console.log('🤖 Analyzing image with AI...');
      const response = await aiService.analyzeImage(file, token);
      console.log('📥 AI response:', response);

      if (response.success && response.result) {
        const mappedResult = {
          catatan: response.result.catatan,
          papan_informasi: response.result.papan_informasi, // Add papan_informasi
          gps_coordinates: response.result.lokasi?.koordinat ? {
            latitude: response.result.lokasi.koordinat.latitude || '',
            longitude: response.result.lokasi.koordinat.longitude || ''
          } : undefined,
          lokasi: response.result.lokasi?.alamat || '',
          image_url: uploadedImageUrl, // Add uploaded image URL for ss_link
        };
        console.log('✅ AI analysis successful:', mappedResult);
        setAiResult(mappedResult);
      } else {
        console.error('❌ AI analysis failed:', response.error);
        // Show more detailed error message
        const errorMsg = response.error || 'Analysis failed';
        const detailedError = errorMsg.includes('Failed to fetch')
          ? 'AI service is not available. Please check if the backend AI service is running.'
          : errorMsg;
        setAiResult({ error: detailedError });
      }
    } catch (error) {
      console.error('💥 Exception in handleProcessAI:', error);
      setAiResult({
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddSurvey = async () => {
    setIsSaving(true);
    try {
      const token = authService.getToken() || null;

      // Check if token exists for authenticated endpoints
      if (!token) {
        setToastMessage('Your session has expired. Please login again.');
        setToastType('warning');
        setShowToast(true);
        setIsSaving(false);
        return;
      }

      let surveyPayload: any = {
        project_id: contractId,
      };

      // Handle Manual Tab
      if (activeTab === 'manual') {
        // Comprehensive validation for Manual tab - collect all missing fields
        const missingFields: string[] = [];

        if (!surveyForm.date || surveyForm.date.trim() === '') {
          missingFields.push('Survey Date');
        }
        if (!surveyForm.location || surveyForm.location.trim() === '') {
          missingFields.push('Location');
        }
        if (!surveyForm.latitude || surveyForm.latitude.trim() === '') {
          missingFields.push('Latitude');
        }
        if (!surveyForm.longitude || surveyForm.longitude.trim() === '') {
          missingFields.push('Longitude');
        }
        if (!surveyForm.span || surveyForm.span.trim() === '') {
          missingFields.push('Span ID');
        }
        if (!linkId || linkId.trim() === '') {
          missingFields.push('SS/Link');
        }
        if (evidencePhotos.length === 0) {
          missingFields.push('Evidence Photo');
        }

        // Show alert if any required field is missing
        if (missingFields.length > 0) {
          setValidationErrors(missingFields);
          setShowValidationModal(true);
          setIsSaving(false);
          return;
        }

        // Upload evidence file first to get file path for evidence field
        try {
          console.log('🔄 Starting evidence upload...');
          console.log('📁 File to upload:', evidencePhotos[0].name, evidencePhotos[0].size, 'bytes');

          const uploadedEvidence = await surveyService.uploadEvidence(evidencePhotos[0], token);

          console.log('✅ Upload successful, building survey payload...');

          // Upload video evidence if provided (optional)
          let uploadedVideo = null;
          if (evidenceVideos.length > 0) {
            console.log('🎥 Starting video upload...');
            console.log('📁 Video to upload:', evidenceVideos[0].name, evidenceVideos[0].size, 'bytes');
            uploadedVideo = await surveyService.uploadVideoEvidence(evidenceVideos[0], token);
            console.log('✅ Video uploaded successfully:', uploadedVideo);
          }

          // Build payload according to API v2.1
          // Use linkId from props (user already selected link from Survey page)
          surveyPayload = {
            project_id: contractId,
            date: surveyForm.date.includes('Z') ? surveyForm.date : `${surveyForm.date}:00Z`,
            location: surveyForm.location,
            ss_link: linkId, // Link ID from props (REQUIRED)
            submit_via: 'web', // Always web for web interface
          };

          console.log('🔍 Using linkId from props:', linkId);

          // Add optional fields only if they have values
          if (surveyForm.latitude && surveyForm.latitude.trim() !== '') {
            surveyPayload.latitude = parseFloat(surveyForm.latitude);
          }
          if (surveyForm.longitude && surveyForm.longitude.trim() !== '') {
            surveyPayload.longitude = parseFloat(surveyForm.longitude);
          }
          // Send designators array as item_name to backend (multiple designators)
          if (surveyForm.designators && surveyForm.designators.length > 0) {
            surveyPayload.item_name = surveyForm.designators; // Send as array
          }
          // Add span_id if selected
          if (surveyForm.span && surveyForm.span.trim() !== '') {
            console.log('🔍 Adding span_id to payload:', surveyForm.span);
            console.log('🔍 Type of span_id:', typeof surveyForm.span);
            console.log('🔍 Is string?', typeof surveyForm.span === 'string');
            
            // Ensure span_id is a string
            const spanIdString = String(surveyForm.span);
            surveyPayload.span_id = spanIdString;
            
            console.log('🔍 Final span_id in payload:', spanIdString);
          }

          // Add evidence metadata (optional)
          if (uploadedEvidence) {
            surveyPayload.evidence = {
              file_path: uploadedEvidence.file_path,
              file_name: uploadedEvidence.file_name,
              file_type: uploadedEvidence.file_type,
              file_size: uploadedEvidence.file_size,
              file_category: 'field_evidence',
            };
          }

          // Add video evidence metadata (optional)
          if (uploadedVideo) {
            surveyPayload.video_evidence = {
              file_path: uploadedVideo.file_path,
              file_name: uploadedVideo.file_name,
              file_type: uploadedVideo.file_type,
              file_size: uploadedVideo.file_size,
              file_category: 'survey_video',
            };
          }

          console.log('📤 Survey payload to send:', JSON.stringify(surveyPayload, null, 2));
        } catch (uploadError: any) {
          console.error('❌ Upload error caught:', uploadError);
          console.error('❌ Error type:', typeof uploadError);
          console.error('❌ Error message:', uploadError?.message || String(uploadError));
          console.error('❌ Error stack:', uploadError?.stack);

          // Provide user-friendly error messages
          let errorMessage = 'Failed to upload evidence';

          if (uploadError?.message) {
            if (uploadError.message.includes('401') || uploadError.message.includes('Authentication failed')) {
              errorMessage = 'Your session has expired. Please login again.';
              setToastType('warning');
            } else if (uploadError.message.includes('Network error') || uploadError.message.includes('Cannot connect')) {
              errorMessage = 'Cannot connect to backend server. Please check:\n• Backend is running at http://127.0.0.1:8080\n• No firewall blocking the connection\n• CORS is properly configured';
              setToastType('error');
            } else if (uploadError.message.includes('403') || uploadError.message.includes('forbidden')) {
              errorMessage = 'Access forbidden. You do not have permission to upload files.';
              setToastType('error');
            } else {
              errorMessage = uploadError.message;
              setToastType('error');
            }
          }

          setToastMessage(errorMessage);
          setShowToast(true);
          setIsSaving(false);
          return;
        }
      }
      // Handle AI Detection Tab
      else if (activeTab === 'automatic') {
        // Validation for AI tab - collect all missing fields
        const missingFields: string[] = [];

        if (!aiResult || aiResult.error) {
          missingFields.push('AI Image Analysis (please analyze an image first)');
        }
        if (!surveyForm.span || surveyForm.span.trim() === '') {
          missingFields.push('Span ID');
        }
        if (aiResult && !aiResult.image_url) {
          missingFields.push('Image Upload (upload failed, please try again)');
        }

        // Show alert if any required field is missing
        if (missingFields.length > 0) {
          setValidationErrors(missingFields);
          setShowValidationModal(true);
          setIsSaving(false);
          return;
        }

        // Build payload according to API v2.1
        surveyPayload = {
          project_id: contractId,
          date: new Date().toISOString(),
          location: aiResult.lokasi || 'Unknown Location',
          ss_link: aiResult.image_url, // REQUIRED - from uploaded image
          submit_via: 'web', // Always web for web interface
        };

        // Add GPS coordinates if available
        if (aiResult.gps_coordinates?.latitude) {
          const lat = parseFloat(aiResult.gps_coordinates.latitude);
          if (!isNaN(lat)) {
            surveyPayload.latitude = lat;
          }
        }
        if (aiResult.gps_coordinates?.longitude) {
          const lon = parseFloat(aiResult.gps_coordinates.longitude);
          if (!isNaN(lon)) {
            surveyPayload.longitude = lon;
          }
        }

        // Add item_name from AI result if available (from catatan.kode)
        // If not available, item_name will be null (optional field)
        if (aiResult.catatan?.kode) {
          surveyPayload.item_name = aiResult.catatan.kode;
        }

        // Add span_id from form (REQUIRED for AI tab)
        if (surveyForm.span && surveyForm.span.trim() !== '') {
          console.log('🔍 Adding span_id to payload (AI):', surveyForm.span);
          console.log('🔍 Type of span_id:', typeof surveyForm.span);
          console.log('🔍 Is string?', typeof surveyForm.span === 'string');
          
          // Ensure span_id is a string
          const spanIdString = String(surveyForm.span);
          surveyPayload.span_id = spanIdString;
          
          console.log('🔍 Final span_id in payload:', spanIdString);
        }

        console.log('📤 Survey payload to send (AI):', JSON.stringify(surveyPayload, null, 2));
      }

      // Create survey via API - returns array of surveys
      const newSurveys = await surveyService.createSurvey(surveyPayload, token);

      console.log('✅ Survey(s) created:', newSurveys);
      console.log('✅ Number of surveys created:', newSurveys.length);
      
      // Add new surveys to the top of the list
      setSurveyData(prevData => [...newSurveys, ...prevData]);

      // Show success toast with count
      const surveyCount = newSurveys.length;
      const message = surveyCount > 1 
        ? `${surveyCount} surveys created successfully!` 
        : 'Survey created successfully!';
      setToastMessage(message);
      setToastType('success');
      setShowToast(true);

      // Refresh local survey list first
      await fetchSurveys();

      // Trigger parent refetch for KML and Survey data
      if (onDataChanged) {
        console.log('🔄 Triggering parent data refetch after survey created');
        onDataChanged();
      }

      // Close modal and reset form
      handleClose();
    } catch (error: any) {
      console.error('Error creating survey:', error);
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes('401')) {
        setToastMessage('Your session has expired. Please login again.');
        setToastType('warning');
      } else {
        setToastMessage(`Failed to create survey: ${errorMessage}`);
        setToastType('error');
      }
      setShowToast(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setSurveyForm({
      date: '',
      location: '',
      latitude: '',
      longitude: '',
      designators: [],
      span: '',
      ssLink: linkId || '', // Reset to linkId if provided, otherwise empty
    });
    setSelectedDesignators([]); // Reset selected designators
    setDesignatorSearchQuery(''); // Reset search query
    setShowDesignatorDropdown(false); // Close dropdown
    setAiResult(null);
    setIsProcessing(false);
    setIsSaving(false);
    setActiveTab('manual'); // Reset to manual tab
    setEvidencePhotos([]);
    setEvidenceVideos([]); // Reset videos
    setShowAddSurveyModal(false);
    setShowMapPicker(false);
  };

  const handleLocationSelect = (longitude: number, latitude: number) => {
    setSurveyForm({
      ...surveyForm,
      longitude: longitude.toString(),
      latitude: latitude.toString()
    });
    setShowMapPicker(false);
  };

  const handleSubmit = () => {
    handleAddSurvey();
  };

  const handleEditRow = (row: SurveyResponse) => {
    setEditingSurvey(row);

    // Convert datetime to datetime-local format (YYYY-MM-DDTHH:MM)
    const dateObj = new Date(row.date);
    const localDate = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    console.log('📝 Editing survey:', row);
    console.log('📝 Survey ID:', row.id);

    // Extract span_id from row if available
    let spanId = '';
    if (row.span_id) {
      if (typeof row.span_id === 'object' && 'id' in row.span_id) {
        const nestedId = (row.span_id as any).id;
        if (typeof nestedId === 'string') {
          spanId = nestedId;
        } else if (typeof nestedId === 'object' && nestedId.String) {
          spanId = nestedId.String;
        }
      } else if (typeof row.span_id === 'string') {
        spanId = row.span_id;
      }
    }

    setSurveyForm({
      date: localDate,
      location: row.location,
      latitude: row.latitude?.toString() || '',
      longitude: row.longitude?.toString() || '',
      designators: row.item_name ? [row.item_name] : [], // item_name from backend -> designators array in form
      span: spanId, // Extract span_id from row
      ssLink: typeof row.ss_link === 'string' ? row.ss_link : (row.ss_link as any)?.id?.String || '',
    });
    // Set selectedDesignators for edit mode
    setSelectedDesignators(row.item_name ? [row.item_name] : []);
    setShowEditSurveyModal(true);
  };

  const handleDeleteRow = (row: SurveyResponse) => {
    // Show delete confirmation modal
    setSurveyToDelete(row);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!surveyToDelete) return;

    setIsDeleting(true);
    try {
      const token = authService.getToken() || null;

      // Extract ID properly - same pattern as TabSpanItems
      let surveyId = 'unknown';
      if (surveyToDelete.id) {
        if (typeof surveyToDelete.id === 'string') {
          surveyId = surveyToDelete.id;
        } else if ((surveyToDelete.id as any).id) {
          // Handle nested format
          const nestedId = (surveyToDelete.id as any).id;
          if (typeof nestedId === 'string') {
            surveyId = nestedId;
          } else if (nestedId.String) {
            surveyId = nestedId.String;
          }
        } else if ((surveyToDelete.id as any).String) {
          // Direct String property
          surveyId = (surveyToDelete.id as any).String;
        }
      }

      console.log('🔍 Raw row.id:', JSON.stringify(surveyToDelete.id));
      console.log('✅ Extracted survey ID for delete:', surveyId);

      await surveyService.deleteSurvey(surveyId, token);

      // Show success toast
      setToastMessage('Survey deleted successfully!');
      setToastType('success');
      setShowToast(true);

      // Trigger parent refetch for KML and Survey data
      if (onDataChanged) {
        console.log('🔄 Triggering parent data refetch after survey deleted');
        onDataChanged();
      }

      // Close modal
      setShowDeleteModal(false);
      setSurveyToDelete(null);

      await fetchSurveys();
    } catch (error: any) {
      console.error('Error deleting survey:', error);
      const errorMessage = error?.message || String(error);
      setToastMessage(`Failed to delete survey: ${errorMessage}`);
      setToastType('error');
      setShowToast(true);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateSurvey = async () => {
    if (!editingSurvey) return;

    setIsSaving(true);
    try {
      const token = authService.getToken() || null;

      if (!token) {
        setToastMessage('Your session has expired. Please login again.');
        setToastType('warning');
        setShowToast(true);
        setIsSaving(false);
        return;
      }

      // Validation - date, location, latitude, and longitude are required
      if (!surveyForm.date || !surveyForm.location || !surveyForm.latitude || !surveyForm.longitude) {
        setToastMessage('Please fill in all required fields (Survey Date, Location, Latitude, and Longitude).');
        setToastType('warning');
        setShowToast(true);
        setIsSaving(false);
        return;
      }

      // Build update payload according to API v2.1
      const updatePayload: any = {
        date: surveyForm.date.includes('Z') ? surveyForm.date : `${surveyForm.date}:00Z`,
        location: surveyForm.location,
      };

      // Add optional fields only if they have values
      if (surveyForm.latitude && surveyForm.latitude.trim() !== '') {
        updatePayload.latitude = parseFloat(surveyForm.latitude);
      }
      if (surveyForm.longitude && surveyForm.longitude.trim() !== '') {
        updatePayload.longitude = parseFloat(surveyForm.longitude);
      }
      // Send designators as comma-separated string (backend expects string, not array)
      if (surveyForm.designators && surveyForm.designators.length > 0) {
        updatePayload.item_name = surveyForm.designators.join(', '); // Send as comma-separated string
      }
      // Always set submit_via to 'web' for web interface
      updatePayload.submit_via = 'web';

      console.log('📤 Update payload:', JSON.stringify(updatePayload, null, 2));

      // Extract ID properly
      let surveyId = 'unknown';
      if (editingSurvey.id) {
        if (typeof editingSurvey.id === 'string') {
          surveyId = editingSurvey.id;
        } else if ((editingSurvey.id as any).id) {
          const nestedId = (editingSurvey.id as any).id;
          if (typeof nestedId === 'string') {
            surveyId = nestedId;
          } else if (nestedId.String) {
            surveyId = nestedId.String;
          }
        } else if ((editingSurvey.id as any).String) {
          surveyId = (editingSurvey.id as any).String;
        }
      }

      console.log('🔍 Raw editingSurvey.id:', JSON.stringify(editingSurvey.id));
      console.log('✅ Extracted survey ID:', surveyId);

      await surveyService.updateSurvey(surveyId, updatePayload, token);

      // Show success toast
      setToastMessage('Survey updated successfully!');
      setToastType('success');
      setShowToast(true);

      // Trigger parent refetch for KML and Survey data
      if (onDataChanged) {
        console.log('🔄 Triggering parent data refetch after survey updated');
        onDataChanged();
      }

      // Refresh survey list
      await fetchSurveys();

      // Close modal and reset
      setShowEditSurveyModal(false);
      setEditingSurvey(null);
      setSurveyForm({
        date: '',
        location: '',
        latitude: '',
        longitude: '',
        designators: [],
        span: '',
        ssLink: linkId || '',
      });
      setSelectedDesignators([]); // Reset selected designators
      setDesignatorSearchQuery(''); // Reset search query
      setShowDesignatorDropdown(false); // Close dropdown
    } catch (error: any) {
      console.error('Error updating survey:', error);
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes('401')) {
        setToastMessage('Your session has expired. Please login again.');
        setToastType('warning');
      } else {
        setToastMessage(`Failed to update survey: ${errorMessage}`);
        setToastType('error');
      }
      setShowToast(true);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle grid ready (kept for future use if needed)
  const onGridReady = (_params: any) => {
    // Grid API can be accessed here if needed in the future
  };

  // Safe getRowId function to handle nested ID structure
  const getRowId = (params: any) => {
    const row = params.data;
    if (!row || !row.id) return Math.random().toString();

    // Handle different ID structures
    if (typeof row.id === 'string') {
      return row.id;
    } else if (row.id.id) {
      const nestedId = row.id.id;
      if (typeof nestedId === 'string') {
        return nestedId;
      } else if (nestedId.String) {
        return nestedId.String;
      }
    } else if (row.id.String) {
      return row.id.String;
    }

    return Math.random().toString();
  };

  // Actions Cell Renderer
  const ActionsCellRenderer = (params: any) => {
    const survey = params.data;
    if (!survey) return null;

    // Extract survey ID
    const getSurveyId = (survey: SurveyResponse): string => {
      if (typeof survey.id === 'string') {
        return survey.id;
      }
      if (typeof survey.id === 'object' && survey.id.id) {
        if (typeof survey.id.id === 'string') {
          return survey.id.id;
        }
        if (typeof survey.id.id === 'object' && (survey.id.id as any).String) {
          return (survey.id.id as any).String;
        }
      }
      return '';
    };

    // Extract link ID
    const getLinkId = (survey: SurveyResponse): string => {
      const ssLink = survey.ss_link;
      if (typeof ssLink === 'string') {
        return ssLink;
      }
      if (typeof ssLink === 'object' && (ssLink as any).id) {
        const id = (ssLink as any).id;
        if (typeof id === 'string') {
          return id;
        }
        if (typeof id === 'object' && id.String) {
          return id.String;
        }
      }
      return '';
    };

    const surveyId = getSurveyId(survey);

    return (
      <div className="flex items-center justify-center gap-1">
        <button
          className="p-1 hover:bg-gray-200 rounded"
          title="Edit"
          onClick={(e) => {
            e.stopPropagation();
            handleEditRow(params.data);
          }}
        >
          <Edit className="w-4 h-4 text-blue-600" />
        </button>
        <button
          className="p-1 hover:bg-gray-200 rounded"
          title="Delete"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteRow(params.data);
          }}
        >
          <Trash2 className="w-4 h-4 text-red-600" />
        </button>
      </div>
    );
  };

  // Column definitions (matching API response structure)
  const columnDefs: ColDef[] = [
    {
      field: 'location',
      headerName: 'LOCATION',
      width: 300,
      minWidth: 250,
      flex: 3,
      pinned: 'left',
      wrapText: true,
      autoHeight: true,
      cellStyle: {
        whiteSpace: 'normal',
        lineHeight: '1.4',
        paddingTop: '8px',
        paddingBottom: '8px'
      }
    },
    {
      field: 'ss_link',
      headerName: 'SS/LINK',
      width: 200,
      minWidth: 180,
      flex: 1.2,
      wrapText: true,
      autoHeight: true,
      cellStyle: {
        whiteSpace: 'normal',
        lineHeight: '1.4',
        paddingTop: '8px',
        paddingBottom: '8px'
      },
      valueGetter: (params) => {
        if (!params.data) return '-';
        
        // Get ss_link ID from survey
        const surveyLinkId = typeof params.data.ss_link === 'string'
          ? params.data.ss_link
          : (params.data.ss_link as any)?.id?.String || (params.data.ss_link as any)?.id;
        
        if (!surveyLinkId) return '-';
        
        // Find matching link in links array
        const matchingLink = links.find(link => {
          const linkIdValue = link.id.id;
          const linkIdStr = typeof linkIdValue === 'string' 
            ? linkIdValue 
            : linkIdValue.String;
          return linkIdStr === surveyLinkId;
        });
        
        if (matchingLink) {
          // Return link name (e.g., "SS#456 STO Selalu Berusaha - STO Pasti Berhasil")
          return matchingLink.link_name || surveyLinkId;
        }
        
        return surveyLinkId; // Fallback to ID if link not found
      }
    },
    {
      field: 'latitude',
      headerName: 'LATITUDE',
      width: 140,
      minWidth: 120,
      flex: 0.6,
      filter: false,
      valueFormatter: (params) => params.value?.toFixed(6) || '-'
    },
    {
      field: 'longitude',
      headerName: 'LONGITUDE',
      width: 140,
      minWidth: 120,
      flex: 0.6,
      filter: false,
      valueFormatter: (params) => params.value?.toFixed(6) || '-'
    },
    {
      field: 'span_id',
      headerName: 'SPAN',
      width: 180,
      minWidth: 150,
      flex: 0.9,
      valueGetter: (params) => {
        if (!params.data) return '-';
        
        // Get span_id from survey
        const surveySpanId = typeof params.data.span_id === 'string'
          ? params.data.span_id
          : (params.data.span_id as any)?.id?.String || (params.data.span_id as any)?.id;
        
        if (!surveySpanId) return '-';
        
        // Find matching span in spans array
        const matchingSpan = spans.find(span => {
          const spanIdValue = span.id.id;
          const spanIdStr = typeof spanIdValue === 'string' 
            ? spanIdValue 
            : spanIdValue.String;
          return spanIdStr === surveySpanId;
        });
        
        if (matchingSpan) {
          // Return span name
          return matchingSpan.span_name || surveySpanId;
        }
        
        return surveySpanId; // Fallback to ID if span not found
      }
    },
    {
      field: 'item_name',
      headerName: 'DESIGNATOR',
      width: 200,
      minWidth: 170,
      flex: 1.2,
      valueFormatter: (params) => params.value || '-'
    },
    {
      field: 'length',
      headerName: 'LENGTH',
      width: 100,
      minWidth: 90,
      flex: 0.5,
      filter: false,
      valueFormatter: (params) => {
        if (!params.value) return '-';
        // Remove decimal if it's .00, otherwise show 2 decimals
        const value = parseFloat(params.value);
        return value % 1 === 0 ? `${Math.round(value)} m` : `${value.toFixed(2)} m`;
      }
    },
    {
      field: 'submit_via',
      headerName: 'SUBMITTED BY',
      width: 200,
      minWidth: 180,
      flex: 1,
      cellRenderer: SubmittedByCellRenderer,
      autoHeight: true,
      filter: 'agSetColumnFilter',
      filterParams: {
        values: ['web', 'mobile'],
        valueFormatter: (params: any) => {
          if (!params.value) return 'Unknown';
          return params.value.charAt(0).toUpperCase() + params.value.slice(1);
        }
      },
      menuTabs: ['filterMenuTab'],
    },
    {
      field: 'date',
      headerName: 'SURVEY DATE',
      width: 180,
      minWidth: 160,
      flex: 0.9,
      filter: false,
      valueFormatter: (params) => {
        if (!params.value) return '-';
        const date = new Date(params.value);
        return date.toLocaleString('id-ID', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    },
    {
      field: 'created_at',
      headerName: 'SUBMITTED DATE',
      width: 180,
      minWidth: 160,
      flex: 0.9,
      filter: false,
      valueFormatter: (params) => {
        if (!params.value) return '-';
        const date = new Date(params.value);
        return date.toLocaleString('id-ID', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    },
    {
      field: 'actions',
      headerName: 'ACTION',
      width: 140,
      minWidth: 120,
      maxWidth: 160,
      pinned: 'right',
      cellRenderer: ActionsCellRenderer,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' } as any,
      sortable: false,
      filter: false,
      resizable: false,
      lockPosition: true,
      suppressMovable: true,
    },
  ];

  return (
    <div className="flex flex-col bg-white relative" style={{ height: '85vh', minHeight: '600px' }}>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="text-lg font-medium" style={{ fontWeight: 600 }}>Data Survey</h3>
          <p className="text-sm text-gray-500 mt-1">Survey data collection and management</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={tableSearchQuery}
              onChange={(e) => setTableSearchQuery(e.target.value)}
              placeholder="Search by designator..."
              className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            {tableSearchQuery && (
              <button
                onClick={() => setTableSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Add Survey Button */}
          <button
            onClick={() => setShowAddSurveyModal(true)}
            style={{
              background: 'linear-gradient(135deg, rgba(0, 94, 184, 0.9) 0%, rgba(0, 119, 215, 0.9) 100%)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              cursor: 'pointer',
              boxShadow: '0 8px 32px 0 rgba(0, 94, 184, 0.37)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 40px 0 rgba(0, 94, 184, 0.5)';
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 94, 184, 1) 0%, rgba(0, 119, 215, 1) 100%)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(0, 94, 184, 0.37)';
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 94, 184, 0.9) 0%, rgba(0, 119, 215, 0.9) 100%)';
            }}
          >
            <Plus className="w-4 h-4" />
            Add Data Survey
          </button>
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-hidden">
        <div className={`ag-theme-quartz w-full h-full survey-table-custom ${isLoadingSurveys ? 'ag-grid-loading' : ''}`}>
          {isLoadingSurveys ? (
            <div className="flex items-center justify-center h-full">
              <OrbitProgress color="#15396C" size="medium" text="" textColor="" />
            </div>
          ) : (
            <>
              <style>{`
            /* Survey Table - Ultra Clean Design (consistent with BOQ) */
            .survey-table-custom .ag-header {
              background-color: #F8F9FA !important;
              border-bottom: 1px solid #E9ECEF !important;
            }
            
            .survey-table-custom .ag-header-cell {
              background-color: #F8F9FA !important;
              color: #495057 !important;
              font-weight: 600 !important;
              font-size: 11px !important;
              text-transform: uppercase !important;
              letter-spacing: 0.02em !important;
              border-right: 1px solid #E9ECEF !important;
              padding: 10px 12px !important;
              line-height: 1.4 !important;
            }
            
            .survey-table-custom .ag-header-cell-label {
              color: #495057 !important;
              font-weight: 600 !important;
            }
            
            /* Pure white background for rows */
            .survey-table-custom .ag-row {
              background-color: #FFFFFF !important;
              border-bottom: 1px solid #F1F3F5 !important;
            }
            
            /* Hover effect only - no selection styling */
            .survey-table-custom .ag-row:hover {
              background-color: #F8F9FA !important;
            }
            
            /* Disable row selection styling */
            .survey-table-custom .ag-row-selected {
              background-color: #FFFFFF !important;
            }

            .survey-table-custom .ag-row-selected:hover {
              background-color: #F8F9FA !important;
            }
            
            /* Center align cell content vertically */
            .survey-table-custom .ag-cell {
              display: flex !important;
              align-items: center !important;
              padding: 12px !important;
              font-size: 13px !important;
              color: #212529 !important;
              border-right: 1px solid #F1F3F5 !important;
              line-height: 1.5 !important;
            }
            
            .survey-table-custom .ag-row:focus,
            .survey-table-custom .ag-row:focus-within,
            .survey-table-custom .ag-cell:focus,
            .survey-table-custom .ag-cell:focus-within {
              outline: 0 !important;
              outline-width: 0 !important;
              outline-style: none !important;
              outline-color: transparent !important;
              border: none !important;
              box-shadow: none !important;
            }
            
            .survey-table-custom .ag-root-wrapper {
              border-radius: 8px !important;
              overflow: hidden !important;
              border: 1px solid #E9ECEF !important;
            }
            
            /* Ensure horizontal scroll container has proper padding */
            .survey-table-custom .ag-body-horizontal-scroll-viewport {
              overflow-x: auto !important;
            }
            
            /* Add padding to the right side of the grid to prevent column cutoff */
            .survey-table-custom .ag-center-cols-container {
              padding-right: 0 !important;
            }
            
            /* Ensure pinned right columns are fully visible */
            .survey-table-custom .ag-pinned-right-cols-container {
              box-shadow: -2px 0 4px rgba(0, 0, 0, 0.05);
              border-left: 1px solid #E9ECEF !important;
            }
            
            /* Hide filter/menu icons for cleaner look */
            .survey-table-custom .ag-header-cell-menu-button,
            .survey-table-custom .ag-header-cell-filter-button {
              display: none !important;
            }
            
            /* Hide sort icons by default, show on hover */
            .survey-table-custom .ag-header-cell .ag-icon {
              opacity: 0 !important;
              transition: opacity 0.2s ease !important;
            }
            
            .survey-table-custom .ag-header-cell:hover .ag-icon {
              opacity: 0.5 !important;
            }
            
            /* Uniform border styling */
            .survey-table-custom .ag-header-cell,
            .survey-table-custom .ag-cell {
              border-color: #E9ECEF !important;
            }

            /* Clean borders for cells */
            .survey-table-custom .ag-cell {
              border-bottom: 1px solid #F1F3F5 !important;
            }

            /* Actions column clean styling */
            .survey-table-custom .ag-pinned-right-header,
            .survey-table-custom .ag-pinned-right-cols-container {
              border-left: 1px solid #E9ECEF !important;
            }

            /* Hide AG Grid overlay when loading */
            .ag-grid-loading .ag-overlay-no-rows-wrapper {
              display: none !important;
            }

            /* Hide AG Grid "No Rows To Show" message when loading */
            .ag-grid-loading .ag-overlay {
              display: none !important;
            }
          `}</style>
              <AgGridReact
                key={`survey-grid-${filteredSurveyData.length}`}
                rowData={filteredSurveyData}
                columnDefs={columnDefs}
                animateRows={true}
                suppressCellFocus={true}
                theme={themeQuartz}
                onGridReady={onGridReady}
                getRowId={getRowId}
                defaultColDef={{
                  sortable: true,
                  filter: true,
                  resizable: true,
                }}
                rowHeight={60}
                headerHeight={44}
                suppressClickEdit={true}
                suppressHorizontalScroll={false}
                suppressRowClickSelection={true}
                ensureDomOrder={true}
                loading={isLoadingSurveys}
                overlayLoadingTemplate='<div style="padding: 20px; font-size: 14px; color: #6b7280; display: flex; flex-direction: column; align-items: center; gap: 12px;"><div style="display: flex; gap: 4px; align-items: center;"><div style="width: 12px; height: 24px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 3px; transform: skewX(-15deg); animation: blinkblur1 1.2s ease-in-out infinite;"></div><div style="width: 12px; height: 24px; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); border-radius: 3px; transform: skewX(-15deg); animation: blinkblur2 1.2s ease-in-out infinite;"></div><div style="width: 12px; height: 24px; background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); border-radius: 3px; transform: skewX(-15deg); animation: blinkblur3 1.2s ease-in-out infinite;"></div><div style="width: 12px; height: 24px; background: linear-gradient(135deg, #F97316 0%, #EA580C 100%); border-radius: 3px; transform: skewX(-15deg); animation: blinkblur4 1.2s ease-in-out infinite;"></div><div style="width: 12px; height: 24px; background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); border-radius: 3px; transform: skewX(-15deg); animation: blinkblur5 1.2s ease-in-out infinite;"></div></div><div style="font-weight: 600; color: #374151;">Loading Survey Data...</div><div style="font-size: 12px; color: #9ca3af;">Please wait</div></div><style>@keyframes blinkblur1 { 0%, 100% { opacity: 0.3; filter: blur(2px); transform: skewX(-15deg) scale(0.95); } 50% { opacity: 1; filter: blur(0); transform: skewX(-15deg) scale(1); } } @keyframes blinkblur2 { 0%, 100% { opacity: 0.3; filter: blur(2px); transform: skewX(-15deg) scale(0.95); } 50% { opacity: 1; filter: blur(0); transform: skewX(-15deg) scale(1); } } @keyframes blinkblur3 { 0%, 100% { opacity: 0.3; filter: blur(2px); transform: skewX(-15deg) scale(0.95); } 50% { opacity: 1; filter: blur(0); transform: skewX(-15deg) scale(1); } } @keyframes blinkblur4 { 0%, 100% { opacity: 0.3; filter: blur(2px); transform: skewX(-15deg) scale(0.95); } 50% { opacity: 1; filter: blur(0); transform: skewX(-15deg) scale(1); } } @keyframes blinkblur5 { 0%, 100% { opacity: 0.3; filter: blur(2px); transform: skewX(-15deg) scale(0.95); } 50% { opacity: 1; filter: blur(0); transform: skewX(-15deg) scale(1); } }</style>'
                overlayNoRowsTemplate='<span style="padding: 20px; font-size: 14px; color: #6b7280;">No Rows To Show</span>'
              />
            </>
          )}
        </div>
      </div>

      {/* Add Survey Modal with Space Theme */}
      {showAddSurveyModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9000] p-6" onClick={() => setShowAddSurveyModal(false)}>
          <div
            className="shadow-2xl flex flex-col relative"
            style={{
              width: '900px',
              maxWidth: '95vw',
              maxHeight: '90vh',
              minHeight: '600px',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              background: activeTab === 'automatic' ? '#0a0e27' : '#ffffff',
              backdropFilter: activeTab === 'automatic' ? 'blur(10px)' : 'none'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Space Background Animation for Automatic Tab */}
            {activeTab === 'automatic' && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
                <div className="stars"></div>
                <div className="stars2"></div>
                <div className="stars3"></div>
              </div>
            )}

            {/* Modal Header with Tabs */}
            <div
              className="relative"
              style={{
                background: activeTab === 'automatic'
                  ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)'
                  : 'linear-gradient(135deg, rgba(0, 94, 184, 0.95) 0%, rgba(0, 119, 215, 0.95) 100%)',
                backdropFilter: 'blur(10px)',
                flexShrink: 0,
                zIndex: 10
              }}
            >
              {/* Header */}
              <div className="p-6 pb-0 flex items-center justify-between">
                <div className="relative">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    {activeTab === 'automatic' && <Sparkles className="w-5 h-5" />}
                    Add Survey
                  </h3>
                  <p className="text-sm text-white mt-1 opacity-90">
                    {activeTab === 'manual' ? 'Fill in survey details manually' : 'AI-powered survey detection'}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-all relative"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Tab Switcher */}
              <div className="flex w-full border-b border-white/20">
                <button
                  onClick={() => setActiveTab('manual')}
                  className="flex-1 px-6 py-3 font-medium text-sm transition-all relative"
                  style={{
                    color: activeTab === 'manual' ? '#ffffff' : '#9ca3af'
                  }}
                >
                  Manual Input
                  {activeTab === 'manual' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('automatic')}
                  className="flex-1 px-6 py-3 font-medium text-sm transition-all relative"
                  style={{
                    color: activeTab === 'automatic' ? '#ffffff' : '#9ca3af'
                  }}
                >
                  AI Detection
                  {activeTab === 'automatic' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
                  )}
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div
              className="p-6 relative flex flex-col"
              style={{
                background: activeTab === 'automatic' ? 'transparent' : '#ffffff',
                overflowY: 'auto',
                flexShrink: 1,
                flexGrow: 1,
                zIndex: 5,
                minHeight: '0'
              }}
            >
              {/* Manual Input Tab */}
              {activeTab === 'manual' && (
                <div className="space-y-4">
                  {/* Survey Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Survey Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={surveyForm.date}
                      onChange={(e) => setSurveyForm({ ...surveyForm, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm"
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Location <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={surveyForm.location}
                      onChange={(e) => setSurveyForm({ ...surveyForm, location: e.target.value })}
                      placeholder="e.g., Jl. Sudirman No. 123"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm"
                    />
                  </div>

                  {/* GPS Coordinates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Latitude <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={surveyForm.latitude}
                        onChange={(e) => setSurveyForm({ ...surveyForm, latitude: e.target.value })}
                        placeholder="-7.250445"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Longitude <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="any"
                          value={surveyForm.longitude}
                          onChange={(e) => setSurveyForm({ ...surveyForm, longitude: e.target.value })}
                          placeholder="112.768845"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowMapPicker(true)}
                          disabled={isLoadingKml}
                          className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all disabled:bg-gray-400 disabled:cursor-not-allowed relative"
                          title={isLoadingKml ? "Loading map data..." : "Pick location from map"}
                        >
                          {isLoadingKml ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <MapPin className="w-4 h-4 text-white" />
                          )}
                        </button>
                      </div>
                      {isLoadingKml && (
                        <p className="text-xs text-gray-500 mt-1">Loading map data...</p>
                      )}
                    </div>
                  </div>

                  {/* Designator and Span - Side by Side */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Span ID - LEFT */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Span ID <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={surveyForm.span}
                        onChange={(e) => {
                          const selectedValue = e.target.value;
                          console.log('🔍 Selected Span ID value:', selectedValue);
                          console.log('🔍 Type:', typeof selectedValue);
                          console.log('🔍 Is string?', typeof selectedValue === 'string');
                          setSurveyForm({ ...surveyForm, span: selectedValue });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm"
                        disabled={isLoadingSpans}
                      >
                        <option value="">-- Select Span ID --</option>
                        {filteredSpans.map((span) => {
                          // Extract ID from span - handle nested structure: span.id.id.String
                          let spanId = '';

                          if (span.id && typeof span.id === 'object') {
                            if ('id' in span.id && span.id.id) {
                              const nestedId = span.id.id as any;
                              // Check if span.id.id has String property
                              if (typeof nestedId === 'object' && nestedId.String) {
                                spanId = String(nestedId.String);
                              } else if (typeof nestedId === 'string') {
                                spanId = nestedId;
                              } else {
                                spanId = String(nestedId);
                              }
                            } else if ('String' in span.id) {
                              spanId = String(span.id.String);
                            }
                          } else if (typeof span.id === 'string') {
                            spanId = span.id;
                          }

                          console.log('🔍 Span option (Manual):', {
                            name: span.span_name,
                            extractedId: spanId,
                            rawId: span.id,
                            nestedId: (span.id as any)?.id
                          });

                          return (
                            <option key={spanId} value={spanId}>
                              {span.span_name}
                            </option>
                          );
                        })}
                      </select>
                      {isLoadingSpans && (
                        <p className="text-xs text-gray-500 mt-1">Loading spans...</p>
                      )}
                    </div>
                    
                    {/* SS/Link - RIGHT */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        SS/Link <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={surveyForm.ssLink}
                        onChange={(e) => {
                          console.log('🔍 Selected SS/Link value:', e.target.value);
                          setSurveyForm({ ...surveyForm, ssLink: e.target.value });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                        disabled={isLoadingLinks || !!linkId}
                      >
                        <option value="">-- Select SS/Link --</option>
                        {links.map((link) => {
                          // Extract ID from deeply nested structure: link.id.id.String
                          let linkId = '';

                          if (link.id && typeof link.id === 'object') {
                            if ('id' in link.id && link.id.id) {
                              const nestedId = link.id.id as any;
                              // Check if link.id.id has String property
                              if (typeof nestedId === 'object' && nestedId.String) {
                                linkId = String(nestedId.String);
                              } else if (typeof nestedId === 'string') {
                                linkId = nestedId;
                              } else {
                                linkId = String(nestedId);
                              }
                            }
                          } else if (typeof link.id === 'string') {
                            linkId = link.id;
                          }

                          console.log('🔍 Link option:', {
                            name: link.link_name,
                            extractedId: linkId,
                            rawId: link.id,
                            nestedId: (link.id as any)?.id
                          });

                          return (
                            <option key={linkId} value={linkId}>
                              {link.link_name}
                            </option>
                          );
                        })}
                      </select>
                      {isLoadingLinks && (
                        <p className="text-xs text-gray-500 mt-1">Loading links...</p>
                      )}
                      {linkId && (
                        <p className="text-xs text-blue-600 mt-1">✓ Auto-filled from selected link</p>
                      )}
                    </div>
                  </div>

                  {/* Designator - Autocomplete with Multiple Selection */}
                  <div className="space-y-3">
                    <div className="relative" ref={designatorDropdownRef}>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Designator (Search & Select Multiple) <span className="text-red-500">*</span>
                      </label>
                      
                      {/* Selected Designators Tags */}
                      {selectedDesignators.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1.5 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                          {selectedDesignators.map((designator) => (
                            <span 
                              key={designator} 
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500 text-white rounded-full text-xs font-medium"
                            >
                              {designator}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDesignators(prev => prev.filter(d => d !== designator));
                                }}
                                className="hover:bg-blue-600 rounded-full p-0.5 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Search Input */}
                      <div className="relative">
                        <input
                          type="text"
                          value={designatorSearchQuery}
                          onChange={(e) => {
                            setDesignatorSearchQuery(e.target.value);
                            setShowDesignatorDropdown(true);
                          }}
                          onFocus={() => setShowDesignatorDropdown(true)}
                          placeholder="Type to search designators..."
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm"
                        />
                        <Tag className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>

                      {/* Dropdown List */}
                      {showDesignatorDropdown && (
                        <div 
                          className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg"
                          style={{ 
                            maxHeight: '240px',
                            overflowY: 'auto',
                            overflowX: 'hidden'
                          }}
                          onMouseEnter={(e) => {
                            // Prevent parent scroll when hovering over dropdown
                            e.currentTarget.style.pointerEvents = 'auto';
                          }}
                        >
                            {isLoadingDesignators ? (
                              <div className="p-3 text-center text-sm text-gray-500">
                                Loading designators...
                              </div>
                            ) : designatorsV2.length === 0 ? (
                              <div className="p-3 text-center text-sm text-gray-500">
                                No designators available
                              </div>
                            ) : (
                              <>
                                {designatorsV2
                                  .filter(d => 
                                    d.name.toLowerCase().includes(designatorSearchQuery.toLowerCase())
                                  )
                                  .map((designator) => {
                                    const isSelected = selectedDesignators.includes(designator.name);
                                    return (
                                      <button
                                        key={designator.id.id.String}
                                        type="button"
                                        onClick={() => {
                                          if (isSelected) {
                                            setSelectedDesignators(prev => prev.filter(d => d !== designator.name));
                                          } else {
                                            setSelectedDesignators(prev => [...prev, designator.name]);
                                          }
                                          setDesignatorSearchQuery('');
                                        }}
                                        className={`w-full text-left px-3 py-2 hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                                          isSelected ? 'bg-purple-100' : ''
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <div className="text-sm font-medium text-gray-900">
                                              {designator.name}
                                            </div>
                                            <div className="text-xs text-gray-500 truncate">
                                              {designator.description}
                                            </div>
                                            <div className="text-xs text-purple-600 mt-0.5">
                                              Unit: {designator.unit}
                                            </div>
                                          </div>
                                          {isSelected && (
                                            <div className="ml-2 flex-shrink-0">
                                              <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </button>
                                    );
                                  })}
                                {designatorsV2.filter(d => 
                                  d.name.toLowerCase().includes(designatorSearchQuery.toLowerCase()) ||
                                  d.description.toLowerCase().includes(designatorSearchQuery.toLowerCase()) ||
                                  d.unit.toLowerCase().includes(designatorSearchQuery.toLowerCase())
                                ).length === 0 && (
                                  <div className="p-3 text-center text-sm text-gray-500">
                                    No designators match "{designatorSearchQuery}"
                                  </div>
                                )}
                              </>
                            )}
                        </div>
                      )}

                      {selectedDesignators.length > 0 && (
                        <p className="text-xs text-purple-600 mt-1.5">
                          {selectedDesignators.length} designator(s) selected
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Evidence Photo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Evidence Photo <span className="text-red-500">*</span>
                    </label>
                    <div
                      className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${isDragging ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-gray-400'
                        }`}
                      onDrop={handleDrop}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onClick={() => document.getElementById('manual-evidence-upload')?.click()}
                    >
                      <input
                        id="manual-evidence-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 font-medium">Upload Evidence Photo</p>
                      <p className="text-xs text-gray-500 mt-1">Click or drag & drop image here</p>
                    </div>

                    {/* Preview uploaded photos */}
                    {evidencePhotos.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {evidencePhotos.map((file, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Evidence ${index + 1}`}
                              className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemovePhoto(index);
                              }}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Video Evidence Upload - NEW */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Video Evidence <span className="text-gray-400">(Optional)</span>
                    </label>
                    <div
                      className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all border-gray-300 hover:border-gray-400"
                      onClick={() => document.getElementById('manual-video-upload')?.click()}
                    >
                      <input
                        id="manual-video-upload"
                        type="file"
                        accept="video/mp4,video/mov,video/avi,video/mkv"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            // Check file size (max 100MB)
                            if (file.size > 100 * 1024 * 1024) {
                              alert('Video file is too large. Maximum size is 100 MB.');
                              return;
                            }
                            setEvidenceVideos([...evidenceVideos, file]);
                          }
                        }}
                        className="hidden"
                      />
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 font-medium">Upload Video Evidence</p>
                      <p className="text-xs text-gray-500 mt-1">MP4, MOV, AVI, MKV (Max 100MB)</p>
                    </div>

                    {/* Preview uploaded videos */}
                    {evidenceVideos.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {evidenceVideos.map((file, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                              <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEvidenceVideos(evidenceVideos.filter((_, i) => i !== index));
                              }}
                              className="flex-shrink-0 p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Automatic AI Detection Tab */}
              {activeTab === 'automatic' && (
                <div className="space-y-2 flex flex-col h-full">
                  {/* Upload Area - SMALLER */}
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    className="border-2 border-dashed rounded-xl text-center transition-all cursor-pointer flex-shrink-0"
                    style={{
                      background: isDragging
                        ? 'rgba(168, 85, 247, 0.15)'
                        : 'rgba(255, 255, 255, 0.08)',
                      borderColor: isDragging ? '#a855f7' : 'rgba(255, 255, 255, 0.2)',
                      borderWidth: '2px',
                      borderStyle: 'dashed',
                      padding: '16px'
                    }}
                    onClick={() => !isProcessing && document.getElementById('span-image-upload')?.click()}
                  >
                    <input
                      id="span-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isProcessing}
                    />

                    <Upload className="w-8 h-8 text-white mx-auto mb-1" />
                    <p className="text-white font-medium text-xs mb-0.5">Upload SPAN Image</p>
                    <p className="text-gray-400 text-xs">Click or drag & drop</p>
                  </div>

                  {/* Span ID Input - NEW */}
                  <div className="flex-shrink-0">
                    <label className="block text-sm font-medium text-white mb-1.5">
                      Span ID <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={surveyForm.span}
                      onChange={(e) => {
                        const selectedValue = e.target.value;
                        console.log('🔍 Selected Span ID value (AI tab):', selectedValue);
                        console.log('🔍 Type:', typeof selectedValue);
                        console.log('🔍 Is string?', typeof selectedValue === 'string');
                        setSurveyForm({ ...surveyForm, span: selectedValue });
                      }}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all"
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#ffffff'
                      }}
                      disabled={isLoadingSpans}
                    >
                      <option value="" style={{ background: '#1e293b', color: '#ffffff' }}>-- Select Span ID --</option>
                      {filteredSpans.map((span) => {
                        // Extract ID from span - handle nested structure: span.id.id.String
                        let spanId = '';

                        if (span.id && typeof span.id === 'object') {
                          if ('id' in span.id && span.id.id) {
                            const nestedId = span.id.id as any;
                            // Check if span.id.id has String property
                            if (typeof nestedId === 'object' && nestedId.String) {
                              spanId = String(nestedId.String);
                            } else if (typeof nestedId === 'string') {
                              spanId = nestedId;
                            } else {
                              spanId = String(nestedId);
                            }
                          } else if ('String' in span.id) {
                            spanId = String(span.id.String);
                          }
                        } else if (typeof span.id === 'string') {
                          spanId = span.id;
                        }

                        console.log('🔍 Span option (AI):', {
                          name: span.span_name,
                          extractedId: spanId,
                          rawId: span.id,
                          nestedId: (span.id as any)?.id
                        });

                        return (
                          <option key={spanId} value={spanId} style={{ background: '#1e293b', color: '#ffffff' }}>
                            {span.span_name}
                          </option>
                        );
                      })}
                    </select>
                    {isLoadingSpans && (
                      <p className="text-xs text-gray-400 mt-1">Loading spans...</p>
                    )}
                  </div>

                  {/* AI Analysis Result - LARGER */}
                  <div
                    className="border rounded-xl backdrop-blur-sm flex flex-col flex-grow overflow-hidden"
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                      borderWidth: '1px',
                      minHeight: '0'
                    }}
                  >
                    <div className="p-3 border-b flex-shrink-0" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                      <h4 className="text-white font-semibold flex items-center gap-2 text-sm">
                        <Sparkles className="w-4 h-4 text-white" />
                        AI Analysis Result
                      </h4>
                    </div>

                    <div className="flex-grow overflow-y-auto p-3">
                      {isProcessing ? (
                        <div className="flex flex-col items-center justify-center h-full">
                          <OrbitProgress color="#15396C" size="small" text="" textColor="" />
                          <p className="text-white font-medium text-xs mb-0.5 mt-4">Analyzing Image</p>
                          <p className="text-gray-400 text-xs">Please wait...</p>
                        </div>
                      ) : aiResult ? (
                        aiResult.error ? (
                          <div className="rounded-lg p-3 border" style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            borderColor: 'rgba(239, 68, 68, 0.3)'
                          }}>
                            <div className="flex items-start gap-2">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{
                                background: 'rgba(239, 68, 68, 0.2)'
                              }}>
                                <X className="w-4 h-4 text-red-400" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-xs mb-1" style={{ color: '#ffffff' }}>Analysis Failed</p>
                                <p className="text-xs leading-relaxed" style={{ color: '#fecaca' }}>{aiResult.error}</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {/* Success Badge - COMPACT */}
                            <div className="flex items-center gap-2 mb-2 p-2 rounded-lg" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                              <Sparkles className="w-4 h-4 text-white flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-semibold text-xs truncate">Information extracted successfully</p>
                              </div>
                            </div>

                            {/* Check if we have any data to display */}
                            {!aiResult.catatan && !aiResult.papan_informasi && !aiResult.gps_coordinates && !aiResult.lokasi ? (
                              <div className="rounded-lg p-4 border text-center" style={{
                                background: 'rgba(245, 158, 11, 0.1)',
                                borderColor: 'rgba(245, 158, 11, 0.3)'
                              }}>
                                <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                                <p className="text-amber-400 font-semibold text-xs mb-1">No Data Extracted</p>
                                <p className="text-gray-400 text-xs">Please try uploading a clearer image.</p>
                              </div>
                            ) : null}

                            {/* Catatan Section - if exists */}
                            {aiResult.catatan && (
                              <div
                                className="rounded-lg p-3 transition-all hover:bg-white/5"
                                style={{
                                  background: 'rgba(59, 130, 246, 0.1)',
                                  border: '1px solid rgba(59, 130, 246, 0.3)'
                                }}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <Tag className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                  <p className="text-xs font-semibold text-blue-300">Catatan</p>
                                </div>
                                <div className="space-y-1.5 pl-6">
                                  {aiResult.catatan.segmen && (
                                    <div>
                                      <p className="text-xs text-gray-400">Segmen</p>
                                      <p className="text-white text-xs">{aiResult.catatan.segmen}</p>
                                    </div>
                                  )}
                                  {aiResult.catatan.jarak && (
                                    <div>
                                      <p className="text-xs text-gray-400">Jarak</p>
                                      <p className="text-white text-xs">{aiResult.catatan.jarak}</p>
                                    </div>
                                  )}
                                  {aiResult.catatan.kode && (
                                    <div>
                                      <p className="text-xs text-gray-400">Kode/Designator</p>
                                      <p className="text-white text-xs font-mono">{aiResult.catatan.kode}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* GPS Coordinates - COMPACT */}
                            {aiResult.gps_coordinates && (
                              <div
                                className="rounded-lg p-2 transition-all hover:bg-white/5"
                                style={{
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid rgba(255, 255, 255, 0.1)'
                                }}
                              >
                                <div className="flex items-center gap-2 mb-1.5">
                                  <Navigation className="w-4 h-4 text-white flex-shrink-0" />
                                  <p className="text-xs text-gray-400">GPS Coordinates</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 pl-6">
                                  <div className="rounded px-2 py-1" style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                                    <p className="text-xs text-gray-500">Lat</p>
                                    <p className="text-white text-xs font-mono truncate">{aiResult.gps_coordinates.latitude}</p>
                                  </div>
                                  <div className="rounded px-2 py-1" style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                                    <p className="text-xs text-gray-500">Lon</p>
                                    <p className="text-white text-xs font-mono truncate">{aiResult.gps_coordinates.longitude}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Location - COMPACT */}
                            {aiResult.lokasi && (
                              <div
                                className="flex items-center gap-2 rounded-lg p-2 transition-all hover:bg-white/5"
                                style={{
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid rgba(255, 255, 255, 0.1)'
                                }}
                              >
                                <MapPin className="w-4 h-4 text-white flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-gray-400">Location Address</p>
                                  <p className="text-white font-semibold text-xs truncate">{aiResult.lokasi}</p>
                                </div>
                              </div>
                            )}

                            {/* Papan Informasi - NEW */}
                            {aiResult.papan_informasi && (
                              <div
                                className="rounded-lg p-3 transition-all hover:bg-white/5"
                                style={{
                                  background: 'rgba(139, 92, 246, 0.1)',
                                  border: '1px solid rgba(139, 92, 246, 0.3)'
                                }}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                  <p className="text-xs font-semibold text-purple-300">Papan Informasi</p>
                                </div>
                                <div className="space-y-1.5 pl-6">
                                  {aiResult.papan_informasi.pekerjaan && (
                                    <div>
                                      <p className="text-xs text-gray-400">Pekerjaan</p>
                                      <p className="text-white text-xs">{aiResult.papan_informasi.pekerjaan}</p>
                                    </div>
                                  )}
                                  {aiResult.papan_informasi.tanggal && (
                                    <div>
                                      <p className="text-xs text-gray-400">Tanggal</p>
                                      <p className="text-white text-xs">{aiResult.papan_informasi.tanggal}</p>
                                    </div>
                                  )}
                                  {aiResult.papan_informasi.lokasi && (
                                    <div>
                                      <p className="text-xs text-gray-400">Lokasi</p>
                                      <p className="text-white text-xs">{aiResult.papan_informasi.lokasi}</p>
                                    </div>
                                  )}
                                  {aiResult.papan_informasi.jalaur && (
                                    <div>
                                      <p className="text-xs text-gray-400">Jalaur</p>
                                      <p className="text-white text-xs">{aiResult.papan_informasi.jalaur}</p>
                                    </div>
                                  )}
                                  {aiResult.papan_informasi.koordinat && (
                                    <div>
                                      <p className="text-xs text-gray-400">Koordinat</p>
                                      <p className="text-white text-xs font-mono">{aiResult.papan_informasi.koordinat}</p>
                                    </div>
                                  )}
                                  {aiResult.papan_informasi.keterangan && (
                                    <div>
                                      <p className="text-xs text-gray-400">Keterangan</p>
                                      <p className="text-white text-xs">{aiResult.papan_informasi.keterangan}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full">
                          <Sparkles className="w-12 h-12 text-white mb-3 opacity-50" />
                          <p className="text-white font-medium text-xs mb-1">Ready to Analyze</p>
                          <p className="text-gray-400 text-xs text-center max-w-xs">
                            Upload a SPAN image above
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              className="p-6 flex gap-3 border-t"
              style={{
                flexShrink: 0,
                background: activeTab === 'automatic' ? 'rgba(17, 24, 39, 0.5)' : '#ffffff',
                borderColor: activeTab === 'automatic' ? 'rgba(55, 65, 81, 0.5)' : '#e5e7eb',
                position: 'relative',
                zIndex: 30
              }}
            >
              <button
                onClick={handleClose}
                disabled={isSaving}
                className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: '#ffffff',
                  color: '#374151',
                  border: '2px solid #d1d5db'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSaving || isProcessing}
                className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: activeTab === 'automatic'
                    ? 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)'
                    : 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)',
                  color: '#ffffff',
                  border: 'none',
                  boxShadow: activeTab === 'automatic'
                    ? '0 4px 15px rgba(147, 51, 234, 0.3)'
                    : '0 4px 15px rgba(147, 51, 234, 0.3)'
                }}
                onMouseEnter={(e) => {
                  if (!isSaving && !isProcessing) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = activeTab === 'automatic'
                      ? '0 6px 20px rgba(147, 51, 234, 0.4)'
                      : '0 6px 20px rgba(147, 51, 234, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSaving && !isProcessing) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = activeTab === 'automatic'
                      ? '0 4px 15px rgba(147, 51, 234, 0.3)'
                      : '0 4px 15px rgba(147, 51, 234, 0.3)';
                  }
                }}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  'Add Data'
                )}
              </button>
            </div>
          </div>

          {/* CSS for Space Animation */}
          <style>{`
            @keyframes animStar {
              from { transform: translateY(0px); }
              to { transform: translateY(-2000px); }
            }
    
            .stars {
              width: 1px;
              height: 1px;
              background: transparent;
              box-shadow: ${Array.from({ length: 700 }, () =>
            `${Math.random() * 2000}px ${Math.random() * 2000}px #FFF`
          ).join(', ')};
              animation: animStar 50s linear infinite;
            }
    
            .stars:after {
              content: " ";
              position: absolute;
              top: 2000px;
              width: 1px;
              height: 1px;
              background: transparent;
              box-shadow: ${Array.from({ length: 700 }, () =>
            `${Math.random() * 2000}px ${Math.random() * 2000}px #FFF`
          ).join(', ')};
            }
    
            .stars2 {
              width: 2px;
              height: 2px;
              background: transparent;
              box-shadow: ${Array.from({ length: 200 }, () =>
            `${Math.random() * 2000}px ${Math.random() * 2000}px #FFF`
          ).join(', ')};
              animation: animStar 100s linear infinite;
            }
    
            .stars2:after {
              content: " ";
              position: absolute;
              top: 2000px;
              width: 2px;
              height: 2px;
              background: transparent;
              box-shadow: ${Array.from({ length: 200 }, () =>
            `${Math.random() * 2000}px ${Math.random() * 2000}px #FFF`
          ).join(', ')};
            }
    
            .stars3 {
              width: 3px;
              height: 3px;
              background: transparent;
              box-shadow: ${Array.from({ length: 100 }, () =>
            `${Math.random() * 2000}px ${Math.random() * 2000}px #FFF`
          ).join(', ')};
              animation: animStar 150s linear infinite;
            }
    
            .stars3:after {
              content: " ";
              position: absolute;
              top: 2000px;
              width: 3px;
              height: 3px;
              background: transparent;
              box-shadow: ${Array.from({ length: 100 }, () =>
            `${Math.random() * 2000}px ${Math.random() * 2000}px #FFF`
          ).join(', ')};
            }
          `}</style>
        </div>,
        document.body
      )}

      {/* Edit Survey Modal */}
      {showEditSurveyModal && editingSurvey && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9000] p-6">
          <div
            className="shadow-2xl flex flex-col relative"
            style={{
              width: '900px',
              maxWidth: '95vw',
              maxHeight: '90vh',
              minHeight: '600px',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              background: '#ffffff',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className="relative"
              style={{
                background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.95) 0%, rgba(126, 34, 206, 0.95) 100%)',
                backdropFilter: 'blur(10px)',
                flexShrink: 0,
                zIndex: 10
              }}
            >
              <div className="p-6 flex items-center justify-between">
                <div className="relative">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Edit className="w-5 h-5" />
                    Edit Survey
                  </h3>
                  <p className="text-sm text-white mt-1 opacity-90">
                    Update survey information
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowEditSurveyModal(false);
                    setEditingSurvey(null);
                    setSurveyForm({
                      date: '',
                      location: '',
                      latitude: '',
                      longitude: '',
                      designators: [],
                      span: '',
                      ssLink: linkId || '',
                    });
                    setSelectedDesignators([]); // Reset selected designators
                    setDesignatorSearchQuery(''); // Reset search query
                    setShowDesignatorDropdown(false); // Close dropdown
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-all relative"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div
              className="p-6 relative flex flex-col"
              style={{
                background: '#ffffff',
                overflowY: 'auto',
                flexShrink: 1,
                flexGrow: 1,
                minHeight: '0'
              }}
            >
              <div className="space-y-4">
                {/* Survey Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Survey Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={surveyForm.date}
                    onChange={(e) => setSurveyForm({ ...surveyForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={surveyForm.location}
                    onChange={(e) => setSurveyForm({ ...surveyForm, location: e.target.value })}
                    placeholder="e.g., Jl. Sudirman No. 123"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm"
                  />
                </div>

                {/* GPS Coordinates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Latitude <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={surveyForm.latitude}
                      onChange={(e) => setSurveyForm({ ...surveyForm, latitude: e.target.value })}
                      placeholder="-7.250445"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Longitude <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={surveyForm.longitude}
                      onChange={(e) => setSurveyForm({ ...surveyForm, longitude: e.target.value })}
                      placeholder="112.768845"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm"
                    />
                  </div>
                </div>

                {/* Designator - Autocomplete with Multiple Selection */}
                <div className="relative" ref={designatorDropdownRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Designator (Search & Select Multiple) <span className="text-red-500">*</span>
                  </label>
                  
                  {/* Selected Designators Tags */}
                  {selectedDesignators.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      {selectedDesignators.map((designator) => (
                        <span 
                          key={designator} 
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500 text-white rounded-full text-xs font-medium"
                        >
                          {designator}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDesignators(prev => prev.filter(d => d !== designator));
                            }}
                            className="hover:bg-blue-600 rounded-full p-0.5 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Search Input */}
                  <div className="relative">
                    <input
                      type="text"
                      value={designatorSearchQuery}
                      onChange={(e) => {
                        setDesignatorSearchQuery(e.target.value);
                        setShowDesignatorDropdown(true);
                      }}
                      onFocus={() => setShowDesignatorDropdown(true)}
                      placeholder="Type to search designators..."
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm"
                    />
                    <Tag className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>

                  {/* Dropdown List */}
                  {showDesignatorDropdown && (
                    <div 
                      className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg"
                      style={{ 
                        maxHeight: '240px',
                        overflowY: 'auto',
                        overflowX: 'hidden'
                      }}
                      onMouseEnter={(e) => {
                        // Prevent parent scroll when hovering over dropdown
                        e.currentTarget.style.pointerEvents = 'auto';
                      }}
                    >
                        {isLoadingDesignators ? (
                          <div className="p-3 text-center text-sm text-gray-500">
                            Loading designators...
                          </div>
                        ) : designatorsV2.length === 0 ? (
                          <div className="p-3 text-center text-sm text-gray-500">
                            No designators available
                          </div>
                        ) : (
                          <>
                            {designatorsV2
                              .filter(d => 
                                d.name.toLowerCase().includes(designatorSearchQuery.toLowerCase()) ||
                                d.description.toLowerCase().includes(designatorSearchQuery.toLowerCase()) ||
                                d.unit.toLowerCase().includes(designatorSearchQuery.toLowerCase())
                              )
                              .map((designator) => {
                                const isSelected = selectedDesignators.includes(designator.name);
                                return (
                                  <button
                                    key={designator.id.id.String}
                                    type="button"
                                    onClick={() => {
                                      if (isSelected) {
                                        setSelectedDesignators(prev => prev.filter(d => d !== designator.name));
                                      } else {
                                        setSelectedDesignators(prev => [...prev, designator.name]);
                                      }
                                      setDesignatorSearchQuery('');
                                    }}
                                    className={`w-full text-left px-3 py-2 hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                                      isSelected ? 'bg-purple-100' : ''
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-900">
                                          {designator.name}
                                        </div>
                                        <div className="text-xs text-gray-500 truncate">
                                          {designator.description}
                                        </div>
                                        <div className="text-xs text-purple-600 mt-0.5">
                                          Unit: {designator.unit}
                                        </div>
                                      </div>
                                      {isSelected && (
                                        <div className="ml-2 flex-shrink-0">
                                          <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            {designatorsV2.filter(d => 
                              d.name.toLowerCase().includes(designatorSearchQuery.toLowerCase()) ||
                              d.description.toLowerCase().includes(designatorSearchQuery.toLowerCase()) ||
                              d.unit.toLowerCase().includes(designatorSearchQuery.toLowerCase())
                            ).length === 0 && (
                              <div className="p-3 text-center text-sm text-gray-500">
                                No designators match "{designatorSearchQuery}"
                              </div>
                            )}
                          </>
                        )}
                    </div>
                  )}

                  {selectedDesignators.length > 0 && (
                    <p className="text-xs text-purple-600 mt-1.5">
                      {selectedDesignators.length} designator(s) selected
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              className="p-6 flex gap-3 border-t"
              style={{
                flexShrink: 0,
                background: '#ffffff',
                borderColor: '#e5e7eb',
                position: 'relative',
                zIndex: 30
              }}
            >
              <button
                onClick={() => {
                  setShowEditSurveyModal(false);
                  setEditingSurvey(null);
                  setSurveyForm({
                    date: '',
                    location: '',
                    latitude: '',
                    longitude: '',
                    designators: [],
                    span: '',
                    ssLink: linkId || '',
                  });
                  setSelectedDesignators([]); // Reset selected designators
                  setDesignatorSearchQuery(''); // Reset search query
                  setShowDesignatorDropdown(false); // Close dropdown
                }}
                disabled={isSaving}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  border: '2px solid #d1d5db',
                  backgroundColor: '#ffffff',
                  color: '#374151',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.5 : 1,
                  position: 'relative',
                  zIndex: 30
                }}
                onMouseEnter={(e) => !isSaving && (e.currentTarget.style.backgroundColor = '#f9fafb')}
                onMouseLeave={(e) => !isSaving && (e.currentTarget.style.backgroundColor = '#ffffff')}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSurvey}
                disabled={isSaving}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  border: 'none',
                  backgroundColor: '#7e22ce',
                  color: '#ffffff',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.7 : 1,
                  position: 'relative',
                  zIndex: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => !isSaving && (e.currentTarget.style.backgroundColor = '#c2410c')}
                onMouseLeave={(e) => !isSaving && (e.currentTarget.style.backgroundColor = '#7e22ce')}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Updating...
                  </>
                ) : (
                  'Update Survey'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && surveyToDelete && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-6">
          <div className="bg-white rounded-lg shadow-2xl max-w-md overflow-hidden" style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="p-6 flex-shrink-0">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Survey</h3>
                  <p className="text-sm text-gray-500 mt-1">Are you sure you want to delete this survey?</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-auto">
                <div className="text-sm">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Location:</span>
                    <span className="font-medium text-gray-900">{surveyToDelete.location}</span>
                  </div>
                  {surveyToDelete.item_name && (
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Item Name:</span>
                      <span className="font-medium text-gray-900">{surveyToDelete.item_name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSurveyToDelete(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2 bg-white border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#b91c1c' }}
                onMouseEnter={(e) => !isDeleting && (e.currentTarget.style.backgroundColor = '#ef4444')}
                onMouseLeave={(e) => !isDeleting && (e.currentTarget.style.backgroundColor = '#b91c1c')}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}


      {/* Map Picker Modal */}
      {showMapPicker && !isLoadingKml && kmlData && (
        <MapPickerModal
          isOpen={showMapPicker}
          onClose={() => setShowMapPicker(false)}
          onLocationSelect={handleLocationSelect}
          projectId={contractId}
          initialLongitude={surveyForm.longitude ? parseFloat(surveyForm.longitude) : 0}
          initialLatitude={surveyForm.latitude ? parseFloat(surveyForm.latitude) : 0}
          kmlData={kmlData}
          linkId={surveyForm.ssLink}
        />
      )}

      {/* Loading Map Data Modal */}
      {showMapPicker && isLoadingKml && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full mx-4">
            <div className="flex flex-col items-center">
              <OrbitProgress color="#8b5cf6" size="medium" text="" textColor="" />
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">Loading Map Data</h3>
              <p className="text-sm text-gray-600 text-center">
                Please wait while we load the map data...
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Validation Modal */}
      {showValidationModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-6">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Required Fields Missing</h3>
                  <p className="text-sm text-white/90 mt-0.5">Please complete all required fields</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                The following fields are required to create a survey:
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                <ul className="space-y-2">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span className="flex-1">{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setShowValidationModal(false);
                  setValidationErrors([]);
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-amber-500/30 transition-all"
              >
                Got it
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        type={toastType}
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        duration={4000}
      />
    </div>
  );
}

