// Core imports
import { Component, OnDestroy, OnInit } from '@angular/core'
import { Router } from '@angular/router'
import { HttpErrorResponse } from '@angular/common/http'
import { MatTabChangeEvent } from '@angular/material'
import { MatSnackBar } from '@angular/material'
// RxJS imports
import { Subject } from 'rxjs'
import { takeUntil } from 'rxjs/operators'

import _ from 'lodash';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'

// Project files and components
import { ConfigurationsService } from '@sunbird-cb/utils/src/public-api'
import { CompetencyPassbookService } from './../competency-passbook.service'
import { WidgetUserService } from '@sunbird-cb/collection/src/public-api'

dayjs.extend(isSameOrBefore)
dayjs.extend(isSameOrAfter)
dayjs.extend(isBetween)

@Component({
  selector: 'ws-competency-list',
  templateUrl: './competency-list.component.html',
  styleUrls: ['./competency-list.component.scss']
})

export class CompetencyListComponent implements OnInit, OnDestroy {

  isMobile: boolean = false;
  toggleFilter: boolean = false;
  skeletonArr = <any>[];
  showAll = false;
  private destroySubject$ = new Subject();
  three_month_back = new Date(new Date().setMonth(new Date().getMonth() - 3));
  six_month_back = new Date(new Date().setMonth(new Date().getMonth() - 6));
  one_year_back = new Date(new Date().setFullYear(new Date().getFullYear() - 1));
  showFilterIndicator: string = 'all';
  filteredData: any[] = [];
  filterApplied: boolean = false;

  TYPE_CONST = {
    behavioral: {
      capsValue: 'Behavioural',
      value: 'behavioural'
    },
    functional: {
      capsValue: 'Functional',
      value: 'functional'
    },
    domain: {
      capsValue: 'Domain',
      value: 'domain'
    }
  }

  competencyArray: any;
  competency: any = {
    skeletonLoading: true,
    error: false,
    all: <any>[],
    behavioural: <any>[],
    functional: <any>[],
    domain: <any>[],
    allValue: 0,
    behaviouralValue: 0,
    functionalValue: 0,
    domainValue: 0,
    behaviouralSubTheme: 0,
    functionalSubTheme: 0,
    domainSubTheme: 0
  };

  leftCardDetails: any = [{
    name: this.TYPE_CONST.behavioral.value,
    label: this.TYPE_CONST.behavioral.capsValue,
    type: 'Behavioral',
    total: 0,
    competencySubTheme: 0,
    contentConsumed: 0,
    filter: {
      all: 0,
      threeMonths: 0,
      sixMonths: 0,
      lastYear: 0,
      threeMonthsSubTheme: 0,
      sixMonthsSubTheme: 0,
      lastYearSubTheme: 0
    }
  }, {
    name: this.TYPE_CONST.functional.value,
    label: this.TYPE_CONST.functional.capsValue,
    type: this.TYPE_CONST.functional.capsValue,
    total: 0,
    competencySubTheme: 0,
    contentConsumed: 0,
    filter: {
      all: 0,
      threeMonths: 0,
      sixMonths: 0,
      lastYear: 0,
      threeMonthsSubTheme: 0,
      sixMonthsSubTheme: 0,
      lastYearSubTheme: 0
    }
  }, {
    name: this.TYPE_CONST.domain.value,
    label: this.TYPE_CONST.domain.capsValue,
    type: this.TYPE_CONST.domain.capsValue,
    total: 0,
    competencySubTheme: 0,
    contentConsumed: 0,
    filter: {
      all: 0,
      threeMonths: 0,
      sixMonths: 0,
      lastYear: 0,
      threeMonthsSubTheme: 0,
      sixMonthsSubTheme: 0,
      lastYearSubTheme: 0
    }
  }];

  filterObjData: any = {
    "primaryCategory":[],
    "status":[],
    "timeDuration":[], 
    "competencyArea": [], 
    "competencyTheme": [], 
    "competencySubTheme": [], 
    "providers": [] 
  }

  courseWithCompetencyArray: any[] = [];
  certificateMappedObject: any = {}; 

