import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { catchError, map, switchMap, timeout } from 'rxjs/operators';
import { GeoLocation } from '../models/user.model';
import { LogService } from './log.service';

/**
 * GeolocationService
 * 
 * Responsible for capturing:
 * 1. User's IP address (via ipify.org)
 * 2. User's GPS coordinates (via navigator.geolocation API)
 * 3. Fallback IP-based geolocation (via ipapi.co) if GPS denied
 * 
 * Used for audit/legal purposes when accepting Terms of Use
 */
@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  
  private readonly IP_API = 'https://api.ipify.org?format=json';
  private readonly GEO_API = 'https://ipapi.co/json/';
  private readonly TIMEOUT_MS = 5000; // 5 seconds timeout
  private readonly logService = new LogService();
  
  constructor(private http: HttpClient) {}

  /**
   * Get user's public IP address
   * Uses ipify.org (free, no rate limits)
   * 
   * @returns Observable with IP address string or null if failed
   */
  getIpAddress(): Observable<string | null> {
    return this.http.get<{ ip: string }>(this.IP_API).pipe(
      timeout(this.TIMEOUT_MS),
      map(response => response.ip),
      catchError(error => {
        this.logService.error('GeolocationService', 'Failed to get IP address', error as Error);
        return of(null);
      })
    );
  }

  /**
   * Get user's GPS coordinates using browser's Geolocation API
   * Requires user permission
   * 
   * @returns Observable with GeoLocation object or null if denied/failed
   */
  getGpsCoordinates(): Observable<GeoLocation | null> {
    if (!navigator.geolocation) {
      this.logService.warn('GeolocationService', 'Geolocation API not available in this browser');
      return of(null);
    }

    return from(
      new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          position => resolve(position),
          error => reject(error),
          {
            enableHighAccuracy: false, // Don't need high accuracy for terms acceptance
            timeout: this.TIMEOUT_MS,
            maximumAge: 60000 // Accept cached position up to 1 minute old
          }
        );
      })
    ).pipe(
      map(position => ({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date(position.timestamp)
      })),
      catchError(error => {
        this.logService.warn('GeolocationService', 'Failed to get GPS coordinates', { error: error.message || error });
        return of(null);
      })
    );
  }

  /**
   * Get approximate geolocation based on IP address
   * Fallback when GPS is denied or unavailable
   * Uses ipapi.co (free tier: 1000 requests/day)
   * 
   * @returns Observable with approximate GeoLocation or null if failed
   */
  getIpBasedGeolocation(): Observable<GeoLocation | null> {
    return this.http.get<any>(this.GEO_API).pipe(
      timeout(this.TIMEOUT_MS),
      map(response => {
        if (response.latitude && response.longitude) {
          return {
            latitude: response.latitude,
            longitude: response.longitude,
            accuracy: 50000, // IP-based geo is very approximate (~50km)
            timestamp: new Date()
          };
        }
        return null;
      }),
      catchError(error => {
        this.logService.error('GeolocationService', 'Failed to get IP-based geolocation', error as Error);
        return of(null);
      })
    );
  }

  /**
   * Get complete geolocation data with fallback strategy:
   * 1. Try GPS first (most accurate)
   * 2. If GPS fails/denied, try IP-based geo (approximate)
   * 3. If all fail, return null
   * 
   * @returns Observable with GeoLocation object or null
   */
  getGeolocation(): Observable<GeoLocation | null> {
    return this.getGpsCoordinates().pipe(
      switchMap(gpsGeo => {
        if (gpsGeo) {
          this.logService.info('GeolocationService', 'GPS coordinates obtained');
          return of(gpsGeo);
        }
        
        this.logService.info('GeolocationService', 'GPS unavailable, trying IP-based geolocation');
        return this.getIpBasedGeolocation();
      })
    );
  }

  /**
   * Get all data needed for Terms acceptance:
   * - IP address
   * - Geolocation (GPS or IP-based fallback)
   * 
   * @returns Observable with object containing ip and geolocation (both can be null)
   */
  getAcceptanceData(): Observable<{ ip: string | null; geolocation: GeoLocation | null }> {
    return this.getIpAddress().pipe(
      switchMap(ip => {
        return this.getGeolocation().pipe(
          map(geolocation => ({
            ip,
            geolocation
          }))
        );
      }),
      catchError(error => {
        this.logService.error('GeolocationService', 'Failed to get acceptance data', error as Error);
        return of({ ip: null, geolocation: null });
      })
    );
  }

  /**
   * Format coordinates as human-readable string
   * Useful for display/logging purposes
   */
  formatCoordinates(geo: GeoLocation | null): string {
    if (!geo) return 'Unavailable';
    return `${geo.latitude.toFixed(6)}, ${geo.longitude.toFixed(6)} (±${geo.accuracy?.toFixed(0)}m)`;
  }
}

