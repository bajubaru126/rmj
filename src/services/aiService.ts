// AI Service for image analysis
import { API_ENDPOINTS, buildUrl } from '@/config/api';

export interface Coordinates {
  latitude?: string;
  longitude?: string;
}

export interface LocationInfo {
  alamat?: string;
  koordinat?: Coordinates;
}

export interface Notes {
  segmen?: string;
  jarak?: string;
  kode?: string;
  kedalaman?: string;
}

export interface BoardInfo {
  pekerjaan?: string;
  tanggal_identifikasi?: string;
  lokasi_detail?: string;
}

export interface FieldDocumentation {
  project?: string;
  absensi?: string;
  tanggal?: string;
  lokasi?: LocationInfo;
  catatan?: Notes;
  papan_informasi?: BoardInfo;
}

export interface AiAnalyzeSuccessResponse {
  success: true;
  result: FieldDocumentation;
  prompt: string;
}

export interface AiAnalyzeErrorResponse {
  success: false;
  error: string;
  result: null;
}

export type AiAnalyzeResponse = AiAnalyzeSuccessResponse | AiAnalyzeErrorResponse;

class AiService {
  /**
   * Analyze image using AI
   * @param imageFile - Image file to analyze
   * @param token - Auth token
   * @returns Analysis result
   */
  async analyzeImage(
    imageFile: File,
    token: string | null
  ): Promise<AiAnalyzeResponse> {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      console.log('🔄 Sending request to:', buildUrl(API_ENDPOINTS.AI.ANALYZE));
      console.log('🔑 Token present:', !!token);

      const response = await fetch(buildUrl(API_ENDPOINTS.AI.ANALYZE), {
        method: 'POST',
        headers,
        body: formData,
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        let errorMessage = `AI analysis failed with status ${response.status}`;
        try {
          // Clone response before reading to avoid "body stream already read" error
          const responseClone = response.clone();
          const errorText = await responseClone.text();
          console.error('❌ AI API error response:', errorText);
          
          // Try to parse as JSON
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch {
            // If not JSON, use the text directly
            if (errorText) {
              errorMessage = errorText;
            }
          }
        } catch (e) {
          console.error('❌ Failed to read error response:', e);
        }
        
        // Return error response instead of throwing
        return {
          success: false,
          error: errorMessage,
          result: null
        };
      }

      const result: AiAnalyzeResponse = await response.json();
      console.log('✅ AI API success:', result);
      return result;
    } catch (error) {
      console.error('💥 Exception in analyzeImage:', error);
      // Return error response instead of throwing
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze image',
        result: null
      };
    }
  }

  /**
   * Check AI service health
   */
  async healthCheck(): Promise<{ status: string; service: string }> {
    try {
      const response = await fetch(buildUrl(API_ENDPOINTS.AI.HEALTH), {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Health check failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Health check error:', error);
      throw error;
    }
  }

  /**
   * Format field documentation for display
   */
  formatDocumentation(doc: FieldDocumentation): string {
    const lines: string[] = [];

    if (doc.project) {
      lines.push(`📋 Project: ${doc.project}`);
    }

    if (doc.absensi) {
      lines.push(`⏰ Absensi: ${doc.absensi}`);
    }

    if (doc.tanggal) {
      lines.push(`📅 Tanggal: ${doc.tanggal}`);
    }

    if (doc.lokasi) {
      lines.push('\n📍 Lokasi:');
      if (doc.lokasi.alamat) {
        lines.push(`   Alamat: ${doc.lokasi.alamat}`);
      }
      if (doc.lokasi.koordinat) {
        if (doc.lokasi.koordinat.latitude) {
          lines.push(`   Latitude: ${doc.lokasi.koordinat.latitude}`);
        }
        if (doc.lokasi.koordinat.longitude) {
          lines.push(`   Longitude: ${doc.lokasi.koordinat.longitude}`);
        }
      }
    }

    if (doc.catatan) {
      lines.push('\n📝 Catatan:');
      if (doc.catatan.segmen) {
        lines.push(`   Segmen: ${doc.catatan.segmen}`);
      }
      if (doc.catatan.jarak) {
        lines.push(`   Jarak: ${doc.catatan.jarak}`);
      }
      if (doc.catatan.kode) {
        lines.push(`   Kode: ${doc.catatan.kode}`);
      }
      if (doc.catatan.kedalaman) {
        lines.push(`   Kedalaman: ${doc.catatan.kedalaman}`);
      }
    }

    if (doc.papan_informasi) {
      lines.push('\n📋 Papan Informasi:');
      if (doc.papan_informasi.pekerjaan) {
        lines.push(`   Pekerjaan: ${doc.papan_informasi.pekerjaan}`);
      }
      if (doc.papan_informasi.tanggal_identifikasi) {
        lines.push(`   Tanggal Identifikasi: ${doc.papan_informasi.tanggal_identifikasi}`);
      }
      if (doc.papan_informasi.lokasi_detail) {
        lines.push(`   Lokasi Detail: ${doc.papan_informasi.lokasi_detail}`);
      }
    }

    return lines.join('\n');
  }
}

export const aiService = new AiService();
