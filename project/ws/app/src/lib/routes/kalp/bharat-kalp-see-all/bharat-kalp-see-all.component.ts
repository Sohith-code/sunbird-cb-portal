import { Component, HostListener, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { HttpClient } from '@angular/common/http'
import { ConfigurationsService } from '@sunbird-cb/utils-v2'
import { catchError } from 'rxjs/operators'
import { of } from 'rxjs'
import { NsContent, VIEWER_ROUTE_FROM_MIME } from '@sunbird-cb/collection'

const ALL_WEEKS = 0

interface ContentTypeTab {
  key: string
  label: string
}

@Component({
  selector: 'ws-app-bharat-kalp-see-all',
  templateUrl: './bharat-kalp-see-all.component.html',
  styleUrls: ['./bharat-kalp-see-all.component.scss'],
  standalone: false,
})
export class BharatKalpSeeAllComponent implements OnInit {
  readonly ALL_WEEKS = ALL_WEEKS

  /* Week filter */
  weeks: number[] = []
  currentWeek = 1
  selectedWeek: number = ALL_WEEKS
  weekDropdownOpen = false
  /* Status pills */
  readonly statusPills = ['All', 'In Progress', 'Completed', 'Not Started']
  selectedStatus = 'All'

  /* Content type tabs */
  activeTabIndex = 0
  activetabKey = ''

  /* Search */
  searchText = ''

  /* Pagination */
  itemsPerPage = 10
  currentPage = 0
  readonly itemsPerPageOptions = [10, 20, 50, 100]

  /* Data */
  loading = false
  allCards: any[] = []
  enrollmentMap: { [id: string]: number } = {}  /* courseId → completionPercentage */
  weekProgress: any = null
  weeksData: any[] = []
  bkConfig: any = {}

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private configSvc: ConfigurationsService,
  ) { }

  /* Status logic (same as portal's content-strip-with-tabs-pills):
     Not Started  = identifier NOT in enrollment
     In Progress  = in enrollment AND completionPercentage < 100
     Completed    = in enrollment AND completionPercentage >= 100              */
  private _getStatus(identifier: string): 'Not Started' | 'In Progress' | 'Completed' {
    if (!this.enrollmentMap.hasOwnProperty(identifier)) return 'Not Started'
    return this.enrollmentMap[identifier] >= 100 ? 'Completed' : 'In Progress'
  }


  private _loadEnrollmentForExt(allIds: string[]): void {
    const userId = (this.configSvc as any)?.userProfile?.userId
    if (!allIds.length || !userId) return
    allIds.forEach(id => {
      this.http.get<any>(
        `/apis/proxies/v8/cios-enroll/v1/readby/useridcourseid/${id}`,
      ).pipe(catchError(() => of(null)))
        .subscribe(res => {
          const map: { [id: string]: number } = {};
          ([res?.result?.courses || []]).forEach((c: any) => {
            const id = c.contentId
            if (id) map[id] = c.completionPercentage ?? 0
          })
          this.enrollmentMap = map
        })
    })

  }

  private _loadEnrollment(allIds: string[]): void {
    const userId = (this.configSvc as any)?.userProfile?.userId
    if (!allIds.length || !userId) return
    this.http.post<any>(
      `/apis/proxies/v8/learner/course/v4/user/enrollment/details/${userId}`,
      { request: { courseId: allIds } }
    ).pipe(catchError(() => of(null)))
      .subscribe(res => {
        const map: { [id: string]: number } = {}
          ; (res?.result?.courses || []).forEach((c: any) => {
            const id = c.courseId || c.identifier || c.contentId
            if (id) map[id] = c.completionPercentage ?? 0
          })
        this.enrollmentMap = map
      })
  }

  ngOnInit(): void {
    const formData = this.route.snapshot.data?.['formData']?.data?.result?.form?.data
    if (formData) {
      this.weekProgress = formData.individualSection?.weekProgress
      this.bkConfig = formData.bkConfig || {}
      /* Extract weeks array from the weeks.tabs format */
      this.weeksData = this.weekProgress?.weeks?.tabs || []
    }

    this.weeks = Array.from({ length: this._computeTotalWeeks() }, (_, i) => i + 1)
    this.currentWeek = this._computeCurrentWeek()

    const qWeek = this.route.snapshot.queryParams?.['week']
    const requestedWeek = qWeek ? +qWeek : ALL_WEEKS
    this.selectedWeek = requestedWeek
    this._fetchContent()
  }

  private _parseBkDate(dateStr: string): Date {
    const parts = dateStr.split('-')
    /* Detect DD-MM-YYYY: third segment is 4-digit year */
    return parts.length === 3 && parts[2].length === 4
      ? new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`)  /* DD-MM-YYYY → YYYY-MM-DD */
      : new Date(dateStr)
  }

  /** Week count derived from bkConfig startDate/endDate; falls back to configured totalWeeks */
  private _computeTotalWeeks(): number {
    const { startDate, endDate } = this.bkConfig || {}
    if (startDate && endDate) {
      const start = this._parseBkDate(startDate)
      const end = this._parseBkDate(endDate)
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
        const diffDays = Math.floor((end.getTime() - start.getTime()) / 86_400_000)
        return Math.ceil((diffDays + 1) / 7)
      }
    }
    return this.bkConfig?.totalWeeks || this.weekProgress?.totalWeeks || 16
  }

  private _computeCurrentWeek(): number {
    const startDate = this.bkConfig?.startDate
    if (!startDate) return 1
    const now = new Date()
    const start = this._parseBkDate(startDate)
    if (now < start) return 1
    const diff = Math.floor((now.getTime() - start.getTime()) / 86_400_000)
    return Math.min(Math.floor(diff / 7) + 1, this.weeks.length)
  }


  /** Content-type tabs (Courses/Programs/Events/Resources/...) present for the selected week (or across
   *  all weeks when "All Weeks" is selected) — a key only shows up as a tab if it has at least one id */
  get contentTypeTabs(): ContentTypeTab[] {
    const keys = new Set<string>()
    const weeksToScan = this.selectedWeek === ALL_WEEKS
      ? this.weeksData
      : this.weeksData.filter((w: any) => w.id === `week_${this.selectedWeek}`)

    weeksToScan.forEach((wd: any) => {
      Object.keys(wd?.content_ids || {}).forEach(key => {
        if ((wd.content_ids[key] || []).length > 0) keys.add(key)
      })
    })

    return Array.from(keys).map(key => ({ key, label: this._tabLabel(key) }))
  }

  /** Derives a display label straight from the content_ids key — e.g. "course" -> "Courses" */
  private _tabLabel(key: string): string {
    const capitalized = key.charAt(0).toUpperCase() + key.slice(1)
    return capitalized.endsWith('s') ? capitalized : `${capitalized}s`
  }

  /** Resources aren't enrollable/trackable content, so the status pills (which filter by enrollment) don't apply */
  get isActiveTabResources(): boolean {
    return this.contentTypeTabs[this.activeTabIndex]?.key === 'resources'
  }

  get isActiveExternalTab(): boolean {
    return this.contentTypeTabs[this.activeTabIndex]?.key === 'extCourses'
  }

  /* Get content_ids for current week + content type */
  private _getContentIds(): string[] {
    const key = this.contentTypeTabs[this.activeTabIndex]?.key
    if (!key) return []

    if (this.selectedWeek === ALL_WEEKS) {
      const ids: string[] = []
      this.weeksData.forEach((wd: any) => {
        ; ((wd?.content_ids?.[key]) || []).forEach((id: string) => {
          if (id && !ids.includes(id)) ids.push(id)
        })
      })
      return ids
    }

    /* Specific week */
    const wd = this.weeksData.find((w: any) => w.id === `week_${this.selectedWeek}`)
    return wd?.content_ids?.[key] || []
  }

  _fetchExtContent(): void {
    this.currentPage = 0
    this.allCards = []
    const ids = this._getContentIds()
    if (!ids.length) return

    this.loading = true
    this.http.post<any>('/apis/proxies/v8/cios/v1/search/content', {
      filterCriteriaMap: {
        "contentPartner.isActive": true,
        contentId: ids,
      },
      requestedFields: [],
      pageNumber: 0,
      pageSize: ids.length + 10,
      orderBy: "createdOn",
      searchString: "",
      facets: [
        "topic",
        "contentPartner.contentPartnerName",
        "competencies_v6.competencyAreaName",
        "competencies_v6.competencyThemeName",
        "competencies_v6.competencySubThemeName"
      ],
    }).pipe(catchError(() => of(null)))
      .subscribe(res => {
        const content: any[] = res?.data || []
        this.allCards = content.map((c: any, i: number) => ({
          content: c,
          cardSubType: 'standard' as 'standard',
          context: { pageSection: 'bharat-kalp-see-all', position: i },
          stateData: {},
        }))
        this.loading = false
        /* Load enrollment data to enable status filtering */
        this._loadEnrollmentForExt(content.map((c: any) => c.contentId).filter(Boolean))
      })
  }

  _fetchContent(): void {
    this.currentPage = 0
    this.allCards = []
    const ids = this._getContentIds()
    if (!ids.length) return

    this.loading = true
    this.http.post<any>('/apis/proxies/v8/sunbirdigot/search', {
      locale: ['en'],
      request: {
        filters: { identifier: ids },
        limit: ids.length + 5,
      },
    }).pipe(catchError(() => of(null)))
      .subscribe(res => {
        const results: any[] = res?.result?.content || []
        this.allCards = results.map((c: any, i: number) => ({
          content: c,
          cardSubType: 'standard' as 'standard',
          context: { pageSection: 'bharat-kalp-see-all', position: i },
          stateData: {},
        }))
        this.loading = false
        /* Load enrollment data to enable status filtering */
        this._loadEnrollment(results.map((c: any) => c.identifier).filter(Boolean))
      })
  }

  onWeekChange(event: Event): void {
    this.selectedWeek = +(event.target as HTMLSelectElement).value
    this.activeTabIndex = 0 /* tab set can change per week — reset to the first visible tab */
    this.activetabKey = ''
    this._fetchContent()
  }

  onCardContentDataExt(content: any): void {
    this.router.navigate(['/app/toc/ext/', content?.contentId], {})
  }


  onStatusSelect(status: string): void { this.selectedStatus = status; this.currentPage = 0 }

  onTabChange(index: number): void {
    this.activeTabIndex = index
    /* Status pills are hidden for Resources — reset so a stale filter doesn't silently hide all cards */
    if (this.isActiveTabResources) this.selectedStatus = 'All'
    this.activetabKey = this.contentTypeTabs[this.activeTabIndex]?.key || ''
    if (this.isActiveExternalTab) {
      this._fetchExtContent()
    } else {
      this._fetchContent()
    }
  }

  trackTabKey(_: number, tab: ContentTypeTab): string { return tab.key }

  onSearch(): void { this.currentPage = 0 }

  onItemsPerPageChange(event: Event): void {
    this.itemsPerPage = +(event.target as HTMLSelectElement).value
    this.currentPage = 0
  }

  get filteredCards(): any[] {
    let cards = this.allCards

    /* Status pill filter using enrollment data */
    if (this.selectedStatus !== 'All') {
      cards = cards.filter(c => {
        const status = this._getStatus(c.content?.identifier)
        return status === this.selectedStatus
      })
    }

    /* Search filter */
    if (this.searchText.trim()) {
      const q = this.searchText.toLowerCase()
      cards = cards.filter(c => c.content?.name?.toLowerCase().includes(q))
    }
    return cards
  }

  get pagedCards(): any[] {
    const start = this.currentPage * this.itemsPerPage
    return this.filteredCards.slice(start, start + this.itemsPerPage)
  }

  get totalPages(): number {
    return Math.ceil(this.filteredCards.length / this.itemsPerPage) || 1
  }

  get pageNumbers(): (number | string)[] {
    const total = this.totalPages
    const cur = this.currentPage
    if (total <= 1) return [0]
    if (total <= 7) return Array.from({ length: total }, (_, i) => i)
    const pages: (number | string)[] = [0]
    if (cur > 2) pages.push('...')
    for (let i = Math.max(1, cur - 1); i <= Math.min(total - 2, cur + 1); i++) pages.push(i)
    if (cur < total - 3) pages.push('...')
    if (total - 1 > 0) pages.push(total - 1)
    return pages
  }

  goToPage(page: number | string): void {
    if (typeof page === 'number') {
      this.currentPage = Math.max(0, Math.min(page, this.totalPages - 1))
    }
  }

  onCardNavigate(content: any): void {
    if (content?.primaryCategory === NsContent.EPrimaryCategory.RESOURCE) {
      let url = `app/amrit-gyaan-kosh/player/${VIEWER_ROUTE_FROM_MIME(content?.mimeType)}/${content?.identifier}`
      let queryParams = {
        primaryCategory: content?.primaryCategory
      }
      history.pushState(history.state, '', this.router.url)
      this.router.navigate([url], { queryParams: queryParams, state: { sourceUrl: this.router.url } })
    } else {
      if (!content?.identifier) return
      const qp: any = {}
      if (content.batchId) qp['batchId'] = content.batchId
      this.router.navigate(
        ['/app/toc', content.identifier, 'overview'],
        { queryParams: qp, state: { sourceUrl: this.router.url } }
      )
    }
  }

  goHome(): void { this.router.navigate(['/page/home']) }
  goBharatKalp(): void { this.router.navigate(['/app/learn/bharat-kalp']) }

  toggleWeekDropdown(): void { this.weekDropdownOpen = !this.weekDropdownOpen }

  selectWeekOption(week: number): void {
    this.selectedWeek = week
    this.weekDropdownOpen = false
    this.activeTabIndex = 0 /* tab set can change per week — reset to the first visible tab */
    this._fetchContent()
  }

  /** Display label for a week — configured `name` from week data (e.g. "Week 0"), falls back to "Week N" */
  weekLabel(week: number): string {
    const wd = this.weeksData.find((w: any) => w.id === `week_${week}`)
    return wd?.name || `Week ${week}`
  }

  get selectedWeekLabel(): string {
    if (this.selectedWeek === ALL_WEEKS) return 'All Weeks'
    return this.weekLabel(this.selectedWeek)
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    const target = event.target as HTMLElement
    if (!target.closest('.bk-see-all__week-wrap')) {
      this.weekDropdownOpen = false
    }
  }
}
