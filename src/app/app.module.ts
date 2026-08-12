import { FullscreenOverlayContainer, OverlayContainer } from '@angular/cdk/overlay'
import { APP_BASE_HREF, PlatformLocation } from '@angular/common'
import { HttpClient, HttpClientJsonpModule, HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http'
// Injectable
import { APP_INITIALIZER, NgModule, ErrorHandler, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
// HAMMER_GESTURE_CONFIG
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'

import { WidgetResolverModule } from '@sunbird-cb/resolver'
import { UserProfileService } from '@ws/app/src/lib/routes/user-profile/services/user-profile.service'
import { AccessControlService, ApiService } from '@ws/author/src/public-api'
import { SbUiResolverModule } from '@sunbird-cb/resolver-v2'
import { LoggerService, PipeSafeSanitizerModule, ConfigurationsService, PipeOrderByModule, NPSGridService, DomainConfService } from '@sunbird-cb/utils-v2'

import 'hammerjs'
import { AppRoutingModule } from './app-routing.module'
import { InitService } from './services/init.service'
import { GlobalErrorHandlingService } from './services/global-error-handling.service'
import { AppTocResolverService, WIDGET_REGISTRATION_TOC_LIB_CONFIG } from '@sunbird-cb/toc'

import { RootComponent } from './component/root/root.component'
import { AppFooterComponent } from './component/app-footer/app-footer.component'
import { AppPublicNavBarComponent } from './component/app-public-nav-bar/app-public-nav-bar.component'
import { DialogConfirmComponent } from './component/dialog-confirm/dialog-confirm.component'
import { AppInterceptorService } from './services/app-interceptor.service'
import { AppRetryInterceptorService } from './services/app-retry-interceptor.service'
import { TncAppResolverService } from './services/tnc-app-resolver.service'
import { TncPublicResolverService } from './services/tnc-public-resolver.service'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { ServiceWorkerModule } from '@angular/service-worker'
import { environment } from 'src/environments/environment'
import { QuickTourModule } from '@ws/app'
import { AppIntroComponent } from './component/app-intro/app-intro.component'
import { NoConnectionComponent } from './component/no-connection/no-connection.component'
import { PublicHomeComponent } from './routes/public/public-home/public-home.component'
import { WelcomeUserResolverService } from './services/welcome-user-resolver.service'

import { AppChatbotModule } from './component/app-chatbot/app-chatbot.module'
import { AppHierarchyResolverService } from './services/app-hierarchy-resolver.service'
import { AppEnrollmentResolverService } from './services/app-enrollment-resolver.service'
import { TranslateHttpLoader } from '@ngx-translate/http-loader'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { AppContentResolverService } from './services/app-content-read-resolver.service'

import { HeaderModule } from './header/header.module'
import { DialogBoxComponent } from './component/dialog-box/dialog-box.component'
import { SocialLinkComponent } from './component/social-link/social-link.component'
import { FooterSectionComponent } from './component/app-footer/footer-section/footer-section.component'
import { AppLogoComponent } from './component/app-logo/app-logo.component'
import { NoDataComponent } from './component/no-data/no-data.component'
import {
  CardsModule, DynamicSidebarComponent, WIDGET_REGISTRATION_LIB_CONFIG,
} from '@sunbird-cb/consumption'
import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatDialogModule } from '@angular/material/dialog'
import { MatExpansionModule } from '@angular/material/expansion'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { MatProgressSpinnerModule, MAT_PROGRESS_SPINNER_DEFAULT_OPTIONS } from '@angular/material/progress-spinner'
import { MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material/snack-bar'
import { MatToolbarModule } from '@angular/material/toolbar'
import { AppPreAssessmentContentResolverService } from './services/app-pre-assessment-content-read-resolver.service'
import { ResourceDownloadHelperService } from './services/resource-download-helper.service'
import { ProfileVerificationDialogComponent } from './profile-verification-dialog/profile-verification-dialog.component'
import { CommonDataService } from './services/common-data.service'
import { WIDGET_REGISTRATION_CONFIG } from '@sunbird-cb/collection'
import { MandatoryNotificationModalComponent } from './component/mandatory-notification-modal/mandatory-notification-modal.component'
import { HeaderV2Component } from './header/header-v2/header-v2.component'
import { NoConnectionV2Component } from './component/no-connection-v2/no-connection-v2.component'
import { KarmaLeaderboardV2Module } from './home/home-v2/karma-leaderboard-v2/karma-leaderboard-v2.module'
import { AppNavBarV2Component } from './component/app-nav-bar-v2/app-nav-bar-v2.component'
import { GuidedTourModule, GuidedTourService } from 'igot-cb-tour-guide'
import { AppTourSharedModule } from './component/app-tour/app-tour-shared.module'
// @Injectable()
// export class HammerConfig extends GestureConfig {
//   buildHammer(element: HTMLElement) {
//     return new GestureConfig({ touchAction: 'pan-y' }).buildHammer(element)
//   }
// }
const appInitializer = (initSvc: InitService, logger: LoggerService) => async () => {
  try {
    await initSvc.init()
  } catch (error) {
    logger.error('ERROR DURING APP INITIALIZATION >', error)
  }
}

const getBaseHref = (platformLocation: PlatformLocation): string => {
  return platformLocation.getBaseHrefFromDOM()
}

// tslint:disable-next-line:function-name
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http)
}

