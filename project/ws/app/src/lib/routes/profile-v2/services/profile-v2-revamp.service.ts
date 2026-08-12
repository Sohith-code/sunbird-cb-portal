import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { NSProfileDataV2 } from '../models/profile-v2.model'
import { Observable, of } from 'rxjs'
import { map, retry } from 'rxjs/operators'
import { TranslateService } from '@ngx-translate/core'
import { ConfigurationsService } from '@sunbird-cb/utils-v2'
import * as _ from 'lodash'
import { CommonMethodsService, ConfigDetails } from '@sunbird-cb/consumption'

const API_END_POINTS = {
  GET_USER_BASIC_DETAILS: '/apis/proxies/v8/user/profile/v1/basic', // done
  GET_USER_ENTRIES: '/apis/proxies/v8/user/profile/v1/extended/', // done
  UPDATE_PROFILE_DETAILS: '/apis/proxies/v8/user/v1/extPatch', // done
  UPDATE_PROFILE_DETAILS_V3: '/apis/proxies/v8/user/v3/extPatch', // done
  GET_RECOMMENDED_USERS: '/apis/proxies/v8/connections/v3/connections/recommended',
  ADD_CONNECTION: 'apis/protected/v8/connections/v2/add/connection',
  BLOCK_CONNECTION: 'apis/proxies/v8/connections/block',
  GET_COMMUNITIES: '/apis/proxies/v8/community/v1/popular', // done
  UPLOAD_PROFILE_PIC: '/apis/proxies/v8/storage/profilePhotoUpload/profileImage', // done
  UPLOAD_BANNER_PIC: '/apis/proxies/v8/storage/profilePhotoUpload/profileBanner', // done
  GET_CADRE_DETAILS: '/apis/proxies/v8/data/v2/system/settings/get/cadreConfig', // done
  APPROVAL_DETAILS: '/apis/proxies/v8/workflow/v2/userWFApplicationFieldsSearch', // done
  WITHDRAW_REQUEST: '/apis/protected/v8/workflowhandler/transition', // done
  COURSE_BATCH_LIST: '/apis/proxies/v8/learner/course/v1/batch/list', // not needed
  GET_MASTER_LANGUAGES: '/apis/protected/v8/user/profileRegistry/getMasterLanguages', // done
  ORG_SEARCH: '/apis/proxies/v8/org/v1/search', // done
  GET_SEARCH_DESIGNATIONS: '/apis/proxies/v8/designation/search', // done
  GET_SUNBIRD_IGOT_SEARCH: '/apis/proxies/v8/sunbirdigot/v4/search', // done
  GET_GROUPS: '/api/user/v1/groups', // done
  GET_STATES_LIST: '/apis/proxies/v8/extendedprofile/list/states', // done
  GET_DISTRICTS_LIST: 'apis/proxies/v8/extendedprofile/list/districts', // done
  GET_DEGREES_LIST: 'apis/proxies/v8/masterdata/list/degrees',
  GET_INSTITUTIONS_LIST: 'apis/proxies/v8/masterdata/list/institutions',
  UPDATE_DEGREE: 'apis/proxies/v8/masterdata/update/degree', // done
  UPDATE_INSTITUTION: 'apis/proxies/v8/masterdata/update/institution', // done
  GET_MINISTRY: '/apis/public/v8/org/v1/list/ministry', // not needed

  UPLOAD_ACHIEVEMENT_PIC: '/apis/proxies/v8/storage/profilePhotoUpload/userAchievements', // done
  ADD_ENTRIES: '/apis/proxies/v8/user/profile/v1/extended', // done
  UPDATE_ENTRIES: '/apis/proxies/v8/user/profile/v1/extended/update', // done
  DELETE_ENTRIES: '/apis/proxies/v8/user/profile/v1/extended/delete', // done
  approvedDomains: 'apis/proxies/v8/user/v1/email/approvedDomains', // done

  INSIGHTS: 'apis/proxies/v8/read/user/insights', // done
  GET_CONNECTION_STATUS: 'apis/proxies/v8/connections/v1/profile/relationship', // done
  // GET_CONNECTION_STATUS: (userId: string) => `apis/proxies/v8/connections/v1/profile/relationship/${userId}`,
  UPDAT_CONNECTION_REQUEST: '/apis/protected/v8/connections/v2/update/connection',
  SEARCH_USERS: '/apis/proxies/v8/user/v1/search', // done

  SEARCH_EDUCATIONAL_QUALIFICATIONS: '/apis/proxies/v8/masterdata/v1/search', // done
  SEARCH_USER_PUBLIC: '/apis/proxies/v8/user/v5/public/search', // done

  // ASSESSMENT_DATA: `apis/proxies/v8/wheebox/read`, //old

  ADD_ACHIEVEMENT_ENTRY: '/apis/proxies/v8/learner/achievement/create', // done
  UPDATE_ACHIEVEMENT_ENTRY: '/apis/proxies/v8/learner/achievement/update', // done
  LIST_ACHIEVEMENTS: '/apis/proxies/v8/learner/achievement/list', // done
  DELETE_ACHIEVEMENT: '/apis/proxies/v8/learner/achievement/delete', // done
  COMPETENCY_V6: '/apis/proxies/v8/framework/v1/read/kcmfinal_fw', // done

}

