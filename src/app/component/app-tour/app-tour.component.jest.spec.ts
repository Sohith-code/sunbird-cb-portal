import { AppTourComponent } from './app-tour.component'

describe('AppTourComponent (No TestBed)', () => {
  let component: AppTourComponent
  let mockGuidedTourService: any
  let mockUtilitySvc: any
  let mockConfigSvc: any
  let mockEvents: any
  let mockUserProfileSvc: any
  let mockTranslate: any

  beforeEach(() => {
    mockGuidedTourService = {
      startTour: jest.fn(),
      skipTour: jest.fn(),
    }

    mockUtilitySvc = {
      isMobile: false,
    }

    mockConfigSvc = {
      unMappedUser: { id: 'user-123' },
      updateTourGuideMethod: jest.fn(),
    }

    mockEvents = {
      dispatchGetStartedEvent: jest.fn(),
    }

    mockUserProfileSvc = {
      editProfileDetails: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
    }

    mockTranslate = {
      setDefaultLang: jest.fn(),
      use: jest.fn(),
      instant: jest.fn().mockImplementation((key: string) => key),
    }

    // Mock localStorage
    jest.spyOn(localStorage, 'getItem').mockReturnValue(null)
    jest.spyOn(localStorage, 'setItem').mockImplementation(() => { })

    component = new AppTourComponent(
      mockGuidedTourService,
      mockUtilitySvc,
      mockConfigSvc,
      mockEvents,
      mockUserProfileSvc,
      mockTranslate
    )
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.useRealTimers()
  })

  it('should create the component', () => {
    expect(component).toBeTruthy()
  })

  it('should set isMobile from utilitySvc', () => {
    expect(component.isMobile).toBe(false)
  })

  it('should raise get started telemetry on construction', () => {
    expect(mockEvents.dispatchGetStartedEvent).toHaveBeenCalled()
  })

  describe('updateTourstatus', () => {
    it('should call editProfileDetails with correct payload', () => {
      const status = { visited: true, skipped: false }
      component.updateTourstatus(status)
      expect(mockUserProfileSvc.editProfileDetails).toHaveBeenCalledWith({
        request: {
          userId: 'user-123',
          profileDetails: { get_started_tour_v2: status },
        },
      })
    })
  })

  describe('emitFromVideo', () => {
    it('should call skipTour when event is skip', () => {
      jest.spyOn(component, 'skipTour').mockImplementation(() => { })
      component.emitFromVideo('skip')
      expect(component.skipTour).toHaveBeenCalledWith('video-skip', 'video')
    })

    it('should call startTour when event is not skip', () => {
      jest.spyOn(component, 'startTour').mockImplementation(() => { })
      component.emitFromVideo('start')
      expect(component.startTour).toHaveBeenCalledWith('welcome-start', 'welcome')
    })
  })

  describe('startTour', () => {
    it('should set showpopup and showVideoTour to false', () => {
      jest.useFakeTimers()
      component.startTour('screen', 'subType')
      expect(component.showpopup).toBe(false)
      expect(component.showVideoTour).toBe(false)
      jest.useRealTimers()
    })

    it('should call guidedTourService.startTour for desktop', () => {
      jest.useFakeTimers()
      document.getElementsByClassName = jest.fn().mockReturnValue([{ style: { left: '100px' } }])
      component.isMobile = false
      component.startTour('screen', 'subType')
      expect(mockGuidedTourService.startTour).toHaveBeenCalled()
      jest.useRealTimers()
    })

    it('should call guidedTourService.startTour for mobile after timeout', () => {
      jest.useFakeTimers()
      component.isMobile = true
      component.startTour('screen', 'subType')
      jest.advanceTimersByTime(2000)
      expect(mockGuidedTourService.startTour).toHaveBeenCalled()
      jest.useRealTimers()
    })
  })

  describe('skipTour', () => {
    it('should update tour status and call configSvc.updateTourGuideMethod', () => {
      jest.useFakeTimers()
      component.skipTour('screen', 'subType')
      expect(mockConfigSvc.updateTourGuideMethod).toHaveBeenCalledWith(true)
      expect(component.noScroll).toBe(false)
      expect(component.showpopup).toBe(false)
      expect(component.showVideoTour).toBe(false)
      expect(component.showCompletePopup).toBe(false)
      jest.useRealTimers()
    })

    it('should raise telemetry from currentWindow when screen/subType are empty', () => {
      jest.useFakeTimers()
      component.currentWindow = { title: 'My Profile' }
      component.skipTour('', '')
      expect(mockEvents.dispatchGetStartedEvent).toHaveBeenCalled()
      jest.useRealTimers()
    })

    it('should raise telemetry with welcome-skip when no currentWindow and empty params', () => {
      jest.useFakeTimers()
      component.currentWindow = null
      component.skipTour('', '')
      expect(mockEvents.dispatchGetStartedEvent).toHaveBeenCalled()
      jest.useRealTimers()
    })
  })

  describe('completeTour', () => {
    it('should set showCompletePopup to true', () => {
      jest.useFakeTimers()
      component.completeTour()
      expect(component.showpopup).toBe(false)
      expect(component.showCompletePopup).toBe(true)
      expect(component.hideCloseBtn).toBe(false)
      jest.useRealTimers()
    })

    it('should call onCongrats after 3 seconds', () => {
      jest.useFakeTimers()
      jest.spyOn(component, 'onCongrats').mockImplementation(() => { })
      component.completeTour()
      jest.advanceTimersByTime(3000)
      expect(component.onCongrats).toHaveBeenCalled()
      jest.useRealTimers()
    })
  })

  describe('onCongrats', () => {
    it('should set showCompletePopup to false and save to localStorage', () => {
      component.onCongrats()
      expect(component.showCompletePopup).toBe(false)
      expect(localStorage.setItem).toHaveBeenCalledWith('tourGuide', JSON.stringify({ disable: true }))
      expect(mockConfigSvc.updateTourGuideMethod).toHaveBeenCalledWith(true)
    })
  })

  describe('startApp', () => {
    it('should set showpopup to true', () => {
      component.showpopup = false
      component.startApp()
      expect(component.showpopup).toBe(true)
    })
  })

  describe('starVideoPlayer', () => {
    it('should hide popup and show video tour', () => {
      component.starVideoPlayer()
      expect(component.showpopup).toBe(false)
      expect(component.showVideoTour).toBe(true)
    })
  })

  describe('nextCb', () => {
    it('should set currentWindow and hideCloseBtn for My Profile', () => {
      const stepObject = { title: 'My Profile' }
      component.nextCb(1, stepObject)
      expect(component.hideCloseBtn).toBe(true)
      expect(component.currentWindow).toBe(stepObject)
    })

    it('should not set hideCloseBtn for other steps', () => {
      const stepObject = { title: 'Learn' }
      component.nextCb(1, stepObject)
      expect(component.hideCloseBtn).toBe(false)
      expect(component.currentWindow).toBe(stepObject)
    })
  })

  describe('prevCb', () => {
    it('should set hideCloseBtn to false and update currentWindow', () => {
      const stepObject = { title: 'Search' }
      component.prevCb(0, stepObject)
      expect(component.hideCloseBtn).toBe(false)
      expect(component.currentWindow).toBe(stepObject)
    })
  })

  describe('raiseGetStartedStartTelemetry', () => {
    it('should dispatch get started event', () => {
      mockEvents.dispatchGetStartedEvent.mockClear()
      component.raiseGetStartedStartTelemetry()
      expect(mockEvents.dispatchGetStartedEvent).toHaveBeenCalled()
    })
  })

  describe('raiseTemeletyInterat', () => {
    it('should dispatch interact event with correct data', () => {
      mockEvents.dispatchGetStartedEvent.mockClear()
      component.raiseTemeletyInterat('test-id', 'test-type')
      expect(mockEvents.dispatchGetStartedEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            edata: expect.objectContaining({ id: 'test-id', subType: 'test-type' }),
          }),
        })
      )
    })
  })

  describe('raiseGetStartedEndTelemetry', () => {
    it('should dispatch end telemetry event', () => {
      mockEvents.dispatchGetStartedEvent.mockClear()
      component.raiseGetStartedEndTelemetry()
      expect(mockEvents.dispatchGetStartedEvent).toHaveBeenCalled()
    })
  })

  describe('closeModal', () => {
    it('should call skipTour with empty strings', () => {
      jest.useFakeTimers()
      jest.spyOn(component, 'skipTour').mockImplementation(() => { })
      component.closeModal()
      expect(component.skipTour).toHaveBeenCalledWith('', '')
      jest.useRealTimers()
    })
  })

  describe('translateTo', () => {
    it('should call translate.instant with proper key', () => {
      const result = component.translateTo('stepLearn')
      expect(mockTranslate.instant).toHaveBeenCalledWith('tour.stepLearn')
      expect(result).toBe('tour.stepLearn')
    })
  })

  describe('onKeydownHandler', () => {
    it('should call skipTour on Escape key', () => {
      jest.spyOn(component, 'skipTour').mockImplementation(() => { })
      component.onKeydownHandler({ key: 'Escape' } as KeyboardEvent)
      expect(component.skipTour).toHaveBeenCalledWith('', '')
    })

    it('should not call skipTour on other keys', () => {
      jest.spyOn(component, 'skipTour').mockImplementation(() => { })
      component.onKeydownHandler({ key: 'Enter' } as KeyboardEvent)
      expect(component.skipTour).not.toHaveBeenCalled()
    })
  })
})
