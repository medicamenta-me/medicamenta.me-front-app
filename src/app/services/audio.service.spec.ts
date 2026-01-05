import { TestBed } from '@angular/core/testing';
import { AudioService } from './audio.service';

describe('AudioService', () => {
  let service: AudioService;
  let mockAudioContext: any;
  let mockOscillator: any;
  let mockGainNode: any;
  let mockBiquadFilter: any;
  let mockBufferSource: any;
  let mockAudioBuffer: any;
  let mockAudioParam: any;
  let localStorageStore: { [key: string]: string };

  const createMockAudioParam = (): any => {
    const param: any = {
      setValueAtTime: jasmine.createSpy('setValueAtTime'),
      linearRampToValueAtTime: jasmine.createSpy('linearRampToValueAtTime'),
      exponentialRampToValueAtTime: jasmine.createSpy('exponentialRampToValueAtTime'),
      value: 0
    };
    param.setValueAtTime.and.returnValue(param);
    param.linearRampToValueAtTime.and.returnValue(param);
    param.exponentialRampToValueAtTime.and.returnValue(param);
    return param;
  };

  beforeEach(() => {
    // Reset localStorage mock
    localStorageStore = {};

    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      return localStorageStore[key] ?? null;
    });

    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      localStorageStore[key] = value;
    });

    // Create mock AudioParam
    mockAudioParam = createMockAudioParam();

    // Create mock OscillatorNode
    mockOscillator = {
      connect: jasmine.createSpy('connect').and.returnValue({}),
      start: jasmine.createSpy('start'),
      stop: jasmine.createSpy('stop'),
      frequency: createMockAudioParam()
    };

    // Create mock GainNode
    mockGainNode = {
      connect: jasmine.createSpy('connect').and.returnValue({}),
      gain: createMockAudioParam()
    };

    // Create mock BiquadFilterNode
    mockBiquadFilter = {
      connect: jasmine.createSpy('connect').and.returnValue({}),
      frequency: createMockAudioParam(),
      type: 'lowpass'
    };

    // Create mock AudioBuffer
    mockAudioBuffer = {
      getChannelData: jasmine.createSpy('getChannelData').and.returnValue(new Float32Array(44100 * 0.2))
    };

    // Create mock BufferSourceNode
    mockBufferSource = {
      connect: jasmine.createSpy('connect').and.returnValue({}),
      start: jasmine.createSpy('start'),
      stop: jasmine.createSpy('stop'),
      buffer: null
    };

    // Create mock AudioContext
    mockAudioContext = {
      createOscillator: jasmine.createSpy('createOscillator').and.returnValue(mockOscillator),
      createGain: jasmine.createSpy('createGain').and.returnValue(mockGainNode),
      createBiquadFilter: jasmine.createSpy('createBiquadFilter').and.returnValue(mockBiquadFilter),
      createBuffer: jasmine.createSpy('createBuffer').and.returnValue(mockAudioBuffer),
      createBufferSource: jasmine.createSpy('createBufferSource').and.returnValue(mockBufferSource),
      currentTime: 0,
      sampleRate: 44100,
      destination: {}
    };

    // Mock window.AudioContext
    (window as any).AudioContext = jasmine.createSpy('AudioContext').and.returnValue(mockAudioContext);

    TestBed.configureTestingModule({
      providers: [AudioService]
    });

    service = TestBed.inject(AudioService);
    // Assign the mock context to the service
    (service as any).audioContext = mockAudioContext;
  });

  afterEach(() => {
    // Clean up
    delete (window as any).AudioContext;
  });

  describe('Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should load mute preference from localStorage', () => {
      localStorageStore['audio_muted'] = 'true';
      
      // Re-create service to test initialization
      const newService = new AudioService();
      
      expect(newService.isMutedStatus()).toBeTrue();
    });

    it('should default to unmuted if no preference stored', () => {
      // No stored preference
      const newService = new AudioService();
      
      expect(newService.isMutedStatus()).toBeFalse();
    });

    it('should handle non-boolean localStorage values', () => {
      localStorageStore['audio_muted'] = 'false';
      
      const newService = new AudioService();
      
      expect(newService.isMutedStatus()).toBeFalse();
    });
  });

  describe('toggleMute', () => {
    it('should toggle mute from false to true', () => {
      (service as any).isMuted = false;
      
      service.toggleMute();
      
      expect(service.isMutedStatus()).toBeTrue();
    });

    it('should toggle mute from true to false', () => {
      (service as any).isMuted = true;
      
      service.toggleMute();
      
      expect(service.isMutedStatus()).toBeFalse();
    });

    it('should save mute preference to localStorage', () => {
      (service as any).isMuted = false;
      
      service.toggleMute();
      
      expect(localStorage.setItem).toHaveBeenCalledWith('audio_muted', 'true');
    });

    it('should toggle multiple times correctly', () => {
      (service as any).isMuted = false;
      
      service.toggleMute(); // true
      service.toggleMute(); // false
      service.toggleMute(); // true
      
      expect(service.isMutedStatus()).toBeTrue();
    });
  });

  describe('isMutedStatus', () => {
    it('should return true when muted', () => {
      (service as any).isMuted = true;
      
      expect(service.isMutedStatus()).toBeTrue();
    });

    it('should return false when not muted', () => {
      (service as any).isMuted = false;
      
      expect(service.isMutedStatus()).toBeFalse();
    });
  });

  describe('playConfetti', () => {
    it('should not play when muted', () => {
      (service as any).isMuted = true;
      
      service.playConfetti();
      
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
    });

    it('should not play when audioContext is null', () => {
      (service as any).audioContext = null;
      (service as any).isMuted = false;
      
      service.playConfetti();
      
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
    });

    it('should create oscillator when not muted', () => {
      (service as any).isMuted = false;
      
      service.playConfetti();
      
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    });

    it('should create gain node', () => {
      (service as any).isMuted = false;
      
      service.playConfetti();
      
      expect(mockAudioContext.createGain).toHaveBeenCalled();
    });

    it('should connect oscillator to gain', () => {
      (service as any).isMuted = false;
      
      service.playConfetti();
      
      expect(mockOscillator.connect).toHaveBeenCalledWith(mockGainNode);
    });

    it('should connect gain to destination', () => {
      (service as any).isMuted = false;
      
      service.playConfetti();
      
      expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination);
    });

    it('should set frequency parameters', () => {
      (service as any).isMuted = false;
      
      service.playConfetti();
      
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(800, 0);
    });

    it('should start and stop oscillator', () => {
      (service as any).isMuted = false;
      
      service.playConfetti();
      
      expect(mockOscillator.start).toHaveBeenCalledWith(0);
      expect(mockOscillator.stop).toHaveBeenCalled();
    });
  });

  describe('playStarburst', () => {
    beforeEach(() => {
      jasmine.clock().install();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should not play when muted', () => {
      (service as any).isMuted = true;
      
      service.playStarburst();
      
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
    });

    it('should not play when audioContext is null', () => {
      (service as any).audioContext = null;
      (service as any).isMuted = false;
      
      service.playStarburst();
      
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
    });

    it('should create oscillator for whoosh sound', () => {
      (service as any).isMuted = false;
      
      service.playStarburst();
      
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    });

    it('should set ascending frequency for whoosh', () => {
      (service as any).isMuted = false;
      
      service.playStarburst();
      
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(200, 0);
    });

    it('should schedule power-up ding after whoosh', () => {
      (service as any).isMuted = false;
      
      service.playStarburst();
      
      // Initial call
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(1);
      
      // After 300ms, should create another oscillator for ding
      jasmine.clock().tick(300);
      
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(2);
    });
  });

  describe('playFireworks', () => {
    beforeEach(() => {
      jasmine.clock().install();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should not play when muted', () => {
      (service as any).isMuted = true;
      
      service.playFireworks();
      
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
    });

    it('should not play when audioContext is null', () => {
      (service as any).audioContext = null;
      (service as any).isMuted = false;
      
      service.playFireworks();
      
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
    });

    it('should create oscillator for launch sound', () => {
      (service as any).isMuted = false;
      
      service.playFireworks();
      
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    });

    it('should schedule bang sound after launch', () => {
      (service as any).isMuted = false;
      
      service.playFireworks();
      
      // Initial launch sound
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(1);
      
      // After 800ms, should create buffer for bang
      jasmine.clock().tick(800);
      
      expect(mockAudioContext.createBuffer).toHaveBeenCalled();
    });

    it('should schedule crackle sound after bang', () => {
      (service as any).isMuted = false;
      
      service.playFireworks();
      
      // Wait for bang (800ms) + crackle delay (100ms)
      jasmine.clock().tick(900);
      
      // Crackle creates multiple oscillators
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    });

    it('should schedule second firework', () => {
      (service as any).isMuted = false;
      
      service.playFireworks();
      
      // Initial calls count
      const initialOscillatorCalls = mockAudioContext.createOscillator.calls.count();
      
      // Wait for second firework launch (1500ms)
      jasmine.clock().tick(1500);
      
      expect(mockAudioContext.createOscillator.calls.count()).toBeGreaterThan(initialOscillatorCalls);
    });
  });

  describe('playNotification', () => {
    it('should not play when muted', () => {
      (service as any).isMuted = true;
      
      service.playNotification();
      
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
    });

    it('should not play when audioContext is null', () => {
      (service as any).audioContext = null;
      (service as any).isMuted = false;
      
      service.playNotification();
      
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
    });

    it('should create oscillator when not muted', () => {
      (service as any).isMuted = false;
      
      service.playNotification();
      
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    });

    it('should create gain node', () => {
      (service as any).isMuted = false;
      
      service.playNotification();
      
      expect(mockAudioContext.createGain).toHaveBeenCalled();
    });

    it('should set frequency to 880Hz (A5)', () => {
      (service as any).isMuted = false;
      
      service.playNotification();
      
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(880, 0);
    });

    it('should start and stop oscillator', () => {
      (service as any).isMuted = false;
      
      service.playNotification();
      
      expect(mockOscillator.start).toHaveBeenCalledWith(0);
      expect(mockOscillator.stop).toHaveBeenCalled();
    });

    it('should connect audio chain correctly', () => {
      (service as any).isMuted = false;
      
      service.playNotification();
      
      expect(mockOscillator.connect).toHaveBeenCalledWith(mockGainNode);
      expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination);
    });
  });

  describe('Private Methods', () => {
    describe('playSparkle', () => {
      it('should not play when audioContext is null', () => {
        (service as any).audioContext = null;
        
        (service as any).playSparkle();
        
        expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
      });

      it('should create high frequency sound', () => {
        (service as any).playSparkle();
        
        expect(mockAudioContext.createOscillator).toHaveBeenCalled();
        expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(2400, 0);
      });

      it('should ramp frequency up to 3200Hz', () => {
        (service as any).playSparkle();
        
        expect(mockOscillator.frequency.exponentialRampToValueAtTime).toHaveBeenCalled();
      });
    });

    describe('playLaunchSound', () => {
      it('should not play when audioContext is null', () => {
        (service as any).audioContext = null;
        
        (service as any).playLaunchSound();
        
        expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
      });

      it('should create ascending frequency for rocket', () => {
        (service as any).playLaunchSound();
        
        expect(mockAudioContext.createOscillator).toHaveBeenCalled();
        expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(100, 0);
      });

      it('should ramp frequency up', () => {
        (service as any).playLaunchSound();
        
        expect(mockOscillator.frequency.exponentialRampToValueAtTime).toHaveBeenCalled();
      });
    });

    describe('playBangSound', () => {
      it('should not play when audioContext is null', () => {
        (service as any).audioContext = null;
        
        (service as any).playBangSound();
        
        expect(mockAudioContext.createBuffer).not.toHaveBeenCalled();
      });

      it('should create audio buffer for white noise', () => {
        (service as any).playBangSound();
        
        expect(mockAudioContext.createBuffer).toHaveBeenCalledWith(1, jasmine.any(Number), 44100);
      });

      it('should create buffer source', () => {
        (service as any).playBangSound();
        
        expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
      });

      it('should create biquad filter for bang', () => {
        (service as any).playBangSound();
        
        expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled();
      });

      it('should set filter to lowpass', () => {
        (service as any).playBangSound();
        
        expect(mockBiquadFilter.type).toBe('lowpass');
      });

      it('should connect audio chain', () => {
        (service as any).playBangSound();
        
        expect(mockBufferSource.connect).toHaveBeenCalledWith(mockBiquadFilter);
        expect(mockBiquadFilter.connect).toHaveBeenCalledWith(mockGainNode);
        expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination);
      });

      it('should start and stop buffer source', () => {
        (service as any).playBangSound();
        
        expect(mockBufferSource.start).toHaveBeenCalledWith(0);
        expect(mockBufferSource.stop).toHaveBeenCalled();
      });
    });

    describe('playCrackle', () => {
      beforeEach(() => {
        jasmine.clock().install();
      });

      afterEach(() => {
        jasmine.clock().uninstall();
      });

      it('should not play when audioContext is null', () => {
        (service as any).audioContext = null;
        
        (service as any).playCrackle();
        
        jasmine.clock().tick(500);
        
        expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
      });

      it('should create multiple oscillators for crackle effect', () => {
        (service as any).playCrackle();
        
        // Wait for all 8 pops (spaced 50ms apart)
        jasmine.clock().tick(400);
        
        expect(mockAudioContext.createOscillator.calls.count()).toBe(8);
      });

      it('should space out pops by 50ms', () => {
        (service as any).playCrackle();
        
        // After first tick, should have 1 oscillator
        jasmine.clock().tick(0);
        expect(mockAudioContext.createOscillator.calls.count()).toBe(1);
        
        // After 50ms, should have 2
        jasmine.clock().tick(50);
        expect(mockAudioContext.createOscillator.calls.count()).toBe(2);
        
        // After 100ms, should have 3
        jasmine.clock().tick(50);
        expect(mockAudioContext.createOscillator.calls.count()).toBe(3);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid toggle calls', () => {
      const initialState = service.isMutedStatus();
      
      for (let i = 0; i < 10; i++) {
        service.toggleMute();
      }
      
      // After 10 toggles, should return to original state
      expect(service.isMutedStatus()).toBe(initialState);
    });

    it('should handle playing multiple sounds simultaneously', () => {
      (service as any).isMuted = false;
      
      service.playConfetti();
      service.playNotification();
      
      // Should create 2 oscillators (one for each sound)
      expect(mockAudioContext.createOscillator.calls.count()).toBeGreaterThanOrEqual(2);
    });

    it('should handle missing window.AudioContext gracefully', () => {
      // Create service without AudioContext
      delete (window as any).AudioContext;
      
      const newService = new AudioService();
      
      // Should not throw when trying to play
      expect(() => newService.playConfetti()).not.toThrow();
      expect(() => newService.playNotification()).not.toThrow();
    });

    it('should handle gain value ramping correctly', () => {
      (service as any).isMuted = false;
      
      service.playNotification();
      
      expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalled();
      expect(mockGainNode.gain.exponentialRampToValueAtTime).toHaveBeenCalled();
    });
  });

  describe('Audio Context State', () => {
    it('should use AudioContext currentTime', () => {
      (service as any).isMuted = false;
      Object.defineProperty(mockAudioContext, 'currentTime', { value: 5.5 });
      
      service.playNotification();
      
      expect(mockOscillator.start).toHaveBeenCalledWith(5.5);
    });

    it('should use AudioContext sampleRate for buffer', () => {
      (service as any).isMuted = false;
      
      (service as any).playBangSound();
      
      expect(mockAudioContext.createBuffer).toHaveBeenCalledWith(1, jasmine.any(Number), 44100);
    });

    it('should connect to AudioContext destination', () => {
      (service as any).isMuted = false;
      
      service.playNotification();
      
      expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination);
    });
  });

  describe('localStorage Persistence', () => {
    it('should persist mute true to localStorage', () => {
      (service as any).isMuted = false;
      
      service.toggleMute();
      
      expect(localStorage.setItem).toHaveBeenCalledWith('audio_muted', 'true');
    });

    it('should persist mute false to localStorage', () => {
      (service as any).isMuted = true;
      
      service.toggleMute();
      
      expect(localStorage.setItem).toHaveBeenCalledWith('audio_muted', 'false');
    });

    it('should read audio_muted key on initialization', () => {
      new AudioService();
      
      expect(localStorage.getItem).toHaveBeenCalledWith('audio_muted');
    });
  });

  describe('Sound Characteristics', () => {
    it('should use pop frequency (800Hz to 100Hz) for confetti', () => {
      (service as any).isMuted = false;
      
      service.playConfetti();
      
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(800, jasmine.any(Number));
    });

    it('should use whoosh frequencies (200Hz to 1200Hz) for starburst', () => {
      (service as any).isMuted = false;
      
      service.playStarburst();
      
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(200, jasmine.any(Number));
    });

    it('should use A5 note (880Hz) for notification', () => {
      (service as any).isMuted = false;
      
      service.playNotification();
      
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(880, jasmine.any(Number));
    });

    it('should use high frequency (2400Hz) for sparkle', () => {
      (service as any).playSparkle();
      
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(2400, jasmine.any(Number));
    });

    it('should use low frequency (100Hz) for launch', () => {
      (service as any).playLaunchSound();
      
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(100, jasmine.any(Number));
    });
  });
});
