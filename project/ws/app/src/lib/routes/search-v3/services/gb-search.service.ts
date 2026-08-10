import { Injectable } from '@angular/core'
import { HttpClient, HttpHeaders } from '@angular/common/http'
import { Observable, of, Subject } from 'rxjs'
import { ConfigurationsService, DomainConfService } from '@sunbird-cb/utils-v2'
import {
  ISearchAutoComplete,
  ISearchQuery,
} from '../../search/models/search.model'
import { SearchApiService } from '../../search/apis/search-api.service'
import {
  SearchCommunitiesRequest,
  SearchExternalRequest,
  SearchNLP,
  SearchPeoplesRequest,
  SearchV4Request,
  SortType,
} from '../models/search-v3.model'
import { SEARCH_SORT_DROPDOWN } from '@ws/author'

const DEFAULT_API_ENDPOINTS = {
  SEARCH_V6: '/apis/proxies/v8/sunbirdigot/search',
  SEARCH_V4: '/apis/proxies/v8/sunbirdigot/v4/search',
  COMPOSITE_SEARCH: '/apis/proxies/v8/composite/v5/search',
  SEARCH_EXT_CONTENT: '/apis/proxies/v8/cios/v1/search/content',
  SEARCH_PEOPLE: '/apis/proxies/v8/user/v5/public/search',
  SEARCH_COMMUNITY: '/apis/proxies/v8/community/v1/search',
  SEARCH_NLP: '/apis/proxies/v8/nlp/search',
  RECENT_CREATE: '/apis/proxies/v8/search/v1/recent/create',
  RECENT_READ: '/apis/proxies/v8/search/v1/recent/read',
  RECENT_DELETE_BY_USERID: '/apis/proxies/v8/search/v1/recent/delete',
  RECENT_DELETE_BY_TIMESTAMP: (id: string) => { return `/apis/proxies/v8/search/v1/recent/delete/timestamp/${id}` },
  ENROLLMENT_API(userId: string): string {
    return `/apis/proxies/v8/learner/course/v4/user/enrollment/list/${userId}`
  },
  EXPLORE_API: '/api/course/v1/explore',
  MICRO_CREDENTIALS: '/apis/proxies/v8/promotionalcontent/v1/assignedto/users',
  GetApplicationsById: '/apis/proxies/v8/forms/v2/bulkGetApplicationsById',
  ENROLLMENT_DICTIONARY_API: `/apis/proxies/v8/user/v1/learning/dictionary`,
}

@Injectable({
  providedIn: 'root',
})
export class GbSearchService {
  private removeFilter = new Subject<any>()
  searchConfig: any = null
  /**
   * Observable string streams
   */
  notifyObservable$ = this.removeFilter.asObservable()
  constructor(
    private http: HttpClient,
    private configSrv: ConfigurationsService,
    private searchApi: SearchApiService,
    private domainConfSvc: DomainConfService
  ) { }

  fetchSearchData(request: any): Observable<any> {
    const url = this.domainConfSvc.getApiUrl('search', 'searchV6', DEFAULT_API_ENDPOINTS.SEARCH_V6)
    if (!url) {
      return of(null)
    }
    return this.http.post<any>(url, request)
  }
  fetchSearchDataByCategory(request: any): Observable<any> {
    const url = this.domainConfSvc.getApiUrl('search', 'searchV4', DEFAULT_API_ENDPOINTS.SEARCH_V4)
    return this.http.post<any>(url, request)
  }
  fetchSearchDataforCios(request: any): Observable<any> {
    const url = this.domainConfSvc.getApiUrl('search', 'externalContent', DEFAULT_API_ENDPOINTS.SEARCH_EXT_CONTENT)
    return this.http.post<any>(url, request)
  }
  public notifyOther(data: any) {
    if (data) {
      this.removeFilter.next(data)
    }
  }

  async getSearchConfig(): Promise<any> {
    if (!this.searchConfig) {
      this.searchConfig = {}
      const baseUrl = this.configSrv.sitePath
      this.searchConfig = await this.http
        .get<any>(`${baseUrl}/feature/search.json`)
        .toPromise()
    }
    return of(this.searchConfig).toPromise()
  }
  searchAutoComplete(params: ISearchQuery): Promise<ISearchAutoComplete[] | any> {
    params.q = params.q.toLowerCase()
    if (params.l.split(',').length === 1 && params.l.toLowerCase() !== 'all') {
      return this.searchApi.getSearchAutoCompleteResults(params).toPromise()
    }
    return Promise.resolve([])
  }

  searchCoursesv4(params: SearchV4Request, apiUrl?: string): Promise<any> {
    const url = apiUrl || this.domainConfSvc.getApiUrl('search', 'searchV4', DEFAULT_API_ENDPOINTS.SEARCH_V4)
    return this.http.post(url, params).toPromise()
  }

  searchVolunteerCourses(params: SearchV4Request): Promise<any> {
    const url = this.domainConfSvc.getApiUrl('search', 'volunteerSearch', DEFAULT_API_ENDPOINTS.SEARCH_V4)
    return this.http.post(url, params).toPromise()
  }

