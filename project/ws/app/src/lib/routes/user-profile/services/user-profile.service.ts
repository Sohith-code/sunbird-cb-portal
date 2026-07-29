import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { TranslateService } from '@ngx-translate/core'
import { Observable, of } from 'rxjs'
import {
  IUserProfileDetails,
  ILanguagesApiData,
  INationalityApiData,
  ICountryApiData,
  IUserProfileDetailsFromRegistry,
  IProfileMetaApiData,
} from '../models/user-profile.model'
import { map } from 'rxjs/operators'
// tslint:disable
import _ from 'lodash'
import { CommonMethodsService, ConfigDetails } from '@sunbird-cb/consumption'
import { ConfigurationsService } from '@sunbird-cb/utils-v2'
// tslint:enable

const API_ENDPOINTS = {
  updateProfileDetails: '/apis/protected/v8/user/profileDetails/updateUser',
  getUserdetailsFromRegistry: '/apis/proxies/v8/api/user/v2/read',
  getUserdetails: '/apis/protected/v8/user/details/detailV1',
  getMasterNationality: '/apis/protected/v8/user/profileRegistry/getMasterNationalities',
  getMasterCountries: '/apis/protected/v8/user/profileRegistry/getMasterCountries',
  getMasterLanguages: '/apis/protected/v8/user/profileRegistry/getMasterLanguages',
  getProfilePageMeta: '/apis/protected/v8/user/profileRegistry/getProfilePageMeta',
  getAllDepartments: '/apis/protected/v8/portal/listDeptNames',
  approveRequest: '/apis/protected/v8/workflowhandler/transition',
  getPendingFields: '/apis/proxies/v8/workflow/v2/userWFApplicationFieldsSearch',
  getApprovalPendingFields: '/apis/proxies/v8/workflow/v2/userWFApplicationFieldsSearch',
  getDesignation: '/apis/proxies/v8/user/v1/positions',
  GET_SEARCH_DESIGNATIONS: '/apis/proxies/v8/designation/search',
  GET_SEARCH_PUBLIC_DESIGNATIONS: '/apis/public/v8/designation/search',
  GET_SUNBIRD_IGOT_SEARCH: '/apis/proxies/v8/sunbirdigot/v4/search',
  editProfileDetails: '/apis/proxies/v8/user/v1/extPatch',
  editProfileDetailsV3: '/apis/proxies/v8/user/v3/extPatch',
  updatePrimaryEmail: '/apis/proxies/v8/user/otp/v2/extPatch',
  updateProfilePic: '/apis/proxies/v8/storage/profilePhotoUpload/profileImage',
  GET_GROUPS: '/api/user/v1/groups',
  getApprovalReqs: '/apis/protected/v8/workflowhandler/applicationsSearch',
  ehrmsDataRequest: '/apis/proxies/v8/ehrms/details',
  withDrawRequest: '/apis/protected/v8/workflowhandler/transition',
  approvedDomains: 'apis/proxies/v8/user/v1/email/approvedDomains',
  GET_DESIGNATION_V2: '/apis/proxies/v8/designation/search',
  GET_ORGANIZATION_V1: '/apis/proxies/v8/org/v1/search',
  ORG_CUSTOM_FIELDS: 'apis/proxies/v8/customFields/v1/search',
  UPDATE_CUSTOM_FIELDS: 'apis/proxies/v8/user/profile/v1/update/additionalFields',
  READ_CUSTOM_FIELDS_VALUES: 'apis/proxies/v8/user/profile/v1/getAdditionalFields',
  READ_ORG_DETAILS: 'api/org/v1/read',
}

@Injectable()
export class UserProfileService {
  constructor(
    private http: HttpClient,
    private translateService: TranslateService,
    private commonMethodsService: CommonMethodsService,
    private configSvc: ConfigurationsService
  ) {
    if (localStorage.getItem('websiteLanguage')) {
      this.translateService.setDefaultLang('en')
      const lang = localStorage.getItem('websiteLanguage')!
      this.translateService.use(lang)
    }
  }

  handleTranslateTo(menuName: string): string {
    // tslint:disable-next-line: prefer-template
    const translationKey = 'profileInfo.' + menuName.replace(/\s/g, '')
    return this.translateService.instant(translationKey)
  }

