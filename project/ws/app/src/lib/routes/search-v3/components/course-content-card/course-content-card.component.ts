import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core'
import { NsContent } from '@sunbird-cb/collection'
import { environment } from 'src/environments/environment'
import {
  ConfigurationsService,
  DomainConfService,
  EventService,
  WsEvents,
} from '@sunbird-cb/utils-v2'
import { MatDialog } from '@angular/material/dialog'
import { CertificateDialogComponent } from '@sunbird-cb/collection'
import { CertificateService } from '../../../certificate/services/certificate.service'
import { Router } from '@angular/router'
import { CommonMethodsService, WidgetContentLibService } from '@sunbird-cb/consumption'
import { IndexedDbService } from '../../services/indexed-db.service'
import * as _ from 'lodash'

const MILLISECONDS_IN_A_DAY = 1000 * 60 * 60 * 24
const NEW_CONTENT_THRESHOLD_DAYS = 14
@Component({
  selector: 'ws-app-course-content-card',
  templateUrl: './course-content-card.component.html',
  styleUrls: ['./course-content-card.component.scss'],
  standalone: false
})
export class CourseContentCardComponent implements OnInit, OnChanges {
  @Input() content: any
  @Input() enrollment: any[] = []
  @Input() cbpPlans: any[] = []
  @Input() unenrolledCourses: any[] = []
  @Input() igotSpecializationPrograms: any[] = []
  @Output() telemetry = new EventEmitter<any>()
  contentBookmarked = false
  defaultThumbnail = '/assets/instances/eagle/app_logos/default.png'
  defaultSLogo = '/assets/instances/eagle/app_logos/igot-katmayogi-logo.svg'
  compentencyKey!: NsContent.ICompentencyKeys

  courseEnrollment: any
  downloadCertificateLoading = false
  isIgot = false
  igotSpecializationProgram: any
  CaCourseUnitIds = '[]'
  isUnenrolled = false
  enrollmentDetailsFromDB: any = {}
  constructor(
    private configSvc: ConfigurationsService,
    private domainConfSvc: DomainConfService,
    private dialog: MatDialog,
    private events: EventService,
    private certificateService: CertificateService,
    private router: Router,
    private contSvc: WidgetContentLibService,
    private commonSvc: CommonMethodsService,
    private indexedDbService: IndexedDbService
  ) { }

  isCardElementEnabled(key: string): boolean {
    return this.domainConfSvc.isConfigEnabled('components.cards', key)
  }

  ngOnInit(): void {
    this.compentencyKey =
      this.configSvc.compentency[environment.compentencyVersionKey]
    this.CaCourseUnitIds = this.commonSvc.getCourseUnitIds()
    this.loadEnrollmentDetailsFromIndexedDB()
  }

  async loadEnrollmentDetailsFromIndexedDB() {
    try {
      const cachedData = await this.indexedDbService.getEnrollmentDetails()
      if (cachedData) {
        this.enrollmentDetailsFromDB = cachedData
        // Check if current content is enrolled using IndexedDB data
        this.checkEnrollmentFromDB()
      }
    } catch (error) {
      console.error('Failed to load enrollment details from IndexedDB:', error)
    }
  }

