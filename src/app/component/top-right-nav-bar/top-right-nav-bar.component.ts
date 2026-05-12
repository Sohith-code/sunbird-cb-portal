import { Component, Input, OnChanges, OnInit } from '@angular/core'
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog'
import { MatDialog as MatDialogNew } from '@angular/material/dialog'
import { DialogBoxComponent } from './../dialog-box/dialog-box.component'
import { TranslateService } from '@ngx-translate/core'
import { HomePageService } from '../../services/home-page.service'
import { ConfigurationsService, EventService, MultilingualTranslationsService } from '@sunbird-cb/utils-v2'
import { DomSanitizer } from '@angular/platform-browser'
import { HttpClient } from '@angular/common/http'
import { DialogBoxComponent as ZohoDialogComponent } from '@ws/app/src/lib/routes/profile-v3/components/dialog-box/dialog-box.component'
import { Router } from '@angular/router'
import { NotificationsService } from 'src/app/services/notifications.service'
import { MatSnackBar } from '@angular/material/snack-bar'
import { environment } from '../../../environments/environment'
import { ConfirmDialogComponent } from '@sunbird-cb/collection/src/lib/_common/confirm-dialog/confirm-dialog.component'
import { SurveyPopupComponent } from '@ws/app/src/lib/routes/peer-validation/components/survey-popup/survey-popup.component'
import { VerificationRequestDialogComponent } from '@ws/app/src/lib/routes/peer-validation/components/verification-request-dialog/verification-request-dialog.component'
import { RootService } from '../root/root.service'
// const rightNavConfig = [
//   {
//     id: 1,
//     section: 'download',
//     active: true,
//   },
//   {
//     id: 2,
//     section: 'font-setting',
//     active: true,
//   },
//   {
//     id: 3,
//     section: 'help',
//     active: true,
//   },
//   {
//     id: 4,
//     section: 'profile',
//     active: true,
//   },
// ]

