import { Component, Inject, OnDestroy } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { HttpErrorResponse } from '@angular/common/http'
import { MatSnackBar } from '@angular/material'

import { Subject } from 'rxjs'
import { takeUntil } from 'rxjs/operators'

import { ConfigurationsService } from '@sunbird-cb/utils/src/public-api'
import { RequestService } from 'src/app/routes/public/public-request/request.service'

@Component({
  selector: 'ws-designation-request',
  templateUrl: './designation-request.component.html',
  styleUrls: ['./designation-request.component.scss'],
})

export class DesignationRequestComponent implements OnDestroy {

  private destroySubject$ = new Subject()
  designation = ''
  constructor(
    public dialogRef: MatDialogRef<DesignationRequestComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private configService: ConfigurationsService,
    private requestService: RequestService,
    private matSnackBar: MatSnackBar
  ) { }

  handleCloseModal(): void {
    this.dialogRef.close()
  }

  handleSaveDesignation(): void {
    const postData: any = {
      state: 'INITIATE',
      action: 'INITIATE',
      serviceName: 'position',
      userId: this.configService.unMappedUser.id,
      applicationId: this.configService.unMappedUser.id,
      actorUserId: this.configService.unMappedUser.id,
      deptName: 'iGOT',
      updateFieldValues: [],
    }

    const data: any = {
      toValue: {
        position: this.designation,
      },
      fieldKey: 'position',
      description: this.designation,
      firstName: (this.data.portalProfile.personalDetails) ? (this.data.portalProfile.personalDetails.firstname || '') : '',
      email: (this.data.portalProfile.personalDetails) ? (this.data.portalProfile.personalDetails.primaryEmail || '') : '',
      mobile: (this.data.portalProfile.personalDetails) ? (this.data.portalProfile.personalDetails.mobile || '') : '',
    }

    postData.updateFieldValues.push(data)
    this.requestService.createPosition(postData)
    .pipe(takeUntil(this.destroySubject$))
    .subscribe((_res: any) => {
      this.matSnackBar.open('Your designation request has been submitted successfully!')
      this.handleCloseModal()
    },         (error: HttpErrorResponse) => {
      if (!error.ok) {
        this.matSnackBar.open('Unable to request given designation, please try again later')
        this.handleCloseModal()
      }
    })
  }

  ngOnDestroy(): void {
    this.destroySubject$.unsubscribe()
  }

}