  constructor(
    private cpService: CompetencyPassbookService,
    private widgetService: WidgetUserService,
    private configService: ConfigurationsService,
    private router: Router,
    private matSnackBar: MatSnackBar
  ) { 
    if (window.innerWidth < 768) {
      this.isMobile = true;
      this.skeletonArr = [1, 2, 3];
    } else {
      this.skeletonArr = [1, 2, 3, 4, 5, 6];
      this.showAll = true;
      this.isMobile = false;
    }
  }

  ngOnInit() {
    this.getUserEnrollmentList();
  }

  getUserEnrollmentList(): void {
    const userId: any = this.configService && this.configService.userProfile && this.configService.userProfile.userId;
    this.widgetService.fetchUserBatchList(userId)
      .pipe(takeUntil(this.destroySubject$))
      .subscribe(
        (response: any) => {
          this.fetchCompetencyList();

          let competenciesV5: any[] = [];
          response.courses.forEach((obj: any) => {
            if (obj.content && obj.content.competencies_v5) {
              this.courseWithCompetencyArray.push(obj);
              competenciesV5 = [...competenciesV5, ...obj.content.competencies_v5];
            }
          });
          
          competenciesV5.forEach((obj: any) => {
            this.leftCardDetails.forEach((_eachObj: any) => {
              if (_eachObj.type.toLowerCase() === obj.competencyArea.toLowerCase()) {
                _eachObj.contentConsumed += 1;
              }
            })
          });

        }, (error: HttpErrorResponse) => {
          if (!error.ok) {
            this.matSnackBar.open("Unable to pull Enrollment list details!");
          }
        }
    )
  }

  loopCertificateData(eachCourse: any, v5Obj: any, themeObj?: any): void {
    eachCourse.issuedCertificates.forEach((eObj: any) => {
      eObj['courseName'] = eachCourse.courseName;
      eObj['competencyTheme'] = v5Obj.competencyTheme;
      eObj['viewMore'] = false;
      if (themeObj && themeObj.name) {
        eObj['subThemes'] = themeObj.children.map((subObj: any) => {
          return subObj;
        });
      }
    });
  }

  bindMoreData(typeObj: any, name: string) {
    const leftCardObj = this.leftCardDetails.find((obj: any) => obj.name === name);

    typeObj.forEach((obj: any) => {
      obj['viewMore'] = false;
      obj['competencyName'] = name;

      if (new Date(obj.createdDate) > this.one_year_back) {
        leftCardObj.filter.lastYear += 1;
        leftCardObj.filter.lastYearSubTheme += obj.children.length;

        if (new Date(obj.createdDate) > this.six_month_back) {
          leftCardObj.filter.sixMonths += 1
          leftCardObj.filter.sixMonthsSubTheme += obj.children.length;
        }

        if (new Date(obj.createdDate) > this.three_month_back) {
          leftCardObj.filter.threeMonths += 1
          leftCardObj.filter.threeMonthsSubTheme += obj.children.length;
        }
      }

      this.leftCardDetails.forEach((_eachObj: any) => {
        if (_eachObj.name === name) {
          _eachObj.competencySubTheme += obj.children.length;
        }
      });

      this.courseWithCompetencyArray.forEach((eachCourse: any) => {
        if (eachCourse.issuedCertificates && eachCourse.issuedCertificates.length) {
          eachCourse.content.competencies_v5 && eachCourse.content.competencies_v5.forEach((cObj: any) => {
            if (cObj.competencyTheme.toLowerCase().trim() === obj.name.toLowerCase().trim()) {
              if (this.certificateMappedObject[obj.name]) {
                this.certificateMappedObject[obj.name].forEach((certificateObj: any) => {
                  eachCourse.issuedCertificates.forEach((courseObj: any) => {
                    if (certificateObj.identifier !== courseObj.identifier) {
                      this.certificateMappedObject[obj.name] = [...this.certificateMappedObject[obj.name], courseObj];
                    }
                  });
                });
              } else {
                this.certificateMappedObject[obj.name] = [];
                this.certificateMappedObject[obj.name] = eachCourse.issuedCertificates;
              }

              this.loopCertificateData(eachCourse, cObj, obj);
            } else {
              this.loopCertificateData(eachCourse, cObj);
            }
          })
        }
      });
    });

    return typeObj;
  }

