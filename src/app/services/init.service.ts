import { APP_BASE_HREF } from '@angular/common'
import { HttpClient, HttpHeaders } from '@angular/common/http'
import { Inject, Injectable } from '@angular/core'
import { MatIconRegistry } from '@angular/material/icon'
import { DomSanitizer } from '@angular/platform-browser'
import {
  hasUnitPermission,
  WidgetResolverService,
} from '@sunbird-cb/resolver'
import {
  ConfigurationsService,
  LoggerService,
  NsAppsConfig,
  NsInstanceConfig,
  UserPreferenceService,
  WidgetEnrollService,
  DomainConfService,
} from '@sunbird-cb/utils-v2'
import { environment } from '../../environments/environment'
/* tslint:disable */
import _ from 'lodash'
import { firstValueFrom } from 'rxjs'
import { map } from 'rxjs/operators'
import { v4 as uuid } from 'uuid'
import { NPSGridService } from '@sunbird-cb/collection'
import { ContentDictionaryService } from '@sunbird-cb/consumption'
import moment from 'moment'
import { TranslateService } from '@ngx-translate/core'
import { SbUiResolverService } from '@sunbird-cb/resolver-v2'
import { NetCoreService } from './netcore.service'
import { BtnSettingsService } from '@sunbird-cb/collection'
import { CommonDataService } from './common-data.service'
import { FormExtService } from './form-ext.service'
declare const smartech: any
/* tslint:enable */

@Injectable({
  providedIn: 'root',
})
export class InitService {
  private baseUrl = this.configSvc.baseUrl
  updateProfileSubscription: any | null = null

  httpOptions = {
    headers: new HttpHeaders({
      wid: 'cc0c1749-4c47-49c8-9f46-2bbdd42ef877',
    }),
  }

  isAnonymousTelemetry = window.location.href.includes('/public/') || window.location.href.includes('&preview=true')
    || window.location.href.includes('/certs') || window.location.href.includes('/achievements') || window.location.href.includes('/crp/')

  constructor(
    private logger: LoggerService,
    private configSvc: ConfigurationsService,
    private domainConfSvc: DomainConfService,
    private widgetResolverService: WidgetResolverService,
    private sbUiResolverService: SbUiResolverService,
    private settingsSvc: BtnSettingsService,
    private userPreference: UserPreferenceService,
    private http: HttpClient,
    private npsSvc: NPSGridService,
    private translate: TranslateService,
    private enrollSvc: WidgetEnrollService,
    private netCoreService: NetCoreService,
    private commonDataSvc: CommonDataService,
    private contentDictionarySvc: ContentDictionaryService,
    private formSvc: FormExtService,

    @Inject(APP_BASE_HREF) private baseHref: string,
    domSanitizer: DomSanitizer,
    iconRegistry: MatIconRegistry,
  ) {
    this.configSvc.isProduction = environment.production

    // Register pin icon for use in Knowledge Board
    // Usage: <mat-icon svgIcon="pin"></mat-icon>
    iconRegistry.addSvgIcon(
      'pin',
      domSanitizer.bypassSecurityTrustResourceUrl('fusion-assets/icons/pin.svg'),
    )
    iconRegistry.addSvgIcon(
      'facebook',
      domSanitizer.bypassSecurityTrustResourceUrl('fusion-assets/icons/facebook.svg'),
    )
    iconRegistry.addSvgIcon(
      'linked-in',
      domSanitizer.bypassSecurityTrustResourceUrl('fusion-assets/icons/linked-in.svg'),
    )
    iconRegistry.addSvgIcon(
      'twitter',
      domSanitizer.bypassSecurityTrustResourceUrl('fusion-assets/icons/twitter.svg'),
    )
    iconRegistry.addSvgIcon(
      'category_xs',
      domSanitizer.bypassSecurityTrustResourceUrl('fusion-assets/icons/category_xs.svg'),
    )
    iconRegistry.addSvgIcon(
      'category_m',
      domSanitizer.bypassSecurityTrustResourceUrl('fusion-assets/icons/category_m.svg'),
    )
    iconRegistry.addSvgIcon(
      'hubs',
      domSanitizer.bypassSecurityTrustResourceUrl('fusion-assets/icons/hubs.svg'),
    )
    iconRegistry.addSvgIcon(
      'verified',
      domSanitizer.bypassSecurityTrustResourceUrl('fusion-assets/icons/verified.svg'),
    )
    iconRegistry.addSvgIcon(
      'info-outline',
      domSanitizer.bypassSecurityTrustResourceUrl('assets/icons/icon-wrapper.svg'),
    )
    iconRegistry.addSvgIcon(
      'video-library',
      domSanitizer.bypassSecurityTrustResourceUrl('assets/icons/hubs/video-library.svg'),
    )
    iconRegistry.addSvgIcon(
      'school-search',
      domSanitizer.bypassSecurityTrustResourceUrl('assets/icons/hubs/school-grey.svg'),
    )
    iconRegistry.addSvgIcon(
      'calender-event',
      domSanitizer.bypassSecurityTrustResourceUrl('assets/icons/hubs/event-grey.svg'),
    )
    iconRegistry.addSvgIcon(
      'people-search',
      domSanitizer.bypassSecurityTrustResourceUrl('assets/icons/hubs/group-grey.svg'),
    )
    iconRegistry.addSvgIcon(
      'menu_book',
      domSanitizer.bypassSecurityTrustResourceUrl('assets/icons/hubs/knowledge-resources-grey.svg'),
    )
    iconRegistry.addSvgIcon(
      'diversity_3',
      domSanitizer.bypassSecurityTrustResourceUrl('assets/icons/hubs/Jan-karmayogi-grey.svg'),
    )
    iconRegistry.addSvgIcon(
      'handshake',
      domSanitizer.bypassSecurityTrustResourceUrl('assets/icons/hubs/handshake.svg'),
    )
    iconRegistry.addSvgIcon(
      'certificate',
      domSanitizer.bypassSecurityTrustResourceUrl('assets/icons/hubs/certificate.svg'),
    )
    iconRegistry.addSvgIcon(
      'download',
      domSanitizer.bypassSecurityTrustResourceUrl('assets/icons/download.svg'),
    )
    iconRegistry.addSvgIcon(
      'course-cataloguee',
      domSanitizer.bypassSecurityTrustResourceUrl('assets/icons/hubs/course-cataloguee.svg'),
    )
    iconRegistry.addSvgIcon(
      'chat',
      domSanitizer.bypassSecurityTrustResourceUrl('assets/icons/edit.svg'),
    )
    iconRegistry.addSvgIcon(
      'content-locked',
      domSanitizer.bypassSecurityTrustResourceUrl('assets/icons/content-locked.svg'),
    )
    iconRegistry.addSvgIcon(
      'approved-icon',
      domSanitizer.bypassSecurityTrustResourceUrl('assets/icons/approved.svg'),
    )
  }

