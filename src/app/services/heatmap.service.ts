import { Injectable, inject, signal } from '@angular/core';
import { Firestore, collection, addDoc, query, where, orderBy, limit, getDocs, Timestamp } from '@angular/fire/firestore';
import { AnalyticsService } from './analytics.service';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';
import { LogService } from './log.service';

export interface HeatmapPoint {
  x: number;
  y: number;
  timestamp: Date;
  elementId?: string;
  elementType?: string;
  page: string;
}

export interface HeatmapData {
  userId: string;
  sessionId: string;
  points: HeatmapPoint[];
  startTime: Date;
  endTime?: Date;
}

export interface HeatmapAggregateData {
  userId: string;
  sessionId: string;
  startTime: Timestamp;
  endTime: Timestamp;
  totalInteractions: number;
  pages: string[];
  elementInteractions: { [elementId: string]: number };
  pageInteractions: { [page: string]: number };
  deviceType: 'mobile' | 'desktop';
  sessionDuration: number; // milliseconds
  scrollDepth?: number;
  rageClicks?: number;
  deadClicks?: number;
}

/**
 * HeatmapService
 * Tracks user interactions (clicks, taps) for UX analysis
 * Stores aggregated data in Firebase Analytics and optionally Firestore
 */
@Injectable({
  providedIn: 'root'
})
export class HeatmapService {
  private readonly analytics = inject(AnalyticsService);
  private readonly auth = inject(AuthService);
  private readonly firebaseService = inject(FirebaseService);
  private readonly firestore: Firestore;

  // Current session data
  private sessionId: string = this.generateSessionId();
  private sessionPoints: HeatmapPoint[] = [];
  private sessionStartTime: Date = new Date();
  private isTracking = signal<boolean>(false);
  private maxPointsPerSession = 1000; // Prevent memory overflow
  
  // Advanced tracking
  private maxScrollDepth = 0;
  private rageClicksCount = 0;
  private deadClicksCount = 0;
  private lastClickTime = 0;
  private lastClickElement: HTMLElement | null = null;
  private clickCount = 0;
  private elementHoverTimes = new Map<string, { start: number; total: number }>();
  
  private readonly logService = inject(LogService);

  constructor() {
    this.firestore = this.firebaseService.firestore;
    this.initializeTracking();
    this.initializeScrollTracking();
    this.initializeHoverTracking();
  }

  /**
   * Initialize click/tap tracking
   */
  private initializeTracking(): void {
    if (typeof document === 'undefined') return;

    // Track clicks (desktop)
    document.addEventListener('click', (event) => this.recordInteraction(event), { passive: true });

    // Track touches (mobile)
    document.addEventListener('touchend', (event) => this.recordTouchInteraction(event), { passive: true });
  }

  /**
   * Record mouse click interaction
   */
  private recordInteraction(event: MouseEvent): void {
    if (!this.isTracking()) return;
    if (this.sessionPoints.length >= this.maxPointsPerSession) return;

    const target = event.target as HTMLElement;
    const page = window.location.pathname;

    const point: HeatmapPoint = {
      x: event.clientX,
      y: event.clientY,
      timestamp: new Date(),
      elementId: target.id || undefined,
      elementType: target.tagName?.toLowerCase(),
      page
    };

    this.sessionPoints.push(point);

    // Detect rage clicks and dead clicks
    this.detectRageClick(target);
    this.detectDeadClick(target);

    // Log to analytics
    this.analytics.logEvent('interaction_click', {
      page,
      element_id: point.elementId || 'unknown',
      element_type: point.elementType || 'unknown',
      x: Math.round(point.x),
      y: Math.round(point.y)
    });
  }

  /**
   * Record touch interaction (mobile)
   */
  private recordTouchInteraction(event: TouchEvent): void {
    if (!this.isTracking()) return;
    if (this.sessionPoints.length >= this.maxPointsPerSession) return;
    if (event.changedTouches.length === 0) return;

    const touch = event.changedTouches[0];
    const target = event.target as HTMLElement;
    const page = window.location.pathname;

    const point: HeatmapPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: new Date(),
      elementId: target.id || undefined,
      elementType: target.tagName?.toLowerCase(),
      page
    };

    this.sessionPoints.push(point);

