import { SharedData, ShareTargetStats } from './share-target.service';

/**
 * Unit tests for ShareTargetService
 * Tests interfaces, types, and utility logic
 */
describe('ShareTargetService', () => {
  
  describe('SharedData Interface', () => {
    
    it('should create shared data with text', () => {
      const data: SharedData = {
        title: 'Shared Text',
        text: 'Aspirin 100mg'
      };

      expect(data.title).toBe('Shared Text');
      expect(data.text).toBe('Aspirin 100mg');
      expect(data.url).toBeUndefined();
      expect(data.files).toBeUndefined();
    });

    it('should create shared data with URL', () => {
      const data: SharedData = {
        title: 'Medication Info',
        url: 'https://example.com/medication/aspirin'
      };

      expect(data.url).toBe('https://example.com/medication/aspirin');
      expect(data.text).toBeUndefined();
    });

    it('should create shared data with files', () => {
      const mockFile = new File(['test'], 'prescription.pdf', { type: 'application/pdf' });
      
      const data: SharedData = {
        title: 'Prescription',
        files: [mockFile]
      };

      expect(data.files).toBeDefined();
      expect(data.files?.length).toBe(1);
      expect(data.files?.[0].name).toBe('prescription.pdf');
    });

    it('should create shared data with multiple files', () => {
      const files = [
        new File(['test1'], 'image1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'image2.jpg', { type: 'image/jpeg' })
      ];
      
      const data: SharedData = {
        title: 'Photos',
        files
      };

      expect(data.files?.length).toBe(2);
    });

    it('should create empty shared data', () => {
      const data: SharedData = {};

      expect(data.title).toBeUndefined();
      expect(data.text).toBeUndefined();
      expect(data.url).toBeUndefined();
      expect(data.files).toBeUndefined();
    });
  });

  describe('ShareTargetStats Interface', () => {
    
    it('should create initial stats', () => {
      const stats: ShareTargetStats = {
        totalShares: 0,
        lastShareDate: null,
        sharesByType: {
          text: 0,
          url: 0,
          image: 0,
          document: 0
        }
      };

      expect(stats.totalShares).toBe(0);
      expect(stats.lastShareDate).toBeNull();
      expect(stats.sharesByType.text).toBe(0);
    });

    it('should track shares by type', () => {
      const stats: ShareTargetStats = {
        totalShares: 10,
        lastShareDate: new Date(),
        sharesByType: {
          text: 5,
          url: 3,
          image: 2,
          document: 0
        }
      };

      expect(stats.sharesByType.text).toBe(5);
      expect(stats.sharesByType.url).toBe(3);
      expect(stats.sharesByType.image).toBe(2);
      expect(stats.sharesByType.document).toBe(0);
    });

    it('should calculate total from types', () => {
      const stats: ShareTargetStats = {
        totalShares: 15,
        lastShareDate: new Date(),
        sharesByType: {
          text: 5,
          url: 4,
          image: 4,
          document: 2
        }
      };

      const calculatedTotal = 
        stats.sharesByType.text + 
        stats.sharesByType.url + 
        stats.sharesByType.image + 
        stats.sharesByType.document;

      expect(calculatedTotal).toBe(stats.totalShares);
    });
  });

  describe('Share Type Detection', () => {
    
    function detectShareType(data: SharedData): 'text' | 'url' | 'file' | null {
      if (data.files && data.files.length > 0) return 'file';
      if (data.url) return 'url';
      if (data.text) return 'text';
      return null;
    }

    it('should detect text share', () => {
      const data: SharedData = { text: 'Some medication name' };
      expect(detectShareType(data)).toBe('text');
    });

    it('should detect url share', () => {
      const data: SharedData = { url: 'https://example.com' };
      expect(detectShareType(data)).toBe('url');
    });

    it('should detect file share', () => {
      const data: SharedData = { 
        files: [new File(['test'], 'test.pdf', { type: 'application/pdf' })] 
      };
      expect(detectShareType(data)).toBe('file');
    });

    it('should prioritize file over url', () => {
      const data: SharedData = { 
        url: 'https://example.com',
        files: [new File(['test'], 'test.pdf', { type: 'application/pdf' })]
      };
      expect(detectShareType(data)).toBe('file');
    });

    it('should prioritize url over text', () => {
      const data: SharedData = { 
        text: 'Some text',
        url: 'https://example.com'
      };
      expect(detectShareType(data)).toBe('url');
    });

    it('should return null for empty share', () => {
      const data: SharedData = {};
      expect(detectShareType(data)).toBeNull();
    });
  });

  describe('File Type Detection', () => {
    
    function isImageFile(file: File): boolean {
      return file.type.startsWith('image/');
    }

    function isPdfFile(file: File): boolean {
      return file.type === 'application/pdf' || file.name.endsWith('.pdf');
    }

    it('should detect JPEG image', () => {
      const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
      expect(isImageFile(file)).toBeTrue();
    });

    it('should detect PNG image', () => {
      const file = new File(['test'], 'photo.png', { type: 'image/png' });
      expect(isImageFile(file)).toBeTrue();
    });

    it('should detect PDF by type', () => {
      const file = new File(['test'], 'document.pdf', { type: 'application/pdf' });
      expect(isPdfFile(file)).toBeTrue();
    });

    it('should detect PDF by extension', () => {
      const file = new File(['test'], 'document.pdf', { type: '' });
      expect(isPdfFile(file)).toBeTrue();
    });

    it('should not detect text file as image', () => {
      const file = new File(['test'], 'notes.txt', { type: 'text/plain' });
      expect(isImageFile(file)).toBeFalse();
    });
  });

  describe('Medication Name Extraction', () => {
    
    function extractMedicationName(text: string): string | null {
      const cleaned = text.trim().replace(/[^\w\s]/gi, '');
      if (cleaned.length > 0 && cleaned.length < 50) {
        return cleaned;
      }
      return null;
    }

    it('should extract simple medication name', () => {
      const result = extractMedicationName('Aspirin');
      expect(result).toBe('Aspirin');
    });

    it('should extract medication name with dosage', () => {
      const result = extractMedicationName('Aspirin 100mg');
      expect(result).toBe('Aspirin 100mg');
    });

    it('should remove special characters', () => {
      const result = extractMedicationName('Aspirin! @#$%');
      expect(result).toBe('Aspirin ');
    });

    it('should return null for long text', () => {
      const longText = 'This is a very long text that describes something about medication and other things that are not relevant to the medication name extraction';
      const result = extractMedicationName(longText);
      expect(result).toBeNull();
    });

    it('should return null for empty text', () => {
      const result = extractMedicationName('   ');
      expect(result).toBeNull();
    });
  });

  describe('Stats Update Logic', () => {
    
    function updateStats(
      current: ShareTargetStats, 
      data: SharedData
    ): ShareTargetStats {
      const sharesByType = { ...current.sharesByType };

      if (data.files && data.files.length > 0) {
        const file = data.files[0];
        if (file.type.startsWith('image/')) {
          sharesByType.image++;
        } else {
          sharesByType.document++;
        }
      } else if (data.url) {
        sharesByType.url++;
      } else if (data.text) {
        sharesByType.text++;
      }

      return {
        totalShares: current.totalShares + 1,
        lastShareDate: new Date(),
        sharesByType
      };
    }

    it('should increment text counter', () => {
      const current: ShareTargetStats = {
        totalShares: 0,
        lastShareDate: null,
        sharesByType: { text: 0, url: 0, image: 0, document: 0 }
      };

      const updated = updateStats(current, { text: 'Test' });
      expect(updated.sharesByType.text).toBe(1);
      expect(updated.totalShares).toBe(1);
    });

    it('should increment url counter', () => {
      const current: ShareTargetStats = {
        totalShares: 5,
        lastShareDate: null,
        sharesByType: { text: 2, url: 2, image: 1, document: 0 }
      };

      const updated = updateStats(current, { url: 'https://example.com' });
      expect(updated.sharesByType.url).toBe(3);
      expect(updated.totalShares).toBe(6);
    });

    it('should increment image counter', () => {
      const current: ShareTargetStats = {
        totalShares: 0,
        lastShareDate: null,
        sharesByType: { text: 0, url: 0, image: 0, document: 0 }
      };

      const updated = updateStats(current, { 
        files: [new File(['test'], 'photo.jpg', { type: 'image/jpeg' })] 
      });
      expect(updated.sharesByType.image).toBe(1);
    });

    it('should increment document counter', () => {
      const current: ShareTargetStats = {
        totalShares: 0,
        lastShareDate: null,
        sharesByType: { text: 0, url: 0, image: 0, document: 0 }
      };

      const updated = updateStats(current, { 
        files: [new File(['test'], 'doc.pdf', { type: 'application/pdf' })] 
      });
      expect(updated.sharesByType.document).toBe(1);
    });

    it('should update last share date', () => {
      const before = Date.now();
      const current: ShareTargetStats = {
        totalShares: 0,
        lastShareDate: null,
        sharesByType: { text: 0, url: 0, image: 0, document: 0 }
      };

      const updated = updateStats(current, { text: 'Test' });
      const after = Date.now();

      expect(updated.lastShareDate).toBeInstanceOf(Date);
      expect(updated.lastShareDate!.getTime()).toBeGreaterThanOrEqual(before);
      expect(updated.lastShareDate!.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('URL Parameter Parsing', () => {
    
    function parseShareParams(url: string): SharedData {
      const urlObj = new URL(url, 'https://example.com');
      const params = urlObj.searchParams;

      return {
        title: params.get('title') || undefined,
        text: params.get('text') || undefined,
        url: params.get('url') || undefined
      };
    }

    it('should parse text parameter', () => {
      const result = parseShareParams('https://example.com/share?text=Aspirin');
      expect(result.text).toBe('Aspirin');
    });

    it('should parse title parameter', () => {
      const result = parseShareParams('https://example.com/share?title=Medication');
      expect(result.title).toBe('Medication');
    });

    it('should parse url parameter', () => {
      const result = parseShareParams('https://example.com/share?url=https://other.com');
      expect(result.url).toBe('https://other.com');
    });

    it('should parse multiple parameters', () => {
      const result = parseShareParams('https://example.com/share?title=Med&text=Aspirin&url=https://info.com');
      expect(result.title).toBe('Med');
      expect(result.text).toBe('Aspirin');
      expect(result.url).toBe('https://info.com');
    });

    it('should handle missing parameters', () => {
      const result = parseShareParams('https://example.com/share');
      expect(result.title).toBeUndefined();
      expect(result.text).toBeUndefined();
      expect(result.url).toBeUndefined();
    });
  });

  describe('File to Base64 Conversion', () => {
    
    it('should handle file reader promise pattern', async () => {
      const mockFileContent = 'test content';
      const file = new File([mockFileContent], 'test.txt', { type: 'text/plain' });

      const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };

      const base64 = await fileToBase64(file);
      expect(base64).toContain('data:');
      expect(base64).toContain('base64');
    });
  });

  describe('Stats Serialization', () => {
    
    it('should serialize stats to JSON', () => {
      const stats: ShareTargetStats = {
        totalShares: 10,
        lastShareDate: new Date('2024-01-15T10:00:00Z'),
        sharesByType: { text: 5, url: 3, image: 1, document: 1 }
      };

      const json = JSON.stringify(stats);
      expect(json).toContain('"totalShares":10');
      expect(json).toContain('"text":5');
    });

    it('should deserialize stats from JSON', () => {
      const json = '{"totalShares":10,"lastShareDate":"2024-01-15T10:00:00.000Z","sharesByType":{"text":5,"url":3,"image":1,"document":1}}';
      const stats = JSON.parse(json);
      stats.lastShareDate = new Date(stats.lastShareDate);

      expect(stats.totalShares).toBe(10);
      expect(stats.lastShareDate).toBeInstanceOf(Date);
    });

    it('should handle null lastShareDate', () => {
      const stats: ShareTargetStats = {
        totalShares: 0,
        lastShareDate: null,
        sharesByType: { text: 0, url: 0, image: 0, document: 0 }
      };

      const json = JSON.stringify(stats);
      const parsed = JSON.parse(json);

      expect(parsed.lastShareDate).toBeNull();
    });
  });
});
