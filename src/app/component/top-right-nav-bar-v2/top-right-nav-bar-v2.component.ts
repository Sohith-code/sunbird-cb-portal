import { Component, OnInit, OnDestroy, inject, signal, computed, input, effect } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatDialog } from '@angular/material/dialog'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { MatButtonModule } from '@angular/material/button'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatSelectModule } from '@angular/material/select'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatSnackBar } from '@angular/material/snack-bar'
import { FormsModule } from '@angular/forms'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import { Router } from '@angular/router'
import { SafeHtml } from '@angular/platform-browser'
import { Subscription } from 'rxjs'

import { HomePageService } from '../../services/home-page.service'
import { ZohoSupportService } from '../../services/zoho-support.service'
import { ConfigurationsService, EventService, MultilingualTranslationsService } from '@sunbird-cb/utils-v2'
import { DialogBoxComponent } from './../dialog-box/dialog-box.component'
import { DialogBoxComponent as ZohoDialogComponent } from '@ws/app'
import { ConfirmDialogComponent } from '@sunbird-cb/collection'
import { SurveyPopupComponent } from '@ws/app'
import { VerificationRequestDialogComponent } from '@ws/app'
import { RootService } from '../root/root.service'
import { NotificationsService } from '../../services/notifications.service'
import { ThemeService } from '@sunbird-cb/design-system'
import { BtnSettingsService } from '@sunbird-cb/collection'
import { environment } from '../../../environments/environment'
import { NotificationDropdownModule } from '@sunbird-cb/notification'
import { WidgetResolverModule } from '@sunbird-cb/resolver'

@Component({
  selector: 'ws-top-right-nav-bar-v2',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatTooltipModule,
    MatSelectModule,
    MatFormFieldModule,
    TranslateModule,
    NotificationDropdownModule,
    WidgetResolverModule
  ],
  templateUrl: './top-right-nav-bar-v2.component.html',
  styleUrls: ['./top-right-nav-bar-v2.component.scss'],
})
export class TopRightNavBarV2Component implements OnInit, OnDestroy {
  // Inputs as signals
  item = input<any>({})
  rightNavConfigInput = input<any>(undefined, { alias: 'rightNavConfig' })
  showLangDropdown = input(true)
  notificationsCountInput = input<any>(0, { alias: 'notificationsCount' })

  // State signals
  notificationsCount = signal(0)
  selectedLanguage = signal('en')
  multiLang = signal<any[]>([])
  zohoHtml = signal<SafeHtml>('')
  isMultiLangEnabled = signal(false)
  showDropdown = signal(false)
  roles = signal<string[]>([])
  enableSupportAI = signal(false)
  fontSizeLevel = signal(2) // 0=x-small, 1=small, 2=normal, 3=large, 4=x-large

  // Computed
  rightNavConfig = computed(() => {
    const input = this.rightNavConfigInput()
    return input?.topRightNavConfig ? input.topRightNavConfig : input
  })

  fontLabel = computed(() => this.fontLabels[this.fontSizeLevel()])

  // Constants
  private readonly fontClasses = ['x-small-typography', 'small-typography', 'normal-typography', 'large-typography', 'x-large-typography']
  private readonly fontLabels = ['XS', 'S', 'M', 'L', 'XL']

  // Injected services
  private dialog = inject(MatDialog)
  private homePageService = inject(HomePageService)
  private configSvc = inject(ConfigurationsService)
  private langtranslations = inject(MultilingualTranslationsService)
  private translate = inject(TranslateService)
  private zohoSupportSvc = inject(ZohoSupportService)
  private events = inject(EventService)
  private snackBar = inject(MatSnackBar)
  private router = inject(Router)
  private notificationsService = inject(NotificationsService)
  private rootService = inject(RootService)
  themeSvc = inject(ThemeService)
  private btnSettingsSvc = inject(BtnSettingsService)

  private dialogRef: any
  private subs: Subscription[] = []

  constructor() {
    const storedLang = localStorage.getItem('websiteLanguage')
    if (storedLang) {
      this.translate.setDefaultLang('en')
      this.selectedLanguage.set(storedLang)
      this.translate.use(storedLang)
    }
    this.subs.push(
      this.langtranslations.languageSelectedObservable.subscribe(() => {
        const lang = localStorage.getItem('websiteLanguage')
        if (lang) {
          this.translate.setDefaultLang('en')
          this.translate.use(lang)
          this.selectedLanguage.set(lang)
        }
      })
    )

    if (this.configSvc?.unMappedUser?.roles) {
      this.roles.set(this.configSvc.unMappedUser.roles)
    }

    // Sync input notificationsCount to local signal
    effect(() => {
      this.notificationsCount.set(this.notificationsCountInput())
    })
  }