  searchVolunteerCoursesComposite(params: any): Promise<any> {
    const url = this.domainConfSvc.getApiUrl('search', 'compositeSearch', DEFAULT_API_ENDPOINTS.COMPOSITE_SEARCH)
    const userRootOrg = this.configSrv.userProfile?.userRootOrg
    const orgId = (typeof userRootOrg === 'string' ? userRootOrg : userRootOrg?.id) || ''
    const headers = new HttpHeaders({ 'x-authenticated-org-id': orgId })
    return this.http.post(url, params, { headers }).toPromise()
  }

  getApplicationsById(formBody: any) {
    const url = this.domainConfSvc.getApiUrl('content', 'applicationsById', DEFAULT_API_ENDPOINTS.GetApplicationsById)
    if (!url) {
      return of(null)
    }
    return this.http.post<any>(url, formBody)
  }

  searchConnections(params: SearchPeoplesRequest): Promise<any> {
    const url = this.domainConfSvc.getApiUrl('search', 'people', DEFAULT_API_ENDPOINTS.SEARCH_PEOPLE)
    return this.http
      .post(url, { request: params })
      .toPromise()
  }

  searchCommunity(params: SearchCommunitiesRequest): Promise<any> {
    const url = this.domainConfSvc.getApiUrl('search', 'community', DEFAULT_API_ENDPOINTS.SEARCH_COMMUNITY)
    return this.http.post(url, params).toPromise()
  }

  searchResource(params: SearchV4Request): Promise<any> {
    const url = this.domainConfSvc.getApiUrl('search', 'searchV6', DEFAULT_API_ENDPOINTS.SEARCH_V6)
    if (!url) {
      return Promise.resolve(null)
    }
    return this.http.post(url, params).toPromise()
  }

  nlpSearch(params: SearchNLP): Promise<any> {
    const url = this.domainConfSvc.getApiUrl('search', 'nlp', DEFAULT_API_ENDPOINTS.SEARCH_NLP)
    if (!url) {
      return Promise.resolve(null)
    }
    return this.http.post(url, params).toPromise()
  }
  // getApiUrl returns '' when the api is disabled in global-config, so each of these bails out the
  // same way nlpSearch does - without the check a disabled api posts to the app's own origin
  recentCreate(req: any): Promise<any> {
    const url = this.domainConfSvc.getApiUrl('search', 'recentCreate', DEFAULT_API_ENDPOINTS.RECENT_CREATE)
    if (!url) {
      return Promise.resolve(null)
    }
    return this.http.post(url, req).toPromise()
  }
  recentRead(): Observable<any> {
    const url = this.domainConfSvc.getApiUrl('search', 'recentRead', DEFAULT_API_ENDPOINTS.RECENT_READ)
    if (!url) {
      return of(null)
    }
    return this.http.get(url)
  }

  recentDeleteByUser(): Observable<any> {
    const url = this.domainConfSvc.getApiUrl('search', 'recentDelete', DEFAULT_API_ENDPOINTS.RECENT_DELETE_BY_USERID)
    if (!url) {
      return of(null)
    }
    return this.http.delete(url)
  }
  // no dedicated config key for the per-timestamp delete, so it rides on recentDelete
  recentDeleteByTime(id: any): Observable<any> {
    if (!this.domainConfSvc.isApiEnabled('search', 'recentDelete')) {
      return of(null)
    }
    return this.http.delete(DEFAULT_API_ENDPOINTS.RECENT_DELETE_BY_TIMESTAMP(id))
  }

  enrollment(request: any, _userId: string): any {
    const baseUrl = this.domainConfSvc.getApiUrl('user', 'enrollment', '/apis/proxies/v8/learner/course/v4/user/enrollment/list')
    return this.http.post(`${baseUrl}`, request)
  }

  searchExternalContent(params: SearchExternalRequest): Promise<any> {
    const url = this.domainConfSvc.getApiUrl('search', 'externalContent', DEFAULT_API_ENDPOINTS.SEARCH_EXT_CONTENT)
    return this.http.post(url, params).toPromise()
  }

  exploreContent() {
    const url = this.domainConfSvc.getApiUrl('content', 'explore', DEFAULT_API_ENDPOINTS.EXPLORE_API)
    return this.http.get(url)
  }

  getFirstSortOption(isExploreContentTab: boolean): any {
    let options = SEARCH_SORT_DROPDOWN
    let selectedOption = SortType.MostRelevent
    if (isExploreContentTab) {
      options = SEARCH_SORT_DROPDOWN.filter(option => option.value !== SortType.MostRelevent)
      selectedOption = SortType.RecentlyAdded
    } else {
      options = SEARCH_SORT_DROPDOWN
      selectedOption = SortType.MostRelevent
    }
    return { options, selectedOption }
  }

  microCredentialsSearch(): Observable<any> {
    const url = this.domainConfSvc.getApiUrl('content', 'microCredentials', DEFAULT_API_ENDPOINTS.MICRO_CREDENTIALS)
    return this.http.get<any>(url)
  }

  enrollmentDictionary(): Observable<any> {
    return this.http.get(DEFAULT_API_ENDPOINTS.ENROLLMENT_DICTIONARY_API)
  }

}