@Injectable({
  providedIn: 'root',
})
export class ProfileV2RevampService {

  constructor(
    private http: HttpClient,
    private translateService: TranslateService,
    private configSvc: ConfigurationsService,
    private commonMethodsService: CommonMethodsService
  ) { }

  fetchProfile(configDetails: ConfigDetails, _userId: string, isNotCurrentUser?: boolean): Observable<NSProfileDataV2.IProfile | string> {
    let url = ''
    if (isNotCurrentUser && _userId) {
      // viewing another user's profile: call basic/{userId} directly, ignoring config
      url = `${API_END_POINTS.GET_USER_BASIC_DETAILS}/${_userId}`
    } else {
      configDetails['defaultUrl'] = API_END_POINTS.GET_USER_BASIC_DETAILS
      url = this.commonMethodsService.getEnabledUrl(configDetails)
      if (!url) {
        return of('')
      }
    }
    return this.http.get<NSProfileDataV2.IProfile>(`${url}`)
      .pipe(map(res => {
        if (!isNotCurrentUser) {
          this.configulreProfileDetails(res)
        }
        return res
      }))
  }
  // fetchNodalDetailsV2(rootOrgId: any, roles: string): Promise<any> {
  //   const reqBody = {
  //     request: {
  //       filters: {
  //         rootOrgId: rootOrgId,
  //         'organisations.roles': roles,
  //       },
  //       fields: ['firstName', 'profileDetails.personalDetails.primaryEmail'],
  //       limit: 1,
  //     },
  //   }
  //   return this.http.post<any>(API_END_POINTS.SEARCH_USERS, reqBody).toPromise()
  // }

  configulreProfileDetails(requestBody: any) {
    if (this.configSvc && this.configSvc.userProfileV2) {
      this.configSvc.userProfileV2['profileBannerUrl'] = _.get(requestBody, 'result.response.profileDetails.profileBannerUrl', '')
    }
  }

  updateProfileDetails(configDetails: ConfigDetails, requestBody: any): Observable<any> {
    configDetails['defaultUrl'] = API_END_POINTS.UPDATE_PROFILE_DETAILS
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    return this.http.post<any>(url, requestBody)
      .pipe(map(res => {
        return res
      }))
  }

  updateProfileDetailsV3(configDetails: ConfigDetails, requestBody: any): Observable<any> {
    configDetails['defaultUrl'] = API_END_POINTS.UPDATE_PROFILE_DETAILS_V3
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    return this.http.post<any>(url, requestBody)
      .pipe(map(res => {
        return res
      }))
  }

  updateProfilePic(formData: FormData, configDetails: ConfigDetails): Observable<any> {
    configDetails['defaultUrl'] = API_END_POINTS.UPLOAD_PROFILE_PIC
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    return this.http.post<any>(url, formData)
      .pipe(map(res => {
        return res
      }))
  }

  updateBannerPic(configDetails: ConfigDetails, formData: FormData): Observable<any> {
    configDetails['defaultUrl'] = API_END_POINTS.UPLOAD_BANNER_PIC
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    return this.http.post<any>(url, formData)
      .pipe(map(res => {
        return res
      }))
  }

  fetchProfileEntries(configDetails: ConfigDetails, _userId: string, entryType: string = 'all', isNotCurrentUser?: boolean): Observable<NSProfileDataV2.IProfile | string> {
    let url = ''
    if (isNotCurrentUser && _userId) {
      // viewing another user's profile: call extended/{entryType}/{userId} directly, ignoring config
      url = `${API_END_POINTS.GET_USER_ENTRIES}${entryType}/${_userId}`
    } else {
      configDetails['defaultUrl'] = API_END_POINTS.GET_USER_ENTRIES
      const base = this.commonMethodsService.getEnabledUrl(configDetails)
      if (!base) {
        return of('')
      }
      url = `${base}${entryType}`
    }
    return this.http.get<NSProfileDataV2.IProfile>(url)
      .pipe(map(res => {
        return res
      }))
  }

  getRecommendedUsers(formBody: any): Observable<any> {
    return this.http.post<any>(API_END_POINTS.GET_RECOMMENDED_USERS, formBody)
  }

  connectToNetwork(payload: any): Observable<any> {
    return this.http.post(API_END_POINTS.ADD_CONNECTION, payload)
  }

