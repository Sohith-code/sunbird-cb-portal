import {
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
  signal,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterModule } from '@angular/router'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatChipsModule } from '@angular/material/chips'
import { MatDividerModule } from '@angular/material/divider'
import { TranslateModule } from '@ngx-translate/core'

import { ConfigurationsService, DomainConfService } from '@sunbird-cb/utils-v2'
import { debounceTime, distinctUntilChanged, Subscription } from 'rxjs'
import { SearchServService } from '../../../search/services/search-serv.service'
import { GbSearchService } from '../../services/gb-search.service'
import {
  FacetType,
  SearchCategory,
  SearchCommunitiesRequest,
  SearchEventfacet,
  SearchEventFields,
  SearchExternalRequest,
  SearchNLP,
  SearchPeoplesRequest,
  SearchResourceFacets,
  SearchResourceMimeType,
  SearchV4Request,
} from '../../models/search-v3.model'
import { WidgetContentLibService } from '@sunbird-cb/consumption'
import { MobileAppsService } from './../../../services/mobile-apps.service'
import { MatAutocompleteModule } from '@angular/material/autocomplete'
import { MatListModule } from '@angular/material/list'

interface SearchCategoryItem {
  label: string
  value: SearchCategory
  icon: string
}

@Component({
  selector: 'ws-app-search-v4-input-home',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    MatChipsModule,
    MatDividerModule,
    MatListModule
  ],
  templateUrl: './search-input-home-v4.component.html',
  styleUrl: './search-input-home-v4.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class SearchInputHomeV4Component implements OnInit, OnDestroy {
  // Inputs using Angular 20 signals
  placeHolder = input<string>('');
  ref = input<string>('');

  // Outputs using Angular 20 signals
  closed = output<boolean>();

  // State signals
  queryControl: FormControl<string | null>
  languageSearch = signal<string[]>([]);
  disableMenu = signal(false);
  recentSearches: any
  searchQuery = signal('');
  allSearchResults = signal<any[]>([]);
  nlpSearchValue = signal<any>(null);
  selectedSearchCategory = signal<string>(SearchCategory.Courses);
  openSearchTemplate = signal(false);
  loaderSearching = signal(false);
  responseNlpQuery = signal('');
  searchLocale = signal('en');
  preferredLanguages = signal('');
  searchCategoriesEnabled = true;
  // global-config -> components.recentSearch.enabled / components.allSearchResults.enabled - the
  // same keys the v3 input reads. Both default to true when absent, so a tenant whose config
  // predates them keeps the current behaviour
  recentSearchesEnabled = true;
  allSearchResultsEnabled = true;

  // Constants
  readonly SAKSHAMAI_ICON_LOADER = '/assets/images/sakshamAI/saksham_ai_loader.gif';

  private hasReadRecentBeenCalled = false;

  categories: SearchCategoryItem[] = [
    { label: 'Content', value: SearchCategory.Courses, icon: 'video-library' },
    { label: 'Events', value: SearchCategory.Events, icon: 'calender-event' },
    { label: 'People', value: SearchCategory.People, icon: 'people-search' },
    {
      label: 'External Contents',
      value: SearchCategory.ExternalContents,
      icon: 'video-library',
    },
    {
      label: 'Communities',
      value: SearchCategory.Communities,
      icon: 'menu_book',
    },
    {
      label: 'Resources',
      value: SearchCategory.Resources,
      icon: 'diversity_3',
    },
    // { label: 'All', value: SearchCategory.All, icon: '' },
  ];

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>

  private searchSubscription?: Subscription
  private querySubscription?: Subscription
  private activated = inject(ActivatedRoute);
  private router = inject(Router);
  private searchServSvc = inject(SearchServService);
  private configSvc = inject(ConfigurationsService);
  private eRef = inject(ElementRef);
  private searchV3Service = inject(GbSearchService);
  private contSvc = inject(WidgetContentLibService);
  private mobileAppsService = inject(MobileAppsService);
  private domainConfSvc = inject(DomainConfService)

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.openSearchTemplate.set(false)
    }
  }

  constructor() {
    this.queryControl = new FormControl(
      this.activated.snapshot.queryParams.q || ''
    )

    this.searchSubscription = this.mobileAppsService.clearGlobalSearchForHomePage.subscribe((value: any) => {
      if (value) {
        this.clearSearchTextElement()
      }
    })

    this.querySubscription = this.queryControl.valueChanges
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe(async (value) => {
        if (value && value.length > 0) {
          await this.searchFromQuery(value)
          this.loaderSearching.set(false)
        } else {
          this.loaderSearching.set(false)
        }
      })
  }

  ngOnInit() {
    this.filterCategoriesByConfig()
    if (!this.activated.snapshot.data.searchPageData) {
      this.searchServSvc
        .getSearchConfig()
        .then((data) => {
          this.activated.snapshot.data = {
            searchPageData: { data },
          }
        })
        .then(() => {
          this.initialize()
        })
    } else {
      this.initialize()
    }
  }

  filterCategoriesByConfig() {
    // recentRead is ANDed in the same way v3's showRecentSearch does it - with no api there is
    // nothing to list, so the section stays hidden either way
    this.recentSearchesEnabled = this.domainConfSvc.isConfigEnabled('components.recentSearch', 'enabled')
      && this.domainConfSvc.isApiEnabled('search', 'recentRead')
    this.allSearchResultsEnabled = this.domainConfSvc.isConfigEnabled('components.allSearchResults', 'enabled')
    this.searchCategoriesEnabled = this.domainConfSvc.isSearchCategoriesEnabled()
    if (this.domainConfSvc.getSearchCategoriesConfig()) {
      this.categories = this.categories.filter(cat => {
        return this.domainConfSvc.isSearchCategoryEnabled(cat.value)
      })
    }
  }

  isCategoryEnabled(categoryValue: string): boolean {
    return this.domainConfSvc.isSearchCategoryEnabled(categoryValue)
  }

  // The dropdown is just chrome around three optional sections. With all of them switched off in
  // global-config - or simply empty - it used to render as a bare white box under the input
  get hasSearchPanelContent(): boolean {
    return (this.searchCategoriesEnabled && this.categories.length > 0)
      || (this.recentSearchesEnabled && !!this.recentSearches?.length)
      || (this.allSearchResultsEnabled && this.allSearchResults().length > 0)
  }

  clearSearchTextElement() {
    this.queryControl.setValue('')
    if (this.searchInput) {
      this.searchInput.nativeElement.value = ''
    }
  }

  autoFilter() {
    if (this.activated.snapshot.data.searchPageData) {
      const isAutoCompleteAllowed =
        this.activated.snapshot.data.searchPageData.data.search.isAutoCompleteAllowed
      if (typeof isAutoCompleteAllowed === 'boolean' && isAutoCompleteAllowed) {
        this.queryControl.valueChanges
          .pipe(debounceTime(200), distinctUntilChanged())
          .subscribe((q) => {
            if (q) {
              this.searchFromQuery(q)
            }
          })
      }
    }
  }

  initialize() {
    let isNotMyUser = false
    let isIgotOrg = false

    if (this.configSvc?.unMappedUser?.profileDetails?.profileStatus) {
      isNotMyUser = this.configSvc.unMappedUser.profileDetails.profileStatus.toLowerCase() === 'not-my-user'
    }

    if (this.configSvc?.unMappedUser?.profileDetails?.employmentDetails?.departmentName) {
      isIgotOrg = this.configSvc.unMappedUser.profileDetails.employmentDetails.departmentName.toLowerCase() === 'igot'
    }

    this.disableMenu.set(isNotMyUser && isIgotOrg)

    this.activated.queryParamMap.subscribe((queryParam) => {
      if (queryParam.has('q')) {
        this.queryControl.setValue(queryParam.get('q') || '')
      }
      if (queryParam.has('category')) {
        this.selectedSearchCategory.set(queryParam.get('category') || SearchCategory.Courses)
      } else {
        this.selectedSearchCategory.set(SearchCategory.Courses)
      }

      const isAutoCompleteAllowed = this.activated.snapshot.data.searchPageData
        ? this.activated.snapshot.data.searchPageData.data.search.isAutoCompleteAllowed
        : false

      if (typeof isAutoCompleteAllowed === 'undefined' ||
        (typeof isAutoCompleteAllowed === 'boolean' && isAutoCompleteAllowed)) {
        // Auto-complete is allowed
      }
    })
  }

  onSearchSubmit(event: Event) {
    event.preventDefault()
    this.updateQuery(this.queryControl.value || '')
  }

  async updateQuery(query: string) {
    if (query && query.length) {
      await this.searchInNLP(query)
        .then(() => {
          this.processSearchText(query)
        })
        .catch(() => {
          this.processSearchText(query)
        })
    } else {
      this.processSearchText(query)
    }
  }

  async updateRecentSearchQuery(query: any) {
    if (!this.recentSearchesEnabled) {
      this.processRecentSearchText(query)
      return
    }
    if (query) {
      const reqBody = {
        nlpSearchQuery: query?.nlp_search_query,
        searchQuery: query?.search_query,
        searchCategory: query?.search_category[0]
      }
      await this.searchV3Service.recentCreate(reqBody).then(() => {
        this.processRecentSearchText(query)
      }).catch(() => {
        this.processRecentSearchText(query)
      })
    } else {
      this.processRecentSearchText(query)
    }
  }

  async createRecent(data: any) {
    if (!this.recentSearchesEnabled) {
      return
    }

    // AFTER NLW NEED TO ENABLE
    const reqBody = {
      nlpSearchQuery: data,
      searchQuery: this.queryControl?.value,
      searchCategory: this.selectedSearchCategory() ? this.selectedSearchCategory() : 'all'
    }

    await this.searchV3Service.recentCreate(
      reqBody
    ).catch()

  }

  readRecent() {
    if (!this.recentSearchesEnabled) {
      this.recentSearches = ''
      return undefined
    }
    // AFTER NLW NEED TO ENABLE
    return this.searchV3Service.recentRead().subscribe((res: any) => {
      if (res) {
        // this.recentSearches = res.result.searchQueries.nlp_search_query   this.nlpSearchValue = res
        if (res?.result?.searchQueries && res?.result?.searchQueries) {
          this.recentSearches = res?.result?.searchQueries
        } else {
          this.recentSearches = ''
        }
      }
    })
  }

  goToSearchItem(query: any) {
    const category = query?.search_category && query?.search_category[0]
    const nlpSearchQuery = query?.nlp_search_query

    if (category && nlpSearchQuery) {
      this.processSearchByCategory(category, nlpSearchQuery, query)
    }
  }

  private processSearchByCategory(category: string, nlpSearchQuery: string, query: any) {
    switch (category) {
      case 'courses':
        this.searchCourses(nlpSearchQuery, query)
        break
      case 'events':
        this.searchEvents(nlpSearchQuery, query)
        break
      case 'peoples':
        this.searchPeoples(nlpSearchQuery, query)
        break
      case 'resources':
        this.searchResources(nlpSearchQuery, query)
        break
      case 'communities':
        this.searchCommunities(nlpSearchQuery, query)
        break
      case 'all':
        this.searchAll(nlpSearchQuery, query)
        break
    }
  }

  private searchCourses(nlpSearchQuery: string, query: any) {
    const req = {
      request: {
        filters: {
          contentType: ['Course'],
          courseCategory: [],
          status: ['Live'],
        },
        fields: [
          'downloadUrl', 'organisation', 'language', 'source', 'appIcon',
          'identifier', 'name', 'primaryCategory', 'contentType', 'posterImage',
          'createdOn', 'duration', 'avgRating', 'additionalTags', 'courseCategory',
          'mimeType', 'contentId', 'creatorLogo', 'languageMapV1', 'sectorDetails_v1',
        ],
        facets: [
          'avgRating', 'language', 'organisation', 'courseCategory',
          'sectorDetails_v1.sectorName', 'sectorDetails_v1.subSectorName',
          'competencies_v6.competencyAreaName', 'competencies_v6.competencyThemeName',
          'competencies_v6.competencySubThemeName',
        ],
        query: nlpSearchQuery,
        limit: 3,
        offset: 0,
        sort_by: {},
      },
    }
    this.searchV3Service.fetchSearchDataByCategory(req).subscribe((res: any) => {
      if (res) {
        this.updateRecentSearchQuery(query)
      }
    })
  }

  private searchEvents(nlpSearchQuery: string, query: any) {
    const req = {
      request: {
        filters: {
          contentType: 'Event',
          status: ['Live'],
        },
        fields: [
          'name', 'description', 'identifier', 'resourceType', 'contentType',
          'sourceName', 'duration', 'startDate', 'endDate', 'startTime', 'endTime',
          'createdOn', 'eventType', 'expiryDate', 'appIcon', 'startDateTime', 'endDateTime',
        ],
        facets: [
          'duration', 'language', 'sourceName', 'startDateTimeInEpoch',
          'endDateTimeInEpoch', 'resourceType', 'competencies_v6.competencyAreaName',
          'competencies_v6.competencyThemeName', 'competencies_v6.competencySubThemeName',
        ],
        query: nlpSearchQuery,
        limit: 3,
        offset: 0,
        sort_by: {},
      },
    }
    this.searchV3Service.fetchSearchDataByCategory(req).subscribe((res: any) => {
      if (res) {
        this.updateRecentSearchQuery(query)
      }
    })
  }

  private searchPeoples(nlpSearchQuery: string, query: any) {
    const req = {
      filters: {},
      facets: ['profileDetails.professionalDetails.designation', 'rootOrgName'],
      fields: [],
      limit: 5,
      offset: 0,
      sort_by: {},
      query: nlpSearchQuery,
    }
    this.searchV3Service.searchConnections(req)
      .then(() => {
        this.updateRecentSearchQuery(query)
      })
      .catch(error => {
        console.error('Error searching people:', error)
      })
  }

  private searchResources(nlpSearchQuery: string, query: any) {
    const req = {
      request: {
        filters: {
          contentType: 'Resource',
          courseCategory: [],
          status: ['Live'],
          mimeType: [
            'application/pdf', 'video/mp4', 'text/x-url',
            'audio/mpeg', 'application/vnd.ekstep.content-collection',
          ],
        },
        fields: [],
        facets: [
          'resourceCategory', 'sectorDetails_v1.subSectorName',
          'sectorDetails_v1.sectorName', 'years',
        ],
        query: nlpSearchQuery,
        limit: 3,
        offset: 0,
        sort_by: {},
        exists: ['sectorDetails_v1.sectorName', 'resourceCategory'],
      },
    }
    this.searchV3Service.fetchSearchDataByCategory(req).subscribe((res: any) => {
      if (res) {
        this.updateRecentSearchQuery(query)
      }
    })
  }

  private searchCommunities(nlpSearchQuery: string, query: any) {
    const req = {
      filterCriteriaMap: {
        status: 'active',
      },
      requestedFields: [],
      pageNumber: 0,
      pageSize: 6,
      facets: [
        'topicName', 'orgName', 'competencies_v6.competencyAreaName',
        'competencies_v6.competencyThemeName', 'competencies_v6.competencySubThemeName',
      ],
      searchString: nlpSearchQuery,
    }
    this.searchV3Service.fetchSearchDataByCategory(req).subscribe((res: any) => {
      if (res) {
        this.updateRecentSearchQuery(query)
      }
    })
  }

  private searchAll(nlpSearchQuery: string, query: any) {
    this.searchCourses(nlpSearchQuery, query)
    this.searchEvents(nlpSearchQuery, query)
    this.searchPeoples(nlpSearchQuery, query)
    this.searchResources(nlpSearchQuery, query)
    this.searchCommunities(nlpSearchQuery, query)
  }

  recentDeleteByUserId() {
    if (!this.recentSearchesEnabled) {
      return undefined
    }
    return this.searchV3Service.recentDeleteByUser().subscribe((result: any) => {
      if (result && result.responseCode === 'OK') {
        this.readRecent()
      }
    })
  }

  recentDeleteByTimeStamp(id: any) {
    if (!this.recentSearchesEnabled) {
      return undefined
    }
    return this.searchV3Service.recentDeleteByTime(id).subscribe((result: any) => {
      if (result) {
        this.readRecent()
      }
    })
  }

  private getGlobalSearchRoute(): string {
    const profileRoles = this.configSvc.userProfileV2?.userRoles || []
    const isVolunteer = (!!this.configSvc.userRoles && this.configSvc.userRoles.has('volunteer'))
      || (Array.isArray(profileRoles) && profileRoles.some(
        (role: any) => (typeof role === 'string' ? role : role?.role || '').toUpperCase() === 'VOLUNTEER'
      ))
    return isVolunteer ? '/app/globalsearch/volunteer' : '/app/globalsearch'
  }

  processRecentSearchText(query: any) {
    document.getElementById('global-search-input')?.blur()
    const queryParams = {
      q: query?.nlp_search_query ? query?.nlp_search_query?.trim() : '',
      category: query?.search_category[0] || null,
      p: null,
      f: null,
      tab: null,
      filtersPanel: 'show',
    }
    const navigationExtras = {
      queryParams,
      queryParamsHandling: 'merge' as 'merge',
    }
    const mergeQueryParams = window.location.pathname === '/app/globalsearch'

    if (this.ref() === 'home') {
      this.closed.emit(false)
      this.router.navigate(['/app/globalsearch'], mergeQueryParams ? navigationExtras : { queryParams })
    } else {
      this.router.navigate([], { ...navigationExtras, relativeTo: this.activated.parent })
    }
    localStorage.removeItem('activeRoute')
    this.openSearchTemplate.set(false)
  }

  processSearchText(query: any) {
    document.getElementById('global-search-input')?.blur()
    const queryParams = {
      q: query ? query?.trim() : '',
      search: query && this.responseNlpQuery() ? this.responseNlpQuery() : null,
      category: this.selectedSearchCategory() || null,
      p: null,
      f: null,
      tab: null,
      filtersPanel: 'show',
    }
    const navigationExtras = {
      queryParams,
      queryParamsHandling: 'merge' as 'merge',
    }
    const searchRoute = this.getGlobalSearchRoute()
    const mergeQueryParams = window.location.pathname === searchRoute
    if (this.ref() === 'home') {
      this.closed.emit(false)
      this.router.navigate([searchRoute], mergeQueryParams ? navigationExtras : { queryParams })
    } else {
      this.router.navigate([], { ...navigationExtras, relativeTo: this.activated.parent })
    }
    localStorage.removeItem('activeRoute')
    this.openSearchTemplate.set(false)
  }

  clearSearchText() {
    setTimeout(() => {
      this.openSearchTemplate.set(true)
    }, 0)
    this.queryControl.reset()
    this.updateQuery('')
  }

  async selectSearchCategory(category: string) {
    if (this.queryControl.value) {
      this.selectedSearchCategory.set(category)
      this.updateQuery(this.queryControl.value)
    }
  }

  async searchFromQuery(query: string) {
    // This is the type-ahead behind the "All Search Results" list and fires on every keystroke,
    // so bail before the request when the list is switched off
    if (!this.allSearchResultsEnabled) {
      this.allSearchResults.set([])
      return
    }
    let courseSearchResult: any
    const searchRequest = new SearchV4Request([])
    searchRequest.request.query = query

    switch (this.selectedSearchCategory()) {
      case SearchCategory.Courses:
        searchRequest.request.filters.courseCategory = 'course'
        break
      case SearchCategory.All:
        searchRequest.request.filters.courseCategory = []
        searchRequest.request.filters.contentType = ['Course', 'Event']
        break
      case SearchCategory.Programs:
        searchRequest.request.filters.courseCategory = 'blended program'
        break
      case SearchCategory.Events:
        searchRequest.request.filters.contentType = 'Event'
        searchRequest.request.fields = SearchEventFields
        searchRequest.request.facets = SearchEventfacet
        delete searchRequest.request.filters?.courseCategory
        delete searchRequest.request.sort_by?.createdOn
        break
      case SearchCategory.CaseStudy:
        searchRequest.request.filters.courseCategory = 'case study'
        break
      case SearchCategory.Resources:
        searchRequest.request.filters.contentType = 'Resource'
        searchRequest.request.facets = SearchResourceFacets
        searchRequest.request.filters.mimeType = SearchResourceMimeType
        searchRequest.request.exists = [FacetType.sectorNames_v1, FacetType.resourceCategory]
        searchRequest.request.fields = []
        delete searchRequest.request.filters?.courseCategory
        delete searchRequest.request.sort_by?.createdOn
        break
    }

    courseSearchResult = await this.searchV3Service.searchCoursesv4(searchRequest).catch()

    if (this.selectedSearchCategory() === SearchCategory.People) {
      const searchRequest = new SearchPeoplesRequest()
      searchRequest.query = query
      const result = await this.searchV3Service.searchConnections(searchRequest)
        .catch(() => {
          this.allSearchResults.set([])
        })

      if (result?.result && result.result?.response?.content.length) {
        this.allSearchResults.set(result.result?.response?.content || [])
      } else {
        this.allSearchResults.set([])
      }
      return
    } else if (this.selectedSearchCategory() === SearchCategory.Communities) {
      const searchRequestCommunities = new SearchCommunitiesRequest([])
      searchRequestCommunities.searchString = query
      const result = await this.searchV3Service
        .searchCommunity(searchRequestCommunities)
        .catch(() => {
          this.allSearchResults.set([])
        })

      if (result?.result && Object.keys(result.result).length > 0 &&
        result.result?.search_results?.data && result.result?.search_results?.data.length) {
        this.allSearchResults.set(result.result?.search_results?.data)
      } else {
        this.allSearchResults.set([])
      }
      return
    } else if (this.selectedSearchCategory() === SearchCategory.ExternalContents) {
      const searchRequestExternal = new SearchExternalRequest([])
      searchRequestExternal.searchString = query || ''
      const result = await this.searchV3Service
        .searchExternalContent(searchRequestExternal)
        .catch(() => {
          this.allSearchResults.set([])
        })

      if (result?.data && result?.data.length) {
        this.allSearchResults.set(result?.data)
      } else {
        this.allSearchResults.set([])
      }
      return
    }

    const validKeys = Object.keys(courseSearchResult?.result || {}).filter(
      (key) =>
        (key === 'Event' || key === 'content') &&
        Array.isArray(courseSearchResult.result[key]) &&
        courseSearchResult.result[key].length > 0
    )

    this.allSearchResults.set(
      validKeys.length ? courseSearchResult.result[validKeys[0]] : []
    )
  }

  getResultName(result: any): string {
    if (!result) {
      return ''
    }

    if (this.selectedSearchCategory() === SearchCategory.People) {
      return result.personalDetails?.firstname ?? result.firstName ?? ''
    } else if (this.selectedSearchCategory() === SearchCategory.Communities) {
      return result.communityName ?? ''
    } else {
      return result.name ?? ''
    }
  }

  redirectToContent(result: any) {
    this.openSearchTemplate.set(false)

    if (this.selectedSearchCategory() === SearchCategory.People) {
      this.goToUserProfile(result)
    } else if (this.selectedSearchCategory() === SearchCategory.Communities) {
      // TODO: Route community
    } else {
      this.getRedirectUrlData(result)
    }
  }

  goToUserProfile(user: any) {
    this.router.navigate(
      ['/app/person-profile', user.userId || user.id || user.wid],
      { fragment: 'profileInfo' }
    )
  }

  async getRedirectUrlData(content: any) {
    if (content && content.objectType === 'Event' && content.identifier) {
      this.router.navigate([`app/event-hub/home/${content.identifier}`])
    } else {
      const urlData = await this.contSvc.getResourseLink(content)
      this.router.navigate([urlData.url], {
        queryParams: urlData.queryParams,
      })
    }
  }

  async searchInNLP(query: string) {
    const searchRequest = new SearchNLP()
    searchRequest.query = query
    await this.searchV3Service
      .nlpSearch(searchRequest)
      .then(async (response) => {
        if (response?.data && response?.data?.keywords) {
          if (response?.data?.keywords.length > 0) {
            this.responseNlpQuery.set(response?.data?.keywords[0]?.keyword)
            this.createRecent(this.responseNlpQuery())
            this.readRecent()
          }
        } else {
          this.responseNlpQuery.set('')
        }
      })
      .catch()
  }

  openSearchTemplateF() {
    this.openSearchTemplate.set(true)
    // load recent searches once per session, only when the section and the recentRead API are
    // enabled in global-config. Without this the list only ever appeared after a search had been
    // submitted, because searchInNLP was the sole caller of readRecent
    if (!this.hasReadRecentBeenCalled && this.recentSearchesEnabled) {
      this.readRecent()
      this.hasReadRecentBeenCalled = true
    }
  }

  searchLanguage(lang: string) {
    this.searchLocale.set(lang)
    // Additional language search logic can be implemented here
  }

  ngOnDestroy(): void {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe()
    }
    if (this.querySubscription) {
      this.querySubscription.unsubscribe()
    }
  }
}