  ngOnInit() {
    this.initFontLevel()

    const instanceConfig = this.configSvc.instanceConfig
    if (instanceConfig) {
      this.multiLang.set(instanceConfig.websitelanguages || [])
      this.isMultiLangEnabled.set(!!instanceConfig.isMultilingualEnabled)
    }

    this.subs.push(
      this.homePageService.closeDialogPop.subscribe((data: any) => {
        if (data) {
          this.dialogRef?.close()
        }
      })
    )

    this.subs.push(
      this.zohoSupportSvc.getZohoHtml().subscribe(res => {
        this.zohoHtml.set(res)
      })
    )
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe())
  }

  translateLabels(label: string, type: any) {
    return this.langtranslations.translateLabel(label, type, '')
  }

  onBellClick() {
    if (this.notificationsCount() > 0) {
      this.notificationsService.resetNotificationsCount().subscribe(
        (res: any) => {
          if (res.responseCode === 'OK') {
            this.notificationsCount.set(0)
          }
        },
        error => console.error('Error while fetching notifications count', error)
      )
    }
    this.showDropdown.set(false)
    setTimeout(() => this.showDropdown.set(true))
  }

  onMenuClosed() {
    this.showDropdown.set(false)
  }

  selectLanguage(langKey: string) {
    this.selectedLanguage.set(langKey)
    localStorage.setItem('websiteLanguage', langKey)
    this.langtranslations.updatelanguageSelected(
      true,
      langKey,
      this.configSvc.unMappedUser ? this.configSvc.unMappedUser.id : ''
    )
    this.configSvc.languageTranslationFlag.next(true)
  }

  getZohoForm() {
    const dialogRef = this.dialog.open(ZohoDialogComponent, {
      width: '45%',
      data: { view: 'zohoform', value: this.zohoHtml() },
    })
    dialogRef.afterClosed().subscribe(() => { })
    setTimeout(() => this.callXMLRequest(), 0)
  }

  openDialog() {
    this.dialogRef = this.dialog.open(DialogBoxComponent, { width: '1000px' })
    this.dialogRef.afterClosed().subscribe(() => { })
  }

  callXMLRequest() {
    const webFormxhr = new XMLHttpRequest()
    webFormxhr.open('GET', 'https://desk.zoho.in/support/GenerateCaptcha?action=getNewCaptcha&_=' + new Date().getTime(), true)
    webFormxhr.onreadystatechange = () => {
      if (webFormxhr.readyState === 4 && webFormxhr.status === 200) {
        try {
          const response = webFormxhr.responseText ? JSON.parse(webFormxhr.responseText) : ''
          const zsCaptchaUrl = document.getElementById('zsCaptchaUrl') as HTMLImageElement
          if (zsCaptchaUrl) {
            zsCaptchaUrl.src = response.captchaUrl
            zsCaptchaUrl.style.display = 'block'
          }
          const xJdfEaS = document.getElementsByName('xJdfEaS')[0] as HTMLInputElement
          if (xJdfEaS) xJdfEaS.value = response.captchaDigest
          const zsCaptchaLoading = document.getElementById('zsCaptchaLoading')
          if (zsCaptchaLoading) zsCaptchaLoading.style.display = 'none'
          const zsCaptcha = document.getElementById('zsCaptcha')
          if (zsCaptcha) zsCaptcha.style.display = 'block'
          const refreshCaptcha = document.getElementById('refreshCaptcha')
          if (refreshCaptcha) {
            refreshCaptcha.addEventListener('click', () => this.callXMLRequest())
          }
        } catch (_e) { }
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
      this.notificationsService.handleRedirection(event, environment, this.roles(), this.snackBar)
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

    if (notification.status === 'SUBMITTED') {
      this.snackBar.open('You have already completed the survey.', 'X', { duration: 3000 })
      return
    }
    if (notification.status === 'IGNORED') {
      this.snackBar.open('You have already submitted the response.', 'X', { duration: 3000 })
      return
    }
    if (notification.status === 'EXPIRED') {
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

    const dialogRef = this.dialog.open(SurveyPopupComponent, {
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
      if (result === 'ignored') notification.status = 'IGNORED'
    })
  }

  openVerificationPopup(notification: any) {
    const notifData = notification.message?.data?.[0] || {}

    if (notification.status === 'APPROVED' || notification.status === 'REJECTED') {
      this.snackBar.open('You have already submitted the review.', 'X', { duration: 3000 })
      return
    }
    if (notification.status === 'IGNORED') {
      this.snackBar.open('You have already submitted the response.', 'X', { duration: 3000 })
      return
    }
    if (notification.status === 'EXPIRED') {
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

    const dialogRef = this.dialog.open(VerificationRequestDialogComponent, {
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
    dialogRef.afterClosed().subscribe(result => {
      if (result === 'ignored') notification.status = 'IGNORED'
    })
  }

  reCountNotifications(event: any) {
    this.notificationsService.nofificationsCount.next(event)
  }

  showConfirmDialog(data: any, url: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, data)
    dialogRef.afterClosed().subscribe(result => {
      if (result) window.open(url, '_blank')
    })
  }

  raiseTelemetryEventForNotification(notification: any) {
    this.events.raiseInteractTelemetry(
      { type: 'click', subType: 'notification-engine', id: notification.notification_id },
      {},
      { module: 'Home' }
    )
  }

  openSupportChatBot() {
    const aiConfig = this.configSvc.iGOTAIConfig
    if (aiConfig?.supportAI?.all) {
      this.enableSupportAI.set(true)
      this.rootService.openSupportAIChatbot.next(true)
    } else if (
      aiConfig?.supportAI?.forOrg?.length &&
      aiConfig.supportAI.forOrg.includes(this.configSvc.userProfile?.rootOrgId)
    ) {
      this.enableSupportAI.set(true)
      this.rootService.openSupportAIChatbot.next(true)
    } else {
      this.getZohoForm()
    }
  }

  increaseFontSize() {
    if (this.fontSizeLevel() < 4) {
      this.fontSizeLevel.update(v => v + 1)
      this.applyFontSize()
    }
  }

  decreaseFontSize() {
    if (this.fontSizeLevel() > 0) {
      this.fontSizeLevel.update(v => v - 1)
      this.applyFontSize()
    }
  }

  private initFontLevel() {
    const stored = localStorage.getItem('setting')
    const idx = this.fontClasses.indexOf(stored || 'normal-typography')
    this.fontSizeLevel.set(idx >= 0 ? idx : 2)
  }

  private applyFontSize() {
    const fontClass = this.fontClasses[this.fontSizeLevel()]
    localStorage.setItem('setting', fontClass)
    this.btnSettingsSvc.changeFont(fontClass)
  }
}
