import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router'
import { ConfigurationsService, IResolveResponse } from '@sunbird-cb/utils-v2'
import { Observable, of } from 'rxjs'
import { NSProfileDataV2 } from '../../models/profile-v2.model'
import { ProfileV2RevampService } from '../../services/profile-v2-revamp.service'
import { catchError, map } from 'rxjs/operators'
import * as _ from 'lodash'
import { ConfigDetails } from '@sunbird-cb/consumption'

@Injectable()
export class profileResolver {
  constructor(
    private profileSvc: ProfileV2RevampService, private configSvc: ConfigurationsService) { }

  resolve(
    _route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot,
  ): Observable<IResolveResponse<NSProfileDataV2.IProfile>> {
    const apiConfig = _.get(_route, 'parent.data.pageData.data.apiConfig')
    const path = _route.routeConfig && _route.routeConfig.path
    let userId = ''
    if (path !== 'me') {
      userId = _route.params.userId
      if (!userId) {
        userId = _route.queryParams.userId
      }
      if (!userId) {
        userId = this.configSvc.userProfile && this.configSvc.userProfile.userId || ''
      }
    } else {
      userId = this.configSvc.userProfile && this.configSvc.userProfile.userId || ''
    }
    const isNotCurrentUser = userId !== _.get(this.configSvc, 'userProfile.userId')
    const configDetails: ConfigDetails = {
      defaultUrl: '',
      urlConfigPath: 'profileV1Basic',
      apiConfig,
    }
    return this.profileSvc.fetchProfile(configDetails, userId, isNotCurrentUser).pipe(
      map(data => {
        const profileData = _.get(data, 'result.response') || {}
        if (!isNotCurrentUser) {
          _.merge(profileData, {
            professionalDetails: this.configSvc.userProfile?.professionalDetails,
          })
        }
        return {
          userId,
          data: profileData,
          error: null,
        }
      }),
      catchError(error => of({ error, data: null })),
    )
  }
}
