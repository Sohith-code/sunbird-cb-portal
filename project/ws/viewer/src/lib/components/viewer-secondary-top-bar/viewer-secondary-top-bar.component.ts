import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, AfterViewInit, ChangeDetectorRef } from '@angular/core'
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog'
import { DomSanitizer, SafeUrl } from '@angular/platform-browser'
import { ActivatedRoute, NavigationEnd, NavigationExtras, Router } from '@angular/router'
import { WidgetContentService } from '@sunbird-cb/toc'
import { NsContent, VIEWER_ROUTE_FROM_MIME } from '@sunbird-cb/collection'
import { ConfigurationsService, EventService, NsPage, ValueService, WsEvents } from '@sunbird-cb/utils-v2'
import { Subscription } from 'rxjs'
import { ViewerUtilService } from '@sunbird-cb/toc'
import { CourseCompletionDialogComponent } from '../course-completion-dialog/course-completion-dialog.component'
import { PdfScormDataService } from '../../pdf-scorm-data-service'
import { AppTocService, ViewerDataService } from '@sunbird-cb/toc'
import { WidgetContentLibService } from '@sunbird-cb/consumption'
import { ZohoFormService } from '../../../../../../../src/app/header/header/zoho-form.service'
// import { WidgetContentService as WidgetContentServiceUtils } from '@sunbird-cb/utils-v2'

@Component({
  selector: 'viewer-viewer-secondary-top-bar',
  templateUrl: './viewer-secondary-top-bar.component.html',
  styleUrls: ['./viewer-secondary-top-bar.component.scss'],
})
export class ViewerSecondaryTopBarComponent implements OnInit, OnDestroy, AfterViewInit {