  editProfileDetails(data: any) {
    return this.http.post<any>(API_ENDPOINTS.editProfileDetails, data)
  }

  editProfileDetailsV3(data: any) {
    return this.http.post<any>(API_ENDPOINTS.editProfileDetailsV3, data)
  }

  updatePrimaryEmailDetails(data: any) {
    return this.http.post<any>(API_ENDPOINTS.updatePrimaryEmail, data)
  }

  updateProfileDetails(data: any) {
    return this.http.patch<any>(API_ENDPOINTS.updateProfileDetails, data)
  }

  getUserdetails(email: string | undefined): Observable<[IUserProfileDetails]> {
    return this.http.post<[IUserProfileDetails]>(API_ENDPOINTS.getUserdetails, { email })
  }

  getMasterLanguages(): Observable<ILanguagesApiData> {
    return this.http.get<ILanguagesApiData>(API_ENDPOINTS.getMasterLanguages)
  }

  getMasterNationality(): Observable<INationalityApiData> {
    return this.http.get<INationalityApiData>(API_ENDPOINTS.getMasterNationality)
  }

  getMasterCountries(): Observable<ICountryApiData> {
    return this.http.get<ICountryApiData>(API_ENDPOINTS.getMasterCountries)
  }

  getProfilePageMeta(): Observable<IProfileMetaApiData> {
    return this.http.get<IProfileMetaApiData>(API_ENDPOINTS.getProfilePageMeta)
  }

  getUserdetailsFromRegistry(wid: string): Observable<[IUserProfileDetailsFromRegistry]> {
    return this.http.get<[IUserProfileDetailsFromRegistry]>(`${API_ENDPOINTS.getUserdetailsFromRegistry}/${wid}`)
      .pipe(map((res: any) => {
        return res.result.response
      }))
  }

  getOrganizationData(request: any) {
    return this.http.post<any>(API_ENDPOINTS.GET_ORGANIZATION_V1, request)
  }

  readOrgData(request: any, configDetails?: ConfigDetails) {
    let url = API_ENDPOINTS.READ_ORG_DETAILS
    if (configDetails) {
      configDetails['defaultUrl'] = API_ENDPOINTS.READ_ORG_DETAILS
      url = this.commonMethodsService.getEnabledUrl(configDetails)
      if (!url) {
        return of('')
      }
    }
    return this.http.post<any>(url, request)
  }

  getAllDepartments() {
    return this.http.get<INationalityApiData>(API_ENDPOINTS.getAllDepartments)
  }

  approveRequest(data: any) {
    return this.http.post(API_ENDPOINTS.approveRequest, data)
  }

  // workflow application-fields search is gated by global-config apis.workflow.userWFApplicationFieldsSearch
  private isWorkflowSearchEnabled(): boolean {
    const cfg = this.configSvc.globalConfig?.apis?.workflow?.userWFApplicationFieldsSearch
    return !(cfg && !cfg.enabled)
  }

  private getWorkflowSearchUrl(): string {
    const cfg = this.configSvc.globalConfig?.apis?.workflow?.userWFApplicationFieldsSearch
    return (cfg?.enabled && cfg?.url) ? cfg.url : API_ENDPOINTS.getPendingFields
  }

  listApprovalPendingFields() {
    if (!this.isWorkflowSearchEnabled()) {
      return of({ result: { data: [] } })
    }
    return this.http.post<any>(this.getWorkflowSearchUrl(), {
      serviceName: 'profile',
      applicationStatus: 'SEND_FOR_APPROVAL',
    })
  }

  fetchApprovalPendingFields() {
    if (!this.isWorkflowSearchEnabled()) {
      return of({ result: { data: [] } })
    }
    return this.http.post<any>(this.getWorkflowSearchUrl(), {
      serviceName: 'profile',
      applicationStatus: 'SEND_FOR_APPROVAL',
    })
  }

  fetchApprovedFields() {
    if (!this.isWorkflowSearchEnabled()) {
      return of({ result: { data: [] } })
    }
    return this.http.post<any>(this.getWorkflowSearchUrl(), {
      serviceName: 'profile',
      applicationStatus: 'APPROVED',
    })
  }

  listRejectedFields() {
    if (!this.isWorkflowSearchEnabled()) {
      return of({ result: { data: [] } })
    }
    return this.http.post<any>(this.getWorkflowSearchUrl(), {
      serviceName: 'profile',
      applicationStatus: 'REJECTED',
    })
  }

