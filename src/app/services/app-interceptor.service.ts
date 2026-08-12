import { Injectable, LOCALE_ID, Inject } from '@angular/core'
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http'
import { Observable, throwError } from 'rxjs'
import { ConfigurationsService, AuthKeycloakService } from '@sunbird-cb/utils-v2'
import { catchError } from 'rxjs/operators'
import { MatSnackBar } from '@angular/material/snack-bar'
import { NOTIFICATION_TIME } from '@sunbird-cb/collection'
// import 'rxjs/add/operator/do'

@Injectable({
  providedIn: 'root',
})
export class AppInterceptorService implements HttpInterceptor {
  constructor(
    private configSvc: ConfigurationsService,
    private snackBar: MatSnackBar,
    private authSvc: AuthKeycloakService,
    // private router: Router,
    @Inject(LOCALE_ID) private locale: string,
  ) { }
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const lang = [this.locale.replace('en-US', 'en')]
    if (this.configSvc.userPreference) {
      (this.configSvc.userPreference.selectedLangGroup || '')
        .split(',')
        .map(u => u.trim())
        .filter(u => u.length)
        .forEach(locale => {
          if (!lang.includes(locale)) {
            lang.push(locale)
          }
        })
    }

    if (this.configSvc.activeOrg && this.configSvc.rootOrg) {
      const modifiedReq = req.clone({
        setHeaders: {
          Authorization: '',
          org: this.configSvc.activeOrg,
          rootOrg: this.configSvc.rootOrg,
          locale: lang.join(','),
          wid: (this.configSvc.userProfile && this.configSvc.userProfile.userId) || '',
          cstoken: (this.configSvc.cstoken) || '',
          // wid:'',
          hostPath: this.configSvc.hostPath,
        },
      })
      return next.handle(modifiedReq)
        // .do(event => {
        //   if (event instanceof HttpResponseBase) {
        //     const response = event as HttpResponseBase
        //     if (response && response.ok && response.url && response.url.toLowerCase().indexOf(this.logoPartialUrl) >= 0) {
        //       // Modify this portion appropriately to match your redirect page
        //       const queryStringIndex = response.url.indexOf('?')
        //       const loginUrl = queryStringIndex && queryStringIndex > 0 ? response.url.substring(0, queryStringIndex) : response.url;
        //       console.log('User logout detected, redirecting to login page: %s', loginUrl)
        //       window.location.href = loginUrl
        //     }
        //   }
        // })
        .pipe(
          catchError(error => {
            if (error instanceof HttpErrorResponse) {
              const localUrl = location.origin
              const pagePath = location.href || `${localUrl}/page/home`
              const pageName = (location.href || '').replace(localUrl, '')
              switch (error.status) {
                case 0:
                  if (localUrl.includes('localhost')) {
                    this.snackBar.open('Please login Again and Apply new TOKEN', undefined, { duration: NOTIFICATION_TIME * 3 })

                    // this.authSvc.logout()
                    this.authSvc.force_logout()
                  }
                  break
                case 200:
                  if (!error.ok && error.url) {
                    window.location.href = error.url
                  }
                  break
                // case 0:
                case 419:      // login
                  if (localStorage.getItem('telemetrySessionId')) {
                    localStorage.removeItem('telemetrySessionId')
                  }
                  // Only redirect if we are not already sitting on the login entry point.
                  // Without this, a login URL that fails to leave the SPA - e.g. the
                  // service worker answering /protected/** with cached index.html - makes
                  // this handler send the browser to the page it is already on, the app
                  // boots again, its startup calls 419 again, and the cycle repeats until
                  // the tab is closed (observed: 1487 requests over 3.3 min).
                  // new URL(..., origin) normalises both forms the backend may send -
                  // a bare path and a fully qualified URL - down to a comparable pathname.
                  if (error.error && error.error.redirectUrl
                      && !location.pathname.startsWith(
                        new URL(String(error.error.redirectUrl), localUrl).pathname)) {
                    // tslint:disable-next-line: prefer-template
                    window.location.href = error.error.redirectUrl
                      + `?redirect_uri=${encodeURIComponent(localUrl.includes('localhost') ? pagePath : pageName)}`
                  }
                  // if (!window.location.href.includes('/public/home')) {
                  //   this.router.navigate(['public', 'home'])
                  //   // window.location.href = '/public/home'
                  // }
                  // this.authSvc.force_logout()
                  break
              }
            }
            return throwError(error)
          })
        )
    }
    return next.handle(req)
  }
}