  @Input() frameReference: any
  @Input() forPreview = false
  @Input() content: any
  @Output() toggle = new EventEmitter()
  @Input() leafNodesCount: any
  @Input() contentMIMEType: any
  @Input() completedCount: any
  @Input() baseContentReadData: any
  private viewerDataServiceSubscription: Subscription | null = null
  private paramSubscription: Subscription | null = null
  private viewerDataServiceResourceSubscription: Subscription | null = null
  appIcon: SafeUrl | null = null
  isTypeOfCollection = false
  courseName = ''
  collectionType: string | null = null
  prevResourceUrl: string | null = null
  nextResourceUrl: string | null = null
  prevResourceUrlParams!: NavigationExtras
  nextResourceUrlParams!: NavigationExtras
  pageNavbar: Partial<NsPage.INavBackground> = this.configSvc.pageNavBar
  resourceId: string = (this.viewerDataSvc.resourceId as string) || ''
  resourceName: string | null = this.viewerDataSvc.resource ? this.viewerDataSvc.resource.name : ''
  resourcePrimaryCategory: string | null = this.viewerDataSvc.resource ? this.viewerDataSvc.resource.primaryCategory : ''
  contentProgressHash: any = []
  // previousResourcePrimaryCategory!: NsContent.EPrimaryCategory
  // nextResourcePrimaryCategory!: NsContent.EPrimaryCategory
  collectionId = ''
  logo = true
  isPreview = false
  forChannel = false
  currentRoute = window.location.pathname
  identifier: any
  batchId: any
  userid: any
  channelId: any
  optionalLink = false
  isMobile = false
  handleBackFromPdfScormFullScreenFlag = false
  toggleSideBarFlag = true
  enableShare = false
  pdfContentProgressData: any = { status: 1 }
  canShare = false
  rootOrgId: any
  currentDataFromEnrollList: any
  enrollmentList: any = []
  pageScrollSubscription: Subscription | null = null
  hashmapUpdateSubscription: Subscription | null = null
  // primaryCategory = NsContent.EPrimaryCategory
  contentPrimaryCategory: any
  isNextResourceLocked = false
  constructor(
    private activatedRoute: ActivatedRoute,
    private domSanitizer: DomSanitizer,
    // private logger: LoggerService,
    private configSvc: ConfigurationsService,
    private viewerDataSvc: ViewerDataService,
    private valueSvc: ValueService,
    private dialog: MatDialog,
    private router: Router,
    private widgetServ: WidgetContentService,
    private viewerSvc: ViewerUtilService,
    private pdfScormDataService: PdfScormDataService,
    private events: EventService,
    private appTocSvc: AppTocService,
    private widgetLibSvc: WidgetContentLibService,
    private cdr: ChangeDetectorRef,
    private zohoFormService: ZohoFormService,
    // private contentSvc: WidgetContentServiceUtils

  ) {
    this.valueSvc.isXSmall$.subscribe(isXSmall => {
      this.logo = !isXSmall
    })
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.currentRoute = event.url
      }
    })
  }

  ngOnInit() {
    // this.getAuthDataIdentifer()
    this.enrollmentList = this.activatedRoute.snapshot.data.enrollmentData
      && this.activatedRoute.snapshot.data.enrollmentData.data || []

    this.contentPrimaryCategory = this.activatedRoute?.snapshot?.data?.contentRead &&
      this.activatedRoute?.snapshot?.data?.contentRead?.data?.result?.content?.primaryCategory

    this.pageScrollSubscription = this.appTocSvc.updatePageScroll.subscribe((value: boolean) => {
      if (value) {
        setTimeout(() => {
          if (document.getElementsByClassName('viewer-top-secondary') &&
            document.getElementsByClassName('viewer-top-secondary')[0]) {
            document.getElementsByClassName('viewer-top-secondary')[0].scrollIntoView({
              behavior: 'smooth',
              block: 'start',
              inline: 'start',
            })
          }
        }, 1000)
      }
    })

    // Subscribe to hashmap updates to dynamically update lock status
    this.hashmapUpdateSubscription = this.appTocSvc.hashmapUpdated$.subscribe((update) => {
      console.log('🔄 [NEXT BUTTON] Hashmap update received:', {
        hasUpdate: !!update,
        hasNextUrl: !!this.nextResourceUrl,
        nextUrl: this.nextResourceUrl
      })

      if (update && this.nextResourceUrl) {
        // Extract the resource ID from the nextResourceUrl
        const urlParts = this.nextResourceUrl.split('/')
        const nextResourceId = urlParts[urlParts.length - 1]

        if (nextResourceId) {
          // Recheck lock status when hashmap updates
          const previousLockState = this.isNextResourceLocked
          this.isNextResourceLocked = this.checkIfContentIsLocked(nextResourceId)

          console.log('🔓 [NEXT BUTTON] Lock status check:', {
            nextResourceId,
            previousLockState,
            newLockState: this.isNextResourceLocked,
            changed: previousLockState !== this.isNextResourceLocked
          })

          if (previousLockState !== this.isNextResourceLocked) {
            console.log('✅ [NEXT BUTTON] Lock status CHANGED - triggering UI update')
            // Trigger change detection to update UI immediately
            this.cdr.markForCheck()
            this.cdr.detectChanges()
          }
        }
      }
    })

    if (window.innerWidth <= 1200) {
      this.isMobile = true
    } else {
      this.isMobile = false
    }
    this.pdfScormDataService.handleBackFromPdfScormFullScreen.subscribe((data: any) => {
      this.handleBackFromPdfScormFullScreenFlag = data
    })
    this.pdfScormDataService.handlePdfMarkComplete.subscribe((contentData: any) => {
      this.pdfContentProgressData = contentData
    })
    this.viewerSvc.autoPlayNextVideo.subscribe((autoPlayVideoData: any) => {
      if (autoPlayVideoData) {
        if (this.isTypeOfCollection && this.nextResourceUrl && this.nextResourceUrlParams && this.nextResourceUrlParams.queryParams) {
          this.router.navigate([this.nextResourceUrl], { queryParams: this.nextResourceUrlParams.queryParams })
        }
      }
    })
    this.viewerSvc.autoPlayNextAudio.subscribe((autoPlayVideoData: any) => {
      if (autoPlayVideoData) {
        if (this.isTypeOfCollection && this.nextResourceUrl && this.nextResourceUrlParams && this.nextResourceUrlParams.queryParams) {
          this.router.navigate([this.nextResourceUrl], { queryParams: this.nextResourceUrlParams.queryParams })
        }
      }
    })

    if (window.location.href.includes('/channel/')) {
      this.forChannel = true
    }
    this.isTypeOfCollection = this.activatedRoute.snapshot.queryParams.collectionType ? true : false
    this.collectionType = this.activatedRoute.snapshot.queryParams.collectionType
    this.courseName = this.activatedRoute.snapshot.queryParams.courseName
    this.channelId = this.activatedRoute.snapshot.queryParams.channelId
    if (this.configSvc.instanceConfig) {
      this.appIcon = this.domSanitizer.bypassSecurityTrustResourceUrl(
        this.configSvc.instanceConfig.logos.app,
      )
    }
    //   this.route.data.subscribe((data: any) => {
    //     this.appIcon =
    //     this.domSanitizer.bypassSecurityTrustResourceUrl(data.configData.data.logos.app)
    //   }
    // )
    this.viewerDataSvc.isSkipBtn.subscribe((data: any) => {
      if (data !== undefined) {
        this.optionalLink = data
      } else {
        this.optionalLink = false
      }
    })

    this.viewerDataServiceSubscription = this.viewerDataSvc.tocChangeSubject.subscribe((data: any) => {
      // Reset the locked state at the beginning of each navigation to avoid stale values
      this.isNextResourceLocked = false

      if (data.prevResource) {
        if (data.prevResource && !data.prevResource.viewerUrl) {
          data.prevResource['viewerUrl'] = `${this.forPreview ? '' : ''}/viewer/${VIEWER_ROUTE_FROM_MIME(
            data.prevResource.mimeType,
            // )}/${content.identifier}?primaryCategory=${content.primaryCategory}
            // &collectionId=${this.viewerDataSvc.collectionId}&collectionType=${this.collectionType}
            // &batchId=${this.batchId}&viewMode=${this.viewMode}`,
          )}/${data.prevResource.identifier}`
          this.prevResourceUrl = data.prevResource.viewerUrl
        } else {
          this.prevResourceUrl = data.prevResource.viewerUrl
        }

        this.prevResourceUrlParams = {
          queryParams: {
            primaryCategory: data.prevResource.primaryCategory,
            collectionId: data.prevResource.collectionId,
            collectionType: data.prevResource.collectionType || this.collectionType,
            batchId: data.prevResource.batchId,
            viewMode: data.prevResource.viewMode,
            preview: this.forPreview,
            channelId: this.channelId,
            ...(data.queryMLParams ? data.queryMLParams : null),
            ...(window.location.href.includes('editMode=true') ? { editMode: true } : {}),
            ...(window.location.href.includes('preAssessment=true') ? { preAssessment: true } : {}),
          },
          fragment: '',
        }
        if (data.prevResource.optionalReading && data.prevResource.primaryCategory === 'Learning Resource') {
          this.updateProgress(2, data.prevResource.identifier)
        }
        // if(data.prevResource?.isMandatory) {
        //   this.updateProgressForPreAssessment(data)
        // }
      } else {
        this.prevResourceUrl = null
      }
      if (data.nextResource) {
        if (data.nextResource && !data.nextResource.viewerUrl) {
          data.nextResource['viewerUrl'] = `${this.forPreview ? '' : ''}/viewer/${VIEWER_ROUTE_FROM_MIME(
            data.nextResource.mimeType,
            // )}/${content.identifier}?primaryCategory=${content.primaryCategory}
            // &collectionId=${this.viewerDataSvc.collectionId}&collectionType=${this.collectionType}
            // &batchId=${this.batchId}&viewMode=${this.viewMode}`,
          )}/${data.nextResource.identifier}`
          this.nextResourceUrl = data.nextResource.viewerUrl
        } else {
          this.nextResourceUrl = data.nextResource.viewerUrl
        }

        this.nextResourceUrlParams = {
          queryParams: {
            primaryCategory: data.nextResource.primaryCategory,
            collectionId: data.nextResource.collectionId,
            collectionType: data.nextResource.collectionType || this.collectionType,
            batchId: data.nextResource.batchId,
            viewMode: data.nextResource.viewMode,
            courseName: this.courseName,
            preview: this.forPreview,
            channelId: this.channelId,
            ...(data.queryMLParams ? data.queryMLParams : null),
            ...(window.location.href.includes('editMode=true') ? { editMode: true } : {}),
            ...(window.location.href.includes('preAssessment=true') ? { preAssessment: true } : {}),
          },
          fragment: '',
        }

        // Check if next resource is locked from tocSvc hashmap
        this.isNextResourceLocked = this.checkIfContentIsLocked(data.nextResource.identifier)
        console.log('📍 Initial Next Resource Locked Status:', this.isNextResourceLocked, 'for identifier:', data.nextResource.identifier)

        // Store next resource ID for future rechecks
        const nextResourceIdForRecheck = data.nextResource.identifier

        // Recheck after delays to catch late-arriving hashmap updates
        // This handles race conditions where milestone lock computation completes after initial check
        setTimeout(() => {
          const recheckResult = this.checkIfContentIsLocked(nextResourceIdForRecheck)
          if (recheckResult !== this.isNextResourceLocked) {
            console.log('⏱️ [300ms RECHECK] Next resource lock status changed:', {
              identifier: nextResourceIdForRecheck,
              oldStatus: this.isNextResourceLocked,
              newStatus: recheckResult
            })
            this.isNextResourceLocked = recheckResult
            this.cdr.detectChanges()
          }
        }, 300)

        // Additional recheck after a longer delay to catch milestone lock computations
        setTimeout(() => {
          const recheckResult = this.checkIfContentIsLocked(nextResourceIdForRecheck)
          if (recheckResult !== this.isNextResourceLocked) {
            console.log('⏱️ [1000ms RECHECK] Next resource lock status changed:', {
              identifier: nextResourceIdForRecheck,
              oldStatus: this.isNextResourceLocked,
              newStatus: recheckResult
            })
            this.isNextResourceLocked = recheckResult
            this.cdr.detectChanges()
          }
        }, 1000)

        if (data.nextResource.optionalReading && data.nextResource.primaryCategory === 'Learning Resource') {
          this.updateProgress(2, data.nextResource.identifier)
        }
        // if(data.prevResource?.isMandatory) {
        //   this.updateProgressForPreAssessment(data)
        // }
      } else {
        this.nextResourceUrl = null
        this.isNextResourceLocked = false
      }
      if (this.resourceId !== this.viewerDataSvc.resourceId) {
        this.resourceId = this.viewerDataSvc.resourceId as string
        this.resourceName = this.viewerDataSvc.resource ? this.viewerDataSvc.resource.name : ''
        this.resourcePrimaryCategory = this.viewerDataSvc.resource ? this.viewerDataSvc.resource.primaryCategory : ''
      }
    })
    this.paramSubscription = this.activatedRoute.queryParamMap.subscribe(async params => {
      this.collectionId = params.get('collectionId') as string
      this.isPreview = params.get('preview') === 'true' ? true : false
      const enrollList: any = this.widgetLibSvc.getEnrolledDataFromList(this.enrollmentList.courses, this.collectionId) || '{}'
      this.currentDataFromEnrollList = enrollList
    })

    this.viewerDataServiceResourceSubscription = this.viewerDataSvc.changedSubject.subscribe(
      _data => {
        this.resourceId = this.viewerDataSvc.resourceId as string
        this.resourceName = this.viewerDataSvc.resource ? this.viewerDataSvc.resource.name : ''
        this.resourcePrimaryCategory = this.viewerDataSvc.resource ? this.viewerDataSvc.resource.primaryCategory : ''
      },
    )

    if (this.currentDataFromEnrollList && this.currentDataFromEnrollList.content && ![
      NsContent.ECourseCategory.MODERATED_COURSE,
      NsContent.ECourseCategory.MODERATED_ASSESSEMENT,
      NsContent.ECourseCategory.MODERATED_PROGRAM,
      NsContent.ECourseCategory.INVITE_ONLY_PROGRAM,
    ].includes(this.currentDataFromEnrollList.content.courseCategory)) {
      this.canShare = true
      if (this.configSvc.userProfile) {
        this.rootOrgId = this.configSvc.userProfile.rootOrgId
      }
    }
  }

  ngAfterViewInit() {
    // Check lock status after view initialization with multiple retry attempts
    // This ensures hashmap and subscription data are ready
    this.recheckLockStatusWithRetry(0)
  }

  recheckLockStatusWithRetry(attempt: number) {
    const maxAttempts = 5
    const delay = attempt === 0 ? 200 : 500 // First check after 200ms, then 500ms intervals

    setTimeout(() => {
      const lockChecked = this.checkInitialLockStatus()

      // If lock status wasn't determined and we haven't exceeded max attempts, retry
      if (!lockChecked && attempt < maxAttempts) {
        console.log(`Retrying lock status check, attempt ${attempt + 1}/${maxAttempts}`)
        this.recheckLockStatusWithRetry(attempt + 1)
      }
    }, delay)
  }

  checkInitialLockStatus(): boolean {
    // Get the current resource from the viewer data service
    const currentResourceId = this.viewerDataSvc.resourceId

    console.log('Checking initial lock status:', {
      currentResourceId,
      hasNextUrl: !!this.nextResourceUrl,
      hasHashmap: !!this.appTocSvc.hashmap,
      hashmapSize: this.appTocSvc.hashmap ? Object.keys(this.appTocSvc.hashmap).length : 0
    })

    // Method 1: Check using nextResourceUrl if it's already set by subscription
    if (this.nextResourceUrl && this.nextResourceUrlParams?.queryParams) {
      // Extract the resource ID from the nextResourceUrl
      const urlParts = this.nextResourceUrl.split('/')
      const nextResourceId = urlParts[urlParts.length - 1]

      if (nextResourceId && this.appTocSvc.hashmap && this.appTocSvc.hashmap[nextResourceId]) {
        this.isNextResourceLocked = this.checkIfContentIsLocked(nextResourceId)
        return true
      }
    }

    // Method 2: Check using hashmap with current resource
    if (this.appTocSvc.hashmap && currentResourceId) {
      const currentContent = this.appTocSvc.hashmap[currentResourceId]

      if (currentContent) {
        console.log('Current content in hashmap:', {
          id: currentResourceId,
          hasNextResource: !!currentContent.nextResource
        })

        // Check if there's a nextResource property
        if (currentContent.nextResource) {
          this.isNextResourceLocked = this.checkIfContentIsLocked(currentContent.nextResource)
          return true
        }
      }
    }

    console.log('Could not determine lock status yet')
    return false
  }

  updateProgress(status: number, resourceId: any) {
    const collectionId = this.activatedRoute.snapshot.queryParams.collectionId ?
      this.activatedRoute.snapshot.queryParams.collectionId : ''
    // const collectionId = this.activatedRoute.snapshot.params.id ?
    // this.activatedRoute.snapshot.params.id : ''
    const batchId = this.activatedRoute.snapshot.queryParams.batchId ?
      this.activatedRoute.snapshot.queryParams.batchId : ''
    const isPreAssessment = this.activatedRoute.snapshot.queryParams.preAssessment
    if (isPreAssessment) {
      return this.viewerSvc
        .realTimeProgressUpdateForPreAssessmentQuiz(resourceId, status)

    }
    return this.viewerSvc.realTimeProgressUpdateQuiz(resourceId, collectionId, batchId, status)
  }

  ngOnDestroy() {
    if (this.viewerDataServiceSubscription) {
      this.viewerDataServiceSubscription.unsubscribe()
    }
    if (this.paramSubscription) {
      this.paramSubscription.unsubscribe()
    }
    if (this.viewerDataServiceResourceSubscription) {
      this.viewerDataServiceResourceSubscription.unsubscribe()
    }
    if (this.pageScrollSubscription) {
      this.pageScrollSubscription.unsubscribe()
    }
    if (this.hashmapUpdateSubscription) {
      this.hashmapUpdateSubscription.unsubscribe()
    }
  }

  toggleSideBar() {
    this.toggleSideBarFlag = !this.toggleSideBarFlag
    this.toggle.emit()
  }
  get needToHide(): boolean {
    return this.router.url.includes('all/assessment/')
  }

  back() {
    try {
      if (window.self !== window.top) {
        return
      }
      window.history.back()
    } catch (_ex) {
      window.history.back()
    }
  }

  finishDialog() {
    if (window.location.href.includes('preAssessment=true')) {
      this.router.navigateByUrl(`app/toc/${this.collectionId}/overview`)
    }
    else if (!this.forPreview) {
      this.contentProgressHash = []
      this.identifier = this.activatedRoute.snapshot.queryParams.collectionId
      this.batchId = this.activatedRoute.snapshot.queryParams.batchId

      if (this.identifier && this.batchId && this.configSvc.userProfile) {
        let userId
        if (this.configSvc.userProfile) {
          userId = this.configSvc.userProfile.userId || ''
          this.userid = this.configSvc.userProfile.userId || ''
        }

        const language = this.viewerSvc.getResourceContentLanguage(this.identifier)
        const req = {
          request: {
            userId,
            language,
            batchId: this.batchId,
            courseId: this.identifier || '',
            contentIds: [],
            fields: ['progressdetails'],
          },
        }
        this.widgetServ.fetchContentHistoryV2(req).subscribe(
          (data: any) => {
            this.contentProgressHash = data.result.contentList
            this.widgetServ.setProgramChildResumeData(this.contentProgressHash, this.identifier)

            const lastIndexData = this.contentProgressHash?.length && this.contentProgressHash[this.contentProgressHash?.length - 1]
            if (lastIndexData && lastIndexData?.completionPercentage === 100 && lastIndexData?.status === 2 && lastIndexData?.contentId === this.resourceId) {
              this.generateCertificate()
              this.zohoFormService.clearEnrollmentCacheForUser(this.userid)
            }

            // Check if this is a Learning Pathway
            const isLearningPathway = this.baseContentReadData && this.baseContentReadData.courseCategory === 'Learning Pathway'

            if (isLearningPathway) {

              // For Learning Pathway, check if all mandatory items are completed
              // completedCount should already reflect only mandatory items from viewer-top-bar
              if (lastIndexData?.completionPercentage >= 100 && lastIndexData?.status === 2 && lastIndexData?.contentId === this.resourceId) {
                this.showCompletionPopUp()
              } else {
                this.router.navigateByUrl(`app/toc/${this.collectionId}/overview`)
              }
            } else if (this.content && ![
              NsContent.ECourseCategory.MODERATED_COURSE,
              NsContent.ECourseCategory.MODERATED_ASSESSEMENT,
              NsContent.ECourseCategory.MODERATED_PROGRAM,
              NsContent.ECourseCategory.INVITE_ONLY_PROGRAM,
            ].includes(this.content.courseCategory)) {
              if (this.completedCount === this.leafNodesCount) {

                this.showCompletionPopUp()
              } else {
                this.router.navigateByUrl(`app/toc/${this.collectionId}/overview`)
              }
            } else {
              if (this.leafNodesCount === this.contentProgressHash.length) {
                const ipStatusCount = this.contentProgressHash.filter((item: any) => item.status === 1)
                if (ipStatusCount.length === 0) {
                  this.showCompletionPopUp()
                } else {
                  this.router.navigateByUrl(`app/toc/${this.collectionId}/overview`)
                }
              } else {
                this.router.navigateByUrl(`app/toc/${this.collectionId}/overview`)
              }
            }
          })
      }
    } else {
      if (window.location.href.includes('editMode=true')) {
        this.router.navigateByUrl(`public/toc/${this.collectionId}/overview?editMode=true`)
      } else {
        this.router.navigateByUrl(`public/toc/${this.collectionId}/overview`)
      }

    }
  }

  showCompletionPopUp() {
    let id = ''
    const MLID = this.activatedRoute.snapshot.queryParams.MLId ?
      this.activatedRoute.snapshot.queryParams.MLId : ''
    // check if multilingual ID is there then hit the API with MLID
    id = MLID ? MLID : this.identifier
    const dialogRef = this.dialog.open(CourseCompletionDialogComponent, {
      autoFocus: false,
      panelClass: 'course-completion-dialog',
      data: {
        courseName: this.activatedRoute.snapshot.queryParams.courseName,
        userId: this.userid,
        identifier: id,
        primaryCategory: this.collectionType,
        courseCategory: this.currentDataFromEnrollList.content.courseCategory,
        baseContentReadData: this.baseContentReadData,
        collectionId: this.identifier // In case of multilingual course, redirection should happen to base collectionID
      },
    })
    dialogRef.afterClosed().subscribe(result => {
      const app: any = document.getElementById('viewer-conatiner-backdrop')
      app.style.filter = 'blur(0px)'
      if (result === true) {
        this.router.navigateByUrl(`app/toc/${this.identifier}/overview`)
      }
    })
  }

  markAsComplete() {
    this.viewerSvc.markAsCompleteSubject.next(true)
    if (!this.nextResourceUrl) {
      this.pdfContentProgressData['status'] = 2
      this.finishDialog()
    }
    this.changeResource()
  }

  changeResource() {
    setTimeout(() => {
      this.appTocSvc.getPageScroll.next(true)
    }, 700)
  }

  checkForNextOfflineOnlineSession() {
    const nextUrl: any = this.nextResourceUrl
    if ((nextUrl.includes('offline-session')) ||
      (nextUrl.includes('online-session'))
    ) {
      this.router.navigate([this.nextResourceUrl], { queryParams: this.nextResourceUrlParams.queryParams })
      // setTimeout(() => {
      //   this.router.navigate([this.nextResourceUrl], { queryParams: this.nextResourceUrlParams.queryParams })
      // },         0)
    }
    this.changeResource()
  }

  checkForPrevOfflineOnlineSession() {
    const prevUrl: any = this.prevResourceUrl
    if ((prevUrl.includes('offline-session')) ||
      (prevUrl.includes('online-session'))

    ) {
      this.router.navigate([this.prevResourceUrl], { queryParams: this.prevResourceUrlParams.queryParams })
      // setTimeout(() => {
      //   this.router.navigate([this.prevResourceUrl], { queryParams: this.prevResourceUrlParams.queryParams })
      // },         0)
    }
    this.changeResource()
  }

  onClickOfShare() {
    this.enableShare = true
    this.raiseTelemetryForShare('shareContent')
  }

  /* tslint:disable */
  raiseTelemetryForShare(subType: any) {
    this.events.raiseInteractTelemetry(
      {
        type: 'click',
        subType,
        id: this.content ? this.content.identifier : '',
      },
      {
        id: this.content ? this.content.identifier : '',
        type: this.content ? this.content.primaryCategory : '',
      },
      {
        pageIdExt: `btn-${subType}`,
        module: WsEvents.EnumTelemetrymodules.CONTENT,
      }
    )
  }

  resetEnableShare() {
    this.enableShare = false
  }

  backToPrev() {
    // Previous navigation - lock status should already be current from hashmap updates

    if (this.prevResourceUrl) {
      this.router.navigate([this.prevResourceUrl], { queryParams: this.prevResourceUrlParams.queryParams })
    } else {
      if (!this.forPreview) {
        this.router.navigateByUrl(`app/toc/${this.collectionId}/overview`)
      } else {
        this.router.navigateByUrl(`public/toc/${this.collectionId}/overview`)
      }

    }
  }



  checkIfContentIsLocked(contentIdentifier: string): boolean {
    // Return false if no identifier provided
    if (!contentIdentifier) {
      return false
    }

    // Return false if no hashmap exists
    if (!this.appTocSvc.hashmap) {
      return false
    }

    // Check if hashmap has the content
    if (!this.appTocSvc.hashmap[contentIdentifier]) {

      // If content not in hashmap, check if it might be in preview mode
      if (this.forPreview) {
        return false
      }
      // If not in preview and not in hashmap, it might be locked by default
      return true
    }

    const contentData = this.appTocSvc.hashmap[contentIdentifier]

    // Check all possible locking properties from hashmap
    const isDirectlyLocked = contentData.isLocked === true
    const isComputedLocked = contentData.computedIsLocked === true
    const isParentLocked = contentData.isParentMilestoneLocked === true
    const isMilestoneLocked = contentData.isMilestoneLocked === true

    // NEW: Check if this is a milestone assessment that's locked due to incomplete mandatory items
    let milestoneAssessmentLocked = false
    if (contentData.parent) {
      const parentData = this.appTocSvc.hashmap[contentData.parent]

      // If parent is a milestone and this content is an assessment
      if (parentData && parentData.isMilestone &&
        (contentData.primaryCategory === 'Course Assessment' ||
          contentData.primaryCategory === 'Standalone Assessment' ||
          contentData.mimeType === 'application/vnd.sunbird.questionset')) {

        // Check if all mandatory courses in this milestone are completed
        milestoneAssessmentLocked = contentData.milestoneAssessmentLocked === true
      }
    }

    // Final determination - locked if ANY of these are true
    const isLocked = isDirectlyLocked ||
      isComputedLocked ||
      isParentLocked ||
      isMilestoneLocked ||
      milestoneAssessmentLocked

    // Comprehensive debug logging


    return isLocked
  }

  onNextClick(event: Event) {
    // Check current lock status before allowing navigation
    // Lock status should already be up-to-date from previous hashmap updates
    if (this.nextResourceUrl) {
      const urlParts = this.nextResourceUrl.split('/')
      const nextResourceId = urlParts[urlParts.length - 1]

      if (nextResourceId) {
        // Perform a fresh check right before navigation using current hashmap state
        const currentLockStatus = this.checkIfContentIsLocked(nextResourceId)

        console.log('🔍 [NEXT CLICK] Lock check before navigation:', {
          nextResourceId,
          currentLockStatus,
          hashmapExists: !!this.appTocSvc.hashmap,
          hashmapHasContent: this.appTocSvc.hashmap && !!this.appTocSvc.hashmap[nextResourceId]
        })

        // Update lock status if it differs from what we have
        if (currentLockStatus !== this.isNextResourceLocked) {
          console.log('⚠️ [NEXT CLICK] Lock status mismatch - updating:', {
            storedState: this.isNextResourceLocked,
            actualState: currentLockStatus
          })
          this.isNextResourceLocked = currentLockStatus
        }
      }
    }

    if (this.isNextResourceLocked) {
      event.preventDefault()
      event.stopPropagation()
      console.log('🚫 [NEXT CLICK] Navigation blocked - content is locked')
      console.log('🔒 Please complete all mandatory items before proceeding')
      return false
    }

    console.log('✅ [NEXT CLICK] Navigation allowed - proceeding to next content')
    this.checkForNextOfflineOnlineSession()
    return true
  }

  generateCertificate() {
    // const allowedPrimaryCategory = ALLOWED_CATEGORY_FOR_DYNAMIC_GENERATION?.map(
    //   (cat: string) => cat?.toLowerCase()
    // );

    // if (
    //   allowedPrimaryCategory &&
    //   (allowedPrimaryCategory.includes(this.contentPrimaryCategory?.toLowerCase()) ||
    //   allowedPrimaryCategory.includes(this.currentDataFromEnrollList.content.courseCategory?.toLowerCase()) )
    // ) {
    //   const payload = {
    //     request: {
    //       courseId: this.identifier,
    //       batchId: this.batchId,
    //       userId: this.userid,
    //     },
    //   };
    //   this.contentSvc.downloadCertV2(payload).subscribe(() => {});
    // }
  }
}
