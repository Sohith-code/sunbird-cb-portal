import { CommonModule } from '@angular/common'
import { Component, input, Input, OnInit, signal } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { MatToolbarModule } from '@angular/material/toolbar'
import { RouterModule } from '@angular/router'
import { TranslateModule } from '@ngx-translate/core'
import { ConfirmDialogModule, GridLayoutModule } from '@sunbird-cb/collection'
import { DomainConfService, ValueService } from '@sunbird-cb/utils-v2'
import { AppNavBarV2Component } from '../../component/app-nav-bar-v2/app-nav-bar-v2.component'
import { MobileAppsService } from '../../services/mobile-apps.service'

@Component({
  selector: 'ws-header-v2',
  imports: [
    CommonModule,
    RouterModule,
    ConfirmDialogModule,
    TranslateModule,
    MatToolbarModule,
    MatIconModule,
    AppNavBarV2Component,
    GridLayoutModule
  ],
  templateUrl: './header-v2.component.html',
  styleUrl: './header-v2.component.scss',
})
export class HeaderV2Component implements OnInit {
  // Signals for reactive state management
  leftNavBarOpen = input<boolean>(false);
  @Input() headerFooterConfigData: any
  @Input() showHubs = false

  isXSmall$ = this.valueSvc.isXSmall$
  mobileTopHeaderVisibilityStatus = signal<boolean>(true)
  widgetData: any = {}

  // ws-widget-grid-layout is rendered only to host the NPS rating strip, so it gets an empty widget
  // list. The old ws-header passed its own widgetData here and so also drew the cardHomeHubs
  // secondary bar; the v2 sidebar replaced that bar, and reusing widgetData would bring it back
  npsWidgetData: any = { widgets: [] }

  // global-config -> components.dialogs.npsSurvey (and the dialogs master switch)
  get isNpsEnabled(): boolean {
    return this.domainConfSvc.isConfigEnabled('components.dialogs', 'enabled')
      && this.domainConfSvc.isConfigEnabled('components.dialogs', 'npsSurvey')
  }

  constructor(
    private valueSvc: ValueService,
    private mobileAppsService: MobileAppsService,
    public domainConfSvc: DomainConfService
  ) { }

  ngOnInit(): void {
    this.widgetData = {
      widgets: [
        [
          {
            dimensions: {},
            className: 'ws-mat-primary-lite-background-important new-box-hubs',
            widget: {
              widgetType: 'card',
              widgetSubType: 'cardHomeHubs',
              widgetData: {},
            },
          },
        ],
      ],
    }
  }

  downloadApp(): void {
    const userAgent = navigator.userAgent
    // Windows Phone must come first because its UA also contains "Android"
    if (/windows phone/i.test(userAgent)) {
      window.open('https://play.google.com/store/apps/details?id=com.igot.karmayogibharat&hl=en&gl=US', '_blank')
    }

    if (/android/i.test(userAgent)) {
      window.open('https://play.google.com/store/apps/details?id=com.igot.karmayogibharat&hl=en&gl=US', '_blank')
    }

    // iOS detection from: http://stackoverflow.com/a/9039885/177710
    if (/iPad|iPhone|iPod/.test(userAgent)) {
      window.open('https://apps.apple.com/in/app/igot-karmayogi/id6443949491', '_blank')
    }
  }

  hideMobileTopHeader(): void {
    this.mobileTopHeaderVisibilityStatus.set(false)
    this.mobileAppsService.mobileTopHeaderVisibilityStatus.next(false)
  }
}