@Component({
  selector: 'ws-top-right-nav-bar',
  templateUrl: './top-right-nav-bar.component.html',
  styleUrls: ['./top-right-nav-bar.component.scss'],
})
export class TopRightNavBarComponent implements OnInit, OnChanges {
  @Input() item: any
  @Input() rightNavConfig: any
  @Input() showLangDropdown = true
  @Input() notificationsCount: any
  dialogRef: any
  selectedLanguage = 'en'
  multiLang: any = []
  zohoHtml: any
  zohoUrl: any = '/assets/static-data/zoho-code.html'
  isMultiLangEnabled: any
  showDropdown: boolean = false
  roles: string[] = []
  enableSupportAI = false
  constructor(public dialog: MatDialog, public homePageService: HomePageService,
    private configSvc: ConfigurationsService,
    private langtranslations: MultilingualTranslationsService, private translate: TranslateService,
    private http: HttpClient, private sanitizer: DomSanitizer,
    private events: EventService, private snackBar: MatSnackBar,
    private router: Router, private notificationsService: NotificationsService,
    private rootService: RootService,
    private matDialog: MatDialogNew) {
    if (localStorage.getItem('websiteLanguage')) {
      this.translate.setDefaultLang('en')
      let lang = JSON.stringify(localStorage.getItem('websiteLanguage'))
      lang = lang.replace(/\"/g, '')
      this.selectedLanguage = lang
      this.translate.use(lang)
    }

    this.langtranslations.languageSelectedObservable.subscribe(() => {
      if (localStorage.getItem('websiteLanguage')) {
        this.translate.setDefaultLang('en')
        const lang = localStorage.getItem('websiteLanguage')!
        this.translate.use(lang)
        this.selectedLanguage = lang
      }
    })

    if (this.configSvc && this.configSvc.unMappedUser && this.configSvc.unMappedUser.roles) {
      this.roles = this.configSvc.unMappedUser.roles
    }
  }

  ngOnInit() {
    const instanceConfig = this.configSvc.instanceConfig
    if (instanceConfig) {
      this.multiLang = instanceConfig.websitelanguages
      this.isMultiLangEnabled = instanceConfig.isMultilingualEnabled
    }
    this.rightNavConfig = this.rightNavConfig?.topRightNavConfig ? this.rightNavConfig.topRightNavConfig : this.rightNavConfig
    this.homePageService.closeDialogPop.subscribe((data: any) => {
      if (data) {
        this.dialogRef.close()
      }
    })

    this.http.get(this.zohoUrl, { responseType: 'text' }).subscribe(res => {
      this.zohoHtml = this.sanitizer.bypassSecurityTrustHtml(res)
    })
  }

  ngOnChanges() {
    this.rightNavConfig = this.rightNavConfig?.topRightNavConfig ? this.rightNavConfig?.topRightNavConfig : this.rightNavConfig
  }
  // ngOnChanges() {}
  // openDialog(): void {
  //   this.dialogRef = this.dialog.open(DialogBoxComponent, {
  //     width: '1000px',
  //   })
  translateLabels(label: string, type: any) {
    return this.langtranslations.translateLabel(label, type, '')
  }

  onBellClick() {
    if (this.notificationsCount > 0) {
      this.notificationsService.resetNotificationsCount().subscribe((res: any) => {
        if (res.responseCode === 'OK') {
          this.notificationsCount = 0
        }
      }, error => {
        console.error('Error while fetching notifications count', error)
      })
    }
    this.showDropdown = false
    setTimeout(() => {
      this.showDropdown = true
    })
  }

  onMenuClosed() {
    this.showDropdown = false
    // setTimeout(() => {
    //   this.showDropdown = false
    // }, 3000)
  }

  selectLanguage(event: any) {
    this.selectedLanguage = event
    localStorage.setItem('websiteLanguage', this.selectedLanguage)
    this.langtranslations.updatelanguageSelected(
      true,
      this.selectedLanguage,
      this.configSvc.unMappedUser ? this.configSvc.unMappedUser.id : ''
    )
    this.configSvc.languageTranslationFlag.next(true)
  }

  getZohoForm() {
    const dialogRef = this.dialog.open(ZohoDialogComponent, {
      width: '45%',
      data: {
        view: 'zohoform',
        value: this.zohoHtml,
      },
    })
    dialogRef.afterClosed().subscribe(() => {
    })
    setTimeout(() => {
      this.callXMLRequest()
    }, 0)
  }

  openDialog(): void {
    this.dialogRef = this.dialog.open(DialogBoxComponent, {
      width: '1000px',
    })

    this.dialogRef.afterClosed().subscribe(() => {
    })
  }

  callXMLRequest() {
    let webFormxhr: any = {}
    webFormxhr = new XMLHttpRequest()
    // tslint:disable-next-line: prefer-template
    webFormxhr.open('GET', 'https://desk.zoho.in/support/GenerateCaptcha?action=getNewCaptcha&_=' + new Date().getTime(), true)
    webFormxhr.onreadystatechange = () => {
      if (webFormxhr.readyState === 4 && webFormxhr.status === 200) {
        try {
          const response = (webFormxhr.responseText != null) ? JSON.parse(webFormxhr.responseText) : ''
          const zsCaptchaUrl: any = document.getElementById('zsCaptchaUrl')
          if (zsCaptchaUrl) {
            zsCaptchaUrl.src = response.captchaUrl
            zsCaptchaUrl.style.display = 'block'
          }
          const xJdfEaS: any = document.getElementsByName('xJdfEaS')[0]
          xJdfEaS.value = response.captchaDigest
          const zsCaptchaLoading: any = document.getElementById('zsCaptchaLoading')
          zsCaptchaLoading.style.display = 'none'
          const zsCaptcha: any = document.getElementById('zsCaptcha')
          zsCaptcha.style.display = 'block'
          const refreshCaptcha: any = document.getElementById('refreshCaptcha')
          if (refreshCaptcha) {
            refreshCaptcha.addEventListener('click', () => {
              this.callXMLRequest()
            })
          }
        } catch (e) {
        }
      }
    }
    webFormxhr.send()
  }

  viewAllClick(event: any) {
    if (event.category === 'PEER_VALIDATION' || event.sub_type === 'PEER_VALIDATION') {
      this.raiseTelemetryEventForNotification(event)
      if (event.sub_category === 'PEER_REVIEW_ASSIGNED') {
        this.openVerificationPopup(event)
      } else {
        this.openSurveypopup(event)
      }
    } else if (event.category) {
      this.raiseTelemetryEventForNotification(event)
      this.notificationsService.handleRedirection(event, environment, this.roles, this.snackBar)
    } else {
      this.router.navigate(['/app/notifications'], { queryParams: { tab: event } })
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    const dd = String(date.getDate()).padStart(2, '0')
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const yyyy = date.getFullYear()
    return `${dd}-${mm}-${yyyy}`
  }

  openSurveypopup(notification: any) {
    const profile = this.configSvc.userProfile
    const learnerName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim()
    const notifData = notification.message?.data?.[0] || {}
    if (notification.status === "SUBMITTED") {
      this.snackBar.open('You have already completed the survey.', 'X', { duration: 3000 })
      return
    }
    if (notification.status === "IGNORED") {
      this.snackBar.open('You have already submitted the response.', 'X', { duration: 3000 })
      return
    }
    if (notification.status === "EXPIRED") {
      this.snackBar.open('Survey has ended.', 'X', { duration: 3000 })
      return
    }
    if (notifData.surveyEndDate && new Date(notifData.surveyEndDate) < new Date()) {
      this.snackBar.open('Survey has ended.', 'X', { duration: 3000 })
      return
    }
    if (notification.survey_end_date && new Date(notification.survey_end_date) < new Date()) {
      this.snackBar.open('Survey has ended.', 'X', { duration: 3000 })
      return
    }
    const dialogRef = this.matDialog.open(SurveyPopupComponent, {
      width: '500px',
      disableClose: true,
      data: {
        learnerName: learnerName || '',
        courseName: notifData.courseName || notifData.course_name || '',
        completionDate: this.formatDate(notifData.completionDate || ''),
        formId: notifData.formId || '',
        isSurveySubmitted: notifData.isSurveySubmitted || false,
        surveyCreatedById: notifData.surveyCreatedById || '',
        notificationId: notification.notification_id || '',
        createdAt: notification.created_at || '',
        contextOrgId: notifData.contextOrgId || notifData.org_id || '',
        contextId: notifData.contextId || notifData.cource_id || '',
        thumbnail: notifData.thumbnail || '',
      },
    })
    dialogRef.afterClosed().subscribe(result => {
      if (result === 'ignored') {
        notification.status = 'IGNORED'
      }
    })
  }

  openVerificationPopup(notification: any) {
    const notifData = notification.message?.data?.[0] || {}
    if (notification.status === "APPROVED" || notification.status === "REJECTED") {
      this.snackBar.open('You have already submitted the review.', 'X', { duration: 3000 })
      return
    }
    if (notification.status === "IGNORED") {
      this.snackBar.open('You have already submitted the response.', 'X', { duration: 3000 })
      return
    }
    if (notification.status === "EXPIRED") {
      this.snackBar.open('Survey has ended.', 'X', { duration: 3000 })
      return
    }
    if (notifData.surveyEndDate && new Date(notifData.surveyEndDate) < new Date()) {
      this.snackBar.open('Survey has ended.', 'X', { duration: 3000 })
      return
    }
    if (notification.survey_end_date && new Date(notification.survey_end_date) < new Date()) {
      this.snackBar.open('Survey has ended.', 'X', { duration: 3000 })
      return
    }
    const verificationDialogRef = this.matDialog.open(VerificationRequestDialogComponent, {
      width: '440px',
      maxWidth: '90vw',
      disableClose: true,
      data: {
        requestedName: notifData.requestedName || notifData.learnerName || '',
        courseName: notifData.courseName || notifData.course_name || '',
        formId: notifData.formId || '',
        isReviewSubmitted: notifData.isReviewSubmitted || false,
        surveyEndDate: notifData.surveyEndDate || notification.survey_end_date || '',
        notificationId: notification.notification_id || '',
        createdAt: notification.created_at || '',
        contextOrgId: notifData.contextOrgId || notifData.org_id || '',
        contextId: notifData.contextId || notifData.cource_id || '',
        submittedBy: notifData.learnerId || notifData.submittedBy || '',
        thumbnail: notifData.thumbnail || '',
      },
    })
    verificationDialogRef.afterClosed().subscribe(result => {
      if (result === 'ignored') {
        notification.status = 'IGNORED'
      }
    })
  }

  reCountNotifications(event: any) {
    this.notificationsService.nofificationsCount.next(event)
  }

  calculateCount(event: any) {
    console.log("sds", event)
  }

  showDialog(data: any, url: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, data)
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        window.open(url, '_blank')
      }
    })
  }

  raiseTelemetryEventForNotification(notification: any) {
    this.events.raiseInteractTelemetry(
      {
        type: 'click',
        subType: 'notification-engine',
        id: notification.notification_id,
      },
      {},
      {
        module: 'Home',
      }
    )
  }

  openSupportChatBot() {
    if (this.configSvc.iGOTAIConfig && this.configSvc.iGOTAIConfig?.supportAI && this.configSvc.iGOTAIConfig?.supportAI?.all) {
      this.enableSupportAI = true
      this.rootService.openSupportAIChatbot.next(true)
    } else if (this.configSvc.iGOTAIConfig && this.configSvc.iGOTAIConfig?.supportAI && this.configSvc.iGOTAIConfig?.supportAI?.forOrg && this.configSvc.iGOTAIConfig?.supportAI?.forOrg?.length
      && this.configSvc.iGOTAIConfig?.supportAI?.forOrg?.includes(this.configSvc.userProfile?.rootOrgId)
    ) {
      this.enableSupportAI = true
      this.rootService.openSupportAIChatbot.next(true)
    } else {
      this.getZohoForm()
    }
  }

}
