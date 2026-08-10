import { Component, OnInit } from '@angular/core'
import { Router } from '@angular/router'
import {
  ConfigurationsService,
  EventService,
  MultilingualTranslationsService,
  WsEvents,
} from '@sunbird-cb/utils-v2'
import { CommonDataService } from '../../services/common-data.service'

@Component({
  selector: 'ws-app-explore-menu',
  templateUrl: './explore-menu.component.html',
  styleUrls: ['./explore-menu.component.scss'],
  standalone: false,
})
export class ExploreMenuComponent implements OnInit {
  // the two section kinds this page renders; stat_cards is recognised only so it can
  // be skipped (its values are computed in root.component, not carried in the config)
  readonly NAV_LIST = 'nav_list'
  readonly INFO_CARDS = 'info_cards'
  readonly STAT_CARDS = 'stat_cards'

  sections: any[] = []

  // items whose navUrl is empty are actions rather than routes; this is the one
  // such code in the nav list and it mirrors root.component -> exploreContent()
  private readonly CODE_ROUTES: { [code: string]: { path: string, queryParams: any } } = {
    explore: {
      path: '/app/globalsearch',
      queryParams: { q: '', search: null, category: 'courses', p: null, f: null, tab: 'explore-content', filtersPanel: 'show' },
    },
  }

  constructor(
    private configSvc: ConfigurationsService,
    private router: Router,
    private eventSvc: EventService,
    private commonDataSvc: CommonDataService,
    private langtranslations: MultilingualTranslationsService,
  ) { }

  ngOnInit() {
    // root.component resolves the sidebar config once and publishes it here, so this
    // page renders the same items without resolving anything itself. BehaviorSubject,
    // so a value that is already there arrives synchronously
    this.commonDataSvc.leftNavBarConfig.subscribe((leftNavBar: any) => {
      if (leftNavBar) {
        this.buildSections(leftNavBar)
      }
    })
    // nothing published yet (e.g. deep-linked straight to this route): read the
    // app config directly
    if (!this.sections.length) {
      this.buildSections((this.configSvc.instanceConfig as any)?.leftNavBar)
    }
  }

  /**
   * `showInMweb: false` drops a section, an item or a single child from this page only;
   * the desktop sidebar ignores the key, so anything can be sidebar-only without a
   * second config block
   */
  private buildSections(leftNavBar: any) {
    const navSections = leftNavBar?.navSections
    if (!Array.isArray(navSections)) {
      return
    }
    this.sections = navSections
      .filter((section: any) => this.isVisible(section))
      .map((section: any) => ({
        ...section,
        kind: this.cardKind(section),
        items: this.buildItems(section.items),
      }))
      // stat_cards is dropped here: only nav_list and info_cards have a renderer below
      .filter((section: any) => (section.kind === this.NAV_LIST || section.kind === this.INFO_CARDS)
        && section.items.length)
  }

  /**
   * cardType is matched loosely (nav_list / navList / NAV-LIST all work) because the
   * value comes from config that is authored in more than one place
   */
  private cardKind(section: any): string {
    const cardType = (section?.cardType || '').toString().toLowerCase().replace(/[^a-z]/g, '')
    if (cardType.includes('info')) {
      return this.INFO_CARDS
    }
    if (cardType.includes('stat')) {
      return this.STAT_CARDS
    }
    if (cardType.includes('nav')) {
      return this.NAV_LIST
    }
    // unknown cardType: render as the card grid when the items look like links
    const items = Array.isArray(section?.items) ? section.items : []
    return items.some((item: any) => item?.label || item?.title) ? this.NAV_LIST : ''
  }

  private buildItems(items: any[] = []): any[] {
    if (!Array.isArray(items)) {
      return []
    }
    return items
      .filter((item: any) => this.isVisible(item))
      .map((item: any) => {
        if (!item.children || !item.children.length) {
          return item
        }
        // children (e.g. Other Portals) are role-gated the same way the sidebar
        // does it in root.component -> setOtherPortals()
        const children = item.children.filter((child: any) => this.isVisible(child) && this.hasAccess(child))
        return { ...item, children, hasChildren: children.length > 0 }
      })
      // a parent whose children were all filtered out has nothing left to show
      .filter((item: any) => !item.children || item.children.length > 0)
  }

