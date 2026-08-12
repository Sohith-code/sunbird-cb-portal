import {
  AfterViewChecked,
  AfterViewInit,
  ApplicationRef,
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  OnInit,
  signal,
  // TemplateRef,
  ViewChild,
  ViewContainerRef,
} from '@angular/core'
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  ActivatedRoute,
  ActivatedRouteSnapshot,
} from '@angular/router'
import { BreakpointObserver } from '@angular/cdk/layout'
// import { interval, concat, timer } from 'rxjs'
import { BtnPageBackService } from '@sunbird-cb/collection'
import { HttpClient } from '@angular/common/http'
import {
  AuthKeycloakService,
  ConfigurationsService,
  // LoggerService,
  DomainConfService,
  TelemetryService,
  ValueService,
  UtilityService,
  EventService,
  WsEvents,
  // NsInstanceConfig,
} from '@sunbird-cb/utils-v2'
import { delay, first, catchError, map, filter } from 'rxjs/operators'
import { combineLatest } from 'rxjs'
import { MobileAppsService } from '../../services/mobile-apps.service'
import { RootService } from './root.service'

// Explicit '/index' subpath: client-services@3.9.5 ships a broken package.json whose
// `main` (dist/index.js) and `module` (src/index.ts) both point at files it does not
// contain - the real entry is index.js at the package root. Node and esbuild fall back
// to it silently, but the dev server's Vite dependency optimizer errors out with
// "Failed to resolve entry for package". Naming the subpath skips entry resolution.
import { CsModule } from '@project-sunbird/client-services/index'
import { SwUpdate } from '@angular/service-worker'
import { environment } from '../../../environments/environment'
import { MatDialog } from '@angular/material/dialog'
import { DialogConfirmComponent } from '../dialog-confirm/dialog-confirm.component'
import { concat, interval, of } from 'rxjs'
// import { iGOTAIService } from './../../services/igot-ai.service'
import { CommonDataService } from '../../services/common-data.service'
import { UserRestrictionService } from '../../services/user-restriction.service'
import { UrlService } from '../../shared/url.service'
import { LibNotificationsService } from '@sunbird-cb/notification'
import { HomePageService } from '../../services/home-page.service'
import { trigger, style, animate, transition } from '@angular/animations'
import { DialogBoxComponent } from '../dialog-box/dialog-box.component'
import * as _ from 'lodash'

// Anchor on the "Achievement" heading in profile-view-v2, scrolled to from the bottom nav
const ACHIEVEMENT_SECTION_ID = 'achievement-section'
// Breathing room left above the heading so it does not sit flush against the top edge
const ACHIEVEMENT_SCROLL_GAP = 12