  checkEnrollmentFromDB() {
    if (this.enrollmentDetailsFromDB && this.content?.identifier) {
      // Check if the course is enrolled in the cached enrollment details
      const enrollmentRecord = this.enrollmentDetailsFromDB[this.content.identifier]
      if (enrollmentRecord) {
        // You can use this enrollment record as needed
        // For example, update courseEnrollment
        if (!this.courseEnrollment) {
          this.courseEnrollment = enrollmentRecord
        }
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['enrollment'] && changes['enrollment'].currentValue) {
      if (this.enrollment?.length && this.content) {
        this.courseEnrollment =
          this.enrollment.find(
            (ele: any) => ele.courseId === this.content.identifier
          ) || null
      }
    }
    if (changes['cbpPlans'] && changes['cbpPlans'].currentValue) {
      if (this.cbpPlans?.length && this.content) {
        this.isIgot = this.cbpPlans.some(
          (ele: any) => ele.identifier === this.content.identifier
        )
      } else {
        this.isIgot = false
      }
    }

    if (changes['igotSpecializationPrograms'] && changes['igotSpecializationPrograms'].currentValue) {
      if (this.igotSpecializationPrograms?.length && this.content) {
        this.igotSpecializationProgram = this.igotSpecializationPrograms.some(
          (ele: any) => ele.identifier === this.content.identifier && this.content?.additionalTags?.includes('iGOT Specialization')
        )
      } else {
        this.igotSpecializationProgram = false
      }
    }
  }

  checkForCiosDuration(item: any) {
    // if (item && item.contentId && item.contentId.includes('ext_')) {
    //   return item.duration * 60
    // }
    return item.duration
  }

  downloadCertificate(certificateData: any) {
    if (this.content.completionSurveyLink && this.content.surveyCompletionStatus === false) {
      return
    }
    this.events.raiseInteractTelemetry(
      {
        type: WsEvents.EnumInteractTypes.CLICK,
        id: 'view-certificate',
        subType: WsEvents.EnumInteractSubTypes.CERTIFICATE,
      },
      {
        id:
          certificateData.issuedCertificates &&
          certificateData.issuedCertificates.length &&
          certificateData.issuedCertificates[0].identifier, // id of the certificate
        type: WsEvents.EnumInteractSubTypes.CERTIFICATE,
      }
    )
    if (certificateData.issuedCertificates.length > 0) {
      this.downloadCertificateLoading = true
      const certificate: any = certificateData.issuedCertificates.sort(
        (a: any, b: any) =>
          new Date(a.lastIssuedOn).getTime() -
          new Date(b.lastIssuedOn).getTime()
      )
      const certData: any = certificate && certificate.length && certificate[0]
      this.certificateService
        .downloadCertificate_v2(certData.identifier)
        .subscribe((res: any) => {
          this.downloadCertificateLoading = false
          const cet = res.result.printUri
          this.dialog.open(CertificateDialogComponent, {
            width: '1300px',
            data: { cet, certId: certData.identifier },
          })
        })
    } else {
      this.downloadCertificateLoading = false
    }
  }

  checkIfContentIsNew(createdOn: string): boolean {
    if (!createdOn) return false
    const createdDate = new Date(createdOn)
    const currentDate = new Date()
    const diffInMs = currentDate.getTime() - createdDate.getTime()
    const diffInDays = diffInMs / MILLISECONDS_IN_A_DAY

    return diffInDays <= NEW_CONTENT_THRESHOLD_DAYS
  }

  async getRedirectUrlData(content: any) {
    if (content && content?.contentType === 'Resource' && content?.identifier) {
      let resourceType
      if (!content?.resourceType) {
        resourceType = 'youtube'
      } else {
        resourceType = content?.resourceType === 'MP4' ? 'video' : content?.resourceType.toLowerCase()
      }
      this.telemetry.emit(content)
      this.router.navigate([`app/amrit-gyaan-kosh/player/${(resourceType).toLowerCase()}/${content?.identifier}`], {
        queryParams: { primaryCategory: content?.primaryCategory },
      })
    } else {
      this.telemetry.emit(content)
      const urlData = await this.contSvc.getResourseLink(content)
      this.router.navigate([urlData.url], {
        queryParams: urlData.queryParams,
      })
    }
  }

  get lockSurvey(): boolean {
    if (
      _.get(this.configSvc, 'instanceConfig.completionSurvey.enabled') &&
      this.courseEnrollment &&
      this.courseEnrollment.completedOn >= _.get(this.configSvc.instanceConfig, 'completionSurvey.startDate') &&
      this.content &&
      this.content.completionSurveyLink &&
      this.content.surveyCompletionStatus === false
    ) {
      return true
    }
    return false
  }

  generateCompetencySubThemeString(): string {
    if (this.content && this.content[this.compentencyKey?.vKey]) {
      return this.content[this.compentencyKey?.vKey]
        .map((keyword: any) => keyword[this.compentencyKey?.vCompetencySubTheme])
        .join(' · ')
    }
    return ''
  }
}