  blockConnection(payload: any): Observable<any> {
    return this.http.post(API_END_POINTS.BLOCK_CONNECTION, payload)
  }

  getCommunities(configDetails: ConfigDetails, formBody: any): Observable<any> {
    configDetails['defaultUrl'] = API_END_POINTS.GET_COMMUNITIES
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    return this.http.post<any>(url, formBody)
  }

  fetchCourseBatches(req: any): Observable<any> {
    return this.http
      .post<any>(API_END_POINTS.COURSE_BATCH_LIST, req)
      .pipe(
        retry(1),
        map(
          (data: any) => data.result.response
        )
      )
  }

  fetchCadre(configDetails: ConfigDetails): Observable<any> {
    configDetails['defaultUrl'] = API_END_POINTS.GET_CADRE_DETAILS
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    return this.http.get<any>(url)
  }

  getMasterLanguages(configDetails: ConfigDetails): Observable<any> {
    configDetails['defaultUrl'] = API_END_POINTS.GET_MASTER_LANGUAGES
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    return this.http.get<any>(url)
  }
  getOrgSearch(formBody: any, configDetails: ConfigDetails): Observable<any> {
    configDetails['defaultUrl'] = API_END_POINTS.ORG_SEARCH
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    return this.http.post<any>(url, formBody)
  }

  getMinistriesList(): Observable<any> {
    return this.http.get<any>(API_END_POINTS.GET_MINISTRY)
  }

  searchDesignation(_req: any, configDetails: ConfigDetails): Observable<any> {
    configDetails['defaultUrl'] = API_END_POINTS.GET_SEARCH_DESIGNATIONS
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    return this.http.post<any>(url, _req)
  }

  searchIgotDesignation(_req: any, configDetails: ConfigDetails): Observable<any> {
    configDetails['defaultUrl'] = API_END_POINTS.GET_SUNBIRD_IGOT_SEARCH
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    return this.http.post<any>(url, _req)
  }

  fetchNodalDetails(configDetails: ConfigDetails, rootOrgId: any, roles: string) {
    configDetails['defaultUrl'] = API_END_POINTS.SEARCH_USERS
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    const reqBody = {
      'request': {
        'filters': {
          'rootOrgId': rootOrgId,
          'organisations.roles': roles,
        },
        'fields': ['firstName', 'profileDetails.personalDetails.primaryEmail'],
        'limit': 1,
      },
    }
    return this.http.post<any>(url, reqBody)
  }

  getGroups(configDetails: ConfigDetails): Observable<any> {
    configDetails['defaultUrl'] = API_END_POINTS.GET_GROUPS
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    return this.http.get<any>(url)
  }

  getStatesList(configDetails: ConfigDetails): Observable<any> {
    configDetails['defaultUrl'] = API_END_POINTS.GET_STATES_LIST
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    return this.http.get<any>(url)
  }

  getDistrictsList(configDetails: ConfigDetails, state: string): Observable<any> {
    configDetails['defaultUrl'] = API_END_POINTS.GET_DISTRICTS_LIST
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    const formBody = {
      contextName: state,
    }
    return this.http.post<any>(url, formBody)
  }

  getDegreesList(): Observable<any> {
    return this.http.get<any>(`${API_END_POINTS.GET_DEGREES_LIST}`)
  }

  getInstitutionsList() {
    return this.http.get<any>(API_END_POINTS.GET_INSTITUTIONS_LIST)
  }

  updateDegree(requestBody: any, configDetails: ConfigDetails): Observable<any> {
    configDetails['defaultUrl'] = API_END_POINTS.UPDATE_DEGREE
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    return this.http.post<any>(url, requestBody)
  }

  updateInstitution(requestBody: any, configDetails: ConfigDetails): Observable<any> {
    configDetails['defaultUrl'] = API_END_POINTS.UPDATE_INSTITUTION
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    return this.http.post<any>(url, requestBody)
  }

  updateAchievementPic(formData: FormData, configDetails: ConfigDetails): Observable<any> {
    configDetails['defaultUrl'] = API_END_POINTS.UPLOAD_ACHIEVEMENT_PIC
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    return this.http.post<any>(url, formData)
  }

  addEntriesToProfile(requestBody: any, configDetails: ConfigDetails): Observable<any> {
    configDetails['defaultUrl'] = API_END_POINTS.ADD_ENTRIES
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    return this.http.post<any>(url, requestBody)
  }

  updateEntriesOfProfile(configDetails: ConfigDetails, requestBody: any): Observable<any> {
    configDetails['defaultUrl'] = API_END_POINTS.UPDATE_ENTRIES
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    return this.http.put<any>(url, requestBody)
  }

  deleteEntriesOfProfile(requestBody: any, configDetails: ConfigDetails): Observable<any> {
    configDetails['defaultUrl'] = API_END_POINTS.DELETE_ENTRIES
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    return this.http.delete<any>(url, { body: requestBody })
  }

