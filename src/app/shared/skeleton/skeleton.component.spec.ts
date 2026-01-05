import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SkeletonComponent, SkeletonType, SkeletonAnimation } from './skeleton.component';
import { By } from '@angular/platform-browser';

describe('SkeletonComponent', () => {
  let component: SkeletonComponent;
  let fixture: ComponentFixture<SkeletonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkeletonComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SkeletonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('default values', () => {
    it('should have default type as text', () => {
      expect(component.type).toBe('text');
    });

    it('should have default animation as shimmer', () => {
      expect(component.animation).toBe('shimmer');
    });

    it('should have default count as 1', () => {
      expect(component.count).toBe(1);
    });

    it('should have undefined width by default', () => {
      expect(component.width).toBeUndefined();
    });

    it('should have undefined height by default', () => {
      expect(component.height).toBeUndefined();
    });

    it('should have undefined borderRadius by default', () => {
      expect(component.borderRadius).toBeUndefined();
    });
  });

  describe('type input', () => {
    const types: SkeletonType[] = ['text', 'title', 'avatar', 'thumbnail', 'card', 'list-item', 'podium', 'badge'];

    types.forEach(type => {
      it(`should set type to ${type}`, () => {
        component.type = type;
        expect(component.type).toBe(type);
      });
    });
  });

  describe('animation input', () => {
    const animations: SkeletonAnimation[] = ['pulse', 'shimmer', 'wave', 'none'];

    animations.forEach(animation => {
      it(`should set animation to ${animation}`, () => {
        component.animation = animation;
        expect(component.animation).toBe(animation);
      });
    });
  });

  describe('dimension inputs', () => {
    it('should set width', () => {
      component.width = 200;
      expect(component.width).toBe(200);
    });

    it('should set height', () => {
      component.height = 100;
      expect(component.height).toBe(100);
    });

    it('should set borderRadius', () => {
      component.borderRadius = 16;
      expect(component.borderRadius).toBe(16);
    });

    it('should set all dimensions together', () => {
      component.width = 150;
      component.height = 75;
      component.borderRadius = 10;
      
      expect(component.width).toBe(150);
      expect(component.height).toBe(75);
      expect(component.borderRadius).toBe(10);
    });
  });

  describe('size input', () => {
    it('should set both width and height', () => {
      component.size = 64;
      
      expect(component.width).toBe(64);
      expect(component.height).toBe(64);
    });

    it('should set size for avatar type', () => {
      component.type = 'avatar';
      component.size = 80;
      
      expect(component.width).toBe(80);
      expect(component.height).toBe(80);
    });
  });

  describe('count input', () => {
    it('should set count to 1', () => {
      component.count = 1;
      expect(component.count).toBe(1);
    });

    it('should set count to multiple', () => {
      component.count = 5;
      expect(component.count).toBe(5);
    });

    it('should accept various counts', () => {
      [2, 3, 10].forEach(count => {
        component.count = count;
        expect(component.count).toBe(count);
      });
    });
  });

  describe('items getter', () => {
    it('should return array of correct length', () => {
      component.count = 5;
      expect(component.items.length).toBe(5);
    });

    it('should return array filled with zeros', () => {
      component.count = 3;
      expect(component.items).toEqual([0, 0, 0]);
    });

    it('should update when count changes', () => {
      component.count = 2;
      expect(component.items.length).toBe(2);
      
      component.count = 7;
      expect(component.items.length).toBe(7);
    });

    it('should return empty array for count 0', () => {
      component.count = 0;
      expect(component.items.length).toBe(0);
    });
  });

  describe('template rendering', () => {
    it('should render single skeleton when count is 1', () => {
      component.count = 1;
      fixture.detectChanges();
      
      const skeletons = fixture.debugElement.queryAll(By.css('.skeleton'));
      expect(skeletons.length).toBe(1);
    });

    it('should render skeleton element', () => {
      const skeleton = fixture.debugElement.query(By.css('.skeleton'));
      expect(skeleton).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should have aria-busy attribute', () => {
      const skeleton = fixture.debugElement.query(By.css('.skeleton'));
      expect(skeleton.nativeElement.getAttribute('aria-busy')).toBe('true');
    });

    it('should have aria-label attribute', () => {
      const skeleton = fixture.debugElement.query(By.css('.skeleton'));
      expect(skeleton.nativeElement.getAttribute('aria-label')).toBeTruthy();
    });
  });

  describe('combinations', () => {
    it('should handle text type with pulse animation', () => {
      component.type = 'text';
      component.animation = 'pulse';
      fixture.detectChanges();
      
      expect(component.type).toBe('text');
      expect(component.animation).toBe('pulse');
    });

    it('should handle card type with wave animation and dimensions', () => {
      component.type = 'card';
      component.animation = 'wave';
      component.width = 200;
      component.height = 100;
      fixture.detectChanges();
      
      expect(component.type).toBe('card');
      expect(component.animation).toBe('wave');
      expect(component.width).toBe(200);
      expect(component.height).toBe(100);
    });

    it('should handle list-item type with multiple count', () => {
      component.type = 'list-item';
      component.count = 5;
      fixture.detectChanges();
      
      expect(component.type).toBe('list-item');
      expect(component.items.length).toBe(5);
    });

    it('should handle badge type with size', () => {
      component.type = 'badge';
      component.size = 40;
      fixture.detectChanges();
      
      expect(component.type).toBe('badge');
      expect(component.width).toBe(40);
      expect(component.height).toBe(40);
    });
  });

  describe('edge cases', () => {
    it('should handle count of 0', () => {
      component.count = 0;
      expect(component.items).toEqual([]);
    });

    it('should handle negative values for dimensions gracefully', () => {
      component.width = -10;
      component.height = -5;
      expect(component.width).toBe(-10);
      expect(component.height).toBe(-5);
    });

    it('should handle large count', () => {
      component.count = 100;
      expect(component.items.length).toBe(100);
    });
  });
});

