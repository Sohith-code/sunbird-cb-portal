//#region (imports)
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core'
import { UserStats, achievement, educationalQualifications, profileRoutes } from '../../models/profile-revamp.model'
import { MatDialog } from '@angular/material/dialog'
import { CoverPhotoEditPopupComponent } from '../../components/profile-revamp/cover-photo-edit-popup/cover-photo-edit-popup.component'
import { PrfileEditV2Component } from '../../revamp-dialogs/prfile-edit-v2/prfile-edit-v2.component'
import { ProfileEntryEditComponent } from '../../revamp-dialogs/profile-entry-edit/profile-entry-edit.component'
import { DynamicEntryEditComponent } from '../../revamp-dialogs/dynamic-entry-edit/dynamic-entry-edit.component'
import { ActivatedRoute, Router } from '@angular/router'
import * as _ from 'lodash'
import { ProfileV2RevampService } from '../../services/profile-v2-revamp.service'
import { HttpErrorResponse } from '@angular/common/http'
import { MatSnackBar } from '@angular/material/snack-bar'
import { ServiceHistoryComponent } from '../../components/profile-revamp/service-history/service-history.component'
import { EducationalQualificationsComponent } from '../../components/profile-revamp/educational-qualifications/educational-qualifications.component'
import { AchievementsComponent } from '../../components/profile-revamp/achievements/achievements.component'
import { forkJoin, of, Subject } from 'rxjs'
import { catchError, map, mergeMap, takeUntil } from 'rxjs/operators'
import { environment } from 'src/environments/environment'
import { ConfigurationsService, EventService, MultilingualTranslationsService, PipeCertificateImageURL, WsEvents } from '@sunbird-cb/utils-v2'
import { TransferRequestComponent } from '../../components/transfer-request/transfer-request.component'
import { WithdrawRequestComponent } from '../../components/withdraw-request/withdraw-request.component'
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout'
import { TranslateService } from '@ngx-translate/core'
import { DatePipe } from '@angular/common'
import { buildWeeklyClapsData, ConfigDetails, ConfirmationDialogComponent, NlwCertificateDialogComponent, NlwCertificateDialogData } from '@sunbird-cb/consumption'
import { CommonDataService } from '../../../../routes/services/common-data.service'
import { NetCoreService } from '../../../../routes/services/netcore.service'
// Same instance the embedded karma leaderboard uses, so the two share one cached leaderboard call
import { HomePageService } from 'src/app/services/home-page.service'
//#endregion

@Component({
  selector: 'ws-app-profile-view-v2',
  templateUrl: './profile-view-v2.component.html',
  styleUrls: ['./profile-view-v2.component.scss'],
  providers: [PipeCertificateImageURL],
  standalone: false
})
export class ProfileViewV2Component implements OnInit, AfterViewInit, OnDestroy {

  //#region (global variables)
  destroySubject$ = new Subject()
  @ViewChild('aboutMeElement') aboutMeElement !: ElementRef
  isCurrentUser = false
  userId: string = ''
  profesionalDetails: any
  profileData: any
  profileImageUrl = ''
  profileBannerUrl = ''
  profileCompletionPercentage: number = 0
  nameInitials: string = ''
  isIgotOrg = false
  isNotMyUser = false
  isNotMyUserAndIgotOrg = false
  myBadgesCount: any = 0
  userStats: UserStats[] = [
    {
      state: 'NetworkV2Profile.myKarmaPoints',
      totalPoints: '0',
      iconUrl: './assets/icons/karma-point-logo.jpg',
      vewAllUrl: 'app/person-profile/karma-points',
      stateInfo: 'My Karma Points',
      identifier: 'karmaPoints',
    },
    {
      state: 'NetworkV2Profile.myCertificates',
      totalPoints: '0',
      iconUrl: './assets/icons/certificate.svg',
      vewAllUrl: 'app/seeAll/new?key=continueLearning',
      identifier: 'certificateCount',
    },
    {
      state: 'My Badges',
      totalPoints: '0',
      iconUrl: './assets/icons/badges/Medal.svg',
      vewAllUrl: '/badges',
      identifier: 'myBadges',
    },
    {
      state: 'NetworkV2Profile.myPosts',
      totalPoints: '0',
      iconUrl: './assets/icons/edit.svg',
      vewAllUrl: '/app/discussion-forum-v2',
      identifier: 'postCount',
    },

  ]
  profileRoutes: profileRoutes[] = [
    {
      name: 'NetworkV2Profile.aboutMe',
      url: '',
      icon: 'person',
      id: 'about-me',
      key: 'aboutMe',
    }, {
      name: 'NetworkV2Profile.basicDetails',
      url: './assets/icons/checklist.svg',
      icon: '',
      id: 'basic-details',
      key: 'basicDetails'
    }, {
      name: 'NetworkV2Profile.serviceHistory',
      url: '',
      icon: 'history',
      id: 'service-history',
      key: 'serviceHistory'
    }, {
      //   name: 'Competencies',
      //   url: '',
      //   icon: 'extension',
      //   isActive: false,
      //   id: ''
      // }, {
      name: 'NetworkV2Profile.educational',
      url: '',
      icon: 'school',
      id: 'educational-qualifications',
      key: 'educationalQualifications'
    }, {
      name: 'NetworkV2Profile.achievements',
      url: './assets/icons/trophy.svg',
      icon: '',
      id: 'achievements',
      key: 'achievements'
    },
  ]
  activeRoutId: string = 'about-me'
  locationDetails: any = {}
  serviceHistoryDetails: {
    count: number,
    serviceHistoryList: any[]
  } = {
      count: 0,
      serviceHistoryList: [],
    }

  educationalQualificationDetails: {
    count: number,
    educationalQualifications: educationalQualifications[]
  } = {
      count: 0,
      educationalQualifications: [],
    }
  // competencies: Competency[] = [
  //   {
  //     name: 'Behavioural',
  //     active: false,
  //     themes: [
  //       { name: 'Food Waste Management', id: 1 },
  //       { name: 'Commitment to the Organisation', id: 2 },
  //       { name: 'Sustainability Management', id: 3 },
  //       { name: 'Climate Finance', id: 4 },
  //       { name: 'Data Management', id: 5 },
  //       { name: 'General Management', id: 6 },
  //       { name: 'Monitoring and Evaluation', id: 7 }
  //     ]
  //   },
  //   {
  //     name: 'Functional',
  //     themes: [
  //       { name: 'Data Management', id: 5 },
  //       { name: 'General Management', id: 6 },
  //       { name: 'Monitoring and Evaluation', id: 7 }
  //     ]
  //   },
  //   {
  //     name: 'Domain',
  //     themes: [
  //       { name: 'Climate Finance', id: 8 },
  //       { name: 'Finance', id: 9 }
  //     ]
  //   }
  // ];
  achievementsDetails: {
    count: number,
    achievementsList: achievement[]
  } = {
      count: 0,
      achievementsList: [],
    }

  peopleSuggestionsList: any[] = []
  suggestionsLoading = false
  communitySuggestionsList: any[] = []
  communitySuggestionsLoading = true
  aboutme = ''
  showMoreAbout = false
  showViewMoreBtn = false
  primaryDetails: any

  groupsList: any[] = []
  isMentor = false
  enableWTR = false // to enable withdraw transfer request
  enableWR = false // to enable withdraw request
  unVerifiedObj = {
    designation: '',
    group: '',
    organization: '',
    groupRequestTime: 0,
    designationRequestTime: 0,
  }
  rejectedFields = {
    name: '',
    group: '',
    designation: '',
    groupRejectionComments: '',
    designationRejectionComments: '',
    groupRejectionTime: 0,
    designationRejectionTime: 0,
  }
  approvalPendingFields: any = []

  //#region (m web and activites varailbles)
  selectedTabIndex: any = 0
  // Achievement section view switch: 'stats' shows the stats card, 'leaderboard' the karma leaderboard
  achievementView: 'stats' | 'leaderboard' = 'stats'
  // My Statistics cards. Same four metrics the My Achievements sidebar section shows, so the two
  // never disagree; values are filled in by setAchievementStats().
  achievementStats: { key: string, label: string, value: string, icon: string }[] = [
    { key: 'karmaPoints', label: 'profileInfo.youEarned', value: '0 KP', icon: '/assets/icons/hubs-v2/karmapoints.svg' },
    { key: 'rank', label: 'profileInfo.youreRank', value: '--', icon: '/assets/icons/hubs-v2/trophi.svg' },
    { key: 'badges', label: 'leftNavBar.yourEarned', value: '0 Badges', icon: '/assets/icons/hubs-v2/badges.svg' },
    { key: 'learningHours', label: 'leftNavBar.learningHours', value: '0h 0m', icon: '/assets/icons/hubs-v2/badge.svg' },
  ]
  insightsDataLoading = false
  insightsData: any
  // weekList for the weekly claps card, derived from the insights payload (see buildWeeklyClapsData)
  weeklyClapsData: any = null
  orgId: any
  pageData: any
  assessmentsData: any
  isNlw2026Certified = false
  nlwExperience: any = null
  profileConfig: any = null
  profileEditConfigs: any = null
  apiConfig: any = null
  //#endregion

  connectionStatus = 'Connect'
  isMobile = false
  showProfileSection = true
  blockedMessage = ''
  private initCallCount = 0
  private readonly INIT_CALL_TOTAL = 4
  defaultCoverPhotoUrl = './assets/icons/profile_cover_pic.svg'

  @ViewChild('progressCanvas') progressCanvas!: ElementRef<HTMLCanvasElement>
  designationApprovedTime: number = 0
  //#endregion

  constructor(
    private dialog: MatDialog,
    private activatedRoute: ActivatedRoute,
    private profileV2RevampSvc: ProfileV2RevampService,
    private snackBar: MatSnackBar,
    private pipeImgUrl: PipeCertificateImageURL,
    private configSvc: ConfigurationsService,
    private breakpointObserver: BreakpointObserver,
    private translateService: TranslateService,
    private datePipe: DatePipe,
    private events: EventService,
    private langtranslations: MultilingualTranslationsService,
    private commonSvc: CommonDataService,
    private router: Router,
    private netCoreService: NetCoreService,
    private homePageSvc: HomePageService,
  ) {
    this.langtranslations.languageSelectedObservable.subscribe(() => {
      this.translateService.setDefaultLang('hi')
      if (localStorage.getItem('websiteLanguage')) {
        this.translateService.setDefaultLang('en')
        const lang = localStorage.getItem('websiteLanguage')!
        this.translateService.use(lang)
      }
    })

    this.breakpointObserver.observe([Breakpoints.Handset])
      .subscribe(result => {
        this.isMobile = result.matches
        this.setAboutMeButton()
      })
  }

  ngAfterViewInit(): void {
    // ?tab=activities lands straight on the "My activities" tab (used by the Achievements item in
    // the mobile bottom nav). The tab only exists for one's own profile, so anything else falls
    // back to Profile.
    //
    // Subscribed rather than read from the snapshot: tapping Achievements while already on the
    // profile is a query-param-only navigation, which updates the URL without re-running this
    // hook - the snapshot read left the Profile tab selected. Only 'activities' switches tabs, so
    // an unrelated query param change never yanks the user off a tab they picked by hand.
    let isFirstEmission = true
    this.activatedRoute.queryParamMap
      .pipe(takeUntil(this.destroySubject$))
      .subscribe(params => {
        const wantsActivities = params.get('tab') === 'activities'
        if (wantsActivities && this.isCurrentUser && !this.isNotMyUserAndIgotOrg) {
          // Deferred by a tick because the tab group has already been checked by the time this
          // runs, and assigning directly would trip ExpressionChangedAfterItHasBeenCheckedError.
          setTimeout(() => {
            this.selectedTabIndex = 1
          })
        } else if (isFirstEmission) {
          this.selectedTabIndex = 0
        }
        isFirstEmission = false
      })
  }

