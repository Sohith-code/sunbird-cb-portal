import { Component, OnInit, OnDestroy , Output, EventEmitter, Input } from '@angular/core'
import { FormGroup, FormControl } from '@angular/forms'
import { Subscription } from 'rxjs'
import { GbSearchService } from '../../services/gb-search.service'

@Component({
  selector: 'ws-app-search-filters',
  templateUrl: './search-filters.component.html',
  styleUrls: ['./search-filters.component.scss'],
})
export class SearchFiltersComponent implements OnInit, OnDestroy  {
  @Input() newfacets!: any
  @Input() removeFilter!: any
  @Output() appliedFilter = new EventEmitter<any>()
  filterForm: FormGroup | undefined
  filteroptions: any = []
  public userFilters = new Set()
  myFilterArray: any = []
  private subscription: Subscription = new Subscription

  constructor(private searchSrvc: GbSearchService) { }

  ngOnInit() {
    this.filteroptions = this.newfacets
    // this.filteroptions = [
    //   {
    //     name: 'Provider',
    //     values: [
    //       {
    //         count: 5,
    //         name: 'iGot Learning',
    //       },
    //       {
    //         count: 5,
    //         name: 'J-pal',
    //       },
    //       {
    //         count: 5,
    //         name: 'Udemy',
    //       },
    //       {
    //         count: 5,
    //         name: 'LBSNAA',
    //       },
    //     ],
    //   },
    //   {
    //     name: 'primaryCategory',
    //     values: [
    //       {
    //         count: 5,
    //         name: 'Course',
    //       },
    //       {
    //         count: 5,
    //         name: 'Module',
    //       },
    //       {
    //         count: 5,
    //         name: 'learning resource',
    //         subvalues: [
    //           {
    //             count: 5,
    //             name: 'Video',
    //           },
    //           {
    //             count: 5,
    //             name: 'PDF',
    //           },
    //           {
    //             count: 5,
    //             name: 'Audio',
    //           },
    //           {
    //             count: 5,
    //             name: 'Assessment',
    //           },
    //         ],
    //       },
    //     ],
    //   },
    //   {
    //     name: 'Content cost',
    //     values: [
    //       {
    //         count: 5,
    //         name: 'Free',
    //       },
    //       {
    //         count: 5,
    //         name: 'Paid',
    //       },
    //     ],
    //   },
    //   {
    //     name: 'Topics',
    //     values: [
    //       {
    //         count: 5,
    //         name: 'Business of healthcare',
    //       },
    //       {
    //         count: 5,
    //         name: 'Healthcare',
    //       },
    //     ],
    //   },
    //   {
    //     name: 'Learning Levels',
    //     values: [
    //       {
    //         count: 5,
    //         name: 'Beginner',
    //       },
    //       {
    //         count: 5,
    //         name: 'Intermediate',
    //       },
    //       {
    //         count: 5,
    //         name: 'Advanced',
    //       },
    //     ],
    //   },
    //   {
    //     name: 'Competency type',
    //     values: [
    //       {
    //         count: 5,
    //         name: 'Behavioural',
    //       },
    //       {
    //         count: 5,
    //         name: 'Domain',
    //       },
    //       {
    //         count: 5,
    //         name: 'Functional',
    //       },
    //     ],
    //   },
    //   {
    //     name: 'Completion time',
    //     values: [
    //       {
    //         count: 5,
    //         name: '30 min to 1 hr',
    //       },
    //       {
    //         count: 5,
    //         name: '2 hrs to 5 hrs',
    //       },
    //       {
    //         count: 5,
    //         name: '5hrs and more',
    //       },
    //     ],
    //   },
    // ]

    this.filterForm = new FormGroup({
      filters: new FormControl(''),
    })
    this.subscription = this.searchSrvc.notifyObservable$.subscribe((res: any) => {
      const fil = {
        name: res.name,
        count : res.count,
      }
      this.modifyUserFilters(fil, res.mainType)
    })
  }

  ngOnDestroy() {
    this.subscription.unsubscribe()
  }

  modifyUserFilters(fil: any, mainparentType: any) {
    if (this.userFilters.has(fil)) {
      this.userFilters.delete(fil)
      this.myFilterArray.forEach((fs: any, index: number) => {
        if (fs.name === fil.name) {
          this.myFilterArray.splice(index, 1)
        }
      })
      this.appliedFilter.emit(this.myFilterArray)
    } else {
      this.userFilters.add(fil)
      // const myFilterArr = Array.from(this.userFilters)

      const reqfilter = {
        mainType:  mainparentType.name,
        name: fil.name,
        count: fil.count,
      }
      this.myFilterArray.push(reqfilter)
      this.appliedFilter.emit(this.myFilterArray)
    }
  }
}
