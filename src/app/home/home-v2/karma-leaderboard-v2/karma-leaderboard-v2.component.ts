import { Component, OnInit, inject, input, output } from '@angular/core'
import { ConfigurationsService, EventService, WsEvents } from '@sunbird-cb/utils-v2'
import { HomePageService } from '../../../services/home-page.service'
import { UserProfileService } from '../../../../../project/ws/app/src/lib/routes/user-profile/services/user-profile.service'
import moment from 'moment'
import { RouterModule } from '@angular/router'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { MatTooltipModule } from '@angular/material/tooltip'
import { AvatarPhotoModule } from '@sunbird-cb/collection'
import { TranslateModule } from '@ngx-translate/core'
import { TitleCasePipe } from '@angular/common'

@Component({
  selector: 'ws-karma-leaderboard-v2',
  templateUrl: './karma-leaderboard-v2.component.html',
  styleUrls: ['./karma-leaderboard-v2.component.scss'],
  standalone: true,
  imports: [RouterModule, MatIconModule, MatButtonModule, MatTooltipModule, AvatarPhotoModule, TranslateModule, TitleCasePipe],
})
export class KarmaLeaderboardV2Component implements OnInit {

  readonly close = output<void>()
  readonly embedded = input(false)

  loading = true
  rank1: any = null
  rank2: any = null
  rank3: any = null
  otherUsers: any[] = []
  currentUserRank: any = null
  currentUserId = ''
  monthName = ''
  year: any = null
  myKarmaPoints = 0

  // Celebration banner
  showOverlay = false
  overLayText = ''
  currentUserProfile: any = null

  readonly tooltipText =
    'The learner leaderboard is calculated based on the Karma Points earned in a month and updated on the 1st of every month.'

  leaderboardUnavailableTitle = 'Leaderboard Not Yet Available'
  leaderboardUnavailableMessage =
    'The learner leaderboard is calculated based on the Karma Points earned in a month and updated on the 1st of every month.'

  private readonly homePageSvc = inject(HomePageService)
  private readonly configSvc = inject(ConfigurationsService)
  private readonly userProfileSvc = inject(UserProfileService)
  private readonly eventSvc = inject(EventService)

  ngOnInit() {
    this.currentUserId = (this.configSvc.unMappedUser && this.configSvc.unMappedUser.id) || ''
    this.currentUserProfile = this.configSvc.unMappedUser && this.configSvc.unMappedUser.profileDetails

    try {
      const raw = localStorage.getItem('userEnrollmentCount')
      if (raw) {
        const parsed = JSON.parse(raw)
        this.myKarmaPoints = (parsed && parsed.userCourseEnrolmentInfo && parsed.userCourseEnrolmentInfo.karmaPoints) || 0
      }
    } catch (_e) { /* ignore */ }

    this.setLeaderboardUnavailableCopy()
    this.loadLeaderboard()
  }

  private setLeaderboardUnavailableCopy() {
    const navSections = (this.configSvc.instanceConfig
      && this.configSvc.instanceConfig.leftNavBar
      && this.configSvc.instanceConfig.leftNavBar.navSections) || []
    const achievements = navSections.find((section: any) => section.sectionKey === 'my_achievements')
    if (!achievements) {
      return
    }
    this.leaderboardUnavailableTitle = achievements.leaderboardUnavailableMessageTitle || this.leaderboardUnavailableTitle
    this.leaderboardUnavailableMessage = achievements.leaderboardUnavailableMessage || this.leaderboardUnavailableMessage
  }

  get isCurrentUserInTop3(): boolean {
    return [
      this.rank1?.userId,
      this.rank2?.userId,
      this.rank3?.userId,
    ].includes(this.currentUserId)
  }

  get isCurrentUserInOtherList(): boolean {
    return this.otherUsers.some((u: any) => u.userId === this.currentUserId)
  }

  ordinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
  }

  isNotClamped(el: HTMLElement): boolean {
    if (!el) { return true }
    return el.scrollHeight <= el.clientHeight
  }

  loadLeaderboard() {
    this.loading = true
    this.homePageSvc.getLearnerLeaderboardCached().subscribe(
      (res: any) => {
        if (res && res.result && res.result.result && res.result.result.length) {
          const results: any[] = res.result.result
          this.rank1 = results[0] || null
          this.rank2 = results[1] || null
          this.rank3 = results[2] || null
          this.otherUsers = results.slice(3, 6)
          this.currentUserRank = results.find((r: any) => r.userId === this.currentUserId) || null
          if (this.rank1) {
            const months = [
              'January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December',
            ]
            this.monthName = months[Number(this.rank1.month) - 1] || ''
            this.year = this.rank1.year
          }

          // ── Celebration banner (mirrors user-leaderboard logic) ──
          if (this.currentUserRank && this.currentUserRank.rank < this.currentUserRank.previous_rank) {
            const rankDiff = this.currentUserRank.previous_rank - this.currentUserRank.rank
            const levelWord = rankDiff === 1 ? 'level' : 'levels'
            this.overLayText = `Congratulations on reaching the ${this.ordinal(this.currentUserRank.rank)} rank this month, which is ${rankDiff} ${levelWord} higher than your previous ranking.`
            const isMessageShown = localStorage.getItem('motivationalMessage')
            if (!isMessageShown) {
              this.showOverlayMessage()
            }
            if (isMessageShown && this.currentUserProfile && this.currentUserProfile.lastMotivationalMessageTime) {
              const date = moment(this.currentUserProfile.lastMotivationalMessageTime)
              if ((date.month() === 0 && (+this.rank1.month !== 12)) ||
                (date.month() !== 0 && date.month() !== (+this.rank1.month))) {
                this.showOverlayMessage()
              }
            }
          }
        }
        this.loading = false
        this.raiseImpressionTelemetry()
      },
      () => { this.loading = false },
    )
  }

  showOverlayMessage() {
    this.showOverlay = true
    this.updateMotivationalMessagestatus()
    setTimeout(() => {
      this.showOverlay = false
    }, 5000)
  }

  dismissOverlay() {
    this.showOverlay = false
    this.eventSvc.raiseInteractTelemetry(
      { id: 'karma-leaderboard-celebration-dismiss', type: WsEvents.EnumInteractTypes.CLICK, subType: 'celebration-banner' },
      {},
      { module: WsEvents.EnumTelemetrymodules.KARMAPOINTS }
    )
  }

  onNavBtnClick() {
    this.close.emit()
    this.eventSvc.raiseInteractTelemetry(
      { id: 'karma-leaderboard-view-karma-points', type: WsEvents.EnumInteractTypes.CLICK, subType: 'view-karma-points' },
      {},
      { module: WsEvents.EnumTelemetrymodules.KARMAPOINTS }
    )
  }

  private raiseImpressionTelemetry() {
    this.eventSvc.raiseInteractTelemetry(
      { id: 'karma-leaderboard-impression', type: WsEvents.EnumInteractTypes.CLICK, subType: 'leaderboard-loaded' },
      {},
      { module: WsEvents.EnumTelemetrymodules.KARMAPOINTS }
    )
  }

  updateMotivationalMessagestatus() {
    const reqUpdates = {
      request: {
        userId: this.configSvc.unMappedUser.id,
        profileDetails: { lastMotivationalMessageTime: new Date() },
      },
    }
    this.userProfileSvc.editProfileDetails(reqUpdates).subscribe((_res: any) => {
      localStorage.setItem('motivationalMessage', 'yes')
    })
  }

}