  getDesignations(_req: any): Observable<IProfileMetaApiData> {
    return this.http.get<IProfileMetaApiData>(API_ENDPOINTS.getDesignation)
  }

  searchDesignation(_req: any): Observable<any> {
    return this.http.post<any>(API_ENDPOINTS.GET_SEARCH_PUBLIC_DESIGNATIONS, _req)
  }
  searchPublicDesignation(_req: any, configDetails?: ConfigDetails): Observable<any> {
    let url = API_ENDPOINTS.READ_ORG_DETAILS
    if (configDetails) {
      configDetails['defaultUrl'] = API_ENDPOINTS.READ_ORG_DETAILS
      url = this.commonMethodsService.getEnabledUrl(configDetails)
      if (!url) {
        return of('')
      }
    }
    return this.http.post<any>(url, _req)
  }
  searchDesignationPublicPage(_req: any): Observable<any> {
    return this.http.post<any>(API_ENDPOINTS.GET_SEARCH_PUBLIC_DESIGNATIONS, _req)
  }

  searchIgotDesignation(_req: any): Observable<any> {
    return this.http.post<any>(API_ENDPOINTS.GET_SUNBIRD_IGOT_SEARCH, _req)
  }

  getDesignationV2(_req: any): Observable<IProfileMetaApiData> {
    return this.http.post<IProfileMetaApiData>(API_ENDPOINTS.GET_DESIGNATION_V2, _req)
  }

  uploadProfilePhoto(req: any): Observable<any> {
    return this.http.post<any>(`${API_ENDPOINTS.updateProfilePic}`, req)
  }

  getGroups(): Observable<any> {
    return this.http.get<any>(API_ENDPOINTS.GET_GROUPS)
  }

  getApprovalReqs(data: any): Observable<any> {
    return this.http.post<any>(API_ENDPOINTS.getApprovalReqs, data)
  }

  withDrawRequest(userId: string, wfId: string): Observable<any> {
    const payload = {
      'action': 'WITHDRAW',
      'state': 'SEND_FOR_APPROVAL',
      'userId': userId,
      'applicationId': userId,
      'actorUserId': userId,
      'wfId': wfId,
      'serviceName': 'profile',
      'updateFieldValues': [],
      'comment': '',
    }
    return this.http.post<any>(API_ENDPOINTS.withDrawRequest, payload)
  }

  fetchEhrmsDetails() {
    return this.http
      .get(API_ENDPOINTS.ehrmsDataRequest)
      .pipe(
        map(
          (result: any) => result
        )
      )
  }
  getWhiteListDomain(): Observable<any> {
    return this.http.get<any>(API_ENDPOINTS.approvedDomains)
  }

  fetchCustomFields(requestBody: any, configDetails?: ConfigDetails): Observable<any> {
    let url = API_ENDPOINTS.ORG_CUSTOM_FIELDS
    if (configDetails) {
      configDetails['defaultUrl'] = API_ENDPOINTS.ORG_CUSTOM_FIELDS
      url = this.commonMethodsService.getEnabledUrl(configDetails)
      if (!url) {
        return of('')
      }
    }
    return this.http.post<any>(url, requestBody)
  }

  updateCustomFields(requestBody: any, configDetails?: ConfigDetails): Observable<any> {
    let url = API_ENDPOINTS.UPDATE_CUSTOM_FIELDS
    if (configDetails) {
      configDetails['defaultUrl'] = API_ENDPOINTS.UPDATE_CUSTOM_FIELDS
      url = this.commonMethodsService.getEnabledUrl(configDetails)
      if (!url) {
        return of('')
      }
    }
    return this.http.post<any>(url, requestBody)
  }

  readCustomattributeDetails(_userId: string, _orgId: string, configDetails?: ConfigDetails): Observable<any> {
    let url = API_ENDPOINTS.READ_CUSTOM_FIELDS_VALUES
    if (configDetails) {
      configDetails['defaultUrl'] = API_ENDPOINTS.READ_CUSTOM_FIELDS_VALUES
      url = this.commonMethodsService.getEnabledUrl(configDetails)
      if (!url) {
        return of('')
      }
    }
    return this.http.get<any>(`${url}`)
  }
}
