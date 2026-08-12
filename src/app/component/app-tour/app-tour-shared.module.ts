import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { TranslateModule } from '@ngx-translate/core'
import { GuidedTourModule } from 'igot-cb-tour-guide'
import { AppTourComponent } from './app-tour.component'
import { AppTourVideoComponent } from '../app-tour-video/app-tour-video.component'

@NgModule({
  declarations: [AppTourComponent, AppTourVideoComponent],
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    TranslateModule,
    GuidedTourModule,
  ],
  exports: [AppTourComponent, AppTourVideoComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppTourSharedModule { }
