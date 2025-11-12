import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SkeletonType = 'text' | 'title' | 'avatar' | 'thumbnail' | 'card' | 'list-item' | 'podium' | 'badge';
export type SkeletonAnimation = 'pulse' | 'shimmer' | 'wave' | 'none';

/**
 * Skeleton Component
 * Reusable loading skeleton for different UI patterns
 * 
 * @example
 * ```html
 * <!-- Text skeleton -->
 * <app-skeleton type="text" [width]="200"></app-skeleton>
 * 
 * <!-- Avatar skeleton -->
 * <app-skeleton type="avatar" [size]="64"></app-skeleton>
 * 
 * <!-- Card skeleton -->
 * <app-skeleton type="card" [height]="120"></app-skeleton>
 * 
 * <!-- Multiple items -->
 * <app-skeleton type="list-item" [count]="5"></app-skeleton>
 * ```
 */
@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (count > 1) {
      @for (item of items; track $index) {
        <div 
          class="skeleton" 
          [class]="'skeleton-' + type + ' skeleton-' + animation"
          [style.width.px]="width"
          [style.height.px]="height"
          [style.border-radius.px]="borderRadius"
          [attr.aria-busy]="true"
          [attr.aria-label]="'Loading ' + type">
        </div>
      }
    } @else {
      <div 
        class="skeleton" 
        [class]="'skeleton-' + type + ' skeleton-' + animation"
        [style.width.px]="width"
        [style.height.px]="height"
        [style.border-radius.px]="borderRadius"
        [attr.aria-busy]="true"
        [attr.aria-label]="'Loading ' + type">
      </div>
    }
  `,
  styles: [`
    .skeleton {
      background: var(--ion-color-light);
      position: relative;
      overflow: hidden;
      margin-bottom: 8px;
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .skeleton {
        background: var(--ion-color-dark);
      }
    }

    /* Animation: Pulse */
    .skeleton-pulse {
      animation: skeleton-pulse 1.5s ease-in-out infinite;
    }

    @keyframes skeleton-pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    /* Animation: Shimmer */
    .skeleton-shimmer::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.3),
        transparent
      );
      animation: skeleton-shimmer 1.5s infinite;
    }

    @media (prefers-color-scheme: dark) {
      .skeleton-shimmer::before {
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.1),
          transparent
        );
      }
    }

    @keyframes skeleton-shimmer {
      0% {
        transform: translateX(0);
      }
      100% {
        transform: translateX(200%);
      }
    }

    /* Animation: Wave */
    .skeleton-wave {
      animation: skeleton-wave 1.5s ease-in-out infinite;
    }

    @keyframes skeleton-wave {
      0%, 100% {
        transform: scaleX(1);
      }
      50% {
        transform: scaleX(0.95);
      }
    }

    /* Type: Text */
    .skeleton-text {
      height: 16px;
      border-radius: 4px;
      width: 100%;
    }

    /* Type: Title */
    .skeleton-title {
      height: 24px;
      border-radius: 6px;
      width: 60%;
    }

    /* Type: Avatar */
    .skeleton-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
    }

    /* Type: Thumbnail */
    .skeleton-thumbnail {
      width: 80px;
      height: 80px;
      border-radius: 8px;
    }

    /* Type: Card */
    .skeleton-card {
      width: 100%;
      height: 120px;
      border-radius: 12px;
    }

    /* Type: List Item */
    .skeleton-list-item {
      width: 100%;
      height: 60px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      padding: 12px;
    }

    /* Type: Podium */
    .skeleton-podium {
      width: 80px;
      border-radius: 8px;
      margin: 0 4px;
    }

    /* Type: Badge */
    .skeleton-badge {
      width: 40px;
      height: 40px;
      border-radius: 8px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SkeletonComponent {
  /**
   * Type of skeleton to display
   */
  @Input() type: SkeletonType = 'text';

  /**
   * Animation style
   */
  @Input() animation: SkeletonAnimation = 'shimmer';

  /**
   * Width in pixels (overrides default for type)
   */
  @Input() width?: number;

  /**
   * Height in pixels (overrides default for type)
   */
  @Input() height?: number;

  /**
   * Border radius in pixels (overrides default for type)
   */
  @Input() borderRadius?: number;

  /**
   * Size for avatar/badge types (sets both width and height)
   */
  @Input() set size(value: number) {
    this.width = value;
    this.height = value;
  }

  /**
   * Number of skeleton items to render
   */
  @Input() count: number = 1;

  /**
   * Array for *ngFor iteration
   */
  get items(): number[] {
    return Array(this.count).fill(0);
  }
}