  fetchCompetencyList(): void {
    const payload = {
      "search": {
        "type": "Competency Area"
      },
      "filter": {
        "isDetail": true
      }
    };

    this.cpService.getCompetencyList(payload)
      .pipe(takeUntil(this.destroySubject$))
      .subscribe(
        (response: any) => {
          response.result.competency.forEach((obj: any) => {
            if (obj.name === 'Behavioral') {
              this.competency.behavioural = this.bindMoreData(obj.children, 'behavioural');
              this.competency.all = [...this.competency.all, ...this.competency.behavioural]
            } else if (obj.name === 'Functional') {
              this.competency.functional = this.bindMoreData(obj.children, obj.name.toLowerCase());
              this.competency.all = [...this.competency.all, ...this.competency.functional]
            } else {
              this.competency.domain = this.bindMoreData(obj.children, obj.name.toLowerCase());
              this.competency.all = [...this.competency.all, ...this.competency.domain]
            }
            
            this.leftCardDetails.forEach((_eachObj: any) => {
              if(_eachObj.type.toLowerCase() === obj.name.toLowerCase()) {
                _eachObj.total = obj.children.length
              }

              // _eachObj.filter.all = _eachObj.filter.threeMonths + _eachObj.filter.sixMonths + _eachObj.filter.lastYear;
            });
          });

          this.competencyArray = (this.isMobile) ? this.competency.all.slice(0, 3) : this.competency.all;
          this.competency.skeletonLoading = false;
        }, (error: HttpErrorResponse) => {
          if (!error.ok) {
            this.competency.error = true;
            this.competency.skeletonLoading = false;
          }
        }
      );
  }

  handleLeftFilter(months: string): void {
    this.leftCardDetails.forEach((_obj: any) => {
      this.competency[`${_obj.name}Value`] = _obj.filter[months]
      if (months === 'all') {
        this.competency[`${_obj.name}SubTheme`] = _obj.competencySubTheme
      } else {
        this.competency[`${_obj.name}SubTheme`] = _obj.filter[`${months}SubTheme`]
      }
    });
    this.showFilterIndicator = months;
  }

  handleTabChange(event: MatTabChangeEvent ): void {
    const param = event.tab.textLabel.toLowerCase();
    this.competencyArray = this.competency[param];
  }

  handleShowAll(): void {
    this.showAll = !this.showAll;
    this.competencyArray = (this.showAll) ? this.competency['all'] : this.competency['all'].slice(0, 3); 
  }

  handleClick(param: string): void {
    this.competencyArray = (this.isMobile) ? this.competency[param].slice(0, 3) : this.competency[param];
  }

  handleViewMore(obj: any, flag?: string): void {
    obj.viewMore = flag ? false : true;
  }

  handleNavigate(obj: any): void {
    const state =  {certificate: this.certificateMappedObject[obj.name]};
    this.router.navigate(['/page/competency-passbook/details'], {queryParams: {theme: obj.name, name: obj.competencyName}, state});
  }

  handleSearch(event: string, competencyTheme: string): void {
    competencyTheme = competencyTheme.toLowerCase()
    if (!this.competency[competencyTheme].length) return;
    this.competencyArray = (!event.length) ? this.competency[competencyTheme] : this.competency[competencyTheme].filter((obj: any) => obj.name.toLowerCase().trim().includes(event.toLowerCase()));
  }

  // Filters related functionalities...
  handleFilter(event: boolean): void {
    console.log("event - ", event);
    this.toggleFilter = event;
  }

  handleApplyFilter(event: any){
    this.toggleFilter = false
    this.filterObjData = event
    this.filterData(event)
  }

  handleClearFilterObj(event: any){
    this.filterObjData = event;
    this.filterData(event);
  }