  get isAnonymousTelemetryRequired(): boolean {
    this.isAnonymousTelemetry = window.location.href.includes('/public/') || window.location.href.includes('/helpcenter')
      || window.location.href.includes('&preview=true') || window.location.href.includes('/certs') || window.location.href.includes('/achievements') || window.location.href.includes('/crp/')
    return this.isAnonymousTelemetry
  }

  async init() {
    if (this.updateProfileSubscription) {
      this.updateProfileSubscription.unsubscribe()
    }
    // to update the profile from user read api
    this.updateProfileSubscription = this.configSvc.updateProfileObservable.subscribe(async (value: boolean) => {
      if (value) {
        await this.fetchUserDetails()
      }
    })
    // public / preview / creator (editMode) routes have no auth session:
    //  - skip the protected global-config form call
    //  - application-config is loaded from the static json (form read only on normal routes)
    const href = window.location.href
    const isPublicPreviewOrCreator = href.includes('/public/')
      || href.includes('&preview=true')
      || href.includes('editMode=true')
      || window.location.href.includes('/helpcenter')
    if (!isPublicPreviewOrCreator) {
      await this.globalConfigData()
    }
    await this.fetchDefaultConfig(isPublicPreviewOrCreator)

    // Invalid User
    try {
      const path = window.location.pathname
      const isPublic = window.location.href.includes('/public/') || window.location.href.includes('/helpcenter')
        || window.location.href.includes('&preview=true') || window.location.href.includes('/certs') || window.location.href.includes('/achievements') || window.location.href.includes('/crp/')
      this.setTelemetrySessionId()
      if (!path.startsWith('/public') && !isPublic) {
        await this.fetchStartUpDetails()
        await this.fetchUserEnrollDetails()
        // pre-load the content dictionary only when enabled via global-config apis.content.dictionary
        if (this.configSvc.globalConfig?.apis?.content?.dictionary?.enabled) {
          this.contentDictionarySvc.getDictionary().subscribe({
            error: (err: any) => this.logger.warn('InitService: Failed to pre-load content dictionary', err),
          })
        }
      } else if (path.includes('/public/welcome')) {
        await this.fetchStartUpDetails()
      } else if (window.location.href.includes('editMode=true') && window.location.href.includes('_rc')) {
        await this.fetchStartUpDetails()
      }

      // detail: depends only on userID
    } catch (e) {
      this.settingsSvc.initializePrefChanges(environment.production)
      this.updateNavConfig()
      this.isAnonymousTelemetry = true
      this.updateTelemetryConfig()
      this.logger.info('Not Authenticated')
      await this.initFeatured()
      return false

    }
    try {
      await this.initFeatured()
    } catch (e) {
      this.logger.warn(
        'Initialization process encountered some error. Application may not work as expected',
        e,
      )
      this.settingsSvc.initializePrefChanges(environment.production)
    }
    this.updateNavConfig()
    if (
      !(
        window.location.href.includes('/public/') ||
        window.location.href.includes('/crp/') ||
        window.location.href.includes('/certs') ||
        window.location.href.includes('/achievements') ||
        window.location.href.includes('/viewer') || window.location.href.includes('/helpcenter')
      )
    ) {
      this.logFirstLogin()
    }
    return true
  }
  async initFeatured() {
    /**
     * Wait for the widgets and get the list of restricted widgets
     */
    this.widgetResolverService.initialize(
      this.configSvc.restrictedWidgets,
      this.configSvc.userRoles,
      this.configSvc.userGroups,
      this.configSvc.restrictedFeatures,
    )
    this.sbUiResolverService.initialize(
      this.configSvc.restrictedWidgets,
      this.configSvc.userRoles,
      this.configSvc.userGroups,
      this.configSvc.restrictedFeatures,
    )
    /**
     * Wait for the instance config and after that
     */
    this.updateTelemetryConfig()

    // Apply the settings using settingsService
    this.settingsSvc.initializePrefChanges(environment.production)
    this.userPreference.initialize()

    // lang selection
    if (this.configSvc.instanceConfig && this.configSvc.instanceConfig.isMultilingualEnabled) {
      if (this.configSvc.unMappedUser) {
        if (this.configSvc.unMappedUser.profileDetails
          && this.configSvc.unMappedUser.profileDetails.additionalProperties
          && this.configSvc.unMappedUser.profileDetails.additionalProperties.webPortalLang) {
          const lang = this.configSvc.unMappedUser.profileDetails.additionalProperties.webPortalLang
          this.translate.use(lang)
          localStorage.setItem('websiteLanguage', lang)
        } else {
          if (localStorage.getItem('websiteLanguage')) {
            let lang = JSON.stringify(localStorage.getItem('websiteLanguage'))
            lang = lang.replace(/\"/g, '')
            this.translate.use(lang)
          } else {
            this.translate.setDefaultLang('en')
            localStorage.setItem('websiteLanguage', 'en')
          }
        }
      } else if (localStorage.getItem('websiteLanguage')) {
        let lang = JSON.stringify(localStorage.getItem('websiteLanguage'))
        lang = lang.replace(/\"/g, '')
        this.translate.use(lang)
      } else {
        this.translate.setDefaultLang('en')
        localStorage.setItem('websiteLanguage', 'en')
      }
    } else {
      this.translate.setDefaultLang('en')
      localStorage.setItem('websiteLanguage', 'en')
    }
  }

  private async fetchDefaultConfig(useStaticConfig = false): Promise<NsInstanceConfig.IConfig> {
    let publicConfig: NsInstanceConfig.IConfig | any
    try {
      if (useStaticConfig) {
        // public / preview / creator routes: load the static json, skip the protected form read
        publicConfig = await firstValueFrom(this.http
          .get<NsInstanceConfig.IConfig>(`${this.baseUrl}/application.config.json`))
      } else {
        const request = {
          request: {
            type: 'page',
            subType: 'application-config-web',
            portal: 'portal',
            clientVersion: this.configSvc?.globalConfig?.formClientVersion?.['application-config-web'] || 1.0,
          },
        }
        const response: any = await firstValueFrom(this.formSvc.formConfigReadData(request))
        publicConfig = response?.result?.data || response?.result?.form?.data
      }
      if (!publicConfig) {
        throw new Error('InitService: Empty application config received from form API')
      }
    } catch (e) {
      console.error('InitService: Failed to load application config from form API, falling back to static file', e)
      publicConfig = await firstValueFrom(this.http
        .get<NsInstanceConfig.IConfig>(`${this.baseUrl}/application.config.json`))
    }
    if (publicConfig.npsCategory) {
      localStorage.setItem('npsCategory', publicConfig.npsCategory)
    }
    this.configSvc.instanceConfig = publicConfig
    this.configSvc.rootOrg = publicConfig.rootOrg
    this.configSvc.org = publicConfig.org
    // TODO: set one org as default org :: use user preference
    this.configSvc.activeOrg = publicConfig.org[0]
    this.configSvc.appSetup = publicConfig.appSetup
    this.configSvc.positions = publicConfig.positions
    this.configSvc.compentency = publicConfig.compentency
    this.configSvc.portalUrls = publicConfig.portalUrls
    this.configSvc.completionSurvey = publicConfig.completionSurvey
    this.updateAppIndexMeta()
    this.updateTelemetryConfig()
    this.configSvc.appsConfig = this.processAppsConfig(publicConfig)
    this.configSvc.overrideThemeChanges = publicConfig.overrideThemeChanges
    this.configSvc.profileTimelyNudges = publicConfig.profileTimelyNudges
    this.configSvc['headerFooterConfigData'] = publicConfig.headerFooterConfigData
    this.configSvc.netcoreConfig = publicConfig.netcoreConfig
    if (publicConfig && publicConfig?.iGOTAI && publicConfig?.iGOTAI?.web) {
      this.configSvc.iGOTAIConfig = publicConfig.iGOTAI.web
    }
    return publicConfig
  }

  private async globalConfigData(): Promise<any> {
    try {
      const request = {
        request: {
          subType: 'global-web',
          type: 'page',
          portal: 'portal',
          clientVersion: 1.0,
        },
      }
      const response: any = await firstValueFrom(this.formSvc.formConfigReadData(request))
      this.configSvc.globalConfig = response.result.data
    } catch (e) {
      // the global-web form config is mandatory — when the API fails the app
      // must show the error screen instead of silently running on a stale
      // static fallback (root.component renders the error screen off this flag)
      console.error('InitService: Failed to load global config', e)
      this.configSvc.globalConfig = {}
      this.configSvc.globalConfigLoadFailed = true
    }
    return this.configSvc.globalConfig
  }

  private async fetchUserEnrollDetails(): Promise<NsInstanceConfig.IConfig> {
    const enrollmentSummaryConfig = this.configSvc.globalConfig?.apis?.user?.userEnrollmentSummary
    if (!enrollmentSummaryConfig?.enabled) {
      return {} as NsInstanceConfig.IConfig
    }
    const userId = this.configSvc.userProfile?.userId
    const publicConfig: NsInstanceConfig.IConfig = await firstValueFrom(this.enrollSvc.fetchEnrollStats(userId, enrollmentSummaryConfig.url)).then((res: any) => {
      let userCourseEnrolmentInfo: any = {}
      let userExternalCourseEnrolmentInfo: any = {}
      if (res && res.result && res.result.userCourseEnrolmentInfo) {
        const badgeCount: any = res.result.badgeCount
        userCourseEnrolmentInfo = res.result.userCourseEnrolmentInfo
        userExternalCourseEnrolmentInfo = res.result.userExternalCourseEnrolmentInfo
        userCourseEnrolmentInfo['badgeCount'] = badgeCount
        userCourseEnrolmentInfo['karmaPoints'] = userCourseEnrolmentInfo['karmaPoints'] + (userExternalCourseEnrolmentInfo['karmaPoints'] || 0)
        userCourseEnrolmentInfo['timeSpentOnCompletedCourses'] = userCourseEnrolmentInfo['timeSpentOnCompletedCourses'] + (userExternalCourseEnrolmentInfo['timeSpentOnCompletedCourses'] || 0)
        userCourseEnrolmentInfo['certificatesIssued'] = userCourseEnrolmentInfo['certificatesIssued'] + (userExternalCourseEnrolmentInfo['certificatesIssued'] || 0)
        userCourseEnrolmentInfo['coursesInProgress'] = userCourseEnrolmentInfo['coursesInProgress'] + (userExternalCourseEnrolmentInfo['coursesInProgress'] || 0)
        if (userCourseEnrolmentInfo.addinfo && Object.keys(userCourseEnrolmentInfo.addinfo).length > 0) {
          if (Object.keys(userExternalCourseEnrolmentInfo).length > 0
            && userExternalCourseEnrolmentInfo.addinfo
            && Object.keys(userExternalCourseEnrolmentInfo.addinfo).length > 0) {
            const addInfo = userExternalCourseEnrolmentInfo.addinfo
            userCourseEnrolmentInfo['addinfo']['claimedNonACBPCourseKarmaQuota'] = userCourseEnrolmentInfo['addinfo']['claimedNonACBPCourseKarmaQuota'] + (addInfo['claimedNonACBPCourseKarmaQuota'] || 0)
          }
        }
        const enrolledCourseCount = userCourseEnrolmentInfo['coursesInProgress'] + userCourseEnrolmentInfo['certificatesIssued']
        const userData = {
          enrolledCourseCount,
          userCourseEnrolmentInfo,
        }
        console.log('userData', userData)
        localStorage.removeItem('userEnrollmentCount')
        localStorage.setItem('userEnrollmentCount', JSON.stringify(userData))

      }
      if (this.configSvc.userProfile) {
        const userProfile = this.configSvc && this.configSvc.userProfile
        if (userProfile.rootOrgId) {
          this.netCoreService.getOrgReadData(userProfile.rootOrgId).subscribe(orgData => {
            this.configSvc.orgReadData = orgData
            if (!(orgData && orgData['netcoreDisabled'])) {
              smartech('create', 'ADGMOT35CHFLVDHBJNIG50K968HALK3BMP0VCCVVE0PODR835I00', 'tin')
              smartech('register', 'b632681d782c843e187fd5447c97ed4d')
              smartech('identify', '')
              smartech('dispatch', 1, {})
              if (this.configSvc.netcoreConfig && this.configSvc.netcoreConfig.netcoreWebConfig
                && this.configSvc.netcoreConfig.netcoreWebConfig.isActive
              ) {
                const netCoreUserSetupFlag: any = localStorage.getItem('netCoreUserSetup') ? localStorage.getItem('netCoreUserSetup') : ''
                if (netCoreUserSetupFlag === 'false' || netCoreUserSetupFlag === false || netCoreUserSetupFlag === '') {
                  this.netCoreUserLoginSetup()
                }
              }
            }
          })
        }

      }

      return res
    }).catch((_err: any) => {
      const userCourseEnrolmentInfo = {
        enrolledCourseCount: 0,
        karmaPoints: 0,
        timeSpentOnCompletedCourses: 0,
        certificatesIssued: 0,
        coursesInProgress: 0,
        addinfo: {},
      }
      localStorage.removeItem('userEnrollmentCount')
      localStorage.setItem('userEnrollmentCount', JSON.stringify(userCourseEnrolmentInfo))
    }) as NsInstanceConfig.IConfig || {}
    return publicConfig
  }

  get locale(): string {
    return this.baseHref && this.baseHref.replace(/\//g, '')
      ? this.baseHref.replace(/\//g, '')
      : 'en'
  }
  private setTelemetrySessionId() {
    if (localStorage.getItem('telemetrySessionId')) {
      localStorage.removeItem('telemetrySessionId')
    }
    localStorage.setItem('telemetrySessionId', uuid())
  }

  private logFirstLogin() {
    const firstLoginUrl = this.domainConfSvc.getApiUrl('user', 'firstLogin', '/apis/proxies/v8/login/entry')
    if (!firstLoginUrl) {
      console.warn('First login API is disabled')
      return
    }
    if (!localStorage.getItem('firsLogin')) {
      this.http.get<any>(firstLoginUrl).pipe(map((res: any) => {
        if (res && res.result) {
          localStorage.setItem('firsLogin', 'true')
        }
      })).toPromise()
    }
  }
  private async fetchStartUpDetails(): Promise<any> {
    let apiResponse: any
    if (this.configSvc.instanceConfig) {
      let userPidProfile: any | null = null
      const profileUrl = this.domainConfSvc.getApiUrl('user', 'profile', '/apis/proxies/v8/api/user/v2/read')

      if (!profileUrl) {
        console.error('User profile API is disabled')
        throw new Error('Profile API disabled')
      }

      try {
        userPidProfile = await this.http
          .get<any>(profileUrl)
          .pipe(map((res: any) => {
            apiResponse = res
            return _.get(res, 'result.response')
          })).toPromise()
        if (userPidProfile && userPidProfile.roles && userPidProfile.roles.length > 0 &&
          this.hasRole(userPidProfile.roles)) {
          this.setTelemetrySessionId()
          this.updateTelemetryConfig()
          this.configSvc.unMappedUser = userPidProfile
          const profileV2 = _.get(userPidProfile, 'profileDetails')
          this.configSvc.userProfile = {
            country: _.get(profileV2, 'personalDetails.countryCode') || null,
            email: _.get(profileV2, 'profileDetails.officialEmail') || userPidProfile.email,
            givenName: userPidProfile.firstName,
            userId: userPidProfile.userId,
            firstName: userPidProfile.firstName,
            lastName: userPidProfile.lastName,
            rootOrgId: userPidProfile.rootOrgId,
            rootOrgName: userPidProfile.channel,
            userName: userPidProfile.userName,
            profileImage: userPidProfile.thumbnail,
            departmentName: userPidProfile.channel,
            dealerCode: null,
            isManager: false,
            profileUpdateCompletion: _.get(userPidProfile, 'profileUpdateCompletion') || 0,
            profileImageUrl: _.get(userPidProfile, 'profileDetails.profileImageUrl') || '',
            professionalDetails: _.get(userPidProfile, 'profileDetails.professionalDetails') || [],
            userRootOrg: _.get(userPidProfile, 'rootOrg') || null,
          }

          this.configSvc.userProfileV2 = {
            userId: _.get(profileV2, 'userId') || userPidProfile.userId,
            email: _.get(profileV2, 'personalDetails.officialEmail') || userPidProfile.email,
            firstName: _.get(profileV2, 'personalDetails.firstname') || userPidProfile.firstName,
            surName: _.get(profileV2, 'personalDetails.surname') || userPidProfile.lastName,
            middleName: _.get(profileV2, 'personalDetails.middlename') || '',
            departmentName: _.get(profileV2, 'employmentDetails.departmentName') || userPidProfile.channel,
            givenName: _.get(userPidProfile, 'userName'),
            userName: `${_.get(profileV2, 'personalDetails.firstname') ? _.get(profileV2, 'personalDetails.firstname') : ''}${_.get(profileV2, 'personalDetails.surname') ? _.get(profileV2, 'personalDetails.surname') : ''}`,
            profileImage: _.get(profileV2, 'photo') || userPidProfile.thumbnail,
            profileImageUrl: _.get(userPidProfile, 'profileDetails.profileImageUrl') || '',
            dealerCode: null,
            isManager: false,
            competencies: _.get(profileV2, 'competencies') || [],
            desiredCompetencies: _.get(profileV2, 'desiredCompetencies') || [],
            systemTopics: _.get(profileV2, 'systemTopics') || [],
            desiredTopics: _.get(profileV2, 'desiredTopics') || [],
            userRoles: _.get(profileV2, 'userRoles') || [],
            webPortalLang: _.get(profileV2, 'additionalProperties.webPortalLang') || '',
          }
          if (!this.configSvc.nodebbUserProfile) {
            this.configSvc.nodebbUserProfile = {
              username: userPidProfile.userName,
              email: 'null',
            }
          }
          localStorage.setItem('login', 'true')

          // NLW 2026 certification eligibility check
          this.commonDataSvc.checkAndCacheNlw2026Eligibility(userPidProfile)
        } else {
          if (apiResponse && apiResponse.redirectUrl) {
            window.location.href = apiResponse.redirectUrl
          } else {
            window.location.href = `${this.defaultRedirectUrl}apis/reset`
          }
          this.updateTelemetryConfig()
        }
        const details = {
          group: [],
          profileDetailsStatus: !!_.get(userPidProfile, 'profileDetails.mandatoryFieldsExists'),
          roles: (userPidProfile.roles || []).map((v: { toLowerCase: () => void }) => v.toLowerCase()),
          tncStatus: !userPidProfile.promptTnC,
          isActive: !!!userPidProfile.isDeleted,
        }
        this.configSvc.hasAcceptedTnc = details.tncStatus
        this.configSvc.profileDetailsStatus = details.profileDetailsStatus
        this.configSvc.userGroups = new Set(details.group)
        this.configSvc.userRoles = new Set((details.roles || []).map((v: string) => v.toLowerCase()))
        this.configSvc.isActive = details.isActive

        // nps check (skipped entirely when the NPS survey dialog is disabled
        // in global-config -> components.dialogs.npsSurvey)
        if (this.domainConfSvc.isConfigEnabled('components.dialogs', 'enabled')
          && this.domainConfSvc.isConfigEnabled('components.dialogs', 'npsSurvey')) {
          if (localStorage.getItem('platformratingTime')) {
            const date = localStorage.getItem('platformratingTime') || ''
            const isNextDay = moment().subtract(24, 'hours').isBefore(moment(new Date(date)))
            if (isNextDay) {
              this.checkUserFeed()
            }
          } else {
            this.checkUserFeed()
          }
        }
        return details
      } catch (e) {
        this.configSvc.userProfile = null
        this.updateTelemetryConfig()
        throw new Error('Invalid user')
      }
    } else {
      return { group: [], profileDetailsStatus: true, roles: new Set(['Public']), tncStatus: true, isActive: true }
    }
  }

  // This is a replication of fetchStartUpDetails() method
  // only change is calling the read api with userID
  // since Backend api is failing if we call the read api twice
  private async fetchUserDetails(): Promise<any> {
    if (this.configSvc.unMappedUser.id) {
      let userPidProfile: any | null = null
      const profileBaseUrl = this.domainConfSvc.getApiUrl('user', 'profile', '/apis/proxies/v8/api/user/v2/read')

      if (!profileBaseUrl) {
        console.error('User profile API is disabled')
        throw new Error('Profile API disabled')
      }

      const profileByIdUrl = `${profileBaseUrl}/${this.configSvc.unMappedUser.id}`
      try {
        userPidProfile = await this.http
          .get<any>(profileByIdUrl)
          .pipe(map((res: any) => {
            return _.get(res, 'result.response')
          })).toPromise()

        if (userPidProfile && userPidProfile.roles && userPidProfile.roles.length > 0 &&
          this.hasRole(userPidProfile.roles)) {
          this.setTelemetrySessionId()
          // make the endpoint private for logged in user
          this.updateTelemetryConfig()
          this.configSvc.unMappedUser = userPidProfile
          const profileV2 = _.get(userPidProfile, 'profileDetails')
          this.configSvc.userProfile = {
            country: _.get(profileV2, 'personalDetails.countryCode') || null,
            email: _.get(profileV2, 'profileDetails.officialEmail') || userPidProfile.email,
            givenName: userPidProfile.firstName,
            userId: userPidProfile.userId,
            firstName: userPidProfile.firstName,
            lastName: userPidProfile.lastName,
            rootOrgId: userPidProfile.rootOrgId,
            rootOrgName: userPidProfile.channel,
            userName: userPidProfile.userName,
            profileImage: userPidProfile.thumbnail,
            departmentName: userPidProfile.channel,
            dealerCode: null,
            isManager: false,
            profileUpdateCompletion: _.get(userPidProfile, 'profileUpdateCompletion') || 0,
            profileImageUrl: _.get(userPidProfile, 'profileDetails.profileImageUrl') || '',
            professionalDetails: _.get(userPidProfile, 'profileDetails.professionalDetails') || [],
            userRootOrg: _.get(userPidProfile, 'rootOrg') || null,
          }
          this.configSvc.userProfileV2 = {
            userId: _.get(profileV2, 'userId') || userPidProfile.userId,
            email: _.get(profileV2, 'personalDetails.officialEmail') || userPidProfile.email,
            firstName: _.get(profileV2, 'personalDetails.firstname') || userPidProfile.firstName,
            surName: _.get(profileV2, 'personalDetails.surname') || userPidProfile.lastName,
            middleName: _.get(profileV2, 'personalDetails.middlename') || '',
            departmentName: _.get(profileV2, 'employmentDetails.departmentName') || userPidProfile.channel,
            givenName: _.get(userPidProfile, 'userName'),
            userName: `${_.get(profileV2, 'personalDetails.firstname') ? _.get(profileV2, 'personalDetails.firstname') : ''}${_.get(profileV2, 'personalDetails.surname') ? _.get(profileV2, 'personalDetails.surname') : ''}`,
            profileImage: _.get(profileV2, 'photo') || userPidProfile.thumbnail,
            dealerCode: null,
            isManager: false,
            competencies: _.get(profileV2, 'competencies') || [],
            desiredCompetencies: _.get(profileV2, 'desiredCompetencies') || [],
            systemTopics: _.get(profileV2, 'systemTopics') || [],
            desiredTopics: _.get(profileV2, 'desiredTopics') || [],
            userRoles: _.get(profileV2, 'userRoles') || [],
            webPortalLang: _.get(profileV2, 'additionalProperties.webPortalLang') || '',
          }

          if (!this.configSvc.nodebbUserProfile) {
            this.configSvc.nodebbUserProfile = {
              username: userPidProfile.userName,
              email: 'null',
            }
          }
          localStorage.setItem('login', 'true')
        } else {
          window.location.href = `${this.defaultRedirectUrl}apis/reset`
          this.updateTelemetryConfig()
        }
        const details = {
          group: [],
          profileDetailsStatus: !!_.get(userPidProfile, 'profileDetails.mandatoryFieldsExists'),
          roles: (userPidProfile.roles || []).map((v: { toLowerCase: () => void }) => v.toLowerCase()),
          tncStatus: !userPidProfile.promptTnC,
          isActive: !!!userPidProfile.isDeleted,
        }
        this.configSvc.hasAcceptedTnc = details.tncStatus
        this.configSvc.profileDetailsStatus = details.profileDetailsStatus
        this.configSvc.userGroups = new Set(details.group)
        this.configSvc.userRoles = new Set((details.roles || []).map((v: string) => v.toLowerCase()))
        this.configSvc.isActive = details.isActive
        return details
      } catch (e) {
        this.configSvc.userProfile = null
        this.updateTelemetryConfig()
        throw new Error('Invalid user')
      }
    } else {
      return { group: [], profileDetailsStatus: true, roles: new Set(['Public']), tncStatus: true, isActive: true }
    }

  }

  private processAppsConfig(appsConfig: NsAppsConfig.IAppsConfig): NsAppsConfig.IAppsConfig {
    const tourGuide = appsConfig?.tourGuide
    const features: { [id: string]: NsAppsConfig.IFeature } = Object.values(
      appsConfig?.features || {},
      // tslint:disable-next-line: no-shadowed-variable
    ).reduce((map: { [id: string]: NsAppsConfig.IFeature }, feature: NsAppsConfig.IFeature) => {
      if (hasUnitPermission(feature.permission, this.configSvc.restrictedFeatures, true)) {
        map[feature.id] = feature
      }
      return map
      // tslint:disable-next-line: align
    }, {})
    const groups = appsConfig.groups
      .map((group: NsAppsConfig.IGroup) => ({
        ...group,
        featureIds: group.featureIds.filter(id => Boolean(features[id])),
      }))
      .filter(group => group.featureIds.length)
    return { features, groups, tourGuide }
  }
  private updateNavConfig() {
    if (this.configSvc.instanceConfig) {
      const background = this.configSvc.instanceConfig.backgrounds
      if (background && background.primaryNavBar) {
        this.configSvc.primaryNavBar = background.primaryNavBar
      }
      if (background && background.pageNavBar) {
        this.configSvc.pageNavBar = background.pageNavBar
      }
      if (this.configSvc.instanceConfig.primaryNavBarConfig) {
        this.configSvc.primaryNavBarConfig = this.configSvc.instanceConfig.primaryNavBarConfig
      }
    }
  }

  private updateTelemetryConfig() {
    if (this.configSvc.instanceConfig && this.configSvc.instanceConfig.telemetryConfig) {
      if (this.isAnonymousTelemetryRequired) {
        this.configSvc.instanceConfig.telemetryConfig.endpoint = this.configSvc.instanceConfig.telemetryConfig.publicEndpoint
      } else {
        this.configSvc.instanceConfig.telemetryConfig.endpoint = this.configSvc.instanceConfig.telemetryConfig.protectedEndpoint
      }
    }
  }

  private updateAppIndexMeta() {
    if (this.configSvc.instanceConfig) {
      if (this.configSvc.instanceConfig.details && this.configSvc.instanceConfig.details.appName) {
        document.title = this.configSvc.instanceConfig.details.appName
      }
      try {
        if (this.configSvc.instanceConfig.indexHtmlMeta.description) {
          const manifestElem = document.getElementById('id-app-description')
          if (manifestElem) {
            // tslint:disable-next-line: semicolon // tslint:disable-next-line: whitespace
            ; (manifestElem as HTMLMetaElement).setAttribute(
              'content',
              this.configSvc.instanceConfig.indexHtmlMeta.description,
            )
          }
        }
        if (this.configSvc.instanceConfig.indexHtmlMeta.webmanifest) {
          const manifestElem = document.getElementById('id-app-webmanifest')
          if (manifestElem) {
            // tslint:disable-next-line: semicolon // tslint:disable-next-line: whitespace
            ; (manifestElem as HTMLLinkElement).setAttribute(
              'href',
              this.configSvc.instanceConfig.indexHtmlMeta.webmanifest,
            )
          }
        }
        if (this.configSvc.instanceConfig.indexHtmlMeta.pngIcon) {
          const pngIconElem = document.getElementById('id-app-fav-icon')
          if (pngIconElem) {
            // tslint:disable-next-line: semicolon // tslint:disable-next-line: whitespace
            ; (pngIconElem as HTMLLinkElement).href = this.configSvc.instanceConfig.indexHtmlMeta.pngIcon
          }
        }
        if (this.configSvc.instanceConfig.indexHtmlMeta.xIcon) {
          const xIconElem = document.getElementById('id-app-x-icon')
          if (xIconElem) {
            // tslint:disable-next-line: semicolon // tslint:disable-next-line: whitespace
            ; (xIconElem as HTMLLinkElement).href = this.configSvc.instanceConfig.indexHtmlMeta.xIcon
          }
        }
      } catch (error) {
        this.logger.error('Error updating index html meta >', error)
      }
    }
  }
  hasRole(role: string[]): boolean {
    let returnValue = false
    const rolesForCBP = environment.portalRoles
    role.forEach(v => {
      if ((rolesForCBP).includes(v)) {
        returnValue = true
      }
    })
    return returnValue
  }

  // for NPS user feed check
  private checkUserFeed() {
    // Check if the feed API is enabled
    if (!this.domainConfSvc.isApiEnabled('user', 'feedStatus')) {
      console.warn('Feed status API is disabled')
      return
    }

    const feedId: any = []
    // Pass only the user ID to getFeedStatus - the service constructs the full URL
    this.npsSvc.getFeedStatus(this.configSvc.unMappedUser.id).subscribe((res: any) => {
      if (res.result.response.userFeed && res.result.response.userFeed.length > 0) {
        const feed = res.result.response.userFeed
        feed.forEach((item: any) => {
          if (item.category === 'NPS' && item && item.data && item.data.actionData && item.data.actionData.formId) {
            feedId.push(item.id)
            const currentTime = moment()
            localStorage.platformratingTime = currentTime
            localStorage.setItem('ratingformID', JSON.stringify(item.data.actionData.formId))
            localStorage.setItem('ratingfeedID', JSON.stringify(feedId))
          } else if (item.category === 'NPS2' && item && item.data && item.data.actionData && item.data.actionData.formId) {
            feedId.push(item.id)
            const currentTime = moment()
            localStorage.platformratingTime = currentTime
            localStorage.setItem('ratingformID', JSON.stringify(item.data.actionData.formId))
            localStorage.setItem('ratingfeedID', JSON.stringify(feedId))
          }
        })
      }
    })
    const checkSurvey = localStorage.getItem('surveyPopup')
    if (checkSurvey && checkSurvey === 'false') {
      localStorage.setItem('surveyPopup', 'false')
    } else {
      localStorage.setItem('surveyPopup', 'true')
    }
  }

  // get default url

  private get defaultRedirectUrl(): string {
    try {
      const baseUrl = document.baseURI
      return baseUrl || location.origin
    } catch (error) {
      return location.origin
    }
  }

  async netCoreUserLoginSetup() {
    /* tslint:disable */
    localStorage.setItem('netCoreUserSetup', 'true')
    console.log('this.configSvc.unMappedUser', this.configSvc.unMappedUser)
    let userEnrollmentCount: any = await localStorage.getItem('userEnrollmentCount')
    if (userEnrollmentCount) {
      userEnrollmentCount = JSON.parse(userEnrollmentCount)
    }
    /* tslint:disable */
    console.log('userEnrollmentCount', userEnrollmentCount)
    /* tslint:enable */
    const userInfoPayload: any = {}
    userInfoPayload['TOTAL_EXPERIENCE'] = ''
    if (this.configSvc && this.configSvc.unMappedUser && this.configSvc.unMappedUser.identifier) {
      userInfoPayload['pk^userid'] = this.configSvc.unMappedUser.identifier.trim().toLowerCase()
    }
    if (this.configSvc && this.configSvc.unMappedUser
      && this.configSvc.unMappedUser.profileDetails
      && this.configSvc.unMappedUser.profileDetails.personalDetails
    ) {
      if (this.configSvc.unMappedUser.profileDetails.personalDetails.firstname) {
        userInfoPayload['FULL_NAME'] = this.toTitleCase(this.configSvc.unMappedUser.profileDetails.personalDetails.firstname.trim())
      }

      if (this.configSvc.unMappedUser.profileDetails.personalDetails.domicileMedium) {
        userInfoPayload['MOTHER_TONGUE'] = this.toTitleCase(this.configSvc.unMappedUser.profileDetails.personalDetails.domicileMedium.trim())
      }

      if (this.configSvc.unMappedUser.profileDetails.personalDetails.primaryEmail) {
        userInfoPayload['email'] = this.configSvc.unMappedUser.profileDetails.personalDetails.primaryEmail.trim()
      }
      if (this.configSvc.unMappedUser.profileDetails.personalDetails.mobile) {
        userInfoPayload['mobile'] = this.configSvc.unMappedUser.profileDetails.personalDetails.mobile
      }
    }
    if (this.configSvc && this.configSvc.unMappedUser
      && this.configSvc.unMappedUser.profileDetails
    ) {
      if (this.configSvc.unMappedUser.profileDetails.profileStatus) {
        userInfoPayload['PROFILE_STATUS'] = this.configSvc.unMappedUser.profileDetails.profileStatus.trim()
      }
    }

    if (this.configSvc && this.configSvc.unMappedUser
      && this.configSvc.unMappedUser.profileDetails
      && this.configSvc.unMappedUser.profileDetails.professionalDetails
      && this.configSvc.unMappedUser.profileDetails.professionalDetails[0]
    ) {
      if (this.configSvc.unMappedUser.profileDetails.professionalDetails[0].designation) {
        userInfoPayload['PROFILE_DESIGNATION'] = this.toTitleCase(this.configSvc.unMappedUser.profileDetails.professionalDetails[0].designation.trim())
      }
      if (this.configSvc.unMappedUser.profileDetails && this.configSvc.unMappedUser.profileDetails.employmentDetails && this.configSvc.unMappedUser.profileDetails.employmentDetails.departmentName) {
        userInfoPayload['ORGANISATION'] = this.toTitleCase(this.configSvc.unMappedUser.profileDetails.employmentDetails.departmentName.trim())
      }
      if (this.configSvc.unMappedUser.profileDetails.professionalDetails[0].group) {
        userInfoPayload['PROFILE_GROUP'] = this.toTitleCase(this.configSvc.unMappedUser.profileDetails.professionalDetails[0].group.trim())
      }
    }
    /* tslint:disable */
    console.log('userInfoPayload', userInfoPayload)
    if (this.configSvc.netcoreConfig && this.configSvc.netcoreConfig.netcoreWebConfig
      && this.configSvc.netcoreConfig.netcoreWebConfig.isActive) {
      this.netCoreService.netCoreUserLoginSetup(userInfoPayload)
    }

    if (this.configSvc.netcoreConfig && this.configSvc.netcoreConfig.netcoreWebConfig
      && this.configSvc.netcoreConfig.netcoreWebConfig.isActive
      && this.configSvc.netcoreConfig.netcoreWebConfig.events
      && this.configSvc.netcoreConfig.netcoreWebConfig.events.user_signin
      && this.configSvc.netcoreConfig.netcoreWebConfig.events.user_signin.isActive
    ) {
      this.netCoreService.trackEvent('user_signin', this.configSvc.unMappedUser.identifier.trim().toLowerCase())
    }
  }

  toTitleCase(str: string): string {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

}
