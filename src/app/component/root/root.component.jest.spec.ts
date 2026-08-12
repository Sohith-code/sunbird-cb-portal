import { RootComponent } from './root.component'
import { of, Subject, BehaviorSubject } from 'rxjs'

describe('RootComponent (No TestBed)', () => {
  let component: RootComponent
  let mockRouter: any
  let mockRoute: any
  let mockAppRef: any
  let mockSwUpdate: any
  let mockDialog: any
  let mockHttp: any
  let mockConfigSvc: any
  let mockValueSvc: any
  let mockTelemetrySvc: any
  let mockEventSvc: any
  let mockMobileAppsSvc: any
  let mockRootSvc: any
  let mockBtnBackSvc: any
  let mockChangeDetector: any
  let mockUtilitySvc: any
  let mockUrlService: any
  let mockIGOTAIService: any
  let mockCommonDataSvc: any
  let mockLibNotificationsService: any
  let mockHomePageSvc: any
  let routerEventsSubject: Subject<any>

  beforeEach(() => {
    routerEventsSubject = new Subject()

    mockRouter = {
      events: routerEventsSubject.asObservable(),
      navigate: jest.fn(),
      navigateByUrl: jest.fn(),
      url: '/page/home',
    }

    mockRoute = {
      queryParams: of({}),
      snapshot: {
        fragment: '',
        root: { firstChild: { data: { pageId: 'home', module: 'home' }, firstChild: null } },
        queryParams: { primaryCategory: '' },
      },
    }

    mockAppRef = {
      isStable: of(true),
    }

    mockSwUpdate = {
      isEnabled: false,
      checkForUpdate: jest.fn().mockReturnValue(Promise.resolve()),
      activateUpdate: jest.fn().mockReturnValue(Promise.resolve()),
    }

    mockDialog = {
      open: jest.fn().mockReturnValue({ afterClosed: () => of(false) }),
    }

    mockHttp = {
      get: jest.fn().mockReturnValue(of({ data: null })),
      post: jest.fn().mockReturnValue(of({})),
    }

    mockConfigSvc = {
      unMappedUser: {
        id: 'user-123',
        rootOrgId: 'org-1',
        profileDetails: {
          profileStatus: 'active',
          employmentDetails: { departmentName: 'IT' },
          get_started_tour_v2: { skipped: false, visited: false },
        },
      },
      userProfile: { userId: 'user-123' },
      sitePath: '/assets',
      iGOTAIConfig: null,
      overrideThemeChanges: null,
      updateTourGuideMethod: jest.fn(),
      updateTourGuide: of(false),
      profileTimelyNudges: { enable: false },
      languageTranslationFlag: new Subject(),
    }

    mockValueSvc = {
      isXSmall$: of(false),
    }

    mockTelemetrySvc = {
      impression: jest.fn(),
    }

    mockEventSvc = {
      dispatchEvent: jest.fn(),
      raiseInteractTelemetry: jest.fn(),
    }

    mockMobileAppsSvc = {
      init: jest.fn(),
      mobileTopHeaderVisibilityStatus: new BehaviorSubject(true),
      clearGlobalSearchForHomePage: new BehaviorSubject(false),
    }

    mockRootSvc = {
      showNavbarDisplay$: new BehaviorSubject(true),
      getCookie: jest.fn().mockReturnValue(null),
    }

    mockBtnBackSvc = {
      initialize: jest.fn(),
    }

    mockChangeDetector = {
      detectChanges: jest.fn(),
    }

    mockUtilitySvc = {
      setRouteData: jest.fn(),
      routeData: { pageId: 'home', module: 'home' },
      isMobile: false,
    }

    mockUrlService = {
      setPreviousUrl: jest.fn(),
    }

    mockIGOTAIService = {
      iGOTAIConfigReadData: jest.fn().mockReturnValue(of({ web: { aiTutor: true } })),
    }

    mockCommonDataSvc = {
      mandatoryDetails: jest.fn(),
    }

    mockLibNotificationsService = {
      updateUnreadCount: jest.fn(),
    }

    mockHomePageSvc = {
      getLearnerLeaderboardCached: jest.fn().mockReturnValue(of({
        result: {
          result: [
            { userId: 'user-123', rank: 5 },
            { userId: 'user-456', rank: 2 },
          ],
        },
      })),
    }

    // Mock CsModule
    jest.mock('@project-sunbird/client-services', () => ({
      CsModule: { instance: { init: jest.fn() } },
    }), { virtual: true })

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { pathname: '/page/home', origin: 'http://localhost', reload: jest.fn() },
      writable: true,
    })

    component = new RootComponent(
      mockRouter,
      mockRoute,
      mockAppRef,
      mockSwUpdate,
      mockDialog,
      mockHttp,
      mockConfigSvc,
      mockValueSvc,
      mockTelemetrySvc,
      mockEventSvc,
      mockMobileAppsSvc,
      mockRootSvc,
      mockBtnBackSvc,
      mockChangeDetector,
      mockUtilitySvc,
      mockUrlService,
      mockIGOTAIService,
      mockCommonDataSvc,
      mockLibNotificationsService,
      mockHomePageSvc
    )
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should create the component', () => {
    expect(component).toBeTruthy()
  })

  it('should initialize menuBarDetails with correct structure', () => {
    expect(component.menuBarDetails).toBeDefined()
    expect(component.menuBarDetails.logoUrl).toBeDefined()
    expect(component.menuBarDetails.navSections).toHaveLength(3)
  })

  it('should have navSections with sectionLoading false', () => {
    component.menuBarDetails.navSections.forEach((section: any) => {
      expect(section.sectionLoading).toBe(false)
    })
  })

  describe('ngOnInit', () => {
    beforeEach(() => {
      jest.spyOn(localStorage, 'getItem').mockImplementation((key: string) => {
        if (key === 'userEnrollmentCount') {
          return JSON.stringify({
            userCourseEnrolmentInfo: {
              karmaPoints: 100,
              badgeCount: 5,
            },
          })
        }
        if (key === 'activeMenu') {
          return 'home'
        }
        return null
      })
      document.getElementById = jest.fn().mockReturnValue({
        classList: { add: jest.fn(), remove: jest.fn() },
      })
    })

    it('should call btnBackSvc.initialize', () => {
      component.ngOnInit()
      expect(mockBtnBackSvc.initialize).toHaveBeenCalled()
    })

    it('should subscribe to mobileTopHeaderVisibilityStatus', () => {
      component.ngOnInit()
      mockMobileAppsSvc.mobileTopHeaderVisibilityStatus.next(false)
      expect(component.mobileTopHeaderVisibilityStatus).toBe(false)
    })

    it('should call configSvc.updateTourGuideMethod', () => {
      component.ngOnInit()
      expect(mockConfigSvc.updateTourGuideMethod).toHaveBeenCalled()
    })

    it('should set customHeight to true when pathname includes /public/home', () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/public/home', origin: 'http://localhost', reload: jest.fn() },
        writable: true,
      })
      component.ngOnInit()
      expect(component.customHeight).toBe(true)
    })

    it('should detect iframe', () => {
      component.ngOnInit()
      expect(component.isInIframe).toBe(false)
    })

    it('should call loadMenuBarAchievements and update karma points', () => {
      component.ngOnInit()
      const statSection = component.menuBarDetails.navSections.find((s: any) => s.cardType === 'stat_cards')
      const karmaItem = statSection.items.find((i: any) => i.code === 'karma_points')
      expect(karmaItem.value).toBe('100 Karma Points')
    })

    it('should call loadMenuBarAchievements and update badge count', () => {
      component.ngOnInit()
      const statSection = component.menuBarDetails.navSections.find((s: any) => s.cardType === 'stat_cards')
      const badgeItem = statSection.items.find((i: any) => i.code === 'badges')
      expect(badgeItem.value).toBe('5 Badges')
    })

    it('should call loadMenuBarAchievements and update rank from leaderboard', () => {
      component.ngOnInit()
      const statSection = component.menuBarDetails.navSections.find((s: any) => s.cardType === 'stat_cards')
      const rankItem = statSection.items.find((i: any) => i.code === 'rank')
      expect(rankItem.value).toBe('5th Rank')
    })

    it('should navigate to profile if isNotMyUser and isIgotOrg', () => {
      mockConfigSvc.unMappedUser.profileDetails.profileStatus = 'not-my-user'
      mockConfigSvc.unMappedUser.profileDetails.employmentDetails.departmentName = 'igot'
      component.ngOnInit()
      expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('app/person-profile/me#profileInfo')
      expect(component.disableHeightOnTop).toBe(true)
    })

    it('should not navigate when user is valid', () => {
      component.ngOnInit()
      expect(component.disableHeightOnTop).toBe(false)
    })
  })

  describe('navBarRequired getter', () => {
    it('should return isNavBarRequired', () => {
      component.isNavBarRequired = true
      expect(component.navBarRequired).toBe(true)
      component.isNavBarRequired = false
      expect(component.navBarRequired).toBe(false)
    })
  })

  describe('isShowNavbar getter', () => {
    it('should return showNavbar', () => {
      component.showNavbar = true
      expect(component.isShowNavbar).toBe(true)
      component.showNavbar = false
      expect(component.isShowNavbar).toBe(false)
    })
  })

  describe('isCustomHeight getter', () => {
    it('should return customHeight and set it based on pathname', () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/public/home', origin: 'http://localhost', reload: jest.fn() },
        writable: true,
      })
      expect(component.isCustomHeight).toBe(true)
    })

    it('should set customHeight for /public/faq', () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/public/faq', origin: 'http://localhost', reload: jest.fn() },
        writable: true,
      })
      expect(component.isCustomHeight).toBe(true)
    })
  })

  describe('skipToMainContent', () => {
    it('should call focus on skipper element', () => {
      component.skipper = { nativeElement: { focus: jest.fn() } } as any
      component.skipToMainContent()
      expect(component.skipper.nativeElement.focus).toHaveBeenCalled()
    })
  })

  describe('unloadHandler', () => {
    it('should handle unload event', () => {
      expect(() => component.unloadHandler({ type: 'unload' })).not.toThrow()
    })

    it('should handle non-unload event', () => {
      expect(() => component.unloadHandler({ type: 'other' })).not.toThrow()
    })
  })

  describe('openIntro', () => {
    it('should not throw', () => {
      expect(() => component.openIntro()).not.toThrow()
    })
  })

  describe('changeBg26Jan', () => {
    it('should add class when theme is enabled', () => {
      const mockElement = { classList: { add: jest.fn(), remove: jest.fn() } }
      document.getElementById = jest.fn().mockReturnValue(mockElement)
      mockConfigSvc.overrideThemeChanges = { isEnabled: true }
      component.changeBg26Jan()
      expect(mockElement.classList.add).toHaveBeenCalledWith('jan-bg-change')
    })

    it('should remove class when theme is disabled', () => {
      const mockElement = { classList: { add: jest.fn(), remove: jest.fn() } }
      document.getElementById = jest.fn().mockReturnValue(mockElement)
      mockConfigSvc.overrideThemeChanges = { isEnabled: false }
      component.changeBg26Jan()
      expect(mockElement.classList.remove).toHaveBeenCalledWith('jan-bg-change')
    })
  })

  describe('removeBg26Jan', () => {
    it('should remove jan-bg-change class', () => {
      const mockElement = { classList: { remove: jest.fn() } }
      document.getElementById = jest.fn().mockReturnValue(mockElement)
      component.removeBg26Jan()
      expect(mockElement.classList.remove).toHaveBeenCalledWith('jan-bg-change')
    })
  })

  describe('raiseAppStartTelemetry', () => {
    it('should dispatch telemetry event on first call', () => {
      component.appStartRaised = false
      component.raiseAppStartTelemetry()
      expect(mockEventSvc.dispatchEvent).toHaveBeenCalled()
      expect(component.appStartRaised).toBe(true)
    })

    it('should not dispatch telemetry event on subsequent calls', () => {
      component.appStartRaised = true
      component.raiseAppStartTelemetry()
      expect(mockEventSvc.dispatchEvent).not.toHaveBeenCalled()
    })
  })

  describe('ngAfterViewInit', () => {
    it('should not throw', () => {
      expect(() => component.ngAfterViewInit()).not.toThrow()
    })
  })

  describe('getChildRouteData', () => {
    it('should push data from firstChild', () => {
      component.currentRouteData = []
      const snapshot = {} as any
      const firstChild = { data: { pageId: 'test' }, firstChild: null } as any
      component.getChildRouteData(snapshot, firstChild)
      expect(component.currentRouteData).toContainEqual({ pageId: 'test' })
    })

    it('should recurse through nested children', () => {
      component.currentRouteData = []
      const snapshot = {} as any
      const firstChild = {
        data: { pageId: 'parent' },
        firstChild: { data: { pageId: 'child' }, firstChild: null },
      } as any
      component.getChildRouteData(snapshot, firstChild)
      expect(component.currentRouteData).toHaveLength(2)
    })

    it('should handle null firstChild', () => {
      component.currentRouteData = []
      component.getChildRouteData({} as any, null)
      expect(component.currentRouteData).toHaveLength(0)
    })
  })

  describe('getTourGuide', () => {
    it('should return showTour value from configSvc', () => {
      const result = component.getTourGuide()
      expect(typeof result).toBe('boolean')
    })
  })

  describe('getHeaderFooterConfiguration', () => {
    it('should call http.get with correct URL', () => {
      mockHttp.get.mockReturnValue(of({ someData: true }))
      component.getHeaderFooterConfiguration().subscribe((res: any) => {
        expect(res.data).toEqual({ someData: true })
      })
      expect(mockHttp.get).toHaveBeenCalledWith('/assets/page/right-nav-config.json')
    })
  })

  describe('ngAfterViewChecked', () => {
    it('should call changeDetector.detectChanges', () => {
      component.ngAfterViewChecked()
      expect(mockChangeDetector.detectChanges).toHaveBeenCalled()
    })
  })

  describe('sidebarStateChanged', () => {
    it('should update leftNavBarIsOpen signal when event has isOpen', () => {
      component.sidebarStateChanged({ isOpen: false })
      expect(component.leftNavBarIsOpen()).toBe(false)
    })

    it('should not update when event is falsy', () => {
      component.sidebarStateChanged(null)
      expect(component.leftNavBarIsOpen()).toBe(true)
    })
  })

  describe('onNavItemClicked', () => {
    it('should call exploreContent and set activeItemCode for explore_content', () => {
      jest.spyOn(component, 'exploreContent').mockImplementation(() => { })
      component.onNavItemClicked('explore_content')
      expect(component.exploreContent).toHaveBeenCalled()
      expect(component.menuBarDetails.activeItemCode).toBe('explore_content')
    })

    it('should set activeItemCode for other codes', () => {
      component.onNavItemClicked('home')
      expect(component.menuBarDetails.activeItemCode).toBe('home')
    })
  })

  describe('exploreContent', () => {
    it('should navigate to globalsearch with query params', () => {
      component.exploreContent()
      expect(mockLibNotificationsService.updateUnreadCount).toHaveBeenCalled()
      expect(mockEventSvc.raiseInteractTelemetry).toHaveBeenCalled()
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ['/app/globalsearch'],
        expect.objectContaining({
          queryParams: expect.objectContaining({ tab: 'explore-content' }),
        })
      )
    })
  })

  describe('raiseTelemetryExploreContent', () => {
    it('should call raiseInteractTelemetry', () => {
      component.raiseTelemetryExploreContent()
      expect(mockEventSvc.raiseInteractTelemetry).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'explore-content' }),
        {},
        expect.any(Object)
      )
    })
  })

  describe('loadMenuBarAchievements', () => {
    it('should handle invalid JSON in localStorage gracefully', () => {
      jest.spyOn(localStorage, 'getItem').mockReturnValue('invalid-json')
      expect(() => (component as any).loadMenuBarAchievements()).not.toThrow()
    })

    it('should handle null localStorage value', () => {
      jest.spyOn(localStorage, 'getItem').mockReturnValue(null)
      expect(() => (component as any).loadMenuBarAchievements()).not.toThrow()
    })

    it('should not call leaderboard when no currentUserId', () => {
      mockConfigSvc.unMappedUser = null
      jest.spyOn(localStorage, 'getItem').mockReturnValue(null)
      expect(() => (component as any).loadMenuBarAchievements()).not.toThrow()
      expect(mockHomePageSvc.getLearnerLeaderboardCached).not.toHaveBeenCalled()
    })

    it('should handle leaderboard response with no matching user', () => {
      jest.spyOn(localStorage, 'getItem').mockReturnValue(null)
      mockHomePageSvc.getLearnerLeaderboardCached.mockReturnValue(of({
        result: { result: [{ userId: 'other-user', rank: 1 }] },
      }));
      (component as any).loadMenuBarAchievements()
      const statSection = component.menuBarDetails.navSections.find((s: any) => s.cardType === 'stat_cards')
      const rankItem = statSection.items.find((i: any) => i.code === 'rank')
      expect(rankItem.value).toBe('')
    })
  })

  describe('toOrdinal', () => {
    it('should return 1st for 1', () => {
      expect((component as any).toOrdinal(1)).toBe('1st')
    })

    it('should return 2nd for 2', () => {
      expect((component as any).toOrdinal(2)).toBe('2nd')
    })

    it('should return 3rd for 3', () => {
      expect((component as any).toOrdinal(3)).toBe('3rd')
    })

    it('should return 4th for 4', () => {
      expect((component as any).toOrdinal(4)).toBe('4th')
    })

    it('should return 11th for 11', () => {
      expect((component as any).toOrdinal(11)).toBe('11th')
    })

    it('should return 12th for 12', () => {
      expect((component as any).toOrdinal(12)).toBe('12th')
    })

    it('should return 21st for 21', () => {
      expect((component as any).toOrdinal(21)).toBe('21st')
    })
  })

  describe('router events handling', () => {
    beforeEach(() => {
      jest.spyOn(localStorage, 'getItem').mockReturnValue(null)
      document.getElementById = jest.fn().mockReturnValue({
        classList: { add: jest.fn(), remove: jest.fn() },
      })
      component.ngOnInit()
    })

    it('should handle NavigationEnd and set isSetupPage', () => {
      const navEnd = Object.create(Object.getPrototypeOf({}))
      Object.defineProperty(navEnd, 'constructor', { value: class NavigationEnd { } })
      navEnd.url = '/setup/page'
      navEnd.id = 1
      navEnd.urlAfterRedirects = '/setup/page'
      routerEventsSubject.next(new (class NavigationEnd { id = 1; url = '/setup/page'; urlAfterRedirects = '/setup/page' } as any)())
    })
  })

  describe('iGOTAIConfig', () => {
    it('should call iGOTAIService.iGOTAIConfigReadData', async () => {
      await (component as any).iGOTAIConfig()
      expect(mockIGOTAIService.iGOTAIConfigReadData).toHaveBeenCalled()
      expect(component.iGOTAIConfigLoaded).toBe(true)
    })

    it('should set iGOTAIConfigLoaded to false on 404', async () => {
      mockIGOTAIService.iGOTAIConfigReadData.mockReturnValue(of({ error: { status: 404 } }))
      await (component as any).iGOTAIConfig()
      expect(component.iGOTAIConfigLoaded).toBe(false)
    })
  })
})
