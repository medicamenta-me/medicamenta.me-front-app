import { 
  HeatmapPoint,
  HeatmapData,
  HeatmapAggregateData
} from './heatmap.service';

/**
 * Heatmap Service Tests
 * Testing heatmap types, interfaces and logic
 */
describe('HeatmapService Logic', () => {
  describe('HeatmapPoint Interface', () => {
    it('should have required fields', () => {
      const point: HeatmapPoint = {
        x: 100,
        y: 200,
        timestamp: new Date(),
        page: '/home'
      };

      expect(point.x).toBe(100);
      expect(point.y).toBe(200);
      expect(point.timestamp).toBeInstanceOf(Date);
      expect(point.page).toBe('/home');
    });

    it('should allow optional elementId', () => {
      const point: HeatmapPoint = {
        x: 150,
        y: 300,
        timestamp: new Date(),
        elementId: 'submit-btn',
        page: '/login'
      };

      expect(point.elementId).toBe('submit-btn');
    });

    it('should allow optional elementType', () => {
      const point: HeatmapPoint = {
        x: 200,
        y: 400,
        timestamp: new Date(),
        elementType: 'button',
        page: '/dashboard'
      };

      expect(point.elementType).toBe('button');
    });

    it('should have complete point with all fields', () => {
      const point: HeatmapPoint = {
        x: 250,
        y: 500,
        timestamp: new Date(),
        elementId: 'nav-menu',
        elementType: 'nav',
        page: '/medications'
      };

      expect(point.elementId).toBe('nav-menu');
      expect(point.elementType).toBe('nav');
    });
  });

  describe('HeatmapData Interface', () => {
    it('should have required fields', () => {
      const data: HeatmapData = {
        userId: 'user123',
        sessionId: 'session-abc',
        points: [],
        startTime: new Date()
      };

      expect(data.userId).toBe('user123');
      expect(data.sessionId).toBe('session-abc');
      expect(data.points).toEqual([]);
      expect(data.startTime).toBeInstanceOf(Date);
    });

    it('should allow optional endTime', () => {
      const data: HeatmapData = {
        userId: 'user456',
        sessionId: 'session-def',
        points: [],
        startTime: new Date(),
        endTime: new Date()
      };

      expect(data.endTime).toBeInstanceOf(Date);
    });

    it('should contain array of points', () => {
      const points: HeatmapPoint[] = [
        { x: 10, y: 20, timestamp: new Date(), page: '/home' },
        { x: 30, y: 40, timestamp: new Date(), page: '/home' }
      ];

      const data: HeatmapData = {
        userId: 'user789',
        sessionId: 'session-ghi',
        points,
        startTime: new Date()
      };

      expect(data.points.length).toBe(2);
      expect(data.points[0].x).toBe(10);
    });
  });

  describe('HeatmapAggregateData Interface', () => {
    it('should have required fields', () => {
      const mockTimestamp = { toDate: () => new Date() } as any;
      
      const data: HeatmapAggregateData = {
        userId: 'user123',
        sessionId: 'session-abc',
        startTime: mockTimestamp,
        endTime: mockTimestamp,
        totalInteractions: 100,
        pages: ['/home', '/medications'],
        elementInteractions: {},
        pageInteractions: {},
        deviceType: 'mobile',
        sessionDuration: 300000
      };

      expect(data.totalInteractions).toBe(100);
      expect(data.deviceType).toBe('mobile');
      expect(data.sessionDuration).toBe(300000);
    });

    it('should allow optional scrollDepth', () => {
      const mockTimestamp = { toDate: () => new Date() } as any;
      
      const data: HeatmapAggregateData = {
        userId: 'user123',
        sessionId: 'session-abc',
        startTime: mockTimestamp,
        endTime: mockTimestamp,
        totalInteractions: 50,
        pages: ['/home'],
        elementInteractions: {},
        pageInteractions: {},
        deviceType: 'desktop',
        sessionDuration: 120000,
        scrollDepth: 75
      };

      expect(data.scrollDepth).toBe(75);
    });

    it('should track rage clicks', () => {
      const mockTimestamp = { toDate: () => new Date() } as any;
      
      const data: HeatmapAggregateData = {
        userId: 'user123',
        sessionId: 'session-abc',
        startTime: mockTimestamp,
        endTime: mockTimestamp,
        totalInteractions: 200,
        pages: ['/home'],
        elementInteractions: {},
        pageInteractions: {},
        deviceType: 'mobile',
        sessionDuration: 60000,
        rageClicks: 5
      };

      expect(data.rageClicks).toBe(5);
    });

    it('should track dead clicks', () => {
      const mockTimestamp = { toDate: () => new Date() } as any;
      
      const data: HeatmapAggregateData = {
        userId: 'user123',
        sessionId: 'session-abc',
        startTime: mockTimestamp,
        endTime: mockTimestamp,
        totalInteractions: 150,
        pages: ['/home'],
        elementInteractions: {},
        pageInteractions: {},
        deviceType: 'desktop',
        sessionDuration: 180000,
        deadClicks: 10
      };

      expect(data.deadClicks).toBe(10);
    });

    it('should track element interactions', () => {
      const mockTimestamp = { toDate: () => new Date() } as any;
      
      const data: HeatmapAggregateData = {
        userId: 'user123',
        sessionId: 'session-abc',
        startTime: mockTimestamp,
        endTime: mockTimestamp,
        totalInteractions: 100,
        pages: ['/home'],
        elementInteractions: {
          'submit-btn': 15,
          'nav-menu': 8,
          'search-input': 5
        },
        pageInteractions: {},
        deviceType: 'mobile',
        sessionDuration: 300000
      };

      expect(data.elementInteractions['submit-btn']).toBe(15);
      expect(Object.keys(data.elementInteractions).length).toBe(3);
    });

    it('should track page interactions', () => {
      const mockTimestamp = { toDate: () => new Date() } as any;
      
      const data: HeatmapAggregateData = {
        userId: 'user123',
        sessionId: 'session-abc',
        startTime: mockTimestamp,
        endTime: mockTimestamp,
        totalInteractions: 100,
        pages: ['/home', '/medications', '/settings'],
        elementInteractions: {},
        pageInteractions: {
          '/home': 40,
          '/medications': 35,
          '/settings': 25
        },
        deviceType: 'mobile',
        sessionDuration: 300000
      };

      expect(data.pageInteractions['/home']).toBe(40);
      expect(data.pages.length).toBe(3);
    });
  });

  describe('Session ID Generation', () => {
    function generateSessionId(): string {
      return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    it('should generate unique session IDs', () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();
      expect(id1).not.toBe(id2);
    });

    it('should start with session prefix', () => {
      const id = generateSessionId();
      expect(id.startsWith('session-')).toBeTrue();
    });
  });

  describe('Point Recording Logic', () => {
    let sessionPoints: HeatmapPoint[] = [];
    const maxPointsPerSession = 1000;

    beforeEach(() => {
      sessionPoints = [];
    });

    function recordPoint(x: number, y: number, page: string): boolean {
      if (sessionPoints.length >= maxPointsPerSession) return false;
      
      sessionPoints.push({
        x,
        y,
        timestamp: new Date(),
        page
      });
      return true;
    }

    it('should record point successfully', () => {
      const result = recordPoint(100, 200, '/home');
      expect(result).toBeTrue();
      expect(sessionPoints.length).toBe(1);
    });

    it('should respect max points limit', () => {
      for (let i = 0; i < maxPointsPerSession + 10; i++) {
        recordPoint(i, i, '/home');
      }
      expect(sessionPoints.length).toBe(maxPointsPerSession);
    });

    it('should record coordinates correctly', () => {
      recordPoint(250, 450, '/medications');
      expect(sessionPoints[0].x).toBe(250);
      expect(sessionPoints[0].y).toBe(450);
    });
  });

  describe('Rage Click Detection', () => {
    const RAGE_CLICK_THRESHOLD = 3;
    const RAGE_CLICK_INTERVAL = 500;

    function detectRageClick(
      clickCount: number,
      timeSinceLastClick: number,
      sameElement: boolean
    ): boolean {
      return sameElement && 
             clickCount >= RAGE_CLICK_THRESHOLD && 
             timeSinceLastClick < RAGE_CLICK_INTERVAL;
    }

    it('should detect rage click', () => {
      expect(detectRageClick(3, 200, true)).toBeTrue();
    });

    it('should not detect rage click with low count', () => {
      expect(detectRageClick(2, 200, true)).toBeFalse();
    });

    it('should not detect rage click with high interval', () => {
      expect(detectRageClick(3, 600, true)).toBeFalse();
    });

    it('should not detect rage click on different elements', () => {
      expect(detectRageClick(3, 200, false)).toBeFalse();
    });
  });

  describe('Dead Click Detection', () => {
    function isDeadClick(element: { tagName: string; onclick: any }): boolean {
      const nonInteractiveElements = ['div', 'span', 'p', 'section', 'article'];
      const isNonInteractive = nonInteractiveElements.includes(element.tagName.toLowerCase());
      const hasNoHandler = !element.onclick;
      return isNonInteractive && hasNoHandler;
    }

    it('should detect dead click on div without handler', () => {
      expect(isDeadClick({ tagName: 'DIV', onclick: null })).toBeTrue();
    });

    it('should not detect dead click on button', () => {
      expect(isDeadClick({ tagName: 'BUTTON', onclick: null })).toBeFalse();
    });

    it('should not detect dead click with handler', () => {
      expect(isDeadClick({ tagName: 'DIV', onclick: () => {} })).toBeFalse();
    });
  });

  describe('Scroll Depth Tracking', () => {
    function calculateScrollDepth(
      scrollTop: number,
      documentHeight: number,
      viewportHeight: number
    ): number {
      const maxScroll = documentHeight - viewportHeight;
      if (maxScroll <= 0) return 100;
      return Math.min(100, Math.round((scrollTop / maxScroll) * 100));
    }

    it('should calculate 0% at top', () => {
      expect(calculateScrollDepth(0, 2000, 800)).toBe(0);
    });

    it('should calculate 100% at bottom', () => {
      expect(calculateScrollDepth(1200, 2000, 800)).toBe(100);
    });

    it('should calculate 50% at middle', () => {
      expect(calculateScrollDepth(600, 2000, 800)).toBe(50);
    });

    it('should handle small documents', () => {
      expect(calculateScrollDepth(0, 500, 800)).toBe(100);
    });
  });

  describe('Device Type Detection', () => {
    function getDeviceType(userAgent: string): 'mobile' | 'desktop' {
      const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod'];
      const lowerAgent = userAgent.toLowerCase();
      return mobileKeywords.some(kw => lowerAgent.includes(kw)) ? 'mobile' : 'desktop';
    }

    it('should detect mobile on Android', () => {
      expect(getDeviceType('Mozilla/5.0 (Linux; Android 10)')).toBe('mobile');
    });

    it('should detect mobile on iPhone', () => {
      expect(getDeviceType('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)')).toBe('mobile');
    });

    it('should detect desktop on Windows', () => {
      expect(getDeviceType('Mozilla/5.0 (Windows NT 10.0)')).toBe('desktop');
    });

    it('should detect desktop on Mac', () => {
      expect(getDeviceType('Mozilla/5.0 (Macintosh; Intel Mac OS X)')).toBe('desktop');
    });
  });

  describe('Session Duration Calculation', () => {
    function calculateSessionDuration(startTime: Date, endTime: Date): number {
      return endTime.getTime() - startTime.getTime();
    }

    it('should calculate duration in milliseconds', () => {
      const start = new Date(2025, 0, 1, 10, 0, 0);
      const end = new Date(2025, 0, 1, 10, 5, 0);
      
      expect(calculateSessionDuration(start, end)).toBe(5 * 60 * 1000);
    });

    it('should handle short sessions', () => {
      const start = new Date(2025, 0, 1, 10, 0, 0);
      const end = new Date(2025, 0, 1, 10, 0, 30);
      
      expect(calculateSessionDuration(start, end)).toBe(30 * 1000);
    });
  });

  describe('Aggregation Logic', () => {
    function aggregatePoints(points: HeatmapPoint[]): {
      totalInteractions: number;
      pages: string[];
      elementInteractions: { [key: string]: number };
      pageInteractions: { [key: string]: number };
    } {
      const elementInteractions: { [key: string]: number } = {};
      const pageInteractions: { [key: string]: number } = {};
      const pages = new Set<string>();

      points.forEach(point => {
        pages.add(point.page);
        pageInteractions[point.page] = (pageInteractions[point.page] || 0) + 1;
        
        if (point.elementId) {
          elementInteractions[point.elementId] = (elementInteractions[point.elementId] || 0) + 1;
        }
      });

      return {
        totalInteractions: points.length,
        pages: [...pages],
        elementInteractions,
        pageInteractions
      };
    }

    it('should count total interactions', () => {
      const points: HeatmapPoint[] = [
        { x: 0, y: 0, timestamp: new Date(), page: '/home' },
        { x: 0, y: 0, timestamp: new Date(), page: '/home' },
        { x: 0, y: 0, timestamp: new Date(), page: '/settings' }
      ];

      const result = aggregatePoints(points);
      expect(result.totalInteractions).toBe(3);
    });

    it('should collect unique pages', () => {
      const points: HeatmapPoint[] = [
        { x: 0, y: 0, timestamp: new Date(), page: '/home' },
        { x: 0, y: 0, timestamp: new Date(), page: '/home' },
        { x: 0, y: 0, timestamp: new Date(), page: '/medications' }
      ];

      const result = aggregatePoints(points);
      expect(result.pages.length).toBe(2);
      expect(result.pages).toContain('/home');
      expect(result.pages).toContain('/medications');
    });

    it('should count element interactions', () => {
      const points: HeatmapPoint[] = [
        { x: 0, y: 0, timestamp: new Date(), page: '/home', elementId: 'btn1' },
        { x: 0, y: 0, timestamp: new Date(), page: '/home', elementId: 'btn1' },
        { x: 0, y: 0, timestamp: new Date(), page: '/home', elementId: 'btn2' }
      ];

      const result = aggregatePoints(points);
      expect(result.elementInteractions['btn1']).toBe(2);
      expect(result.elementInteractions['btn2']).toBe(1);
    });

    it('should count page interactions', () => {
      const points: HeatmapPoint[] = [
        { x: 0, y: 0, timestamp: new Date(), page: '/home' },
        { x: 0, y: 0, timestamp: new Date(), page: '/home' },
        { x: 0, y: 0, timestamp: new Date(), page: '/settings' }
      ];

      const result = aggregatePoints(points);
      expect(result.pageInteractions['/home']).toBe(2);
      expect(result.pageInteractions['/settings']).toBe(1);
    });
  });

  describe('Tracking Toggle', () => {
    let isTracking = false;

    function startTracking(): void {
      isTracking = true;
    }

    function stopTracking(): void {
      isTracking = false;
    }

    it('should start tracking', () => {
      startTracking();
      expect(isTracking).toBeTrue();
    });

    it('should stop tracking', () => {
      isTracking = true;
      stopTracking();
      expect(isTracking).toBeFalse();
    });
  });
});