@Component({
  selector: 'ws-root',
  templateUrl: './root.component.html',
  styleUrls: ['./root.component.scss'],
  standalone: false,
  animations: [
    trigger('slidePanel', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('240ms cubic-bezier(0.22, 1, 0.36, 1)', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('160ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('fadeBackdrop', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class RootComponent implements OnInit, AfterViewInit, AfterViewChecked {

  hideHeaderAndFooter = false
  disableHeightOnTop = false
  // iGOTAIConfigLoaded = false
  // dataSubject = new BehaviorSubject<boolean>(false)
  menuBarDetails: any = {}
  private achievementsSection: any = null
  private achievementRankRequested = false
  leftNavBarIsOpen = signal(true)
  showKarmaLeaderboard = signal(false)
  hideFooterSection = signal(false)
  isHomePage = signal(false)
  showFullScreen = signal(false)
  // Routes that need full width (100%) on mobile instead of the default 90% .container-balanced gets.
  // Add more prefixes here when another route needs the same treatment.
  fullWidthMobileRoutes = ['/app/learn/bharat-kalp']
  isFullWidthMobileRoute = signal(false)
  navBarOpenStatusBasedOnNav = signal(true)
  openStatusUserSelection = signal(true)
  // The sidebar only pushes page content on the home page. Everywhere else it is an overlay
  // drawer (see isOverlayMode in sb-uic-dynamic-sidebar), so opening it must leave the header
  // and main content exactly where they are instead of reflowing them.
  sidebarPushesContent = computed(() => this.isHomePage() && this.leftNavBarIsOpen())

  independenceDayBanner: any

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private appRef: ApplicationRef,
    // private logger: LoggerService,
    private swUpdate: SwUpdate,
    private dialog: MatDialog,
    private http: HttpClient,
    private authSvc: AuthKeycloakService,
    public configSvc: ConfigurationsService,
    private valueSvc: ValueService,
    private telemetrySvc: TelemetryService,
    private eventSvc: EventService,
    private mobileAppsSvc: MobileAppsService,
    private rootSvc: RootService,
    private btnBackSvc: BtnPageBackService,
    private changeDetector: ChangeDetectorRef,
    private utilitySvc: UtilityService,
    private urlService: UrlService,
    // private iGOTAIService: iGOTAIService,
    private commonDataSvc: CommonDataService,
    private restrictionSvc: UserRestrictionService,
    public domainConfSvc: DomainConfService,
    private libNotificationsService: LibNotificationsService,
    private homePageSvc: HomePageService,
    private breakpointObserver: BreakpointObserver

  ) {
    effect(() => {
      if (this.leftNavBarIsOpen()) {
        this.loadAchievementRankOnce()
      } else {
        this.showKarmaLeaderboard.set(false)
      }
    })

    if (window.location.pathname.includes('/public/privacy-policy')) {
      this.hideHeaderAndFooter = true
    }
    if (this.configSvc.headerFooterConfigData) {
      this.headerFooterConfigData = this.configSvc.headerFooterConfigData
      this.showFooter = true
    }
    if (this.configSvc.instanceConfig && this.configSvc.instanceConfig.leftNavBar) {
      this.menuBarDetails = this.configSvc.instanceConfig.leftNavBar || undefined
      if (this.menuBarDetails) {
        this.openStatusUserSelection.set(this.menuBarDetails.defaultOpen)
        this.setNavOpenStatus()
        this.setAchivements()
        this.setOtherPortals()
        // share the resolved config so pages outside the sidebar (mweb explore menu)
        // render the same items instead of resolving the config a second time
        this.commonDataSvc.leftNavBarConfig.next(this.menuBarDetails)
      }
    } else {
      this.getLeftNavBarConfiguration().subscribe((sectionData: any) => {
        this.menuBarDetails = sectionData?.data || undefined
        if (this.menuBarDetails) {
          this.setNavOpenStatus()
          this.setAchivements()
          this.setOtherPortals()
          this.commonDataSvc.leftNavBarConfig.next(this.menuBarDetails)
        }
      })
    }

    if (window.location.pathname.includes('/public/home')
      || window.location.pathname.includes('/public/toc/')
      || window.location.pathname.includes('/viewer/')
    ) {
      this.customHeight = true
      // tslint: disable
    }
    if (this.configSvc.unMappedUser && this.configSvc.unMappedUser.profileDetails &&
      this.configSvc.unMappedUser.profileDetails.get_started_tour_v2) {
      this.showTour = this.configSvc.unMappedUser.profileDetails.get_started_tour_v2.skipped ||
        this.configSvc.unMappedUser.profileDetails.get_started_tour_v2.visited
    }
    this.mobileAppsSvc.init()
    this.openIntro()
    const locationOrigin = location.origin

    CsModule.instance.init({
      core: {
        httpAdapter: 'HttpClientBrowserAdapter',
        global: {
          channelId: '', // required
          producerId: '', // required
          deviceId: '', // required
          sessionId: '',
        },
        api: {
          host: `${locationOrigin}/apis/proxies/v8`, // default host
          // host: 'http://localhost:3004/proxies/v8', // default host
          // host: 'http://localhost:3002', // default host
          authentication: {
            // bearerToken: "", // optional
            // userToken: "5574b3c5-16ca-49d8-8059-705304f2c7fb"
            // bearerToken: this.loginToken,
            // optional
          },
        },
      },
      services: {
        groupServiceConfig: {
          apiPath: '/learner/group/v1',
          dataApiPath: '/learner/data/v1/group',
          updateGroupGuidelinesApiPath: '/learner/group/membership/v1',
        },
        userServiceConfig: {
          apiPath: '/learner/user/v2',
        },
        formServiceConfig: {
          apiPath: '/learner/data/v1/form',
        },
        courseServiceConfig: {
          apiPath: '/learner/course/v1',
          certRegistrationApiPath: '/learner/certreg/v2/certs',
        },
        discussionServiceConfig: {
          apiPath: '/discussion',
        },
      },
    })
  }

  get navBarRequired(): boolean {
    return this.isNavBarRequired
  }

  get isShowNavbar(): boolean {
    return this.showNavbar
  }

  get isCustomHeight(): boolean {
    if (window.location.pathname.includes('/public/home')
      || window.location.pathname.includes('/public/faq')
      || window.location.pathname.includes('/public/contact')
      || window.location.pathname.includes('/public/signup')
      || window.location.pathname.includes('/public/request')
      || /^\/crp\/[^\/]+(\/[^\/]+)?$/.test(window.location.pathname)

    ) {
      this.customHeight = true
    }
    return this.customHeight
  }

  /**
   * Inside event-hub only the event detail page (home/:eventId) runs edge to edge. The list
   * pages — home, my-events, see-all, view-all — and the player stay in the centred
   * container. This used to full-screen everything except the exact string
   * '/app/event-hub/home', which caught the lists and even home itself once it carried
   * query params
   */
  private isFullScreenEventPage(url: string): boolean {
    const path = (url || '').split('?')[0].split('#')[0]
    return /^\/app\/event-hub\/home\/[^/]+/.test(path)
  }

  /**
   * Bharat Kalp's landing page runs edge to edge, but its children stay in the centred
   * container - see-all has its own breadcrumb and grid layout that assume it. Matching
   * the exact path rather than a prefix is what keeps the two apart: startsWith would
   * take /app/learn/bharat-kalp/see-all full screen too.
   */
  private isFullScreenBharatKalp(url: string): boolean {
    const path = (url || '').split('?')[0].split('#')[0].replace(/\/+$/, '')
    return path === '/app/learn/bharat-kalp'
  }

  get showMenuBardetails(): boolean {
    // a NOT-MY-USER account has nowhere to navigate, so it gets no sidebar
    return this.menuBarDetails && this.currentUrl &&
      !this.restrictionSvc.isNotMyUser &&
      !this.currentUrl.includes('public') &&
      !this.currentUrl.includes('viewer') &&
      // self-registration via QR runs without the app chrome
      !this.currentUrl.startsWith('/crp/')
  }

  get showHeader(): boolean {
    return this.navBarRequired &&
      !this.hideHeaderAndFooter &&
      this.domainConfSvc.isConfigEnabled('components.header', 'enabled')
  }

  @ViewChild('previewContainer', { read: ViewContainerRef, static: true })
  // @ViewChild('userIntro', { static: true }) userIntro!: TemplateRef<any>
  previewContainerViewRef: ViewContainerRef | null = null
  // Not static: these inputs live inside the *ngIf on the root container, so a
  // static query resolves them to null before change detection creates them and
  // the update prompt opens with an empty title and body. The query is only read
  // from the VERSION_READY subscription, which fires long after view init.
  @ViewChild('appUpdateTitle')
  appUpdateTitleRef: ElementRef | null = null
  @ViewChild('appUpdateBody')
  appUpdateBodyRef: ElementRef | null = null

  @ViewChild('skipper') skipper!: ElementRef

  isXSmall$ = this.valueSvc.isXSmall$
  // Matches BREAKPOINT_QUERIES.TABLET in sb-uic-dynamic-sidebar (600px - 1024px). Starting this
  // at 768px left 600px-767.98px claimed by neither isXSmall$ (< 600px) nor isTabView$, so the
  // desktop sidebar rendered in a range the sidebar itself treated as mobile.
  isTabView$ = this.breakpointObserver
    .observe(['(min-width: 600px) and (max-width: 1024px)'])
    .pipe(map(state => state.matches))
  // Desktop-only: sidebar-driven widths (navBarOpenContent/navBarCloseContent) must not apply on mobile or tab
  isDesktopView$ = combineLatest([this.isXSmall$, this.isTabView$]).pipe(
    map(([isXSmall, isTabView]) => !isXSmall && !isTabView)
  )
  routeChangeInProgress = false
  showNavbar = true
  showFooter = false
  currentUrl!: string
  customHeight = false
  isNavBarRequired = true
  isInIframe = false
  appStartRaised = false
  isSetupPage = false
  processed: any
  loginToken: any
  showTour = false
  currentRouteData: any = []
  loggedinUser = !!(this.configSvc.userProfile && this.configSvc.userProfile.userId)
  headerFooterConfigData: any = null
  mobileTopHeaderVisibilityStatus = true
  activeMenu: any = ''
  backGroundTheme: any
  showHubs = true
  showBottomNav = true
  viewerPage = false

  prevUrl = ''
  currUrl = ''
  detailsChanged = signal(false)
  otherDetailsChanged = signal(false)
  @HostListener('window:unload', ['$event'])
  unloadHandler(event: any) {
    if (event && event.type === 'unload') {
      // this.authSvc.logout()
    }
  }

  reloadPage() {
    window.location.reload()
  }

  // used on the global-config error screen: force_logout works without any
  // loaded configuration (same path as the auth interceptor)
  logout() {
    this.authSvc.force_logout()
  }

  // dialog/popup visibility from global-config -> components.dialogs
  isDialogEnabled(dialogKey: string): boolean {
    return this.domainConfSvc.isConfigEnabled('components.dialogs', 'enabled')
      && this.domainConfSvc.isConfigEnabled('components.dialogs', dialogKey)
  }

  openIntro() {
    // if (!(this.rootSvc.getCookie('intro') && !!(this.rootSvc.getCookie('intro')))) {
    //   if (this.router.url === '/page/home') {
    //     this.dialog.open(AppIntroComponent, { data: {} })
    //   }
    // }
    // this.snackBar.openFromTemplate(this.userIntro, { duration: 20000, verticalPosition: 'bottom', horizontalPosition: 'left' })
  }
  public skipToMainContent(): void {
    this.skipper.nativeElement.focus()
    // tslint: disable
  }
  ngOnInit() {
    this.independenceDayBanner = this.configSvc?.overrideThemeChanges?.independenceDayBanner || {}
    // let showTour = localStorage.getItem('tourGuide')? JSON.parse(localStorage.getItem('tourGuide')||''): {}
    // this.showTour = showTour && showTour.disable ? showTour.disable : false
    this.mobileAppsSvc.mobileTopHeaderVisibilityStatus.subscribe((status: any) => {
      this.mobileTopHeaderVisibilityStatus = status
    })
    this.configSvc.updateTourGuideMethod(this.showTour)
    // this.route.queryParams
    //   .subscribe(_params => {
    //   }
    //   )
    if (window.location.pathname.includes('/public/home')) {
      this.customHeight = true
    }
    try {
      this.isInIframe = window.self !== window.top
    } catch (_ex) {
      this.isInIframe = false
    }

    this.btnBackSvc.initialize()

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const isPlayer = event.url.includes('/viewer')

      // Extract fragment from URL
      const fragment = this.route.snapshot.fragment || ''
      // Initialize mandatory details from common data service
      if (this.configSvc?.unMappedUser && !['mandatorySection', 'orgDetails'].includes(fragment)) {
        this.commonDataSvc.mandatoryDetails(isPlayer)
      }
      // Check and show mandatory notification on route change
      this.prevUrl = this.currUrl

      this.currUrl = event.url

      this.urlService.setPreviousUrl(this.prevUrl)
      if (this.currUrl === '/page/home') {
        this.isHomePage.set(true)
        this.mobileAppsSvc.clearGlobalSearchForHomePage.next(true)
        // Fetch mandatory notification when navigating to home
        // this.commonDataSvc.fetchMandatoryNotification()
      } else {
        this.isHomePage.set(false)
        this.mobileAppsSvc.clearGlobalSearchForHomePage.next(false)
      }
      this.setNavOpenStatus()
      if (event && event.url) {
        if (event.url.includes('/app/network-v2') && window.innerWidth <= 768) {
          this.showNavbar = false
        } else if (event.url.includes('/page/home') && window.innerWidth <= 768) {
          this.showNavbar = true
        }
      }
    })

    this.router.events.subscribe((event: any) => {
      if (event instanceof NavigationEnd) {

        if (event.url.includes('/setup/')) {
          this.isSetupPage = true
        }
      }
      if (window.location.pathname.includes('/page/home')) {
        this.hideFooterSection.set(true)
        this.changeBg26Jan()
      } else {
        this.hideFooterSection.set(false)
        this.removeBg26Jan()
      }

      if (event instanceof NavigationStart) {
        let isMobile = false
        if (window.innerWidth <= 1200) {
          isMobile = true
        } else {
          isMobile = false
        }
        this.showNavbar = true
        if (event.url.includes('preview') || event.url.includes('embed')) {
          this.isNavBarRequired = false
        } else if (event.url.includes('author/') && this.isInIframe) {
          this.isNavBarRequired = false
        } else {
          this.isNavBarRequired = true
        }

        if (!(event.url.includes('/page/home')) && isMobile) {
          this.showHubs = false
        } else {
          if (event.url.includes('/public') || event.url.includes('/crp')) {
            this.showHubs = false
          } else {
            this.showHubs = true
          }
        }

        if (event.url.includes('/viewer')) {
          this.viewerPage = true
        } else {
          this.viewerPage = false
        }
        this.changeDetector.detectChanges()
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.routeChangeInProgress = false
        this.currentUrl = event.url

        if (this.currentUrl.includes('/public/home')) {
          this.customHeight = true

        } else {
          this.customHeight = false
        }
        if (
          this.currentUrl.startsWith('/app/toc') ||
          this.currentUrl.startsWith('/viewer/') ||
          this.isFullScreenEventPage(this.currentUrl) ||
          this.isFullScreenBharatKalp(this.currentUrl) ||
          this.currentUrl.startsWith('/public/') ||
          // self-registration via QR: a standalone flow, so it gets the full width
          this.currentUrl.startsWith('/crp/')
        ) {
          this.showFullScreen.set(true)
        } else {
          this.showFullScreen.set(false)
        }

        this.isFullWidthMobileRoute.set(
          this.fullWidthMobileRoutes.some(route => this.currentUrl.startsWith(route))
        )

        if (
          !!this.currentUrl.startsWith('/public/logout')
          || !!this.currentUrl.startsWith('/public/signup')
          || !!this.currentUrl.startsWith('/public/welcome')
          || !!this.currentUrl.startsWith('/viewer/')
          || !!this.currentUrl.startsWith('/public/request')
          || !!this.currentUrl.startsWith('/public/toc')
          || !!/^\/crp\/[^\/]+(\/[^\/]+)?$/.test(window.location.pathname)
        ) {
          this.showFooter = false
          this.showNavbar = false
          this.isNavBarRequired = false
        } else {
          this.showFooter = true
          this.showNavbar = true
          this.isNavBarRequired = true
        }
        if (window.location.pathname.includes('/learner-advisory')) {
          this.showNavbar = true
          this.isNavBarRequired = true
          this.showBottomNav = true
          this.showHubs = true

        }
        if (window.location.pathname.includes('/globalsearch')) {
          this.showFooter = false

        }

        this.showBottomNav = !this.router.url.startsWith('/app/toc')
      }

      if (event instanceof NavigationEnd) {
        // let snapshot = this.router.routerState.firstChild(this.activatedRoute).snapshot
        // console.log('this.route.snapshot :: ', this.route.snapshot)
        const snapshot = this.route.snapshot
        // console.log('root.snapshot.root.firstChild ', snapshot.root.firstChild)
        // console.log('firstChild ', snapshot.firstChild)
        const firstChild = snapshot.root.firstChild
        this.getChildRouteData(snapshot, firstChild)
        // tslint:disable-next-line: no-console
        // console.log('Final currentDataRoute', this.currentRouteData)
        this.utilitySvc.setRouteData(this.currentRouteData)
        const pageContext = this.utilitySvc.routeData
        const data = {
          pageContext,
        }
        const objectType = this.route.snapshot.queryParams.primaryCategory || ''
        this.raiseAppStartTelemetry()
        if (data.pageContext.pageId && data.pageContext.module) {
          this.telemetrySvc.impression(data, objectType)
        } else {
          this.telemetrySvc.impression()
        }
        this.currentRouteData = []
        this.activeMenu = localStorage.getItem('activeMenu')
        this.openIntro()

      }
      if (event && event.url && event.url.includes('/app/network-v2') && window.innerWidth <= 768) {
        this.showNavbar = false
      }
    })
    this.rootSvc.showNavbarDisplay$.pipe(delay(500)).subscribe((display: any) => {
      this.showNavbar = display
    })

    // NOT-MY-USER alone restricts the account now — it used to also require the user to
    // sit in the 'igot' holding org, which let disowned users of every other org keep
    // navigating the whole app
    if (this.restrictionSvc.isNotMyUser) {
      this.disableHeightOnTop = true
      this.router.navigateByUrl('app/person-profile/me#profileInfo')
    } else {
      this.disableHeightOnTop = false
    }

  }

  setAchivements() {
    const menuBarDetails = JSON.parse(JSON.stringify(this.menuBarDetails))
    const achievements = menuBarDetails?.navSections?.find((section: any) => section.sectionKey === 'my_achievements')
    achievements['sectionLoading'] = true
    this.sendDetailsChangedEvent(achievements)
    if (achievements) {
      try {
        const raw = localStorage.getItem('userEnrollmentCount')
        if (raw) {
          const parsed = JSON.parse(raw)
          const learningHours = _.get(parsed, 'userCourseEnrolmentInfo.timeSpentOnCompletedCourses', 0)
          const badges = _.get(parsed, 'userCourseEnrolmentInfo.badgeCount', 0)
          const itemsList = achievements.items.filter((item: any) => item.enabled !== false)
          if (itemsList && itemsList.length > 0) {
            itemsList.forEach((item: any) => {
              switch (item.code) {
                case 'rank':
                  break
                case 'learning_hours':
                  item.value = this.convertToHoursAndMinutes(learningHours)
                  break
                case 'badges':
                  item.value = `${badges} Badges`
                  break
                case 'karma_points':
                  const karmaPoints = _.get(parsed, 'userCourseEnrolmentInfo.karmaPoints', 0)
                  item.value = `${karmaPoints} Karma Points`
              }
            })
          }
          achievements.items = itemsList
        }
        this.achievementsSection = achievements
        achievements.sectionLoading = false
        this.sendDetailsChangedEvent(achievements)
        this.loadAchievementRankOnce()
      } catch (_e) { /* ignore */ }
    }
  }

  private loadAchievementRankOnce() {
    if (this.achievementRankRequested || !this.leftNavBarIsOpen() || !this.achievementsSection) {
      return
    }
    this.updateAchievementRank()
  }

  private updateAchievementRank() {
    const currentUserId = this.configSvc?.unMappedUser?.id
    const achievements = this.achievementsSection
    const rankItem = achievements?.items?.find((item: any) => item.code === 'rank' && item.enabled !== false)
    if (!currentUserId || !rankItem) {
      return
    }
    this.achievementRankRequested = true
    this.homePageSvc.getLearnerLeaderboardCached().subscribe((res: any) => {
      const results = res?.result?.result
      if (Array.isArray(results) && results.length) {
        const currentUserRank = results.find((entry: any) => entry.userId === currentUserId)
        const rank = currentUserRank?.rank
        rankItem.value = rank != null ? `${this.toOrdinal(rank)} Rank` : '0 Rank'
      } else {
        rankItem.value = '0 Rank'
      }
      this.sendDetailsChangedEvent(achievements)
    }, (_error: any) => {
      this.sendDetailsChangedEvent(achievements)
    })
  }

  setOtherPortals() {
    const menuBarDetails = JSON.parse(JSON.stringify(this.menuBarDetails))
    const quickActionSection = menuBarDetails?.navSections?.find((section: any) => section.sectionKey === 'quick_actions' && section.enabled !== false)
    if (quickActionSection && quickActionSection?.items && quickActionSection.items.length > 0) {
      const otherPortalsSection = quickActionSection?.items?.filter((item: any) => item.code === 'other_portals' && item.enabled !== false)
      if (otherPortalsSection && otherPortalsSection.length > 0) {
        const otherPortalChildren = otherPortalsSection?.[0]?.children || []
        const otherPortalsFilteredChildren: any[] = []
        if (otherPortalChildren && otherPortalChildren.length > 0) {
          // normalize user roles once to lowercase set for O(1) lookup
          const userRolesSet = new Set(Array.from(this.configSvc.userRoles || []).map((r: any) => (r || '').toString().toLowerCase()))
          otherPortalChildren.forEach((child: any) => {
            if (child.enabled === false) { return }

            // normalize child roles to array of strings
            let childRoles: string[] = []
            if (Array.isArray(child.rolesCanAccess)) {
              childRoles = child.rolesCanAccess
            } else if (typeof child.rolesCanAccess === 'string') {
              childRoles = child.rolesCanAccess.split(',').map((s: string) => s.trim()).filter(Boolean)
            }

            // check if any child role exists in user's roles (short-circuits on first match)
            const hasAccess = childRoles.some((cr: string) => userRolesSet.has((cr || '').toLowerCase()))
            if (hasAccess) {
              otherPortalsFilteredChildren.push(child)
            }
          })
          otherPortalsSection[0].children = otherPortalsFilteredChildren
          this.sendOtherDetailsChangedEvent(quickActionSection)
        }
      }
    }

  }

  setNavOpenStatus() {
    if (this.isHomePage()) {
      this.navBarOpenStatusBasedOnNav.set(this.openStatusUserSelection())
      this.leftNavBarIsOpen.set(this.openStatusUserSelection())
    } else {
      this.navBarOpenStatusBasedOnNav.set(false)
      this.leftNavBarIsOpen.set(false)
    }
  }

  sendDetailsChangedEvent(newAchievements: any) {
    const existingDetails = JSON.parse(JSON.stringify(this.menuBarDetails))
    existingDetails?.navSections?.forEach((section: any, index: number) => {
      if (section.sectionKey === 'my_achievements') {
        existingDetails.navSections[index] = newAchievements
      }
    })
    this.menuBarDetails = JSON.parse(JSON.stringify(existingDetails))
    this.detailsChanged.set(!this.detailsChanged())
  }

  sendOtherDetailsChangedEvent(quickActionSection: any) {
    const menuBarDetails = JSON.parse(JSON.stringify(this.menuBarDetails))
    menuBarDetails?.navSections?.forEach((section: any, index: number) => {
      if (section.sectionKey === 'quick_actions') {
        menuBarDetails.navSections[index] = quickActionSection
      }
    })
    this.menuBarDetails = JSON.parse(JSON.stringify(menuBarDetails))
    this.otherDetailsChanged.set(!this.otherDetailsChanged())
  }


  convertToHoursAndMinutes(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    return `${hours}h ${minutes}m`
  }

  // private async iGOTAIConfig(): Promise<NsInstanceConfig.IConfig> {
  //   const payload = {
  //     'request': {
  //       'type': 'page',
  //       'subType': 'iGOTAI',
  //       'action': 'page-configuration',
  //       'component': 'portal',
  //       'rootOrgId': this.configSvc.unMappedUser.rootOrgId,
  //     },
  //   }
  //   const publicConfig: any = await this.iGOTAIService.iGOTAIConfigReadData(payload).toPromise()
  //   // console.log('publicConfig', publicConfig)
  //   if (publicConfig && publicConfig && publicConfig.web) {
  //     this.configSvc.iGOTAIConfig = publicConfig.web
  //     //  console.log('this.configSvc', this.configSvc)
  //   }

  //   // this.configSvc.iGOTAIConfig = {
  //   //   "aiTutor": true,
  //   //   "iGOTAI": true,
  //   //   "subTitles": true,
  //   //   "transcription": true
  //   // }
  //   if (publicConfig && publicConfig.error && publicConfig.error.status === 404) {
  //     this.iGOTAIConfigLoaded = false
  //   } else {
  //     this.iGOTAIConfigLoaded = true
  //   }
  //   return publicConfig
  // }

  changeBg26Jan() {
    this.backGroundTheme = this.configSvc.overrideThemeChanges
    const docData: any = document.getElementById('app-bg')
    if (this.backGroundTheme && this.backGroundTheme.isEnabled) {
      docData.classList.add('jan-bg-change')
    } else {
      docData.classList.remove('jan-bg-change')
    }
  }

  removeBg26Jan() {
    this.backGroundTheme = this.configSvc.overrideThemeChanges
    const docData: any = document.getElementById('app-bg')
    docData.classList.remove('jan-bg-change')
  }

  raiseAppStartTelemetry() {
    if (!this.appStartRaised) {
      // Application start telemetry
      const event = {
        eventType: WsEvents.WsEventType.Telemetry,
        eventLogLevel: WsEvents.WsEventLogLevel.Info,
        data: {
          edata: { type: '' },
          object: {},
          state: WsEvents.EnumTelemetrySubType.Loaded,
          eventSubType: WsEvents.EnumTelemetrySubType.Loaded,
          type: 'app',
          mode: 'view',
        },
        from: '',
        to: 'Telemetry',
      }
      this.eventSvc.dispatchEvent<WsEvents.IWsEventTelemetryInteract>(event)
      this.appStartRaised = true
    }
  }

  ngAfterViewInit() {
    this.initAppUpdateCheck()
  }

  getChildRouteData(snapshot: ActivatedRouteSnapshot, firstChild: ActivatedRouteSnapshot | null) {
    if (firstChild) {
      if (firstChild.data) {
        this.currentRouteData.push(firstChild.data)
      }
      if (firstChild.firstChild) {
        this.getChildRouteData(snapshot, firstChild.firstChild)
      }
    }
  }

  initAppUpdateCheck() {
    if (!environment.production || !this.swUpdate.isEnabled) {
      return
    }

    // A tab left open across a deployment keeps running the shell the service worker
    // cached, but the next build deletes that shell's lazy chunks from the server. The
    // first navigation to a route the user had not visited yet then fails with
    //   Failed to fetch dynamically imported module: .../chunk-XXXXXXXX.js
    // `unrecoverable` fires for exactly that - the cached version references assets the
    // server no longer has. A full reload is the only way out: it fetches the current
    // index.html, which names the chunks that do exist.
    this.swUpdate.unrecoverable.subscribe(() => {
      window.location.reload()
    })

    // Look for a new deployment once the app settles, then every six hours. Without
    // this the client can sit on a stale build indefinitely.
    const appIsStable$ = this.appRef.isStable.pipe(
      first(isStable => isStable),
    )
    const everySixHours$ = interval(6 * 60 * 60 * 1000)
    concat(appIsStable$, everySixHours$).subscribe(() => {
      // Rejects when offline; the next tick retries, so failure is not worth surfacing.
      this.swUpdate.checkForUpdate().catch(() => undefined)
    })

    // `SwUpdate.available` was removed in Angular 13 - versionUpdates replaces it, and
    // VERSION_READY is the event that means the new version is fully downloaded and
    // safe to activate. Subscribing unconditionally (as this did while `available` was
    // commented out) opened the update prompt on every single load.
    this.swUpdate.versionUpdates
      .pipe(filter(evt => evt.type === 'VERSION_READY'))
      .subscribe(() => {
        const dialogRef = this.dialog.open(DialogConfirmComponent, {
          data: {
            title: (this.appUpdateTitleRef && this.appUpdateTitleRef.nativeElement.value) || '',
            body: (this.appUpdateBodyRef && this.appUpdateBodyRef.nativeElement.value) || '',
          },
        })
        dialogRef.afterClosed().subscribe(result => {
          if (!result) {
            return
          }
          // Do not clear the Cache Storage here. The previous version wiped every cache
          // right after activating, which threw away the version that had just been
          // installed and forced a full re-download on the next load.
          this.swUpdate.activateUpdate().then(() => window.location.reload())
        })
      })
  }

  getTourGuide() {
    let showTour = false
    this.configSvc.updateTourGuide.subscribe((res: any) => {

      showTour = res
    })
    this.showTour = showTour
    return showTour
  }

  getHeaderFooterConfiguration() {
    const baseUrl = this.configSvc.sitePath
    // tslint:disable-next-line: prefer-template
    return this.http.get(baseUrl + '/page/right-nav-config.json').pipe(
      map(data => ({ data, error: null })),
      catchError(err => of({ data: null, error: err })),
    )
  }

  getLeftNavBarConfiguration() {
    const baseUrl = this.configSvc.sitePath
    return this.http.get(`${baseUrl}/page/left-nav.json`).pipe(
      map(data => ({ data, error: null })),
      catchError(err => of({ data: null, error: err })),
    )
  }

  ngAfterViewChecked() {
    const show = this.getTourGuide()
    if (show !== this.showTour) { // check if it change, tell CD update view
      // this.showTour = this.showTour
    }
    this.changeDetector.detectChanges()
  }

  sidebarStateChanged(event: any) {
    if (event) {
      this.openStatusUserSelection.set(event.isOpen)
      this.leftNavBarIsOpen.set(event.isOpen)
      this.showKarmaLeaderboard.set(false)
      this.navBarOpenStatusBasedOnNav.set(this.openStatusUserSelection())
    }
  }

  onNavItemClicked(event: any) {
    this.raiseTelemetryExploreContent(event.code, event.subType)
    switch (event.code) {
      case 'start-tour':
        this.router.navigateByUrl('/page/home')
        this.configSvc.updateTourGuideMethod(false)
        break
      case 'explore':
        this.exploreContent()
        this.menuBarDetails.activeItemCode = event.code
        break
      case 'view_all_achievements':
        this.viewAllAchievements()
        break
      case 'download-app':
        this.openAppDownloadDialog()
        break
      default:
        this.menuBarDetails.activeItemCode = event.code
    }
  }

  viewAllAchievements() {
    this.showKarmaLeaderboard.set(true)
    this.updateAchievementRank()
  }

  viewMyActivities() {
    this.showKarmaLeaderboard.set(false)
    this.eventSvc.raiseInteractTelemetry(
      { id: 'view_all_achievements', type: WsEvents.EnumInteractTypes.CLICK },
      {},
      { module: WsEvents.EnumTelemetrymodules.HOME }
    )
    this.router.navigate(['/app/person-profile/me'], { queryParams: { tab: 'activities' } })
      .then(() => this.scrollToAchievements())
  }

  private scrollToAchievements(attempt = 0): void {
    const MAX_ATTEMPTS = 30
    const target = document.getElementById(ACHIEVEMENT_SECTION_ID)
    if (!target) {
      if (attempt < MAX_ATTEMPTS) {
        requestAnimationFrame(() => this.scrollToAchievements(attempt + 1))
      } else {
        this.scrollContentToTop()
      }
      return
    }

    this.alignAchievements(target)
  }

  private alignAchievements(target: HTMLElement, pass = 0): void {
    const MAX_PASSES = 4
    const scroller = this.getContentScroller()
    // Re-read every pass: the header's height changes with the banner
    const headerHeight = scroller
      ? scroller.getBoundingClientRect().top
      : document.querySelector('ws-header-v2')?.getBoundingClientRect().height ?? 0
    const drift = target.getBoundingClientRect().top - headerHeight - ACHIEVEMENT_SCROLL_GAP
    if (Math.abs(drift) <= 2 || pass >= MAX_PASSES) {
      return
    }

    const behavior: ScrollBehavior = pass === 0 ? 'smooth' : 'auto'
    if (scroller) {
      scroller.scrollTo({ top: Math.max(0, scroller.scrollTop + drift), behavior })
    } else {
      window.scrollTo({ top: Math.max(0, window.scrollY + drift), behavior })
    }
    // Give the smooth scroll (and whatever the banner does in response) time to settle
    setTimeout(() => this.alignAchievements(target, pass + 1), pass === 0 ? 450 : 150)
  }

  // The mobile content column scrolls instead of the document; on wider layouts it does not
  private getContentScroller(): HTMLElement | null {
    const column = document.querySelector('.height-on-bottom') as HTMLElement | null
    return column && column.scrollHeight > column.clientHeight ? column : null
  }

  private scrollContentToTop(): void {
    const scroller = this.getContentScroller()
    if (scroller) {
      scroller.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  exploreContent() {
    this.libNotificationsService.updateUnreadCount()
    this.raiseTelemetryExploreContent('explore_content')
    const queryParams = {
      q: '',
      search: null,
      category: 'courses',
      p: null,
      f: null,
      tab: 'explore-content',
      filtersPanel: 'show',
    }
    const navigationExtras = {
      queryParams,
      queryParamsHandling: 'merge' as 'merge',
    }
    this.router.navigate([this.getGlobalSearchRoute()], navigationExtras)
  }
  private getGlobalSearchRoute(): string {
    const profileRoles = this.configSvc.userProfileV2?.userRoles || []
    const isVolunteer = (!!this.configSvc.userRoles && this.configSvc.userRoles.has('volunteer'))
      || (Array.isArray(profileRoles) && profileRoles.some(
        (role: any) => (typeof role === 'string' ? role : role?.role || '').toUpperCase() === 'VOLUNTEER'
      ))
    return isVolunteer ? '/app/globalsearch/volunteer' : '/app/globalsearch'
  }

  raiseTelemetryExploreContent(id: string, subType: string = '') {
    const eData: any = {
      type: WsEvents.EnumInteractTypes.CLICK,
      id: id,
    }
    if (subType) {
      const telemetrySubTypeKey = subType as keyof typeof WsEvents.EnumTelemetrySubType
      if (WsEvents.EnumTelemetrySubType[telemetrySubTypeKey]) {
        eData.subType = WsEvents.EnumTelemetrySubType[telemetrySubTypeKey]
      }
    }
    this.eventSvc.raiseInteractTelemetry(
      eData,
      {},
      {
        module: WsEvents.EnumTelemetrymodules.HOME,
      }
    )
  }

  openAppDownloadDialog() {
    const dialogRef = this.dialog.open(DialogBoxComponent, {
      width: '1000px',
      panelClass: 'download-app-popup-new',
      maxHeight: '95vh',
    })
    dialogRef.afterClosed().subscribe(() => { })
  }

  private toOrdinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
  }

}