  private isVisible(entry: any): boolean {
    return entry && entry.enabled !== false && entry.showInMweb !== false
  }

  private hasAccess(child: any): boolean {
    let childRoles: string[] = []
    if (Array.isArray(child.rolesCanAccess)) {
      childRoles = child.rolesCanAccess
    } else if (typeof child.rolesCanAccess === 'string') {
      childRoles = child.rolesCanAccess.split(',').map((role: string) => role.trim()).filter(Boolean)
    }
    if (!childRoles.length) {
      return true
    }
    const userRoles = new Set(Array.from(this.configSvc.userRoles || [])
      .map((role: any) => (role || '').toString().toLowerCase()))
    return childRoles.some((role: string) => userRoles.has((role || '').toLowerCase()))
  }

  onItemClick(item: any) {
    this.raiseTelemetry(item?.code, item?.subType || item?.subtype || '')
    const navUrl = item?.navUrl
    if (!navUrl) {
      const action = this.CODE_ROUTES[item?.code]
      if (action) {
        const path = item?.code === 'explore' ? this.getGlobalSearchRoute() : action.path
        this.router.navigate([path], { queryParams: action.queryParams, queryParamsHandling: 'merge' })
      }
      return
    }
    if (/^https?:\/\//.test(navUrl)) {
      window.open(navUrl, '_blank')
      return
    }
    this.router.navigate([navUrl], item?.queryParams ? { queryParams: item.queryParams } : {})
  }

  private getGlobalSearchRoute(): string {
    const profileRoles = this.configSvc.userProfileV2?.userRoles || []
    const isVolunteer = (!!this.configSvc.userRoles && this.configSvc.userRoles.has('volunteer'))
      || (Array.isArray(profileRoles) && profileRoles.some(
        (role: any) => (typeof role === 'string' ? role : role?.role || '').toUpperCase() === 'VOLUNTEER'
      ))
    return isVolunteer ? '/app/globalsearch/volunteer' : '/app/globalsearch'
  }

  // the info-cards section navigates on its own (routerLink / href), so this only
  // needs to mirror the telemetry the sidebar raises through root.component
  onInfoCardClick(event: any) {
    this.raiseTelemetry(event?.code, event?.subType || '')
  }

  label(item: any): string {
    const text = item?.label || item?.title || ''
    return item?.disableTranslate ? text : this.translateLabels(text, 'leftNavBar')
  }

  description(item: any): string {
    const text = item?.description || ''
    return item?.disableTranslate ? text : this.translateLabels(text, 'leftNavBar')
  }

  heading(section: any): string {
    const text = section?.sectionTitle || ''
    return section?.disableTranslate ? text : this.translateLabels(text, 'leftNavBar')
  }

  translateLabels(label: string, type: string): string {
    return this.langtranslations.translateActualLabel(label, type, '')
  }

  trackBySectionKey(_index: number, section: any) {
    return section?.sectionKey
  }

  trackByCode(_index: number, item: any) {
    return item?.code
  }

  private raiseTelemetry(id: string, subType: string = '') {
    const eData: any = {
      id,
      type: WsEvents.EnumInteractTypes.CLICK,
    }
    if (subType) {
      const telemetrySubTypeKey = subType as keyof typeof WsEvents.EnumTelemetrySubType
      if (WsEvents.EnumTelemetrySubType[telemetrySubTypeKey]) {
        eData.subType = WsEvents.EnumTelemetrySubType[telemetrySubTypeKey]
      }
    }
    this.eventSvc.raiseInteractTelemetry(eData, {}, { module: WsEvents.EnumTelemetrymodules.HOME })
  }
}