  updateConnectionRequest(formBody: any): Observable<any> {
    return this.http.post<any>(API_END_POINTS.UPDAT_CONNECTION_REQUEST, formBody)
  }

  getWhiteListDomain(configDetails: ConfigDetails): Observable<any> {
    configDetails['defaultUrl'] = API_END_POINTS.approvedDomains
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    return this.http.get<any>(url)
  }

  fetchApprovalDetails(configDetails: ConfigDetails, requestBody: any): Observable<any> {
    // global kill-switch via global-config.apis.workflow.userWFApplicationFieldsSearch
    const gCfg = this.configSvc.globalConfig?.apis?.workflow?.userWFApplicationFieldsSearch
    if (gCfg && !gCfg.enabled) {
      return of('')
    }
    configDetails['defaultUrl'] = API_END_POINTS.APPROVAL_DETAILS
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    return this.http.post<any>(url, requestBody)
  }

  withDrawRequest(configDetails: ConfigDetails, payload: any): Observable<any> {
    configDetails['defaultUrl'] = API_END_POINTS.WITHDRAW_REQUEST
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    return this.http.post<any>(url, payload)
  }

  handleTranslateTo(menuName: string): string {
    // tslint:disable-next-line: prefer-template
    const translationKey = 'NetworkV2Profile.' + menuName.replace(/\s/g, '')
    return this.translateService.instant(translationKey)
  }

  getInsightsData(configDetails: ConfigDetails, payload: any) {
    configDetails['defaultUrl'] = API_END_POINTS.INSIGHTS
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    const result = this.http.post(url, payload)
    return result
  }

  getConnectionStatus(userId: string, configDetails: ConfigDetails) {
    configDetails['defaultUrl'] = API_END_POINTS.GET_CONNECTION_STATUS
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    return this.http.get(`${url}/${userId}`)
  }

  // getAssessmentinfo(): Observable<any> {
  //     return this.http.get(API_END_POINTS.ASSESSMENT_DATA)
  //   }

  deleteAchievement(payload: any, configDetails: ConfigDetails): Observable<any> {
    configDetails['defaultUrl'] = API_END_POINTS.DELETE_ENTRIES
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    return this.http.delete<any>(url, { body: payload })
  }

  getEducationsQualificationsSearch(payload: any, configDetails: ConfigDetails): Observable<any> {
    configDetails['defaultUrl'] = API_END_POINTS.SEARCH_EDUCATIONAL_QUALIFICATIONS
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    return this.http.post<any>(url, payload)
  }

  createAchievementEntry(payload: any, configDetails: ConfigDetails): Observable<any> {
    configDetails['defaultUrl'] = API_END_POINTS.ADD_ACHIEVEMENT_ENTRY
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    return this.http.post<any>(url, payload)
  }

  updateAchievementEntry(payload: any, configDetails: ConfigDetails): Observable<any> {
    configDetails['defaultUrl'] = API_END_POINTS.UPDATE_ACHIEVEMENT_ENTRY
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    return this.http.put<any>(url, payload)
  }

  listAchievements(configDetails: ConfigDetails, userId: string): Observable<any> {
    configDetails['defaultUrl'] = API_END_POINTS.LIST_ACHIEVEMENTS
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }

    const loggedInUserId = _.get(this.configSvc, 'userProfile.userId', '')
    if (userId && userId !== loggedInUserId) {
      return this.http.get<any>(url, { params: { id: userId } })
    }

    return this.http.get<any>(url)
  }

  deleteAchievementEntry(payload: any, configDetails: ConfigDetails): Observable<any> {
    configDetails['defaultUrl'] = API_END_POINTS.DELETE_ACHIEVEMENT
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    return this.http.delete<any>(url, { body: payload })
  }
  /**
   * Search if a user already exists by email or mobile.
   * @param filterField - The profile field path, e.g. 'profileDetails.personalDetails.primaryEmail'
   * @param value - The value to search for
   */
  searchUserByField(filterField: string, value: string, configDetails: ConfigDetails): Observable<any> {
    configDetails['defaultUrl'] = API_END_POINTS.SEARCH_USER_PUBLIC
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    if (filterField === 'email') {
      value = value.toLowerCase()
    }
    const payload = {
      request: {
        limit: 1,
        offset: 0,
        filters: {
          [filterField]: [value],
        },
      },
    }
    return this.http.post<any>(url, payload)
  }

  fetchCompetencyV6(configDetails: ConfigDetails): Observable<any> {
    configDetails['defaultUrl'] = API_END_POINTS.COMPETENCY_V6
    const url = this.commonMethodsService.getEnabledUrl(configDetails)
    if (!url) {
      return of('')
    }
    return this.http.get(url)
  }

}
