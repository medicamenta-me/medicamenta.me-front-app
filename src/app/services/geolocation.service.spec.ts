import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GeolocationService } from './geolocation.service';
import { LogService } from './log.service';

describe('GeolocationService', () => {
  let service: GeolocationService;
  let httpMock: HttpTestingController;
  let mockLogService: jasmine.SpyObj<LogService>;

  beforeEach(() => {
    mockLogService = jasmine.createSpyObj('LogService', ['log', 'error', 'debug', 'info', 'warn']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        GeolocationService,
        { provide: LogService, useValue: mockLogService }
      ]
    });

    service = TestBed.inject(GeolocationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // =============================================
  // Basic Tests
  // =============================================
  describe('creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  // =============================================
  // getIpAddress() Tests
  // =============================================
  describe('getIpAddress', () => {
    it('should return IP address on successful request', (done) => {
      service.getIpAddress().subscribe(ip => {
        expect(ip).toBe('192.168.1.1');
        done();
      });

      const req = httpMock.expectOne('https://api.ipify.org?format=json');
      expect(req.request.method).toBe('GET');
      req.flush({ ip: '192.168.1.1' });
    });

    it('should return null on HTTP error', (done) => {
      service.getIpAddress().subscribe(ip => {
        expect(ip).toBeNull();
        expect(mockLogService.error).toHaveBeenCalledWith(
          'GeolocationService',
          'Failed to get IP address',
          jasmine.any(Object)
        );
        done();
      });

      const req = httpMock.expectOne('https://api.ipify.org?format=json');
      req.error(new ProgressEvent('error'));
    });

    it('should handle malformed IP response', (done) => {
      service.getIpAddress().subscribe(ip => {
        expect(ip).toBeUndefined();
        done();
      });

      const req = httpMock.expectOne('https://api.ipify.org?format=json');
      req.flush({}); // No ip field
    });

    it('should handle IPv6 address', (done) => {
      service.getIpAddress().subscribe(ip => {
        expect(ip).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
        done();
      });

      const req = httpMock.expectOne('https://api.ipify.org?format=json');
      req.flush({ ip: '2001:0db8:85a3:0000:0000:8a2e:0370:7334' });
    });
  });

  // =============================================
  // getIpBasedGeolocation() Tests
  // =============================================
  describe('getIpBasedGeolocation', () => {
    it('should return geolocation data on successful request', (done) => {
      service.getIpBasedGeolocation().subscribe(geo => {
        expect(geo).toBeTruthy();
        expect(geo?.latitude).toBe(-23.5505);
        expect(geo?.longitude).toBe(-46.6333);
        expect(geo?.accuracy).toBe(50000);
        expect(geo?.timestamp).toBeInstanceOf(Date);
        done();
      });

      const req = httpMock.expectOne('https://ipapi.co/json/');
      expect(req.request.method).toBe('GET');
      req.flush({ 
        latitude: -23.5505, 
        longitude: -46.6333,
        city: 'São Paulo',
        country: 'Brazil'
      });
    });

    it('should return null if response has no latitude', (done) => {
      service.getIpBasedGeolocation().subscribe(geo => {
        expect(geo).toBeNull();
        done();
      });

      const req = httpMock.expectOne('https://ipapi.co/json/');
      req.flush({ city: 'São Paulo', longitude: -46.6333 }); // No latitude
    });

    it('should return null if response has no longitude', (done) => {
      service.getIpBasedGeolocation().subscribe(geo => {
        expect(geo).toBeNull();
        done();
      });

      const req = httpMock.expectOne('https://ipapi.co/json/');
      req.flush({ city: 'São Paulo', latitude: -23.5505 }); // No longitude
    });

    it('should return null on HTTP error', (done) => {
      service.getIpBasedGeolocation().subscribe(geo => {
        expect(geo).toBeNull();
        expect(mockLogService.error).toHaveBeenCalledWith(
          'GeolocationService',
          'Failed to get IP-based geolocation',
          jasmine.any(Object)
        );
        done();
      });

      const req = httpMock.expectOne('https://ipapi.co/json/');
      req.error(new ProgressEvent('error'));
    });

    it('should include accuracy of 50km for IP-based geo', (done) => {
      service.getIpBasedGeolocation().subscribe(geo => {
        expect(geo?.accuracy).toBe(50000);
        done();
      });

      const req = httpMock.expectOne('https://ipapi.co/json/');
      req.flush({ latitude: -23.5, longitude: -46.6 });
    });

    it('should handle different coordinate values', (done) => {
      service.getIpBasedGeolocation().subscribe(geo => {
        expect(geo?.latitude).toBe(40.7128);
        expect(geo?.longitude).toBe(-74.0060);
        done();
      });

      const req = httpMock.expectOne('https://ipapi.co/json/');
      req.flush({ latitude: 40.7128, longitude: -74.0060 }); // New York
    });

    it('should return null for zero coordinates (due to falsy check)', (done) => {
      // Note: This is current behavior due to `if (response.latitude && response.longitude)`
      // which treats 0 as falsy. Zero coordinates (Null Island) are valid but not handled.
      service.getIpBasedGeolocation().subscribe(geo => {
        expect(geo).toBeNull();
        done();
      });

      const req = httpMock.expectOne('https://ipapi.co/json/');
      req.flush({ latitude: 0, longitude: 0 }); // Null Island - treated as invalid
    });

    it('should handle extreme coordinates', (done) => {
      service.getIpBasedGeolocation().subscribe(geo => {
        expect(geo?.latitude).toBe(90);
        expect(geo?.longitude).toBe(180);
        done();
      });

      const req = httpMock.expectOne('https://ipapi.co/json/');
      req.flush({ latitude: 90, longitude: 180 }); // North Pole
    });
  });

  // =============================================
  // Edge Cases
  // =============================================
  describe('edge cases', () => {
    it('should handle server returning 500 error', (done) => {
      service.getIpAddress().subscribe(ip => {
        expect(ip).toBeNull();
        done();
      });

      const req = httpMock.expectOne('https://api.ipify.org?format=json');
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle server returning 404 error', (done) => {
      service.getIpBasedGeolocation().subscribe(geo => {
        expect(geo).toBeNull();
        done();
      });

      const req = httpMock.expectOne('https://ipapi.co/json/');
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('should handle empty response body', (done) => {
      service.getIpAddress().subscribe(ip => {
        expect(ip).toBeUndefined();
        done();
      });

      const req = httpMock.expectOne('https://api.ipify.org?format=json');
      req.flush({});
    });
  });
});