// tslint:disable-next-line: max-classes-per-file
@NgModule({
  declarations: [
    RootComponent,
    AppPublicNavBarComponent,
    NoDataComponent,
    AppIntroComponent,
    AppFooterComponent,
    DialogConfirmComponent,
    NoConnectionComponent,
    PublicHomeComponent,
    DialogBoxComponent,
    SocialLinkComponent,
    FooterSectionComponent,
    AppLogoComponent,
    ProfileVerificationDialogComponent,
    MandatoryNotificationModalComponent,
  ],
  imports: [
    FormsModule,
    MatCheckboxModule,
    QuickTourModule,
    ReactiveFormsModule,
    BrowserModule,
    HttpClientModule,
    HttpClientJsonpModule,
    BrowserAnimationsModule,
    AppRoutingModule,

    CardsModule,
    WidgetResolverModule.forRoot([...WIDGET_REGISTRATION_CONFIG, ...WIDGET_REGISTRATION_LIB_CONFIG, ...WIDGET_REGISTRATION_TOC_LIB_CONFIG]),
    SbUiResolverModule.forRoot([...WIDGET_REGISTRATION_LIB_CONFIG, ...WIDGET_REGISTRATION_TOC_LIB_CONFIG]),
    // Material Imports
    MatButtonModule,
    MatCardModule,
    MatToolbarModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    MatExpansionModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    PipeOrderByModule,
    PipeSafeSanitizerModule,
    AppChatbotModule,
    DynamicSidebarComponent,
    HeaderV2Component,
    NoConnectionV2Component,
    KarmaLeaderboardV2Module,
    ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production }),
    HeaderModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
    GuidedTourModule,
    AppNavBarV2Component,
    AppTourSharedModule,

  ],
  exports: [
    HeaderModule,
    TranslateModule,
  ],
  bootstrap: [RootComponent],
  providers: [
    {
      deps: [InitService, LoggerService],
      multi: true,
      provide: APP_INITIALIZER,
      useFactory: appInitializer,
    },
    {
      provide: MAT_SNACK_BAR_DEFAULT_OPTIONS,
      useValue: { duration: 5000 },
    },
    {
      provide: MAT_PROGRESS_SPINNER_DEFAULT_OPTIONS,
      useValue: {
        diameter: 55,
        strokeWidth: 4,
      },
    },
    { provide: HTTP_INTERCEPTORS, useClass: AppInterceptorService, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AppRetryInterceptorService, multi: true },
    TncAppResolverService,
    TncPublicResolverService,
    WelcomeUserResolverService,
    ConfigurationsService,
    AppTocResolverService,
    AppHierarchyResolverService,
    AppContentResolverService,
    AppEnrollmentResolverService,
    NPSGridService,
    AppPreAssessmentContentResolverService,
    HttpClient,
    CommonDataService,
    UserProfileService,
    AccessControlService,
    ApiService,
    DomainConfService,
    {
      provide: APP_BASE_HREF,
      useFactory: getBaseHref,
      deps: [PlatformLocation],
    },
    {
      provide: TranslateLoader,
      useFactory: HttpLoaderFactory,
      deps: [HttpClient],
    },
    { provide: OverlayContainer, useClass: FullscreenOverlayContainer },
    // { provide: HAMMER_GESTURE_CONFIG, useClass: HammerConfig },
    { provide: ErrorHandler, useClass: GlobalErrorHandlingService },
    { provide: 'environment', useValue: environment },
    GuidedTourService,
    ResourceDownloadHelperService,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule { }
