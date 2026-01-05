/**
 * 🧪 Integration Service Tests - Mobile App
 * Testes unitários do serviço de integração com Backend API v2
 * 
 * @version 1.0.0
 * @date 03/01/2026
 */

import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { 
  IntegrationService, 
  ApiError, 
  ApiResponse, 
  ConnectionStatus,
  PaginatedRequest,
  PaginatedResult,
  RequestOptions,
  PendingRequest
} from './integration.service';

describe('IntegrationService', () => {
  let service: IntegrationService;
  let httpMock: HttpTestingController;
  const baseUrl = 'http://localhost:5001/medicamenta-me/us-central1/api';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [IntegrationService]
    });

    service = TestBed.inject(IntegrationService);
    httpMock = TestBed.inject(HttpTestingController);
    
    // Reset state
    service.clearAuthToken();
    service.setConnectionStatus('online');
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe('Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have default loading state as false', () => {
      expect(service.isLoading()).toBe(false);
    });

    it('should have default error as null', () => {
      expect(service.error()).toBeNull();
    });

    it('should have default pending count as 0', () => {
      expect(service.pendingCount()).toBe(0);
    });

    it('should have hasError computed as false initially', () => {
      expect(service.hasError()).toBe(false);
    });

    it('should return base URL', () => {
      expect(service.getBaseUrl()).toBe(baseUrl);
    });

    it('should have queuedRequestsCount as 0 initially', () => {
      expect(service.queuedRequestsCount()).toBe(0);
    });

    it('should have isOffline computed', () => {
      service.setConnectionStatus('offline');
      expect(service.isOffline()).toBe(true);
      service.setConnectionStatus('online');
      expect(service.isOffline()).toBe(false);
    });
  });

  // ============================================================================
  // AUTHENTICATION TESTS
  // ============================================================================

  describe('Authentication', () => {
    it('should set auth token', () => {
      service.setAuthToken('test-token');
      expect(service.getAuthToken()).toBe('test-token');
    });

    it('should get auth token', () => {
      service.setAuthToken('my-token');
      expect(service.getAuthToken()).toBe('my-token');
    });

    it('should clear auth token', () => {
      service.setAuthToken('token');
      service.clearAuthToken();
      expect(service.getAuthToken()).toBeNull();
    });

    it('should include auth header when token is set', fakeAsync(() => {
      service.setAuthToken('bearer-token');

      service.get('/test').subscribe();
      tick();

      const req = httpMock.expectOne(`${baseUrl}/test`);
      expect(req.request.headers.get('Authorization')).toBe('Bearer bearer-token');
      req.flush({ success: true, data: {} });
      flush();
    }));

    it('should not include auth header when skipAuth is true', fakeAsync(() => {
      service.setAuthToken('bearer-token');

      service.get('/test', { skipAuth: true }).subscribe();
      tick();

      const req = httpMock.expectOne(`${baseUrl}/test`);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({ success: true, data: {} });
      flush();
    }));

    it('should not include auth header when no token', fakeAsync(() => {
      service.get('/test').subscribe();
      tick();

      const req = httpMock.expectOne(`${baseUrl}/test`);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({ success: true, data: {} });
      flush();
    }));

    it('should set null token', () => {
      service.setAuthToken('token');
      service.setAuthToken(null);
      expect(service.getAuthToken()).toBeNull();
    });
  });

  // ============================================================================
  // DEVICE ID TESTS
  // ============================================================================

  describe('Device ID', () => {
    it('should set device ID', () => {
      service.setDeviceId('device-123');
      expect(service.getDeviceId()).toBe('device-123');
    });

    it('should include device ID header when set', fakeAsync(() => {
      service.setDeviceId('my-device');

      service.get('/test').subscribe();
      tick();

      const req = httpMock.expectOne(`${baseUrl}/test`);
      expect(req.request.headers.get('X-Device-ID')).toBe('my-device');
      req.flush({ success: true, data: {} });
      flush();
    }));

    it('should include mobile platform header', fakeAsync(() => {
      service.get('/test').subscribe();
      tick();

      const req = httpMock.expectOne(`${baseUrl}/test`);
      expect(req.request.headers.get('X-Client-Platform')).toBe('mobile');
      req.flush({ success: true, data: {} });
      flush();
    }));
  });

  // ============================================================================
  // CONNECTION STATUS TESTS
  // ============================================================================

  describe('Connection Status', () => {
    it('should set connection status', () => {
      service.setConnectionStatus('offline');
      expect(service.connectionStatus()).toBe('offline');
    });

    it('should return isOnline computed', () => {
      service.setConnectionStatus('online');
      expect(service.isOnline()).toBe(true);
      
      service.setConnectionStatus('offline');
      expect(service.isOnline()).toBe(false);
    });

    it('should return isOffline computed', () => {
      service.setConnectionStatus('offline');
      expect(service.isOffline()).toBe(true);
      
      service.setConnectionStatus('online');
      expect(service.isOffline()).toBe(false);
    });

    it('should throw error when offline', (done) => {
      service.setConnectionStatus('offline');

      service.get('/test').subscribe({
        error: (err: ApiError) => {
          expect(err.code).toBe('OFFLINE');
          done();
        }
      });
    });

    it('should allow request when status is checking', fakeAsync(() => {
      service.setConnectionStatus('checking');

      service.get('/test').subscribe();
      tick();

      const req = httpMock.expectOne(`${baseUrl}/test`);
      req.flush({ success: true, data: {} });
      flush();
    }));

    it('should allow request with skipOfflineCheck', fakeAsync(() => {
      service.setConnectionStatus('offline');

      service.get('/test', { skipOfflineCheck: true }).subscribe();
      tick();

      const req = httpMock.expectOne(`${baseUrl}/test`);
      req.flush({ success: true, data: {} });
      flush();
    }));
  });

  // ============================================================================
  // GET REQUESTS TESTS
  // ============================================================================

  describe('GET Requests', () => {
    it('should make GET request', fakeAsync(() => {
      const mockData = { id: 1, name: 'Test' };

      service.get<typeof mockData>('/users/1').subscribe(data => {
        expect(data).toEqual(mockData);
      });
      tick();

      const req = httpMock.expectOne(`${baseUrl}/users/1`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: mockData });
      flush();
    }));

    it('should handle GET with query params', fakeAsync(() => {
      service.get('/users', { params: { page: 1, limit: 10 } }).subscribe();
      tick();

      const req = httpMock.expectOne(r => r.url.includes('/users'));
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('limit')).toBe('10');
      req.flush({ success: true, data: [] });
      flush();
    }));

    it('should handle GET returning array', fakeAsync(() => {
      const mockArray = [{ id: 1 }, { id: 2 }];

      service.get<typeof mockArray>('/items').subscribe(data => {
        expect(data).toEqual(mockArray);
      });
      tick();

      const req = httpMock.expectOne(`${baseUrl}/items`);
      req.flush({ success: true, data: mockArray });
      flush();
    }));

    it('should handle GET with direct response (no ApiResponse wrapper)', fakeAsync(() => {
      const mockData = { id: 1 };

      service.get<typeof mockData>('/direct').subscribe(data => {
        expect(data).toEqual(mockData);
      });
      tick();

      const req = httpMock.expectOne(`${baseUrl}/direct`);
      req.flush(mockData);
      flush();
    }));

    it('should handle endpoint starting with slash', fakeAsync(() => {
      service.get('/endpoint').subscribe();
      tick();

      const req = httpMock.expectOne(`${baseUrl}/endpoint`);
      req.flush({ success: true, data: {} });
      flush();
    }));

    it('should handle endpoint without slash', fakeAsync(() => {
      service.get('endpoint').subscribe();
      tick();

      const req = httpMock.expectOne(`${baseUrl}/endpoint`);
      req.flush({ success: true, data: {} });
      flush();
    }));

    it('should handle GET with full URL', fakeAsync(() => {
      const fullUrl = 'https://external-api.com/data';

      service.get(fullUrl).subscribe();
      tick();

      const req = httpMock.expectOne(fullUrl);
      req.flush({ success: true, data: {} });
      flush();
    }));
  });

  // ============================================================================
  // POST REQUESTS TESTS
  // ============================================================================

  describe('POST Requests', () => {
    it('should make POST request with body', fakeAsync(() => {
      const requestBody = { name: 'New Item' };
      const responseData = { id: 1, name: 'New Item' };

      service.post<typeof responseData>('/items', requestBody).subscribe(data => {
        expect(data).toEqual(responseData);
      });
      tick();

      const req = httpMock.expectOne(`${baseUrl}/items`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(requestBody);
      req.flush({ success: true, data: responseData });
      flush();
    }));

    it('should make POST request without body', fakeAsync(() => {
      service.post('/action').subscribe();
      tick();

      const req = httpMock.expectOne(`${baseUrl}/action`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body == null).toBe(true);
      req.flush({ success: true, data: {} });
      flush();
    }));

    it('should set Content-Type header for POST', fakeAsync(() => {
      service.post('/items', { name: 'Test' }).subscribe();
      tick();

      const req = httpMock.expectOne(`${baseUrl}/items`);
      expect(req.request.headers.get('Content-Type')).toBe('application/json');
      req.flush({ success: true, data: {} });
      flush();
    }));

    it('should handle POST returning created resource', fakeAsync(() => {
      const created = { id: 'new-123', name: 'Created' };

      service.post<typeof created>('/resources', { name: 'Created' }).subscribe(data => {
        expect(data.id).toBe('new-123');
      });
      tick();

      const req = httpMock.expectOne(`${baseUrl}/resources`);
      req.flush({ success: true, data: created });
      flush();
    }));
  });

  // ============================================================================
  // PUT REQUESTS TESTS
  // ============================================================================

  describe('PUT Requests', () => {
    it('should make PUT request', fakeAsync(() => {
      const body = { name: 'Updated' };

      service.put('/items/1', body).subscribe();
      tick();

      const req = httpMock.expectOne(`${baseUrl}/items/1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(body);
      req.flush({ success: true, data: body });
      flush();
    }));

    it('should handle PUT response', fakeAsync(() => {
      const updated = { id: 1, name: 'Updated Name' };

      service.put<typeof updated>('/items/1', updated).subscribe(data => {
        expect(data).toEqual(updated);
      });
      tick();

      const req = httpMock.expectOne(`${baseUrl}/items/1`);
      req.flush({ success: true, data: updated });
      flush();
    }));
  });

  // ============================================================================
  // PATCH REQUESTS TESTS
  // ============================================================================

  describe('PATCH Requests', () => {
    it('should make PATCH request', fakeAsync(() => {
      const body = { status: 'active' };

      service.patch('/items/1', body).subscribe();
      tick();

      const req = httpMock.expectOne(`${baseUrl}/items/1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(body);
      req.flush({ success: true, data: {} });
      flush();
    }));

    it('should handle partial update', fakeAsync(() => {
      const partial = { status: 'completed' };

      service.patch('/tasks/1', partial).subscribe();
      tick();

      const req = httpMock.expectOne(`${baseUrl}/tasks/1`);
      req.flush({ success: true, data: { ...partial, id: 1 } });
      flush();
    }));
  });

  // ============================================================================
  // DELETE REQUESTS TESTS
  // ============================================================================

  describe('DELETE Requests', () => {
    it('should make DELETE request', fakeAsync(() => {
      service.delete('/items/1').subscribe();
      tick();

      const req = httpMock.expectOne(`${baseUrl}/items/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true, data: null });
      flush();
    }));

    it('should handle DELETE with void response', fakeAsync(() => {
      let completed = false;

      service.delete('/items/1').subscribe({
        next: () => { completed = true; }
      });
      tick();

      const req = httpMock.expectOne(`${baseUrl}/items/1`);
      req.flush({ success: true });
      flush();

      expect(completed).toBe(true);
    }));
  });

  // ============================================================================
  // PAGINATED REQUESTS TESTS
  // ============================================================================

  describe('Paginated Requests', () => {
    it('should make paginated GET request', fakeAsync(() => {
      const pagination: PaginatedRequest = { page: 1, pageSize: 10 };

      service.getPaginated('/items', pagination).subscribe();
      tick();

      const req = httpMock.expectOne(r => r.url.includes('/items'));
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('pageSize')).toBe('10');
      req.flush({ success: true, data: { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 } });
      flush();
    }));

    it('should include sort params', fakeAsync(() => {
      const pagination: PaginatedRequest = { 
        page: 1, 
        pageSize: 20,
        sortBy: 'name',
        sortOrder: 'asc'
      };

      service.getPaginated('/items', pagination).subscribe();
      tick();

      const req = httpMock.expectOne(r => r.url.includes('/items'));
      expect(req.request.params.get('sortBy')).toBe('name');
      expect(req.request.params.get('sortOrder')).toBe('asc');
      req.flush({ success: true, data: { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 } });
      flush();
    }));

    it('should handle paginated response', fakeAsync(() => {
      const mockResponse: PaginatedResult<{ id: number }> = {
        items: [{ id: 1 }, { id: 2 }],
        total: 100,
        page: 1,
        pageSize: 10,
        totalPages: 10
      };

      service.getPaginated<{ id: number }>('/items', { page: 1, pageSize: 10 }).subscribe(result => {
        expect(result.items.length).toBe(2);
        expect(result.total).toBe(100);
        expect(result.totalPages).toBe(10);
      });
      tick();

      const req = httpMock.expectOne(r => r.url.includes('/items'));
      req.flush({ success: true, data: mockResponse });
      flush();
    }));

    it('should work without pagination params', fakeAsync(() => {
      service.getPaginated('/items').subscribe();
      tick();

      const req = httpMock.expectOne(`${baseUrl}/items`);
      req.flush({ success: true, data: { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 } });
      flush();
    }));
  });

  // ============================================================================
  // CUSTOM HEADERS TESTS
  // ============================================================================

  describe('Custom Headers', () => {
    it('should include custom headers', fakeAsync(() => {
      const options: RequestOptions = {
        headers: { 'X-Custom-Header': 'custom-value' }
      };

      service.get('/test', options).subscribe();
      tick();

      const req = httpMock.expectOne(`${baseUrl}/test`);
      expect(req.request.headers.get('X-Custom-Header')).toBe('custom-value');
      req.flush({ success: true, data: {} });
      flush();
    }));

    it('should merge custom headers with default headers', fakeAsync(() => {
      service.get('/test', { headers: { 'X-Extra': 'value' } }).subscribe();
      tick();

      const req = httpMock.expectOne(`${baseUrl}/test`);
      expect(req.request.headers.get('Content-Type')).toBe('application/json');
      expect(req.request.headers.get('Accept')).toBe('application/json');
      expect(req.request.headers.get('X-Extra')).toBe('value');
      req.flush({ success: true, data: {} });
      flush();
    }));

    it('should allow overriding default headers', fakeAsync(() => {
      service.get('/test', { headers: { 'Accept': 'text/plain' } }).subscribe();
      tick();

      const req = httpMock.expectOne(`${baseUrl}/test`);
      expect(req.request.headers.get('Accept')).toBe('text/plain');
      req.flush({ success: true, data: {} });
      flush();
    }));
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle 400 Bad Request', fakeAsync(() => {
      service.post('/test', {}).subscribe({
        error: (err: ApiError) => {
          expect(err.code).toBe('BAD_REQUEST');
        }
      });
      tick();

      const req = httpMock.expectOne(`${baseUrl}/test`);
      req.flush({ message: 'Invalid data' }, { status: 400, statusText: 'Bad Request' });
      flush();
    }));

    it('should handle 401 Unauthorized', fakeAsync(() => {
      service.get('/protected').subscribe({
        error: (err: ApiError) => {
          expect(err.code).toBe('UNAUTHORIZED');
        }
      });
      tick();

      const req = httpMock.expectOne(`${baseUrl}/protected`);
      req.flush({}, { status: 401, statusText: 'Unauthorized' });
      flush();
    }));

    it('should handle 403 Forbidden', fakeAsync(() => {
      service.get('/admin').subscribe({
        error: (err: ApiError) => {
          expect(err.code).toBe('FORBIDDEN');
        }
      });
      tick();

      const req = httpMock.expectOne(`${baseUrl}/admin`);
      req.flush({}, { status: 403, statusText: 'Forbidden' });
      flush();
    }));

    it('should handle 404 Not Found', fakeAsync(() => {
      service.get('/notfound').subscribe({
        error: (err: ApiError) => {
          expect(err.code).toBe('NOT_FOUND');
        }
      });
      tick();

      const req = httpMock.expectOne(`${baseUrl}/notfound`);
      req.flush({}, { status: 404, statusText: 'Not Found' });
      flush();
    }));

    it('should handle 409 Conflict', fakeAsync(() => {
      service.post('/items', {}).subscribe({
        error: (err: ApiError) => {
          expect(err.code).toBe('CONFLICT');
        }
      });
      tick();

      const req = httpMock.expectOne(`${baseUrl}/items`);
      req.flush({}, { status: 409, statusText: 'Conflict' });
      flush();
    }));

    it('should handle 422 Validation Error', fakeAsync(() => {
      service.post('/validate', {}).subscribe({
        error: (err: ApiError) => {
          expect(err.code).toBe('VALIDATION_ERROR');
        }
      });
      tick();

      const req = httpMock.expectOne(`${baseUrl}/validate`);
      req.flush({}, { status: 422, statusText: 'Unprocessable Entity' });
      flush();
    }));

    it('should handle 429 Rate Limited', fakeAsync(() => {
      // Rate limited tem retry, então vamos usar retries: 0
      service.get('/rate', { retries: 0 }).subscribe({
        error: (err: ApiError) => {
          expect(err.code).toBe('RATE_LIMITED');
        }
      });
      tick();

      const req = httpMock.expectOne(`${baseUrl}/rate`);
      req.flush({}, { status: 429, statusText: 'Too Many Requests' });
      flush();
    }));

    it('should handle 500 Server Error', fakeAsync(() => {
      service.get('/error', { retries: 0 }).subscribe({
        error: (err: ApiError) => {
          expect(err.code).toBe('SERVER_ERROR');
        }
      });
      tick();

      const req = httpMock.expectOne(`${baseUrl}/error`);
      req.flush({}, { status: 500, statusText: 'Internal Server Error' });
      flush();
    }));

    it('should handle 502 Bad Gateway', fakeAsync(() => {
      service.get('/gateway', { retries: 0 }).subscribe({
        error: (err: ApiError) => {
          expect(err.code).toBe('BAD_GATEWAY');
        }
      });
      tick();

      const req = httpMock.expectOne(`${baseUrl}/gateway`);
      req.flush({}, { status: 502, statusText: 'Bad Gateway' });
      flush();
    }));

    it('should handle 503 Service Unavailable', fakeAsync(() => {
      service.get('/unavailable', { retries: 0 }).subscribe({
        error: (err: ApiError) => {
          expect(err.code).toBe('SERVICE_UNAVAILABLE');
        }
      });
      tick();

      const req = httpMock.expectOne(`${baseUrl}/unavailable`);
      req.flush({}, { status: 503, statusText: 'Service Unavailable' });
      flush();
    }));

    it('should handle 504 Gateway Timeout', fakeAsync(() => {
      service.get('/timeout', { retries: 0 }).subscribe({
        error: (err: ApiError) => {
          expect(err.code).toBe('GATEWAY_TIMEOUT');
        }
      });
      tick();

      const req = httpMock.expectOne(`${baseUrl}/timeout`);
      req.flush({}, { status: 504, statusText: 'Gateway Timeout' });
      flush();
    }));

    it('should handle network error (status 0)', fakeAsync(() => {
      service.get('/network', { retries: 0 }).subscribe({
        error: (err: ApiError) => {
          expect(err.code).toBe('NETWORK_ERROR');
        }
      });
      tick();

      const req = httpMock.expectOne(`${baseUrl}/network`);
      req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
      flush();
    }));

    it('should extract error from API response', fakeAsync(() => {
      const apiError = { code: 'CUSTOM_ERROR', message: 'Custom error message' };

      service.get('/api-error').subscribe({
        error: (err: ApiError) => {
          expect(err.code).toBe('CUSTOM_ERROR');
          expect(err.message).toBe('Custom error message');
        }
      });
      tick();

      const req = httpMock.expectOne(`${baseUrl}/api-error`);
      req.flush({ error: apiError }, { status: 400, statusText: 'Bad Request' });
      flush();
    }));

    it('should set error signal on error', fakeAsync(() => {
      service.get('/error', { retries: 0 }).subscribe({ error: () => {} });
      tick();

      const req = httpMock.expectOne(`${baseUrl}/error`);
      req.flush({}, { status: 500, statusText: 'Error' });
      flush();

      expect(service.error()).not.toBeNull();
      expect(service.hasError()).toBe(true);
    }));

    it('should clear error on successful request', fakeAsync(() => {
      // First, trigger an error
      service.get('/error', { retries: 0 }).subscribe({ error: () => {} });
      tick();
      const req1 = httpMock.expectOne(`${baseUrl}/error`);
      req1.flush({}, { status: 500, statusText: 'Error' });
      flush();
      expect(service.hasError()).toBe(true);

      // Then make successful request
      service.get('/success').subscribe();
      tick();
      const req2 = httpMock.expectOne(`${baseUrl}/success`);
      req2.flush({ success: true, data: {} });
      flush();

      expect(service.error()).toBeNull();
      expect(service.hasError()).toBe(false);
    }));

    it('should handle API error in response body', fakeAsync(() => {
      service.get('/api-fail').subscribe({
        error: (err: ApiError) => {
          expect(err.code).toBe('BUSINESS_ERROR');
        }
      });
      tick();

      const req = httpMock.expectOne(`${baseUrl}/api-fail`);
      req.flush({ success: false, error: { code: 'BUSINESS_ERROR', message: 'Business logic failed' } });
      flush();
    }));
  });

  // ============================================================================
  // LOADING STATE TESTS
  // ============================================================================

  describe('Loading State', () => {
    it('should set loading to true during request', fakeAsync(() => {
      service.get('/test').subscribe();
      tick();

      expect(service.isLoading()).toBe(true);
      expect(service.pendingCount()).toBe(1);

      const req = httpMock.expectOne(`${baseUrl}/test`);
      req.flush({ success: true, data: {} });
      flush();
    }));

    it('should set loading to false after request completes', fakeAsync(() => {
      service.get('/test').subscribe();
      tick();

      const req = httpMock.expectOne(`${baseUrl}/test`);
      req.flush({ success: true, data: {} });
      flush();

      expect(service.isLoading()).toBe(false);
      expect(service.pendingCount()).toBe(0);
    }));

    it('should set loading to false after request fails', fakeAsync(() => {
      service.get('/error', { retries: 0 }).subscribe({ error: () => {} });
      tick();

      const req = httpMock.expectOne(`${baseUrl}/error`);
      req.flush({}, { status: 500, statusText: 'Error' });
      flush();

      expect(service.isLoading()).toBe(false);
      expect(service.pendingCount()).toBe(0);
    }));

    it('should track multiple concurrent requests', fakeAsync(() => {
      service.get('/test1').subscribe();
      service.get('/test2').subscribe();
      tick();

      expect(service.pendingCount()).toBe(2);
      expect(service.isLoading()).toBe(true);

      const req1 = httpMock.expectOne(`${baseUrl}/test1`);
      const req2 = httpMock.expectOne(`${baseUrl}/test2`);
      
      req1.flush({ success: true, data: {} });
      flush();
      
      expect(service.pendingCount()).toBe(1);
      expect(service.isLoading()).toBe(true);

      req2.flush({ success: true, data: {} });
      flush();
      
      expect(service.pendingCount()).toBe(0);
      expect(service.isLoading()).toBe(false);
    }));

    it('should report hasPendingRequests correctly', fakeAsync(() => {
      expect(service.hasPendingRequests()).toBe(false);

      service.get('/test').subscribe();
      tick();

      expect(service.hasPendingRequests()).toBe(true);

      const req = httpMock.expectOne(`${baseUrl}/test`);
      req.flush({ success: true, data: {} });
      flush();

      expect(service.hasPendingRequests()).toBe(false);
    }));
  });

  // ============================================================================
  // RETRY LOGIC TESTS
  // ============================================================================

  describe('Retry Logic', () => {
    it('should retry on 500 error', fakeAsync(() => {
      service.get('/retry', { retries: 2 }).subscribe();
      tick();

      // First attempt fails
      const req1 = httpMock.expectOne(`${baseUrl}/retry`);
      req1.flush({}, { status: 500, statusText: 'Error' });
      tick(1000); // Wait for retry delay

      // Second attempt fails
      const req2 = httpMock.expectOne(`${baseUrl}/retry`);
      req2.flush({}, { status: 500, statusText: 'Error' });
      tick(2000); // Wait for retry delay

      // Third attempt succeeds
      const req3 = httpMock.expectOne(`${baseUrl}/retry`);
      req3.flush({ success: true, data: {} });
      flush();
    }));

    it('should not retry on 400 errors', fakeAsync(() => {
      let errorReceived = false;

      service.get('/noretry', { retries: 3 }).subscribe({
        error: () => { errorReceived = true; }
      });
      tick();

      const req = httpMock.expectOne(`${baseUrl}/noretry`);
      req.flush({}, { status: 400, statusText: 'Bad Request' });
      flush();

      expect(errorReceived).toBe(true);
      // Should not have made additional requests
      httpMock.expectNone(`${baseUrl}/noretry`);
    }));

    it('should not retry on 401 errors', fakeAsync(() => {
      service.get('/auth', { retries: 3 }).subscribe({ error: () => {} });
      tick();

      const req = httpMock.expectOne(`${baseUrl}/auth`);
      req.flush({}, { status: 401, statusText: 'Unauthorized' });
      flush();

      httpMock.expectNone(`${baseUrl}/auth`);
    }));

    it('should not retry on 403 errors', fakeAsync(() => {
      service.get('/forbidden', { retries: 3 }).subscribe({ error: () => {} });
      tick();

      const req = httpMock.expectOne(`${baseUrl}/forbidden`);
      req.flush({}, { status: 403, statusText: 'Forbidden' });
      flush();

      httpMock.expectNone(`${baseUrl}/forbidden`);
    }));

    it('should not retry on 404 errors', fakeAsync(() => {
      service.get('/notfound', { retries: 3 }).subscribe({ error: () => {} });
      tick();

      const req = httpMock.expectOne(`${baseUrl}/notfound`);
      req.flush({}, { status: 404, statusText: 'Not Found' });
      flush();

      httpMock.expectNone(`${baseUrl}/notfound`);
    }));

    it('should work with retries set to 0', fakeAsync(() => {
      let errorCount = 0;

      service.get('/noretries', { retries: 0 }).subscribe({
        error: () => { errorCount++; }
      });
      tick();

      const req = httpMock.expectOne(`${baseUrl}/noretries`);
      req.flush({}, { status: 500, statusText: 'Error' });
      flush();

      expect(errorCount).toBe(1);
      httpMock.expectNone(`${baseUrl}/noretries`);
    }));
  });

  // ============================================================================
  // QUEUE TESTS
  // ============================================================================

  describe('Request Queue (Offline)', () => {
    it('should queue request', () => {
      const id = service.queueRequest('POST', '/items', { name: 'Test' });
      
      expect(id).toBeTruthy();
      expect(service.queuedRequestsCount()).toBe(1);
    });

    it('should get pending queue', () => {
      service.queueRequest('POST', '/items1', { name: 'Test1' });
      service.queueRequest('POST', '/items2', { name: 'Test2' });

      const queue = service.getPendingQueue();
      
      expect(queue.length).toBe(2);
      expect(queue[0].endpoint).toBe('/items1');
      expect(queue[1].endpoint).toBe('/items2');
    });

    it('should remove from queue', () => {
      const id = service.queueRequest('POST', '/items', {});
      expect(service.queuedRequestsCount()).toBe(1);

      const removed = service.removeFromQueue(id);
      
      expect(removed).toBe(true);
      expect(service.queuedRequestsCount()).toBe(0);
    });

    it('should return false when removing non-existent item', () => {
      const removed = service.removeFromQueue('non-existent-id');
      expect(removed).toBe(false);
    });

    it('should clear pending queue', () => {
      service.queueRequest('POST', '/items1', {});
      service.queueRequest('POST', '/items2', {});
      expect(service.queuedRequestsCount()).toBe(2);

      service.clearPendingQueue();
      
      expect(service.queuedRequestsCount()).toBe(0);
      expect(service.getPendingQueue().length).toBe(0);
    });
  });

  // ============================================================================
  // UTILITIES TESTS
  // ============================================================================

  describe('Utilities', () => {
    it('should clear error', fakeAsync(() => {
      service.get('/error', { retries: 0 }).subscribe({ error: () => {} });
      tick();

      const req = httpMock.expectOne(`${baseUrl}/error`);
      req.flush({}, { status: 500, statusText: 'Error' });
      flush();

      expect(service.hasError()).toBe(true);

      service.clearError();
      
      expect(service.error()).toBeNull();
      expect(service.hasError()).toBe(false);
    }));

    it('should generate unique request IDs', () => {
      const id1 = service.generateRequestId();
      const id2 = service.generateRequestId();

      expect(id1).not.toBe(id2);
      expect(id1.startsWith('req_')).toBe(true);
      expect(id2.startsWith('req_')).toBe(true);
    });

    it('should return base URL', () => {
      expect(service.getBaseUrl()).toBe(baseUrl);
    });
  });

  // ============================================================================
  // EDGE CASES TESTS
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty response', fakeAsync(() => {
      service.delete('/items/1').subscribe(data => {
        expect(data).toBeUndefined();
      });
      tick();

      const req = httpMock.expectOne(`${baseUrl}/items/1`);
      req.flush({ success: true });
      flush();
    }));

    it('should handle null data in response', fakeAsync(() => {
      service.get('/nullable').subscribe(data => {
        expect(data).toBeNull();
      });
      tick();

      const req = httpMock.expectOne(`${baseUrl}/nullable`);
      req.flush({ success: true, data: null });
      flush();
    }));

    it('should handle boolean params', fakeAsync(() => {
      service.get('/test', { params: { active: true, deleted: false } }).subscribe();
      tick();

      const req = httpMock.expectOne(r => r.url.includes('/test'));
      expect(req.request.params.get('active')).toBe('true');
      expect(req.request.params.get('deleted')).toBe('false');
      req.flush({ success: true, data: {} });
      flush();
    }));

    it('should handle special characters in endpoint', fakeAsync(() => {
      service.get('/items?search=test&filter=active').subscribe();
      tick();

      // URL should be properly constructed
      const req = httpMock.expectOne(r => r.url.includes('/items'));
      req.flush({ success: true, data: {} });
      flush();
    }));

    it('should handle very long endpoint', fakeAsync(() => {
      const longPath = '/items/' + 'a'.repeat(1000);
      
      service.get(longPath).subscribe();
      tick();

      const req = httpMock.expectOne(r => r.url.includes('/items/'));
      req.flush({ success: true, data: {} });
      flush();
    }));

    it('should handle queued request with options', () => {
      const options: RequestOptions = { 
        headers: { 'X-Custom': 'value' },
        timeout: 5000
      };
      
      service.queueRequest('POST', '/items', { name: 'Test' }, options);
      
      const queue = service.getPendingQueue();
      expect(queue[0].options).toEqual(options);
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================

  describe('Performance', () => {
    it('should handle rapid sequential requests', fakeAsync(() => {
      for (let i = 0; i < 5; i++) {
        service.get(`/item${i}`).subscribe();
      }
      tick();

      expect(service.pendingCount()).toBe(5);

      for (let i = 0; i < 5; i++) {
        const req = httpMock.expectOne(`${baseUrl}/item${i}`);
        req.flush({ success: true, data: { id: i } });
      }
      flush();

      expect(service.pendingCount()).toBe(0);
    }));

    it('should not leak pending count', fakeAsync(() => {
      // Make several requests that fail
      for (let i = 0; i < 3; i++) {
        service.get(`/fail${i}`, { retries: 0 }).subscribe({ error: () => {} });
      }
      tick();

      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne(`${baseUrl}/fail${i}`);
        req.flush({}, { status: 500, statusText: 'Error' });
      }
      flush();

      expect(service.pendingCount()).toBe(0);
      expect(service.isLoading()).toBe(false);
    }));
  });
});