    // Log to analytics
    this.analytics.logEvent('interaction_tap', {
      page,
      element_id: point.elementId || 'unknown',
      element_type: point.elementType || 'unknown',
      x: Math.round(point.x),
      y: Math.round(point.y)
    });
  }

  /**
   * Start tracking interactions
   */
  startTracking(): void {
    this.isTracking.set(true);
    this.logService.info('HeatmapService', 'Tracking started');
  }

  /**
   * Stop tracking interactions
   */
  stopTracking(): void {
    this.isTracking.set(false);
    this.logService.info('HeatmapService', 'Tracking stopped');
  }

  /**
   * Get current session data
   */
  getSessionData(): HeatmapData {
    const user = this.auth.currentUser();
    return {
      userId: user?.uid || 'anonymous',
      sessionId: this.sessionId,
      points: [...this.sessionPoints],
      startTime: this.sessionStartTime,
      endTime: new Date()
    };
  }

  /**
   * Get heatmap data for a specific page
   */
  getPageData(page: string): HeatmapPoint[] {
    return this.sessionPoints.filter(p => p.page === page);
  }

  /**
   * Clear current session data
   */
  clearSession(): void {
    this.sessionPoints = [];
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = new Date();
    this.maxScrollDepth = 0;
    this.rageClicksCount = 0;
    this.deadClicksCount = 0;
    this.elementHoverTimes.clear();
    this.logService.info('HeatmapService', 'Session cleared');
  }

  /**
   * Initialize scroll depth tracking
   */
  private initializeScrollTracking(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('scroll', () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = window.scrollY;
      const scrollPercent = (scrolled / scrollHeight) * 100;
      
      if (scrollPercent > this.maxScrollDepth) {
        this.maxScrollDepth = Math.min(scrollPercent, 100);
      }
    }, { passive: true });
  }

  /**
   * Initialize hover/time on element tracking
   */
  private initializeHoverTracking(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('mouseover', (event) => {
      const target = event.target as HTMLElement;
      const elementId = target.id || target.tagName?.toLowerCase() || 'unknown';
      
      if (!this.elementHoverTimes.has(elementId)) {
        this.elementHoverTimes.set(elementId, { start: Date.now(), total: 0 });
      } else {
        const data = this.elementHoverTimes.get(elementId)!;
        data.start = Date.now();
      }
    }, { passive: true });

    document.addEventListener('mouseout', (event) => {
      const target = event.target as HTMLElement;
      const elementId = target.id || target.tagName?.toLowerCase() || 'unknown';
      
      const data = this.elementHoverTimes.get(elementId);
      if (data && data.start > 0) {
        data.total += Date.now() - data.start;
        data.start = 0;
      }
    }, { passive: true });
  }

  /**
   * Detect rage clicks (multiple rapid clicks on same element)
   */
  private detectRageClick(target: HTMLElement): void {
    const now = Date.now();
    
    // Rage click: 3+ clicks within 1 second on same element
    if (this.lastClickElement === target && now - this.lastClickTime < 1000) {
      this.clickCount++;
      if (this.clickCount >= 3) {
        this.rageClicksCount++;
        this.analytics.logEvent('rage_click', {
          element_id: target.id || 'unknown',
          element_type: target.tagName?.toLowerCase(),
          page: window.location.pathname
        });
        this.clickCount = 0; // Reset after detection
      }
    } else {
      this.clickCount = 1;
      this.lastClickElement = target;
    }
    
    this.lastClickTime = now;
  }

  /**
   * Detect dead clicks (clicks that produce no action)
   */
  private detectDeadClick(target: HTMLElement): void {
    // Dead click heuristic: click on non-interactive element without href/onclick
    const isInteractive = target.tagName === 'BUTTON' || 
                          target.tagName === 'A' || 
                          target.tagName === 'INPUT' ||
                          target.hasAttribute('onclick') ||
                          target.hasAttribute('ng-click') ||
                          target.hasAttribute('(click)');
    
    if (!isInteractive && !target.closest('button, a, input, [onclick], [ng-click], [(click)]')) {
      this.deadClicksCount++;
      this.analytics.logEvent('dead_click', {
        element_id: target.id || 'unknown',
        element_type: target.tagName?.toLowerCase(),
        page: window.location.pathname
      });
    }
  }

  /**
   * Save session data to Firestore (aggregated)
   */
  async saveSessionToFirestore(): Promise<void> {
    try {
      const user = this.auth.currentUser();
      if (!user) {
        this.logService.warn('HeatmapService', 'No user logged in, skipping Firestore save');
        return;
      }

      const stats = this.getStatistics();
      const endTime = new Date();

      // Calculate page interactions
      const pageInteractions: { [page: string]: number } = {};
      this.sessionPoints.forEach(point => {
        pageInteractions[point.page] = (pageInteractions[point.page] || 0) + 1;
      });

      // Calculate element interactions
      const elementInteractions: { [elementId: string]: number } = {};
      stats.mostClickedElements.forEach(elem => {
        elementInteractions[elem.id] = elem.count;
      });

      const aggregateData: HeatmapAggregateData = {
        userId: user.uid,
        sessionId: this.sessionId,
        startTime: Timestamp.fromDate(this.sessionStartTime),
        endTime: Timestamp.fromDate(endTime),
        totalInteractions: stats.totalInteractions,
        pages: stats.pages,
        elementInteractions,
        pageInteractions,
        deviceType: this.isMobileDevice() ? 'mobile' : 'desktop',
        sessionDuration: stats.sessionDuration,
        scrollDepth: this.maxScrollDepth,
        rageClicks: this.rageClicksCount,
        deadClicks: this.deadClicksCount
      };

      const sessionsRef = collection(this.firestore, 'heatmap_sessions');
      await addDoc(sessionsRef, aggregateData);
      
      this.logService.info('HeatmapService', 'Session saved to Firestore', { sessionId: this.sessionId });
    } catch (error: any) {
      this.logService.error('HeatmapService', 'Error saving session to Firestore', error as Error);
    }
  }

  /**
   * Query heatmap sessions from Firestore
   */
  async querySessionsByUser(userId: string, limitCount: number = 10): Promise<HeatmapAggregateData[]> {
    try {
      const sessionsRef = collection(this.firestore, 'heatmap_sessions');
      const q = query(
        sessionsRef,
        where('userId', '==', userId),
        orderBy('endTime', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      const sessions: HeatmapAggregateData[] = [];
      
      snapshot.forEach(doc => {
        sessions.push(doc.data() as HeatmapAggregateData);
      });
      
      return sessions;
    } catch (error: any) {
      this.logService.error('HeatmapService', 'Error querying sessions', error as Error);
      return [];
    }
  }

  /**
   * Query sessions by page
   */
  async querySessionsByPage(page: string, limitCount: number = 10): Promise<HeatmapAggregateData[]> {
    try {
      const sessionsRef = collection(this.firestore, 'heatmap_sessions');
      const q = query(
        sessionsRef,
        where('pages', 'array-contains', page),
        orderBy('endTime', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      const sessions: HeatmapAggregateData[] = [];
      
      snapshot.forEach(doc => {
        sessions.push(doc.data() as HeatmapAggregateData);
      });
      
      return sessions;
    } catch (error: any) {
      this.logService.error('HeatmapService', 'Error querying sessions by page', error as Error);
      return [];
    }
  }

  /**
   * Detect mobile device
   */
  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get interaction statistics
   */
  getStatistics(): {
    totalInteractions: number;
    pages: string[];
    mostClickedElements: { id: string; count: number }[];
    sessionDuration: number;
  } {
    const pages = [...new Set(this.sessionPoints.map(p => p.page))];
    
    // Count clicks per element
    const elementCounts = new Map<string, number>();
    this.sessionPoints.forEach(point => {
      const key = point.elementId || point.elementType || 'unknown';
      elementCounts.set(key, (elementCounts.get(key) || 0) + 1);
    });

    const mostClickedElements = Array.from(elementCounts.entries())
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const sessionDuration = new Date().getTime() - this.sessionStartTime.getTime();

    return {
      totalInteractions: this.sessionPoints.length,
      pages,
      mostClickedElements,
      sessionDuration
    };
  }

  /**
   * Export session data as JSON
   */
  exportSessionData(): string {
    const data = this.getSessionData();
    return JSON.stringify(data, null, 2);
  }

  /**
   * Get tracking status
   */
  isTrackingActive(): boolean {
    return this.isTracking();
  }
}

