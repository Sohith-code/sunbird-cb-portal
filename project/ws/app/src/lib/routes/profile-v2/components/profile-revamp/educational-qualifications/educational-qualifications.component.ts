import { Component, EventEmitter, Inject, Input, OnInit, Output } from '@angular/core'
import { educationalQualifications } from '../../../models/profile-revamp.model'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'
import { ProfileV2RevampService } from '../../../services/profile-v2-revamp.service'
import { MatSnackBar } from '@angular/material/snack-bar'
import * as _ from 'lodash'

@Component({
  selector: 'ws-app-educational-qualifications',
  templateUrl: './educational-qualifications.component.html',
  styleUrls: ['./educational-qualifications.component.scss'],
  standalone: false
})
export class EducationalQualificationsComponent implements OnInit {
  //#region (global variables)
  @Input() educationalQualificationsList: educationalQualifications[] = []
  @Input() isCurrentUser = false
  @Input() editConfig: any = null
  @Input() apiConfig: any
  @Output() openProfileEntryEditDialog = new EventEmitter()

  userId: string = ''
  isPopup: boolean = false
  //#endregion (global variables)

  constructor(
    private dialogRef: MatDialogRef<EducationalQualificationsComponent>,
    @Inject(MAT_DIALOG_DATA) private data: any,
    private profileV2RevampSvc: ProfileV2RevampService,
    private snackBar: MatSnackBar,
  ) {
    if (this.data && this.data.userId) {
      this.userId = data.userId
      this.isPopup = true
      this.isCurrentUser = data.isCurrentUser || false
      this.editConfig = data.editConfig || null
    }
  }

  ngOnInit() {
    if (this.isPopup) {
      this.getEducationalQualificationsList()
    }
  }

  getEducationalQualificationsList() {
    if (this.userId) {
      const configDetails = {
        defaultUrl: '',
        urlConfigPath: 'profileV1Extended',
        apiConfig: this.data?.apiConfig || this.apiConfig
      }
      this.profileV2RevampSvc.fetchProfileEntries(configDetails, this.userId, 'all', !this.isCurrentUser).subscribe({
        next: (res: any) => {
          if (res) {
            this.educationalQualificationsList = _.get(res, 'result.response.educationalQualifications.data', [])
          }
        },
        error: (err: any) => {
          if (err) {
            this.openSnackbar('Something went wrong while fetching educational qualifications, please try again later', 2000)
          }
        },
      })
    }
  }

  //#region (functions)
  openEditDialog(entry: any = {}): void {
    if (this.isPopup) {
      this.dialogRef.close(entry)
    } else {
      this.openProfileEntryEditDialog.emit(entry)
    }
  }

  closePopup(): void {
    if (this.isPopup) {
      this.dialogRef.close()
    }
  }

  openSnackbar(primaryMsg: string, duration: number = 5000) {
    this.snackBar.open(primaryMsg, 'X', {
      duration,
    })
  }
  //#endregion (functions)
}