  onTabChange(index: number): void {
    this.selectedTabIndex = index
    const next = index === 1 ? 'activities' : 'profile'
    const current = this.activatedRoute.snapshot.queryParamMap.get('tab')
    // Leave clean URLs alone: the default tab does not need to announce itself
    if (current === next || (!current && index === 0)) {
      return
    }
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { tab: next },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    })
  }

  ngOnInit() {
    this.getProfileDetailsFromRoutes()
    this.getAchievements()
    this.setAchievementStats()
    if (localStorage.getItem('websiteLanguage')) {
      this.translateService.setDefaultLang('en')
      const lang = localStorage.getItem('websiteLanguage')!
      this.translateService.use(lang)
    }
    // this.profileV2RevampSvc.getWebSiteLanguage()
    const lastSectionId = sessionStorage.getItem('lastProfileSection')
    if (lastSectionId) {
      setTimeout(() => {
        this.selectRoute(lastSectionId)
      }, 100)
    }
    this.getSendApprovalStatus()
    this.getRejectedStatus()
    this.getGroupData()
    this.getInsightsData()

  }

  //#region (initialization)

  getRecommendedUsers() {
    const countOfRecommendations = 3
    const formBody = {
      size: countOfRecommendations + 1,
      offset: 0,
    }

    this.suggestionsLoading = true
    this.profileV2RevampSvc.getRecommendedUsers(formBody).subscribe({
      next: (response: any) => {
        this.suggestionsLoading = false
        const suggestedUser = _.get(response, 'result.response', []).filter((suggestedUser: any) => suggestedUser.id !== this.userId)
        this.peopleSuggestionsList = suggestedUser.slice(0, countOfRecommendations)
      },
      error: () => {
        this.suggestionsLoading = false
        this.openSnackbar('Error while fetching communities')
      },
    })
  }

  getRecommendedCommunitesList() {
    const formBody = {
      field: 'countOfPeopleJoined',
      limit: 3,

      filterCriteriaMap: {
        communityAccessLevel: "public"
      }
    }
    this.communitySuggestionsLoading = true
    const configDetails: ConfigDetails = this.getConfigDetails('communityV1Popular')
    this.profileV2RevampSvc.getCommunities(configDetails, formBody).subscribe({
      next: (response: any) => {
        this.communitySuggestionsLoading = false
        this.communitySuggestionsList = _.get(response, 'result.data', [])
      },
      error: () => {
        this.communitySuggestionsLoading = false
        this.openSnackbar('Error while fetching communities')
      },
    })
  }

  getGroupData(): void {
    const configDetails: ConfigDetails = this.getConfigDetails('userV1Groups')
    this.profileV2RevampSvc.getGroups(configDetails)
      .pipe(takeUntil(this.destroySubject$))
      .subscribe((res: any) => {
        this.groupsList = res.result && res.result.response.filter((ele: any) => ele !== 'Others')
        this.checkMandatory()
      }, (error: HttpErrorResponse) => {
        if (!error.ok) {
          this.openSnackbar(this.handleTranslateTo('groupDataFaile'))
        }
      })
  }
  checkMandatory() {
    this.activatedRoute.fragment.subscribe(fragment => {
      if (fragment === 'mandatorySection') {

        setTimeout(() => {
          this.handleEditMandatoryDetails()

        }, 500)
      } else {
        this.commonSvc.mandatoryDetails(false)
      }
    })
  }

  getAchievements() {
    const configDetails: ConfigDetails = this.getConfigDetails('achievementList')
    this.profileV2RevampSvc.listAchievements(configDetails, this.userId).subscribe((response: any) => {
      if (response) {
        const allAchievements = _.get(response, 'result.search_results.data', [])
        this.achievementsDetails.achievementsList = allAchievements.slice(0, 2)
        this.achievementsDetails.count = _.get(response, 'result.search_results.totalCount', 0)
      }
    }, error => {
      this.openSnackbar('Error while fetching achievements')
      console.error('Error while fetching achievements', error)
    })
  }

  // Karma points, badges and learning hours all come off the cached enrolment payload the rest of
  // the app reads (see the My Achievements sidebar section); only the rank needs the leaderboard.
  setAchievementStats() {
    try {
      const raw = localStorage.getItem('userEnrollmentCount')
      const info = raw ? _.get(JSON.parse(raw), 'userCourseEnrolmentInfo', {}) : {}
      this.setStatValue('karmaPoints', `${_.get(info, 'karmaPoints', 0)} KP`)
      this.setStatValue('badges', `${_.get(info, 'badgeCount', 0)} Badges`)
      this.setStatValue('learningHours', this.toHoursAndMinutes(_.get(info, 'timeSpentOnCompletedCourses', 0)))
    } catch (_e) { /* keep the placeholder values */ }

    this.homePageSvc.getLearnerLeaderboardCached()
      .pipe(takeUntil(this.destroySubject$))
      .subscribe((res: any) => {
        const currentUserId = _.get(this.configSvc, 'unMappedUser.id', '')
        const entry = _.find(_.get(res, 'result.result', []), (row: any) => row.userId === currentUserId)
        const rank = _.get(entry, 'rank')
        if (rank) {
          this.setStatValue('rank', `${this.toOrdinal(rank)} Rank`)
        }
      }, () => { /* leave the placeholder when the leaderboard is unavailable */ })
  }

  private setStatValue(key: string, value: string) {
    const stat = this.achievementStats.find((item: any) => item.key === key)
    if (stat) {
      stat.value = value
    }
  }

  private toHoursAndMinutes(seconds: any): string {
    const total = Number(seconds) || 0
    return `${Math.floor(total / 3600)}h ${Math.floor((total % 3600) / 60)}m`
  }

  private toOrdinal(rank: number): string {
    const suffixes = ['th', 'st', 'nd', 'rd']
    const v = rank % 100
    return `${rank}${suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]}`
  }

  getProfileDetailsFromRoutes() {
    this.pageData = this.activatedRoute.parent && this.activatedRoute.parent.snapshot.data.pageData.data
    this.nlwExperience = this.pageData?.nlwExperience
    this.profileConfig = this.pageData?.profileConfig
    this.profileEditConfigs = this.pageData?.profileEditConfigs
    this.apiConfig = this.pageData?.apiConfig
    if (_.get(this.profileConfig, 'banner.defaultBannerUrl')) {
      this.defaultCoverPhotoUrl = this.profileConfig.banner.defaultBannerUrl
    }
    this.profileRoutes = this.profileRoutes.filter((route: profileRoutes) => _.get(this.profileConfig, `${route.key}.enabled`, false))
    this.activatedRoute.data.subscribe(data => {
      this.userId = _.get(data, 'profile.userId', '')
      this.isIgotOrg = _.get(this.configSvc, 'unMappedUser.profileDetails.employmentDetails.departmentName', '').toLowerCase() === 'igot' ? true : false
      this.isNotMyUser = _.get(this.configSvc, 'unMappedUser.profileDetails.profileStatus', '').toLowerCase() === 'not-my-user' ? true : false
      this.isNotMyUserAndIgotOrg = (this.isNotMyUser && this.isIgotOrg)
      if (!this.isNotMyUserAndIgotOrg && _.get(this.profileConfig, 'rightSection.enabled') && _.get(this.profileConfig, 'rightSection.recommendedCommunities.enabled', false)) {
        // this.getRecommendedUsers()
        this.getRecommendedCommunitesList()
      }
      if (this.configSvc.userProfile && this.configSvc.userProfile.userId) {
        this.isCurrentUser = this.configSvc.userProfile.userId === this.userId
        if (!this.isCurrentUser) {
          this.getConnectionStatus()
        }
      }
      this.profesionalDetails = _.merge(_.get(data, 'profile.data.profiledetails', _.get(data, 'profile.data.profileDetails', _.get(data, 'profile.data', {}))), {
        professionalDetails: _.get(data, 'profile.data.professionalDetails', {}),
      })
      this.profileData = _.get(data, 'profile.data', {})
      this.profesionalDetails['userId'] = _.get(data, 'profile.userId', '')
      this.orgId = _.get(data, 'profile.data.rootOrgId', _.get(data, 'profile.data.profileDetails.rootOrgId', ''))
      this.profileCompletionPercentage = _.get(data, 'profile.data.profileCompletionPercentage', 0)
      this.patchProfileDetails()
      this.setUserStats()
      this.patchEntries(_.get(data, 'entries.data', {}))
      this.checkIsMentor()
    })
    if (_.get(this.profileConfig, 'userStats.enabled', false)) {
      const userStatsConfig: any = this.profileConfig.userStats
      this.userStats = this.userStats.filter((userStat: UserStats) => {
        if (userStat.identifier && userStatsConfig[userStat.identifier].enabled) {
          userStat['viewAllEnabled'] = userStatsConfig[userStat.identifier].viewAllEnabled
          return true
        }
        return false
      })
    }
    this.commonSvc.getNlw2026CertifiedStatus()
      .pipe(takeUntil(this.destroySubject$))
      .subscribe((status: boolean) => {
        this.isNlw2026Certified = status
      })
  }

  getConnectionStatus() {
    const configDetails: ConfigDetails = this.getConfigDetails('connectionsV1ProfileRelationship')
    this.profileV2RevampSvc.getConnectionStatus(this.userId, configDetails).subscribe((data: any) => {
      this.connectionStatus = _.get(data, 'result.response.status', 'Connect')
      this.setProfileVisibilityStatus()
    })
  }

  setProfileVisibilityStatus() {
    const privacyStatus = _.get(this.profesionalDetails, 'profilePreference', 0)
    let blockedMessage = ''
    if (this.connectionStatus === 'Blocked Incoming' || this.connectionStatus === 'Blocked Outgoing') {
      this.showProfileSection = false
      blockedMessage = this.connectionStatus === 'Blocked Outgoing' ? 'youBlockedThisProfile' : 'youAreNotAuthorisedToSeeThisProfile'
    } else {
      if (privacyStatus === 1) {
        this.showProfileSection = false
        blockedMessage = 'thisProfileIsLocked'
      } else if (privacyStatus === 10 && this.connectionStatus !== 'Approved') {
        this.showProfileSection = false
        blockedMessage = 'thisProfileIsLocked'
      } else {
        this.showProfileSection = true
      }
    }

    if (blockedMessage) {
      this.blockedMessage = this.handleTranslateTo(blockedMessage)
    }
  }

  patchProfileDetails() {
    this.profileImageUrl = _.get(this.profesionalDetails, 'profileImageUrl', '')
    this.profileBannerUrl = _.get(this.profesionalDetails, 'profileBannerUrl', '')
    this.setProfileCompletionGraph()
    const isCadre = _.get(this.profesionalDetails, 'personalDetails.isCadre', false)
    const profileOrgName = _.get(this.profileData, 'rootOrgName', '') ||
      _.get(this.profesionalDetails, 'employmentDetails.departmentName', '') ||
      _.get(this.profesionalDetails, 'refRootOrg.orgName', '')
    const currentOrgName = this.isCurrentUser ?
      (_.get(this.configSvc, 'userProfile.rootOrgName', '') || profileOrgName) : profileOrgName
    this.primaryDetails = {
      firstname: _.get(this.profesionalDetails, 'personalDetails.firstname', _.get(this.profileData, 'firstname', _.get(this.profileData, 'firstName', ''))),
      username: _.get(this.profesionalDetails, 'username', _.get(this.profileData, 'username', '')),
      group: _.get(this.profesionalDetails, 'professionalDetails[0].group', ''),
      designation: _.get(this.profesionalDetails, 'professionalDetails[0].designation', ''),
      profileGroupStatus: _.get(this.profesionalDetails, 'profileGroupStatus', ''),
      profileDesignationStatus: _.get(this.profesionalDetails, 'profileDesignationStatus', ''),
      osid: _.get(this.profesionalDetails, 'professionalDetails[0].osid', ''),
      employeeCode: _.get(this.profesionalDetails, 'employmentDetails.employeeCode', ''),
      primaryEmail: _.get(this.profesionalDetails, 'personalDetails.primaryEmail', ''),
      mobile: _.get(this.profesionalDetails, 'personalDetails.mobile', ''),
      gender: _.get(this.profesionalDetails, 'personalDetails.gender', ''),
      dob: this.getDateFromText(_.get(this.profesionalDetails, 'personalDetails.dob', '')),
      domicileMedium: _.get(this.profesionalDetails, 'personalDetails.domicileMedium', ''),
      category: _.get(this.profesionalDetails, 'personalDetails.category', ''),
      pinCode: _.get(this.profesionalDetails, 'employmentDetails.pinCode', ''),
      departmentName: _.get(this.profesionalDetails, 'employmentDetails.departmentName', ''),
      externalSystemId: _.get(this.profesionalDetails, 'additionalProperties.externalSystemId', ''),
      externalSystemDor: _.get(this.profesionalDetails, 'additionalProperties.externalSystemDor', ''),
      isCadre,

      aboutme: _.get(this.profesionalDetails, 'employmentDetails.aboutme', ''),

      currentOrgName,
      profileStatus: _.get(this.profesionalDetails, 'profileStatus', ''),
    }
    if (isCadre) {
      this.primaryDetails['civilServiceTypeId'] = _.get(this.profesionalDetails, 'cadreDetails.civilServiceTypeId', '')
      this.primaryDetails['civilServiceType'] = _.get(this.profesionalDetails, 'cadreDetails.civilServiceType', 'NA')
      this.primaryDetails['civilServiceId'] = _.get(this.profesionalDetails, 'cadreDetails.civilServiceId', '')
      this.primaryDetails['civilServiceName'] = _.get(this.profesionalDetails, 'cadreDetails.civilServiceName', '')
      this.primaryDetails['cadreId'] = _.get(this.profesionalDetails, 'cadreDetails.cadreId', '')
      this.primaryDetails['cadreName'] = _.get(this.profesionalDetails, 'cadreDetails.cadreName', '')
      this.primaryDetails['cadreBatch'] = _.get(this.profesionalDetails, 'cadreDetails.cadreBatch', '')
      this.primaryDetails['cadreControllingAuthorityName'] = _.get(this.profesionalDetails, 'cadreDetails.cadreControllingAuthorityName', '')
      this.primaryDetails['isOnCentralDeputation'] = _.get(this.profesionalDetails, 'cadreDetails.isOnCentralDeputation', false)
    }
    this.onInitCallComplete()
    this.aboutme = _.get(this.profesionalDetails, 'employmentDetails.aboutme', '')
    this.setAboutMeButton()
    if (!this.isCurrentUser && this.aboutme === '') {
      this.filterProfileRoutes('about-me')
    }
    this.getInitials()
  }

  designationApprovedTimeChange(designationApprovedTime: number) {
    this.designationApprovedTime = designationApprovedTime
    this.onInitCallComplete()
  }

  private onInitCallComplete() {
    this.initCallCount++
    if (this.initCallCount === this.INIT_CALL_TOTAL) {
      if (!this.showWithdrawRequestBtn && !this.showApprovalStatus &&
        this.primaryDetails?.profileDesignationStatus === 'VERIFIED'
      ) {
        const obj = {
          organisationName: _.get(this.profesionalDetails, 'refRootOrg.orgName', ''),
          departmentName: _.get(this.profesionalDetails, 'employmentDetails.departmentName', ''),
        }
        this.netCoreUserProfileUpdateEvent(obj)
      }
    }
  }

  get showWithdrawRequestBtn(): boolean {
    if (this.enableWR && this.isCurrentUser && !(this.isNotMyUser && this.isIgotOrg)) {
      return true
    }
    return false
  }

  get showApprovalStatus(): boolean {
    if (
      (this.designationApprovedTime < this.rejectedFields.designationRejectionTime ||
        this.designationApprovedTime < this.unVerifiedObj.designationRequestTime) &&
      this.isCurrentUser
    ) {
      return true
    }
    return false
  }

  get shouldShowBlockProfileButton(): boolean {
    return this.connectionStatus !== 'Blocked Incoming' &&
      this.connectionStatus !== 'Blocked Outgoing' &&
      this.connectionStatus !== 'Pending'
  }

  get shouldShowUserStatsDesktop(): boolean {
    return this.isCurrentUser && !this.isMobile && _.get(this.profileConfig, 'userStats.enabled', false)
  }

  get shouldShowUserStatsMobile(): boolean {
    return this.isCurrentUser && this.isMobile && _.get(this.profileConfig, 'userStats.enabled', false)
  }

  get shouldShowAboutMeSection(): boolean {
    return (this.isCurrentUser || (_.get(this.aboutme, 'length', 0) > 0)) &&
      _.get(this.profileConfig, 'aboutMe.enabled', false)
  }

  get shouldShowServiceHistorySection(): boolean {
    return (this.isCurrentUser ||
      (_.get(this.serviceHistoryDetails, 'serviceHistoryList.length', 0) > 0) ||
      this.hasCurrentEmploymentDetails) &&
      _.get(this.profileConfig, 'serviceHistory.enabled', false)
  }

  get hasCurrentEmploymentDetails(): boolean {
    return !!(_.get(this.primaryDetails, 'currentOrgName') && _.get(this.primaryDetails, 'designation'))
  }

  get shouldShowEducationalQualificationsSection(): boolean {
    return (this.isCurrentUser ||
      (_.get(this.educationalQualificationDetails, 'educationalQualifications.length', 0) > 0)) &&
      _.get(this.profileConfig, 'educationalQualifications.enabled', false)
  }

  get shouldShowAchievementsSection(): boolean {
    return (this.isCurrentUser ||
      (_.get(this.achievementsDetails, 'achievementsList.length', 0) > 0)) &&
      _.get(this.profileConfig, 'achievements.enabled', false)
  }

  getDateFromText(dateString: string): any {
    if (dateString) {
      const sv: string[] = dateString.split('T')
      if (sv && sv.length > 1) {
        return sv[0]
      }
      const splitValues: string[] = dateString.split('-')
      const [dd, mm, yyyy] = splitValues
      const dateToBeConverted = dd.length !== 4 ? `${yyyy}-${mm}-${dd}` : `${dd}-${mm}-${yyyy}`
      return this.datePipe.transform(new Date(dateToBeConverted), 'dd MMMM yyyy')
    }
    return ''
  }

  getInitials(): void {
    const userName = _.get(this.primaryDetails, 'firstname', '')
    if (userName) {
      if (userName.split(' ').length > 1) {
        const nameArr = userName.split(' ')
        this.nameInitials = nameArr[0].charAt(0) + nameArr[1].charAt(0)
      } else {
        this.nameInitials = userName.charAt(0)
      }
    }
  }

  setProfileCompletionGraph() {
    const progress = (247 - ((247 * this.profileCompletionPercentage) / 100))
    document.documentElement.style.setProperty('--i', String(progress))
  }

  setUserStats() {
    if (this.userStats && this.userStats.length > 0 && this.profileData) {
      this.userStats.forEach((userStat: UserStats) => {
        this.myBadgesCount = _.get(this.profileData, 'badgeCount', 0)
        switch (userStat.identifier) {
          case 'karmaPoints':
            userStat.totalPoints = _.get(this.profileData, 'karmaPoints', 0)
            break
          case 'certificateCount':
            userStat.totalPoints = _.get(this.profileData, 'certificateCount', 0)
            break
          case 'postCount':
            userStat.totalPoints = _.get(this.profileData, 'postCount', 0)
            break
          case 'myBadges':
            userStat.totalPoints = this.myBadgesCount
            break
        }
      })
    }
  }

  patchEntries(entries: any) {
    this.serviceHistoryDetails = {
      serviceHistoryList: [],
      count: 0,
    }
    this.educationalQualificationDetails = {
      educationalQualifications: [],
      count: 0,
    }
    this.achievementsDetails = {
      achievementsList: [],
      count: 0,
    }
    this.serviceHistoryDetails.serviceHistoryList = _.get(entries, 'serviceHistory.data', [])
    this.serviceHistoryDetails.count = _.get(entries, 'serviceHistory.count', 0)
    this.educationalQualificationDetails.educationalQualifications = _.get(entries, 'educationalQualifications.data', [])
    this.educationalQualificationDetails.count = _.get(entries, 'educationalQualifications.count', 0)
    this.achievementsDetails.achievementsList = _.get(entries, 'achievements.data', [])
    this.achievementsDetails.count = _.get(entries, 'achievements.count', 0)
    this.locationDetails = _.get(entries, 'locationDetails.data[0]', {})

    if (!this.isCurrentUser) {
      if (_.get(this.serviceHistoryDetails, 'serviceHistoryList', []).length === 0 &&
        !this.hasCurrentEmploymentDetails) {
        this.filterProfileRoutes('service-history')
      }
      if (_.get(this.educationalQualificationDetails, 'educationalQualifications', []).length === 0) {
        this.filterProfileRoutes('educational-qualifications')
      }
      if (_.get(this.achievementsDetails, 'achievementsList', []).length === 0) {
        this.filterProfileRoutes('achievements')
      }
    }
  }

  filterProfileRoutes(routesId: string) {
    this.profileRoutes = this.profileRoutes.filter((route: profileRoutes) => route.id !== routesId)
  }

  setAboutMeButton() {
    if (this.aboutme !== '') {
      setTimeout(() => {
        if (this.aboutMeElement && this.aboutMeElement.nativeElement && this.aboutMeElement.nativeElement.offsetHeight) {
          this.showViewMoreBtn = this.aboutMeElement.nativeElement.offsetHeight > 56
        }
      }, 10)
    }
  }

  checkIsMentor() {
    const userRoles: any = _.get(this.profileData, 'roles')
    if (userRoles) {
      this.isMentor = userRoles.some((role: string) => role.toLowerCase() === 'mentor')
    }
  }
  //#endregion (initialization)

  selectRoute(sectionId: string) {
    const element = document.getElementById(sectionId)
    if (element) {
      // Save the selected section to session storage
      sessionStorage.setItem('lastProfileSection', sectionId)

      // Smooth scroll to element
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
    this.activeRoutId = sectionId
  }

  openCoverPhotoDialog() {
    const dialogRef = this.dialog.open(CoverPhotoEditPopupComponent, {
      width: this.isMobile ? '100vw' : '500px',
      maxWidth: this.isMobile ? '100vw' : '500px',
      height: this.isMobile ? '100vh' : 'auto',
      panelClass: 'cover-photo-edit-popup',
      data: {
        coverPhotoUrl: this.profileBannerUrl,
      },
      disableClose: true,
      autoFocus: false,
    })
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result && result.isUpdated) {
        this.saveBannerImage(result.file)
      }
    })
  }

  saveBannerImage(file: File) {
    if (file) {
      const fileName = file.name.replace(/[^A-Za-z0-9.]/g, '')
      const formdata = new FormData()
      formdata.append('data', file, fileName)
      const configDetails: ConfigDetails = this.getConfigDetails('profilePhotoUploadProfileBanner')
      this.profileV2RevampSvc.updateBannerPic(configDetails, formdata).pipe(
        mergeMap((res: any) => {
          if (!res || !_.get(res, 'result.url')) {
            return of({})
          }
          const createdUrl = _.get(res, 'result.url', '')
          const folderNameToSplit = '/profileBanner/'
          const urlSplice = createdUrl.split(folderNameToSplit)[1]
          const uploadedFile = this.pipeImgUrl.transform(`${folderNameToSplit}${urlSplice}`)
          const formBody = {
            request: {
              userId: this.userId,
              profileDetails: {
                profileBannerUrl: uploadedFile,
              },
            },
          }
          const configDetails: ConfigDetails = this.getConfigDetails('userV1ExtPatch')
          return this.profileV2RevampSvc.updateProfileDetails(configDetails, formBody)

        })
      ).subscribe({
        next: (res: any) => {
          if (res) {
            this.fetchProfileDetails()
          }
        }, error: (error: HttpErrorResponse) => {
          if (error) {
            const errorMessage = _.get(error, 'error.message', 'Something went wrong please try again')
            this.openSnackbar(errorMessage)
          }
        },
      })
    } else if (this.profileBannerUrl) {
      const formBody = {
        request: {
          userId: this.userId,
          profileDetails: {
            profileBannerUrl: '',
          },
        },
      }
      this.updateProfileDetails(formBody)
    }
  }

  updateProfileDetails(formBody: any) {
    const configDetails: ConfigDetails = this.getConfigDetails('userV3ExtPatch')
    this.profileV2RevampSvc.updateProfileDetailsV3(configDetails, formBody).subscribe({
      next: (response: any) => {
        if (response) {
          this.fetchProfileDetails()
          if (_.get(formBody, 'request.profileDetails.professionalDetails')) {
            this.openSnackbar('Sent for Approval')
            this.enableWR = true
            this.getSendApprovalStatus()
          } else {
            this.openSnackbar('Updated Successfully')
          }

          // if (_.get(formBody, 'request.profileDetails.profileImageUrl')) {
          //   this.netCoreUserProfilePhotoUpdateEvent(_.get(formBody, 'request.profileDetails.profileImageUrl'))
          // }
          if (_.get(formBody, 'request.profileDetails.personalDetails.firstname')) {
            this.netCoreUserProfileNameUpdateEvent(_.get(formBody, 'request.profileDetails.personalDetails.firstname'))
          } else {
            this.netCoreUserProfileUpdateEvent(formBody)
          }
        }
      },
      error: (error: HttpErrorResponse) => {
        if (error) {
          const errorMessage = this.getErrorMessage(error, formBody)
          this.openSnackbar(errorMessage)
        }
      },
    })
  }

  netCoreUserProfilePhotoUpdateEvent(profileImageUrl?: string) {
    /* tslint:disable */
    // console.log('this.content', this.portalProfile)
    /* tslint:enable */
    // smartech('contact', '2', {
    //   'pk^userid': this.configSvc.unMappedUser.identifier.trim().toLowerCase(),
    //   'FULL_NAME' : this.profileName.trim().toLowerCase(),
    // })

    if (this.configSvc.netcoreConfig && this.configSvc.netcoreConfig.netcoreWebConfig
      && this.configSvc.netcoreConfig.netcoreWebConfig.isActive
      && this.configSvc.netcoreConfig.netcoreWebConfig.events
      && this.configSvc.netcoreConfig.netcoreWebConfig.events.profile_update
      && this.configSvc.netcoreConfig.netcoreWebConfig.events.profile_update.isActive
    ) {
      const payload: any = {}
      if (this.configSvc && this.configSvc.unMappedUser && this.configSvc.unMappedUser.identifier) {
        payload['pk^userid'] = this.configSvc.unMappedUser.identifier.trim().toLowerCase()
      }
      if (profileImageUrl) {
        payload['PROFILE_PHOTO'] = profileImageUrl
      }

      this.netCoreService.netCoreUserProfilePhotoUpdate(payload)
      this.netCoreService.trackEvent('profile_update', this.configSvc.unMappedUser.identifier.trim().toLowerCase(), payload)
    }

  }

  netCoreUserProfileNameUpdateEvent(firstname?: string) {
    /* tslint:disable */
    // console.log('this.content', this.portalProfile)
    /* tslint:enable */
    // smartech('contact', '2', {
    //   'pk^userid': this.configSvc.unMappedUser.identifier.trim().toLowerCase(),
    //   'FULL_NAME' : this.profileName.trim().toLowerCase(),
    // })
    if (this.configSvc.netcoreConfig && this.configSvc.netcoreConfig.netcoreWebConfig
      && this.configSvc.netcoreConfig.netcoreWebConfig.isActive
      && this.configSvc.netcoreConfig.netcoreWebConfig.events
      && this.configSvc.netcoreConfig.netcoreWebConfig.events.profile_update
      && this.configSvc.netcoreConfig.netcoreWebConfig.events.profile_update.isActive
    ) {
      const payload: any = {}
      if (this.configSvc && this.configSvc.unMappedUser && this.configSvc.unMappedUser.identifier) {
        payload['pk^userid'] = this.configSvc.unMappedUser.identifier.trim().toLowerCase()
      }
      if (firstname) {
        payload['FULL_NAME'] = this.toTitleCase(firstname.trim().toLowerCase())
      }

      this.netCoreService.netCoreUserNameUpdate(payload)
      this.netCoreService.trackEvent('profile_update', this.configSvc.unMappedUser.identifier.trim().toLowerCase(), payload)
    }
  }

  netCoreUserProfileUpdateEvent(formBody?: any) {
    /* tslint:disable */
    // console.log('this.content', this.portalProfile)
    /* tslint:enable */
    // smartech('contact', '2', {
    //   'pk^userid': this.configSvc.unMappedUser.identifier.trim().toLowerCase(),
    //   'FULL_NAME' : this.profileName.trim().toLowerCase(),
    // })
    // let formValueChanges:any
    if (this.configSvc.netcoreConfig && this.configSvc.netcoreConfig.netcoreWebConfig
      && this.configSvc.netcoreConfig.netcoreWebConfig.isActive
      && this.configSvc.netcoreConfig.netcoreWebConfig.events
      && this.configSvc.netcoreConfig.netcoreWebConfig.events.profile_update
      && this.configSvc.netcoreConfig.netcoreWebConfig.events.profile_update.isActive
    ) {
      const profileUpdateObj: any = {}
      const profileUpdateEventObj: any = []
      if (this.configSvc && this.configSvc.unMappedUser && this.configSvc.unMappedUser.identifier) {
        profileUpdateObj['pk^userid'] = this.configSvc.unMappedUser.identifier.trim().toLowerCase()
        // profileUpdateEventObj['pk^userid'] = this.configSvc.unMappedUser.identifier.trim().toLowerCase()
      }

      // if (this.profileName) {
      //   profileUpdateObj['FULL_NAME'] = this.toTitleCase(this.profileName.trim())
      //  // profileUpdateEventObj['FULL_NAME'] = this.toTitleCase(this.profileName.trim())
      //  profileUpdateEventObj.push('FULL_NAME')
      // }
      // if (this.photoUrl) {
      //   profileUpdateObj['PROFILE_PHOTO'] = this.photoUrl
      //   profileUpdateEventObj['PROFILE_PHOTO'] = this.photoUrl
      // }
      if (formBody) {

        const EMPLOYEE_ID = _.get(formBody, 'request.profileDetails.employmentDetails.employeeCode')
        const EMAIL = _.get(formBody, 'request.profileDetails.personalDetails.primaryEmail')
        const MOBILE = _.get(formBody, 'request.profileDetails.personalDetails.mobile')
        const MOTHER_TONGUE = _.get(formBody, 'request.profileDetails.personalDetails.domicileMedium')
        const IS_CADRE = _.get(formBody, 'request.profileDetails.personalDetails.isCadre')
        const ORGANISATION = _.get(formBody, 'organisationName')
        const PARENT_DEPARTMENT = _.get(formBody, 'departmentName')

        if (EMPLOYEE_ID) {
          profileUpdateEventObj.push('EMPLOYEE_ID')
        }
        if (EMAIL) {
          profileUpdateEventObj.push('EMAIL')
        }
        if (MOBILE) {
          profileUpdateEventObj.push('MOBILE')
        }
        if (MOTHER_TONGUE) {
          profileUpdateEventObj.push('MOTHER_TONGUE')
        }
        if (IS_CADRE) {
          profileUpdateEventObj.push('IS_CADRE')
        }
        if (ORGANISATION) {
          profileUpdateEventObj.push('ORGANISATION')
        }
        if (PARENT_DEPARTMENT) {
          profileUpdateEventObj.push('PARENT_DEPARTMENT')
        }
        // if (this.portalProfile.personalDetails.gender) {
        //   profileUpdateObj['GENDER'] = this.toTitleCase(this.portalProfile.personalDetails.gender.trim())
        //   profileUpdateEventObj['GENDER'] = this.toTitleCase(this.portalProfile.personalDetails.gender.trim())
        // }
        // if (this.portalProfile.personalDetails.primaryEmail) {
        //   profileUpdateObj['EMAIL'] = this.portalProfile.personalDetails.primaryEmail.trim()
        //   // profileUpdateEventObj['EMAIL'] = this.portalProfile.personalDetails.primaryEmail.trim()
        //   profileUpdateEventObj.push('EMAIL')
        // }
        // if (this.portalProfile.personalDetails.mobile) {
        //   profileUpdateObj['MOBILE'] = this.portalProfile.personalDetails.mobile
        //   // profileUpdateEventObj['MOBILE'] = this.portalProfile.personalDetails.mobile
        //   profileUpdateEventObj.push('MOBILE')
        // }
        // if (this.portalProfile.personalDetails.dob) {
        //   profileUpdateEventObj['DOB'] = this.portalProfile.personalDetails.dob.trim()
        // }
        // if (this.portalProfile.personalDetails.domicileMedium) {
        //   profileUpdateObj['MOTHER_TONGUE'] = this.toTitleCase(this.portalProfile.personalDetails.domicileMedium.trim().toLowerCase())
        //   // profileUpdateEventObj['MOTHER_TONGUE'] = this.toTitleCase(this.portalProfile.personalDetails.domicileMedium.trim().toLowerCase())
        //   profileUpdateEventObj.push('MOTHER_TONGUE')
        // }
        // if (this.portalProfile.personalDetails.category) {
        //   profileUpdateEventObj['CATEGORY'] = this.toTitleCase(this.portalProfile.personalDetails.category.trim().toLowerCase())
        // }
        // if (this.portalProfile.personalDetails.pincode) {
        //   profileUpdateEventObj['PIN_CODE'] = this.portalProfile.personalDetails.pincode.trim()
        // }

        // if (this.portalProfile.id) {
        //   // profileUpdateEventObj['EMPLOYEE_ID'] = this.portalProfile.employmentDetails?.employeeCode.trim()

        // }
        // if (this.portalProfile.personalDetails.hasOwnProperty('isCadre')) {
        //   profileUpdateEventObj['IS_CADRE'] = this.portalProfile.personalDetails.hasOwnProperty('isCadre')
        //   profileUpdateEventObj.push('IS_CADRE')
        // }

      }

      const PROFILE_GROUP = _.get(formBody, 'request.profileDetails.professionalDetails[0].group')
      const PROFILE_DESIGNATION = _.get(formBody, 'request.profileDetails.professionalDetails[0].designation')

      if (PROFILE_GROUP) {
        profileUpdateEventObj.push('PROFILE_GROUP')
      }
      if (PROFILE_DESIGNATION) {
        profileUpdateEventObj.push('PROFILE_DESIGNATION')
      }

      if (this.profesionalDetails && this.profesionalDetails.profileDetails) {
        profileUpdateObj['PROFILE_GROUP'] = this.toTitleCase(this.profesionalDetails.profileDetails.professionalDetails.group.trim().toLowerCase())
        // profileUpdateEventObj['PROFILE_GROUP'] = this.toTitleCase(this.portalProfile.profileDetails.professionalDetails.group.trim().toLowerCase())
        // profileUpdateEventObj.push('PROFILE_GROUP')
      }

      if (this.profesionalDetails && this.profesionalDetails.profileDetails) {
        profileUpdateObj['PROFILE_DESIGNATION'] = this.toTitleCase(this.profesionalDetails.profileDetails.profileDesignationStatus.group.trim().toLowerCase())
        // profileUpdateEventObj['PROFILE_DESIGNATION'] = this.toTitleCase(this.profesionalDetails.profileDetails.profileDesignationStatus.group.trim().toLowerCase())
        // profileUpdateEventObj.push('PROFILE_DESIGNATION')
      }

      if (this.profesionalDetails &&
        this.profesionalDetails.cadreDetails) {
        // if (this.profesionalDetails.cadreDetails.civilServiceType) {
        //   profileUpdateEventObj['CIVIL_SERVICE_TYPE'] = this.profesionalDetails.cadreDetails.civilServiceType
        // }
        // if (this.portalProfile.cadreDetails.civilServiceName) {
        //   profileUpdateEventObj['CIVIL_SERVICE_NAME'] = this.portalProfile.cadreDetails.civilServiceName
        // }
        // if (this.portalProfile.cadreDetails.cadreName) {
        //   profileUpdateEventObj['CADRE_NAME'] = this.portalProfile.cadreDetails.cadreName
        // }
        // if (this.portalProfile.cadreDetails.cadreBatch) {
        //   profileUpdateEventObj['CADRE_BATCH'] = this.portalProfile.cadreDetails.cadreBatch
        // }
        // if (this.portalProfile.cadreDetails.cadreControllingAuthorityName) {
        //   profileUpdateEventObj['CADRE_CONTROLLING_AUTHORITY'] = this.portalProfile.cadreDetails.cadreControllingAuthorityName
        // }
      }

      if (this.profesionalDetails && this.profesionalDetails.additionalProperties) {
        // if (this.profesionalDetails.additionalProperties.externalSystemId) {
        //   profileUpdateEventObj['EHRMS_ID'] = this.toTitleCase(this.profesionalDetails.additionalProperties.externalSystemId.trim().toLowerCase())
        // }
        // if (this.profesionalDetails.additionalProperties.externalSystemDor) {
        //   profileUpdateEventObj['DOR'] = this.profesionalDetails.additionalProperties.externalSystemDor.trim()
        // }
      }

      // profileUpdateEventObj = profileUpdateEventObj.toString()
      console.log('profileUpdateEventObj', profileUpdateEventObj)

      this.netCoreService.netCoreUserProfilepdate(profileUpdateObj)
      // this.netCoreService.netCoreUserProfileUpdateEvent(profileUpdateEventObj, 'profile_update',this.configSvc.unMappedUser.identifier.trim().toLowerCase())
      this.netCoreService.trackEvent('profile_update', this.configSvc.unMappedUser.identifier.trim().toLowerCase(), profileUpdateEventObj)
    }
  }

  getEditConfig(editObjectKey: string | undefined): any {
    if (this.profileEditConfigs && editObjectKey) {
      return this.profileEditConfigs[editObjectKey] || null
    }
    return null
  }

  toTitleCase(str: string): string {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  getErrorMessage(error: HttpErrorResponse, formBody: any): string {
    const errorMsg = _.get(error, 'error.params.errmsg', '') || _.get(error, 'error.message', '')

    // Check if email or mobile is being updated
    const isEmailUpdate = _.get(formBody, 'request.profileDetails.personalDetails.primaryEmail')
    const isMobileUpdate = _.get(formBody, 'request.profileDetails.personalDetails.mobile')

    // Check for duplicate email error
    if (isEmailUpdate && (errorMsg.toLowerCase().includes('email') || errorMsg.toLowerCase().includes('already exists'))) {
      return 'This email is already registered. Please use a different email address.'
    }

    // Check for duplicate mobile error
    if (isMobileUpdate && (errorMsg.toLowerCase().includes('mobile') || errorMsg.toLowerCase().includes('phone') || errorMsg.toLowerCase().includes('already exists'))) {
      return 'This mobile number is already registered. Please use a different mobile number.'
    }

    // Return specific error message if available, otherwise return generic message
    return errorMsg || 'Something went wrong please try again'
  }

  fetchProfileDetails() {
    const apiConfigDetails: ConfigDetails = this.getConfigDetails('profileV1Basic')
    this.profileV2RevampSvc.fetchProfile(apiConfigDetails, this.userId, !this.isCurrentUser).subscribe({
      next: (response: any) => {
        if (response) {
          this.profesionalDetails = _.get(response, 'result.response.profiledetails', _.get(response, 'result.response.profileDetails', _.get(response, 'result', {})))
          this.profileCompletionPercentage = _.get(response, 'result.response.profileCompletionPercentage', 0)
          this.patchProfileDetails()
        }
      },
      error: (error: HttpErrorResponse) => {
        if (error) {
          this.openSnackbar('Something went wrong please try again')
        }
      },
    })
  }

  get isVolunteerUser(): boolean {
    return !!this.configSvc.userRoles && this.configSvc.userRoles.has('volunteer')
  }

  openProfileEditDialog(header: string) {
    const dialogDetails: any = {
      header,
      profileDetails: this.primaryDetails,
      primaryDetailsEditConfig: this.getEditConfig(this.profileConfig?.basicDetails?.primaryDetails?.editObjectKey),
      apiConfig: this.apiConfig
    }
    if (header === 'Profile') {
      dialogDetails.profileDetails = {
        profileImage: this.profileImageUrl,
        firstname: _.get(this.primaryDetails, 'firstname', ''),
        state: _.get(this.locationDetails, 'state', ''),
        district: _.get(this.locationDetails, 'district', ''),
      }
    } else if (header === 'Primary Details') {
      dialogDetails['groupsList'] = this.groupsList
    } else if (header === 'mandatorySection') {
      dialogDetails['groupsList'] = this.groupsList
    } else if (header === 'Other Details') {
      dialogDetails['editConfig'] = this.getEditConfig(this.profileConfig?.basicDetails?.otherDetails?.editObjectKey)
      // field visibility map for the static edit form (empty/absent -> all fields)
      dialogDetails['otherDetailsFields'] = this.profileConfig?.basicDetails?.otherDetails?.fields || null
    }

    // For mandatorySection, wrap dialogDetails and include approval fields
    let dialogData: any
    if (header === 'mandatorySection') {
      dialogData = {
        dialogDetails,
        unVerifiedObj: this.unVerifiedObj,
        rejectedFields: this.rejectedFields,
        approvalPendingFields: this.approvalPendingFields,
        enableWTR: this.enableWTR,
        enableWR: this.enableWR,
        isCurrentUser: this.isCurrentUser,
        primaryDetails: this.primaryDetails,
        primaryDetailsEditConfig: this.getEditConfig(this.profileConfig?.basicDetails?.primaryDetails?.editObjectKey),
        editConfig: this.getEditConfig(this.profileConfig?.basicDetails?.otherDetails?.editObjectKey),
      }
    } else {
      dialogData = dialogDetails
    }

    let dialogComponent: any = PrfileEditV2Component

    // volunteers always use the existing static Other Details form so the
    // volunteer-restricted fields (employeeId, ehrmsId, dateOfRetirement,
    // governmentService) can be hidden there
    if (
      dialogData.header.toLowerCase() === 'other details'
      && dialogData.editConfig
      && dialogData.editConfig.isDynamicDialog
      && !this.isVolunteerUser
    ) {
      dialogComponent = DynamicEntryEditComponent
    }

    const dialogRef = this.dialog.open(dialogComponent, {
      data: dialogData,
      disableClose: true,
      panelClass: 'dialog_sidenav',
      autoFocus: false,
    })

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.generateBasicProfileFormBody(result)
        if (_.get(result, 'state', '') || _.get(result, 'district', '')) {
          if (_.get(result, 'state', '') !== _.get(this.locationDetails, 'state', '') ||
            _.get(result, 'district', '') !== _.get(this.locationDetails, 'district', '')
          ) {
            this.locationDetails['state'] = _.get(result, 'state', '')
            this.locationDetails['district'] = _.get(result, 'district', '')
            const formBody: any = {
              request: {
                userId: this.userId,
                locationDetails: [this.locationDetails],
              },
            }
            if (_.get(this.locationDetails, 'uuid')) {
              this.updateProfileEntry(formBody)
            } else {
              this.addProfileEntry(formBody)
            }
          }
        }
      }
    })
  }

  generateBasicProfileFormBody(result: any): any {
    if (result) {
      const formBody: any = {
        request: {
          userId: this.userId,
          profileDetails: {},
        },
      }

      // Define field mappings with their paths in the API response and form body
      const fieldMappings: {
        formField: string,
        resultPath: string,
        formBodyPath: string,
        isCader?: boolean
      }[] = [
          {
            formField: 'profileImageUrl',
            resultPath: 'profileImageUrl',
            formBodyPath: 'profileDetails.profileImageUrl',
          },
          {
            formField: 'firstname',
            resultPath: 'firstname',
            formBodyPath: 'profileDetails.personalDetails.firstname',
          },
          {
            formField: 'primaryEmail',
            resultPath: 'primaryEmail',
            formBodyPath: 'profileDetails.personalDetails.primaryEmail',
          },
          {
            formField: 'mobile',
            resultPath: 'mobile',
            formBodyPath: 'profileDetails.personalDetails.mobile',
          },
          {
            formField: 'gender',
            resultPath: 'gender',
            formBodyPath: 'profileDetails.personalDetails.gender',
          },
          {
            formField: 'dob',
            resultPath: 'dob',
            formBodyPath: 'profileDetails.personalDetails.dob',
          },
          {
            formField: 'domicileMedium',
            resultPath: 'domicileMedium',
            formBodyPath: 'profileDetails.personalDetails.domicileMedium',
          },
          {
            formField: 'category',
            resultPath: 'category',
            formBodyPath: 'profileDetails.personalDetails.category',
          },
          {
            formField: 'isCadre',
            resultPath: 'isCadre',
            formBodyPath: 'profileDetails.personalDetails.isCadre',
          },
          {
            formField: 'group',
            resultPath: 'group',
            formBodyPath: 'profileDetails.professionalDetails[0].group',
          },
          {
            formField: 'designation',
            resultPath: 'designation',
            formBodyPath: 'profileDetails.professionalDetails[0].designation',
          },
          {
            formField: 'osid',
            resultPath: 'osid',
            formBodyPath: 'profileDetails.professionalDetails[0].osid',
          },
          {
            formField: 'employeeCode',
            resultPath: 'employeeCode',
            formBodyPath: 'profileDetails.employmentDetails.employeeCode',
          },
          {
            formField: 'pinCode',
            resultPath: 'pinCode',
            formBodyPath: 'profileDetails.employmentDetails.pinCode',
          },
          {
            formField: 'aboutme',
            resultPath: 'aboutme',
            formBodyPath: 'profileDetails.employmentDetails.aboutme',
          },
        ]

      if (result && result.isCadre) {
        const cadreDetailsFieldMappings = [
          {
            formField: 'civilServiceTypeId',
            resultPath: 'civilServiceTypeId',
            formBodyPath: 'profileDetails.cadreDetails.civilServiceTypeId',
            isCader: true,
          }, {
            formField: 'civilServiceType',
            resultPath: 'civilServiceType',
            formBodyPath: 'profileDetails.cadreDetails.civilServiceType',
            isCader: true,
          },
          {
            formField: 'civilServiceId',
            resultPath: 'civilServiceId',
            formBodyPath: 'profileDetails.cadreDetails.civilServiceId',
            isCader: true,
          },
          {
            formField: 'civilServiceName',
            resultPath: 'civilServiceName',
            formBodyPath: 'profileDetails.cadreDetails.civilServiceName',
            isCader: true,
          },
          {
            formField: 'cadreId',
            resultPath: 'cadreId',
            formBodyPath: 'profileDetails.cadreDetails.cadreId',
            isCader: true,
          },
          {
            formField: 'cadreName',
            resultPath: 'cadreName',
            formBodyPath: 'profileDetails.cadreDetails.cadreName',
            isCader: true,
          },
          {
            formField: 'cadreBatch',
            resultPath: 'cadreBatch',
            formBodyPath: 'profileDetails.cadreDetails.cadreBatch',
            isCader: true,
          },
          {
            formField: 'cadreControllingAuthorityName',
            resultPath: 'cadreControllingAuthorityName',
            formBodyPath: 'profileDetails.cadreDetails.cadreControllingAuthorityName',
            isCader: true,
          },
          {
            formField: 'isOnCentralDeputation',
            resultPath: 'isOnCentralDeputation',
            formBodyPath: 'profileDetails.cadreDetails.isOnCentralDeputation',
            isCader: true,
          },
        ]
        fieldMappings.push(...cadreDetailsFieldMappings)
      }

      let hasChanges = false

      // Compare each field and add to form body if changed
      fieldMappings.forEach(mapping => {
        const currentValue = _.get(result, mapping.resultPath, null)
        let formValue = this.primaryDetails[mapping.formField]
        if (mapping.formField === 'dob' && (formValue || formValue === false)) {
          formValue = this.datePipe.transform(new Date(formValue), 'dd-MM-yyyy')
        }

        if ((
          (formValue !== currentValue && currentValue !== null) &&
          (
            (formValue === 'NA' && currentValue !== '') ||
            formValue !== 'NA'
          )
        )
          || mapping.isCader
        ) {
          const pathParts = mapping.formBodyPath.split('.')
          let current = formBody.request

          for (let i = 0; i < pathParts.length - 1; i++) {
            const part = pathParts[i]
            if (part.includes('[0]')) {
              const arrayKey = part.replace('[0]', '')
              if (!current[arrayKey]) current[arrayKey] = [{}]
              current = current[arrayKey][0]
            } else {
              if (!current[part]) current[part] = {}
              current = current[part]
            }
          }

          // Set the final value
          const finalKey = pathParts[pathParts.length - 1]
          current[finalKey] = currentValue
          hasChanges = true
        }
      })

      if (hasChanges) {
        if (_.get(formBody, 'request.profileDetails.personalDetails') && formBody.request) {
          if (_.get(formBody, 'request.profileDetails.personalDetails.primaryEmail')) {
            formBody.request['emailOtp'] = result['emailOtp'] || ''
          }
          if (_.get(formBody, 'request.profileDetails.personalDetails.mobile')) {
            formBody.request['phoneOtp'] = result['phoneOtp'] || ''
          }
        }
        this.updateProfileDetails(formBody)
      }
      else {
        if (this.profesionalDetails.profileDesignationStatus === 'NOT-VERIFIED' || this.profesionalDetails.profileDesignationStatus === 'NOT-VERIFIED') {
          if (result.group || result.designation) {
            formBody.request.profileDetails = { 'professionalDetails': [result.group && result.designation ? { group: result.group, designation: result.designation } : result.group ? { group: result.group } : { designation: result.designation }] }
            this.updateProfileDetails(formBody)
          }
        }
      }
    }
  }

  getSendApprovalStatus(): void {
    const formBody = {
      serviceName: 'profile',
      applicationStatus: 'SEND_FOR_APPROVAL',
    }
    const configDetails: ConfigDetails = this.getConfigDetails('userWFApplicationFieldsSearch')
    this.profileV2RevampSvc.fetchApprovalDetails(configDetails, formBody)
      .pipe(takeUntil(this.destroySubject$))
      .subscribe((responce: any) => {
        this.unVerifiedObj.groupRequestTime = 0
        this.unVerifiedObj.designationRequestTime = 0
        this.approvalPendingFields = _.get(responce, 'result.data', [])

        if (this.approvalPendingFields && this.approvalPendingFields.length === 0) {
          this.enableWTR = false
          this.onInitCallComplete()
          return
        }
        const exists = this.approvalPendingFields.filter((obj: any) => {
          if (obj.hasOwnProperty('name')) {
            this.unVerifiedObj.organization = obj.name
          }
          if (obj.hasOwnProperty('group') && obj.lastUpdatedOn > this.unVerifiedObj.groupRequestTime) {
            this.unVerifiedObj.group = obj.group
            this.unVerifiedObj.groupRequestTime = obj.lastUpdatedOn
          }
          if (obj.hasOwnProperty('designation') && obj.lastUpdatedOn > this.unVerifiedObj.designationRequestTime) {
            this.unVerifiedObj.designation = obj.designation
            this.unVerifiedObj.designationRequestTime = obj.lastUpdatedOn
          }
          return obj.hasOwnProperty('name')
        }).length > 0

        if (exists) {
          this.enableWTR = true
        } else {
          this.enableWR = true
        }
        this.onInitCallComplete()
      }, (error: HttpErrorResponse) => {
        if (!error.ok) {
          this.openSnackbar(this.handleTranslateTo('approvalStatusFailed'))
        }
        this.onInitCallComplete()
      })
  }

  updateWithdrawalStatus() {
    this.enableWR = false
  }

  getRejectedStatus(): void {
    const formBody = {
      serviceName: 'profile',
      applicationStatus: 'REJECTED',
    }
    const configDetails: ConfigDetails = this.getConfigDetails('userWFApplicationFieldsSearch')
    this.profileV2RevampSvc.fetchApprovalDetails(configDetails, formBody)
      .pipe(takeUntil(this.destroySubject$))
      .subscribe((res: any) => {
        if (res.result && res.result.data && Array.isArray(res.result.data)) {
          res.result.data.forEach((obj: any) => {
            if (obj.hasOwnProperty('name')) {
              this.rejectedFields.name = obj.name
            }
            if (obj.hasOwnProperty('group') && obj.lastUpdatedOn > this.rejectedFields.groupRejectionTime) {
              this.rejectedFields.group = obj.group
              this.rejectedFields.groupRejectionComments = obj.comment
              this.rejectedFields.groupRejectionTime = obj.lastUpdatedOn
            }
            if (obj.hasOwnProperty('designation') && obj.lastUpdatedOn > this.rejectedFields.designationRejectionTime) {
              this.rejectedFields.designation = obj.designation
              this.rejectedFields.designationRejectionComments = obj.comment
              this.rejectedFields.designationRejectionTime = obj.lastUpdatedOn
            }
          })
        }
        this.onInitCallComplete()
      }, (error: HttpErrorResponse) => {
        if (!error.ok) {
          this.openSnackbar(this.handleTranslateTo('rejectedStatusFailed'))
        }
        this.onInitCallComplete()
      })
  }

  handleTransferRequest(): void {
    const portalProfile = _.get(this.profesionalDetails, 'profileDetails', this.profesionalDetails)
    const dialogRef = this.dialog.open(TransferRequestComponent, {
      data: {
        portalProfile,
        groupData: this.groupsList,
        apiConfig: this.apiConfig,
      },
      disableClose: true,
      panelClass: 'common-modal',
    })

    dialogRef.componentInstance.enableWithdraw.subscribe((value: boolean) => {
      if (value) {
        this.enableWTR = true
        this.getSendApprovalStatus()
        this.fetchProfileDetails()
      }
    })
  }

  handleWithdrawTransferRequest(): void {
    const requests = (this.approvalPendingFields || []).map((item: any) => {
      if (!item?.name) {
        return of(item)
      }

      const configDetails: ConfigDetails = this.getConfigDetails('orgV1Search')
      return this.profileV2RevampSvc.getOrgSearch({
        request: {
          filters: { status: 1, channel: item?.name },
          fields: ['orgName', 'channel'],
          limit: 1,
          offset: 0,
        },
      }, configDetails).pipe(
        map((res: any) => ({ ...item, displayName: res?.result?.response?.content?.[0]?.orgName || item?.name })),
        catchError(() => of({ ...item, displayName: item?.name }))
      )
    })

    forkJoin(requests).pipe(takeUntil(this.destroySubject$)).subscribe((approvalPendingFields: any) => {
      const dialogRef = this.dialog.open(WithdrawRequestComponent, {
        data: {
          approvalPendingFields,
          withDrawType: 'department',
        },
        disableClose: true,
        panelClass: 'common-modal',
      })

      dialogRef.componentInstance.enableMakeTransfer.subscribe((value: boolean) => {
        if (value) {
          this.enableWTR = false
          this.unVerifiedObj.group = ''
          this.unVerifiedObj.designation = ''
        }
      })
    })
  }

  viewMentorProfile() {
    window.open(`${environment.contentHost}/mentorship`, '_blank')
  }
  openProfileEntryListDialog(header: string) {
    const dialogDetails: any = {
      header,
      userId: this.userId,
      isCurrentUser: this.isCurrentUser || false,
      editConfig: null,
      apiConfig: this.apiConfig,
    }
    switch (header) {
      case 'Service History':
        dialogDetails.editConfig = this.getEditConfig(this.profileConfig?.serviceHistory?.editObjectKey)
        this.openServiceHistoryListDialog(dialogDetails)
        break
      // case 'Competencies':
      //   this.openCompetenciesListDialog(dialogDetails)
      //   break;
      case 'Educational qualifications':
        dialogDetails.editConfig = this.getEditConfig(this.profileConfig?.educationalQualifications?.editObjectKey)
        this.openEducationalQualificationsListDialog(dialogDetails)
        break
      case 'Achievements':
        dialogDetails.editConfig = this.getEditConfig(this.profileConfig?.achievements?.editObjectKey)
        this.openAchievementsListDialog(dialogDetails)
        break
    }
  }

  openServiceHistoryListDialog(dialogDetails: any) {
    dialogDetails['entryType'] = 'all'
    dialogDetails['currentDesignation'] = _.get(this.primaryDetails, 'designation', '')
    dialogDetails['currentOrgName'] = _.get(this.primaryDetails, 'currentOrgName', '')
    const dialogRef = this.dialog.open(ServiceHistoryComponent, {
      data: dialogDetails,
      disableClose: true,
      panelClass: 'dialog_sidenav',
      autoFocus: false,
      width: this.isMobile ? '100vw' : '795px',
    })
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.openProfileEntryEditDialog('Service History', result)
      }
    })
  }

  openEducationalQualificationsListDialog(dialogDetails: any) {
    const dialogRef = this.dialog.open(EducationalQualificationsComponent, {
      data: dialogDetails,
      disableClose: true,
      panelClass: 'dialog_sidenav',
      autoFocus: false,
      width: this.isMobile ? '100vw' : '795px',
    })
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.openProfileEntryEditDialog('Educational qualifications', result)
      }
    })
  }

  openAchievementsListDialog(dialogDetails: any) {
    const dialogRef = this.dialog.open(AchievementsComponent, {
      data: dialogDetails,
      disableClose: true,
      panelClass: 'dialog_sidenav',
      autoFocus: false,
      width: this.isMobile ? '100vw' : '795px',
    })
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        if (result && result.action && result.action === 'delete') {
          const achievement = result.achievement || {}
          this.openProfileEntryDeleteDialog('Achievements', achievement)
        } else {
          this.openProfileEntryEditDialog('Achievements', result)
        }
      }
    })
  }

  //#region (profile entry edit)
  async openProfileEntryEditDialog(header: string, entryDetails?: any) {
    const dialogDetails: any = {
      header,
      entryDetails,
      editConfig: null,
      apiConfig: this.apiConfig,
    }
    switch (header) {
      case 'Service History':
        dialogDetails.editConfig = this.getEditConfig(this.profileConfig?.serviceHistory?.editObjectKey)
        break
      case 'Educational qualifications':
        dialogDetails.editConfig = this.getEditConfig(this.profileConfig?.educationalQualifications?.editObjectKey)
        break
      case 'Achievements':
        dialogDetails.editConfig = this.getEditConfig(this.profileConfig?.achievements?.editObjectKey)
        break
    }
    const isNew = entryDetails ? false : true
    const isDynamic = _.get(dialogDetails, 'editConfig.isDynamicDialog', false)
    const dialogComponent: any = isDynamic ? DynamicEntryEditComponent : ProfileEntryEditComponent
    const dialogRef = this.dialog.open(dialogComponent, {
      data: dialogDetails,
      disableClose: true,
      panelClass: 'dialog_sidenav',
      autoFocus: false,
    })

    dialogRef.afterClosed().subscribe(async (result: any) => {
      if (result) {
        let formBody: any = {}
        switch (header) {
          case 'Service History':
            formBody = this.generateServiceHistoryFormBody(result, entryDetails)
            break
          // case 'Competencies':
          //   this.competencies = result
          //   break;
          case 'Educational qualifications':
            formBody = await this.generateEducationalQualificationsFormBody(result, entryDetails)
            break
          case 'Achievements':
            formBody = this.generateAchievementsFormBody(result, entryDetails)
            break
        }
        if (formBody) {
          if (header === 'Achievements') {
            isNew ? this.addAchievementEntry(formBody) : this.updateAchievementEntry(formBody)
          } else if (header === 'Service History') {
            _.get(entryDetails, 'uuid') ?
              this.updateProfileEntry(formBody) : this.addProfileEntry(formBody, 'Added Successfully')
          } else {
            isNew ? this.addProfileEntry(formBody, 'Added Successfully') : this.updateProfileEntry(formBody)
          }
        }
      }
    })
  }

  generateServiceHistoryFormBody(serviceHistory: any, oldDetails: any): any {
    delete serviceHistory['showMore']
    delete serviceHistory['orgDetails']
    delete serviceHistory['period']
    const formBody: any = {
      request: {
        userId: this.userId,
        serviceHistory: [serviceHistory],
      },
    }
    if (_.get(oldDetails, 'uuid', '')) {
      formBody.request['serviceHistory'][0]['uuid'] = oldDetails.uuid
    }
    return formBody
  }

  async generateEducationalQualificationsFormBody(educationalQualifications: any, oldDetails: any): Promise<any> {
    const isOtherDegree = _.get(educationalQualifications, 'degree', '').toLowerCase() === 'other' && _.get(educationalQualifications, 'otherDegree', '') ? true : false
    const isOtherInstitute = _.get(educationalQualifications, 'institutionName', '').toLowerCase() === 'other' && _.get(educationalQualifications, 'otherInstituteName', '') ? true : false
    const formBody: any = {
      request: {
        userId: this.userId,
        educationalQualifications: [{
          degree: isOtherDegree ? _.get(educationalQualifications, 'otherDegree', '') : _.get(educationalQualifications, 'degree', ''),
          fieldOfStudy: _.get(educationalQualifications, 'fieldOfStudy', ''),
          institutionName: isOtherInstitute ? _.get(educationalQualifications, 'otherInstituteName', '') : _.get(educationalQualifications, 'institutionName', ''),
          endYear: _.get(educationalQualifications, 'endYear', ''),
          startYear: _.get(educationalQualifications, 'startYear', ''),
        }],
      },
    }
    if (_.get(oldDetails, 'uuid', '')) {
      formBody.request['educationalQualifications'][0]['uuid'] = oldDetails.uuid
    }
    try {
      const addApiCalls: any = []
      if (isOtherDegree) {
        const degreeBody = {
          degreeName: _.get(educationalQualifications, 'otherDegree', ''),
        }
        const configDetails: ConfigDetails = this.getConfigDetails('updateDegree')
        addApiCalls.push(this.profileV2RevampSvc.updateDegree(degreeBody, configDetails))
      }
      if (isOtherInstitute) {
        const instituteBody = {
          institutionName: _.get(educationalQualifications, 'otherInstituteName', ''),
        }
        const configDetails: ConfigDetails = this.getConfigDetails('updateInstitution')
        addApiCalls.push(this.profileV2RevampSvc.updateInstitution(instituteBody, configDetails))
      }
      if (addApiCalls.length > 0) {
        await forkJoin(addApiCalls).toPromise()
      }
      return formBody

    } catch (error) {
      this.openSnackbar('Error adding degree/institute. Please try again.')
      throw error
    }
  }

  generateAchievementsFormBody(achievements: any, oldDetails: any): any {
    const requestBody: any = {
      request: {
        contextType: 'achievements',
        source: 'igot',
        contextData: achievements,
      },
    }
    if (_.get(oldDetails, 'id', '')) {
      requestBody.request['id'] = oldDetails.id
    }
    return requestBody
  }

  //#region (service history, achievements, educational qualifications will edit based on the request)
  addProfileEntry(formBody: any, successMessage: string = 'Updated Successfully') {
    const configDetails: ConfigDetails = this.getConfigDetails('addEntries')
    this.profileV2RevampSvc.addEntriesToProfile(formBody, configDetails).subscribe({
      next: (response: any) => {
        if (response) {
          this.fetchProfileEntries()
          this.openSnackbar(successMessage)
        }
      },
      error: (error: HttpErrorResponse) => {
        if (error) {
          this.openSnackbar('Something went wrong please try again')
        }
      },
    })
  }

  addAchievementEntry(formBody: any) {
    const configDetails: ConfigDetails = this.getConfigDetails('achievementCreate')
    this.profileV2RevampSvc.createAchievementEntry(formBody, configDetails).subscribe({
      next: (response: any) => {
        if (response) {
          setTimeout(() => {
            this.getAchievements()
          }, 500)
          this.raiseLearnerPassbookTelemetry('Add Achievement')
          this.openSnackbar('Added successfully and this will be reflected in the Learner Passbook after 30 minutes.')
        }
      },
      error: (error: HttpErrorResponse) => {
        if (error) {
          this.openSnackbar('Something went wrong please try again')
        }
      },
    })
  }

  updateAchievementEntry(formBody: any) {
    const configDetails: ConfigDetails = this.getConfigDetails('achievementUpdate')
    this.profileV2RevampSvc.updateAchievementEntry(formBody, configDetails).subscribe({
      next: (response: any) => {
        if (response) {
          setTimeout(() => {
            this.getAchievements()
          }, 500)
          this.openSnackbar('Updated successfully and this will be reflected in the Learner Passbook after 30 minutes.')
        }
      },
      error: (error: HttpErrorResponse) => {
        if (error) {
          this.openSnackbar('Something went wrong please try again')
        }
      },
    })
  }

  updateProfileEntry(formBody: any) {
    const configDetails: ConfigDetails = this.getConfigDetails('profileV1ExtendedUpdate')
    this.profileV2RevampSvc.updateEntriesOfProfile(configDetails, formBody).subscribe({
      next: (response: any) => {
        if (response) {
          this.fetchProfileEntries()
          this.openSnackbar('Updated Successfully')
        }
      },
      error: (error: HttpErrorResponse) => {
        if (error) {
          this.openSnackbar('Something went wrong please try again')
        }
      },
    })
  }
  //#endregion (service history, achievements, educational qualifications will edit based on the request)

  fetchProfileEntries() {
    const apiConfigDetails: ConfigDetails = this.getConfigDetails('profileV1Extended')
    this.profileV2RevampSvc.fetchProfileEntries(apiConfigDetails, this.userId, 'all', !this.isCurrentUser).subscribe({
      next: (response: any) => {
        if (response) {
          this.patchEntries(_.get(response, 'result.response', {}))
          this.getAchievements()
        }
      },
      error: (error: HttpErrorResponse) => {
        if (error) {
          this.openSnackbar('Something went wrong please try again')
        }
      },
    })
  }

  //#endregion (profile entry edit)

  handleTranslateTo(menuName: string): string {
    return this.profileV2RevampSvc.handleTranslateTo(menuName)
  }

  private openSnackbar(primaryMsg: string, duration: number = 5000) {
    this.snackBar.open(primaryMsg, 'X', {
      duration,
    })
  }

  openConformationDialog(status: string) {
    let message = ''
    switch (status) {
      case 'Rejected':
        message = this.handleTranslateTo('areYouSureYouWantToIgnoreThisRequest')
        break
      case 'Withdrawn':
        message = this.handleTranslateTo('areYouSureYouWantToWithdrawThisRequest')
        break
      case 'Removed':
        message = this.handleTranslateTo('areYouSureYouWantToRemoveThisConnection')
        break
      case 'Blocked':
        message = this.handleTranslateTo('areYouSureYouWantToBlockThisConnection')
        break
    }
    const dialgoData = {
      description: message,
      iconName: 'info',
      type: 'warning',
      buttonsPositionClass: 'justify-center items-center',
      buttons: [
        {
          classes: 'btn-out-line',
          text: this.handleTranslateTo('no'),
          response: false,
        },
        {
          classes: 'succes-button',
          text: this.handleTranslateTo('yes'),
          response: true,
        },
      ],
    }
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: dialgoData,
      disableClose: true,
      width: '400px',
      maxWidth: '90vw',
    })
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        if (status === 'Blocked') {
          this.blockUser()
        } else {
          this.updateProfileConnection(status)
        }
      }
    })
  }

  blockUser(): void {
    const currentUser = this.configSvc.userProfile
    if (this.userId && currentUser && this.primaryDetails) {
      const formBody = {
        connectionId: this.userId,
        userIdFrom: _.get(currentUser, 'userId', ''),
        userNameFrom: _.get(currentUser, 'firstName', ''),
        userDepartmentFrom: _.get(currentUser, 'departmentName', ''),
        userIdTo: this.userId,
        userNameTo: this.primaryDetails.firstname || '',
        userDepartmentTo: this.primaryDetails.departmentName || '',
      }

      this.profileV2RevampSvc.blockConnection(formBody).subscribe({
        next: () => {
          this.getConnectionStatus()
          this.openSnackbar('User blocked successfully')
        },
        error: () => {
          this.openSnackbar('Something went wrong please try again')
        },
      })
    }
  }

  updateProfileConnection(status: string) {
    const currentUser = this.configSvc.userProfile
    let subType = ''
    let eDataId = ''
    let successMessage = ''
    switch (status) {
      case 'Withdrawn':
        eDataId = 'connect-withdraw'
        subType = 'network-hub-connections-sent'
        successMessage = 'Connection withdrawn successfully'
        break
      // case 'Accepted':
      //   break;
      case 'Unblocked':
        eDataId = 'profile-unblock'
        subType = 'network-hub-connections-blocked'
        successMessage = 'User unblocked successfully'
        break
      case 'Removed':
        successMessage = 'Connection removed successfully'
        break
      // case 'Blocked':
      //   break
    }
    this.raiseTelemetry(_.get(currentUser, 'userId', ''), eDataId, subType)
    if (this.userId && currentUser && this.primaryDetails) {
      const formBody = {
        connectionId: this.userId,
        userIdFrom: _.get(currentUser, 'userId', ''),
        userNameFrom: _.get(currentUser, 'firstName', ''),
        userDepartmentFrom: _.get(currentUser, 'departmentName', ''),
        userIdTo: this.userId,
        userNameTo: this.primaryDetails.firstname || '',
        userDepartmentTo: this.primaryDetails.departmentName || '',
        status,
      }
      this.profileV2RevampSvc.updateConnectionRequest(formBody).subscribe({
        next: (response: any) => {
          if (response) {
            this.getConnectionStatus()
            this.openSnackbar(successMessage)
          }
        },
        error: () => {
          this.openSnackbar('Something went wrong please try again')
        },
      })
    }
  }

  copyProfileLink() {
    const currentUrl = window.location.href // Get the current URL
    navigator.clipboard.writeText(currentUrl) // Copy the URL to the clipboard
      .then(() => {
        this.openSnackbar('Profile link copied to clipboard') // Notify the user
      })
      .catch(() => {
        this.openSnackbar('Failed to copy profile link') // Handle errors
      })
  }

  sendConnectionRequest(): void {
    const currentUser = this.configSvc.userProfile
    this.raiseTelemetry(_.get(currentUser, 'userId', ''), 'profile-connect')
    if (this.userId && currentUser && this.primaryDetails) {
      const formBody = {
        connectionId: this.userId,
        userIdFrom: _.get(currentUser, 'userId', ''),
        userNameFrom: _.get(currentUser, 'firstName', ''),
        userDepartmentFrom: _.get(currentUser, 'departmentName', ''),
        userIdTo: this.userId,
        userNameTo: this.primaryDetails.firstname || '',
        userDepartmentTo: this.primaryDetails.departmentName || '',
      }

      this.profileV2RevampSvc.connectToNetwork(formBody).subscribe({
        next: () => {
          this.getConnectionStatus()
          this.openSnackbar('Connection request sent successfully')
        },
        error: () => {
          this.openSnackbar('Something went wrong while sending connection request')
        },
      })
    }
  }

  //#region (activities)
  getInsightsData() {
    this.insightsDataLoading = true
    const request = {
      request: {
        filters: {
          primaryCategory: 'programs',
          organisations: [
            'across',
            this.orgId,
          ],
        },
      },
    }
    const configDetails: ConfigDetails = this.getConfigDetails('userInsights')
    this.profileV2RevampSvc.getInsightsData(configDetails, request)
      .pipe(takeUntil(this.destroySubject$))
      .subscribe((res: any) => {
        if (res.result.response) {
          this.insightsData = res.result.response

          this.constructNudgeData()
          if (this.insightsData && this.insightsData['weekly-claps']) {
            this.insightsData['weeklyClaps'] = this.insightsData['weekly-claps']
          }
          // Derive the week list the way home does instead of using the static weekList in page
          // config, otherwise the same card shows different ticks here than on home
          this.weeklyClapsData = buildWeeklyClapsData(this.insightsData['weeklyClaps'])
        } else {
          this.insightsDataLoading = false
        }
      }, (_error: HttpErrorResponse) => {
        this.insightsDataLoading = false
      })
  }

  constructNudgeData() {
    const nudgeData: any = {
      type: 'data',
      iconsDisplay: false,
      cardClass: 'slider-container',
      height: 'auto',
      width: '',
      sliderData: [],
      negativeDisplay: false,
      'dot-default': 'dot-grey',
      'dot-active': 'dot-active',
    }
    const sliderData: { title: any; icon: string; data: string; colorData: string }[] = []
    this.insightsData.nudges.forEach((ele: any) => {
      if (ele) {
        const data = {
          title: ele.label,
          icon: ele.growth === 'positive' ? 'arrow_upward' : 'arrow_downward',
          data: ele.growth === 'positive' && ele.progress > 1 ? `+${Math.round(ele.progress)}%` : '',
          colorData: ele.growth === 'positive' ? 'color-green' : 'color-red',
        }
        sliderData.push(data)
      }
    })
    nudgeData.sliderData = sliderData
    this.insightsData['sliderData'] = nudgeData
    this.insightsDataLoading = false
  }
  //#endregion (activities)

  raiseTelemetry(userId: string, eDataId: string, subType?: string) {
    const edata: any = {
      type: WsEvents.EnumInteractTypes.CLICK,
      id: eDataId,
    }
    const objDetails = {
      id: userId,
      type: 'User',
    }
    const env = {
      module: WsEvents.EnumTelemetrymodules.NETWORK,
    }
    if (subType) {
      edata['subType'] = subType
    }
    this.events.raiseInteractTelemetry(edata, objDetails, env)
  }

  ngOnDestroy() {
    this.destroySubject$.unsubscribe()
  }

  openProfileEntryDeleteDialog(header: string, entryDetails: any) {
    let requestData: any = {}
    let dialogTitle: string = ''
    switch (header) {
      case 'Achievements':
        requestData = this.formDeleteRequest(header, entryDetails)
        dialogTitle = `Are you sure you want to delete '${entryDetails?.contextData?.title}' achievement?`
        break
    }

    const dialogData = {
      description: dialogTitle,
      iconName: 'info',
      type: 'warning',
      buttonsPositionClass: 'justify-center items-center',
      buttons: [
        {
          classes: 'btn-out-line',
          text: 'No',
          response: false,
        },
        {
          classes: 'succes-button',
          text: 'Yes',
          response: true,
        },
      ],
    }
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: dialogData,
      disableClose: true,
      width: '400px',
      maxWidth: '90vw',
    })
    dialogRef.afterClosed().subscribe(result => {
      if (result) {

        header === 'Achievements' ? this.deleteAchievement(requestData) : this.deleteProfileEntryCall(requestData)
      }
    })

  }

  formDeleteRequest(header: string, entryDetails: any) {
    let requestData: any = {}
    switch (header) {
      case 'Achievements':
        requestData = {
          'request': {
            'id': entryDetails.id,
            contextType: 'achievements',
          },
        }
        break
    }

    return requestData

  }

  deleteAchievement(request: any): void {
    const configDetails: ConfigDetails = this.getConfigDetails('achievementDelete')
    this.profileV2RevampSvc.deleteAchievementEntry(request, configDetails).subscribe({
      next: (res: any) => {
        if (res && res.result && res.responseCode === 'OK') {
          this.openSnackbar('Achievement deleted successfully', 2000)
          setTimeout(() => {
            this.getAchievements()
          }, 500)
        } else {
          this.openSnackbar('Something went wrong while deleting achievement, please try again later', 2000)
        }
      },
      error: (_err: any) => {
        this.openSnackbar('Something went wrong while deleting achievement, please try again later', 2000)
      },
    })
  }

  deleteProfileEntryCall(request: any): void {
    const configDetails: ConfigDetails = this.getConfigDetails('achievementDelete')
    this.profileV2RevampSvc.deleteAchievementEntry(request, configDetails).subscribe({
      next: (res: any) => {
        if (res && res.result && res.result.response) {
          this.openSnackbar('Achievement deleted successfully', 2000)
          this.fetchProfileEntries()
        } else {
          this.openSnackbar('Something went wrong while deleting achievement, please try again later', 2000)
        }
      },
      error: (_err: any) => {
        this.openSnackbar('Something went wrong while deleting achievement, please try again later', 2000)
      },
    })
  }

  // Update handleEditCustomDetails to build the form and populate values
  handleEditMandatoryDetails() {
    const dialogDetails: any = {
      header: 'Mandatory Section',
      profileDetails: this.primaryDetails,
      groupsList: this.groupsList,
    }
    const dialogRef = this.dialog.open(PrfileEditV2Component, {
      data: {
        dialogDetails,
        unVerifiedObj: this.unVerifiedObj,
        rejectedFields: this.rejectedFields,
        approvalPendingFields: this.approvalPendingFields,
        enableWTR: this.enableWTR,
        isCurrentUser: this.isCurrentUser,
        primaryDetails: this.primaryDetails,
        apiConfig: this.apiConfig,
      },
      disableClose: true,
      panelClass: 'dialog_sidenav',
      autoFocus: false,
    })
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        // this.getOrgDetails()
      }
    })
  }

  handleRedirectToCompetencyPassbook(): void {
    this.raiseLearnerPassbookTelemetry('Competency Passbook')
    this.router.navigate(['/page/competency-passbook/list'])
  }

  raiseLearnerPassbookTelemetry(tabname: string): void {
    const name = tabname.toLowerCase().split(' ').join('-')
    this.events.raiseInteractTelemetry(
      {
        type: WsEvents.EnumInteractTypes.CLICK,
        id: `${name}`,
      },
      {},
      {
        module: WsEvents.EnumTelemetrymodules.PROFILE,
      }
    )
  }



  openNlwCertificateDialog(): void {
    if (!this.nlwExperience?.banner?.onClick) { return }
    const onClick = this.nlwExperience.banner.onClick
    const pdfZoom = onClick?.pdfZoom || this.nlwExperience?.banner?.pdfZoom || 'FitH'
    this.events.raiseInteractTelemetry(
      { type: WsEvents.EnumInteractTypes.CLICK, id: 'nlw-certificate-profile' },
      {},
      { module: WsEvents.EnumTelemetrymodules.PROFILE }
    )
    let dialogData: NlwCertificateDialogData
    if (onClick.api) {
      dialogData = {
        pdfZoom,
        action: onClick.action,
        type: onClick.type,
        title: this.nlwExperience.banner.title || 'PM Appreciation Letter',
        url: onClick.url,
        api: onClick.api,
      }
    } else {
      const url = this.commonSvc.getLanguageBasedContentUrl('appreciationletter')
      dialogData = {
        pdfZoom,
        action: onClick.action,
        type: 'PDF',
        title: this.nlwExperience.banner.title || 'PM Appreciation Letter',
        url: url,
      }
    }
    let dialogWidth = '700px'
    if (dialogData.type === 'PDF') {
      dialogWidth = window.innerWidth <= 768 ? '90vw' : '80vw'
    }
    this.dialog.open(NlwCertificateDialogComponent, {
      data: dialogData,
      panelClass: 'nlw-experience-dialog-container',
      maxWidth: '95vw',
      width: dialogWidth,
      autoFocus: false,
    })
  }

  getConfigDetails(configKey: string): ConfigDetails {
    return {
      apiConfig: this.apiConfig,
      urlConfigPath: configKey,
      defaultUrl: '',
    }
  }

}