  filterData(filterValue: any) {
    console.log("filterValue - ", filterValue);
    let finalFilterValue: any = [];
    if( filterValue['primaryCategory'].length || filterValue['status'].length || filterValue['timeDuration'].length || filterValue['competencyArea'].length || filterValue['competencyTheme'].length || filterValue['competencySubTheme'].length || filterValue['providers'].length ) {
      let filterAppliedOnLocal = false;
      this.filteredData = this.competencyArray;

      if(filterValue['primaryCategory'].length) {
        filterAppliedOnLocal = filterAppliedOnLocal ? true : false;
        finalFilterValue = (filterAppliedOnLocal ? finalFilterValue : this.filteredData).filter((data: any) => {
          if(filterValue['primaryCategory'].includes(data.primaryCategory)) {
            return data;
          }
        });
        filterAppliedOnLocal = true;
      }

      if(filterValue['status'].length) {
        filterAppliedOnLocal = filterAppliedOnLocal ? true : false;
        finalFilterValue = (filterAppliedOnLocal ? finalFilterValue : this.filteredData).filter((data: any) => {
          let statusData = filterValue['status'].includes('all')? ['0','1','2']: filterValue['status']
          if(statusData.includes(String(data.contentStatus))) {
            return data 
          }
        })
        filterAppliedOnLocal = true;
      }

      if(filterValue['timeDuration'].length) {
        filterAppliedOnLocal = filterAppliedOnLocal ? true : false;
        finalFilterValue = (filterAppliedOnLocal ? finalFilterValue : this.filteredData).filter((data: any) => {
          if(filterValue['timeDuration'].some((time: any) => {
            let count = Number(time.slice(0,-2))
            if(time.includes('sw')) {
              return dayjs(data.endDate).isSameOrAfter(dayjs(dayjs().subtract(count, 'week'))) && dayjs(data.endDate).isSameOrBefore(dayjs())
            } else if(time.includes('ad')) {
              return dayjs(data.endDate).isSameOrBefore(dayjs(dayjs().add(count, 'day'))) && dayjs(data.endDate).isSameOrAfter(dayjs())
            }  else if(time.includes('sm')) {
              return dayjs(data.endDate).isSameOrAfter(dayjs(dayjs().subtract(count, 'month'))) && dayjs(data.endDate).isSameOrBefore(dayjs())
            }
            return true
          })
          ) {
            return data 
          }
        })
        filterAppliedOnLocal = true
      }

      if(filterValue['competencyArea'].length){
        filterAppliedOnLocal = filterAppliedOnLocal ? true : false
        finalFilterValue = (filterAppliedOnLocal ? finalFilterValue : this.filteredData).filter((data: any) => {
          if(filterValue['competencyArea'].some((r: any) => data.competencyArea.includes(r))) {
            return data 
          }
        })
        filterAppliedOnLocal = true;
      }

      if(filterValue['competencyTheme'].length){
        filterAppliedOnLocal = filterAppliedOnLocal ? true : false
        finalFilterValue = (filterAppliedOnLocal ? finalFilterValue : this.filteredData).filter((data: any) => {
          if(filterValue['competencyTheme'].some((r: any) => data.competencyTheme.includes(r))) {
            return data 
          }
        })
        filterAppliedOnLocal = true;
      }

      if(filterValue['competencySubTheme'].length){
        filterAppliedOnLocal = filterAppliedOnLocal ? true : false
        finalFilterValue = (filterAppliedOnLocal ? finalFilterValue : this.filteredData).filter((data: any) => {
          if(filterValue['competencySubTheme'].some((r: any) => data.competencySubTheme.includes(r))) {
            return data 
          }
        })
        filterAppliedOnLocal = true;
      }

      if(filterValue['providers'].length){
        filterAppliedOnLocal = filterAppliedOnLocal? true : false
        finalFilterValue = (filterAppliedOnLocal ? finalFilterValue : this.filteredData).filter((data: any) => {
          if(filterValue['providers'].includes(data.organisation[0])) {
            return data 
          }
        })
        filterAppliedOnLocal = true;
      }

      console.log("finalFilterValue - ", finalFilterValue);
      
    } else {
      this.filterApplied = false;
      finalFilterValue = this.competencyArray;
    }
  }

  ngOnDestroy(): void {
    this.destroySubject$.unsubscribe();
  }

}
