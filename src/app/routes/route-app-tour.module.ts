import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterModule } from '@angular/router'
import { AppTourComponent } from '../component/app-tour/app-tour.component'
import { AppTourSharedModule } from '../component/app-tour/app-tour-shared.module'
import { GuidedTourModule, GuidedTourService } from 'igot-cb-tour-guide'
import { MatIconModule } from '@angular/material/icon'
import { TranslateModule } from '@ngx-translate/core'

@NgModule({
  imports: [
    CommonModule,
    MatIconModule,
    TranslateModule,
    GuidedTourModule,
    AppTourSharedModule,
    RouterModule.forChild([{ path: '', component: AppTourComponent }]),
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [GuidedTourService],
})
export class RouteAppTourModule {}
