import {
  Component,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core'
import { PageChangeEmitter } from '../../models/search-v3.model'
@Component({
    selector: 'ws-app-pagination',
    templateUrl: './pagination.component.html',
    styleUrls: ['./pagination.component.scss'],
    standalone: false
})
export class PaginationComponent implements OnInit, OnChanges {
  private _currentPage: number = 1;
  private isMobileView = typeof window !== 'undefined' && window.innerWidth < 768;

  @Input() defaultPaginationSize: number = 10;
  @Input() defaultPaginationSizeOptions: number[] = [];
  @Input() totalItemsCount: number = 0;
  @Input() compactMobilePagination = false;

  @HostBinding('class.compact-mobile-pagination')
  get compactMobilePaginationClass(): boolean {
    return this.compactMobilePagination
  }

  @Input()
  set currentPage(value: number) {
    if (this._currentPage !== value) {
      this._currentPage = value
      this.paginationInListing()
    }
  }
  get currentPage(): number {
    return this._currentPage
  }

  @Output() pageChange: EventEmitter<PageChangeEmitter> = new EventEmitter();

  pagination: any = [];
  rangeWithDots: any
  showingArray: any[] = [];
  lastPage = 0;
  firstPage = 0;
  previousPage = 0;

  ngOnInit(): void {
    this.paginationInListing()
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    const isMobileView = window.innerWidth < 768
    if (this.isMobileView !== isMobileView) {
      this.isMobileView = isMobileView
      this.paginationInListing()
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes.totalItemsCount && changes.totalItemsCount.previousValue &&
      changes.totalItemsCount.currentValue !==
      changes.totalItemsCount.previousValue
    ) {
      this.paginationInListing()
    }
  }

  paginationInListing() {
    let lower = 0
    let upper = 0
    let limit = this.defaultPaginationSize
    let items = this.totalItemsCount
    this.showingArray = []

    for (let i = 0; i < items; i++) {
      if (upper !== items && upper < items) {
        lower = upper
        if (upper != items && (upper = lower + limit) <= items) {
          upper = lower + limit
        } else {
          upper = items
        }
        this.showingArray.push([lower, upper])
      }
    }

    let dividedPagination = Math.ceil(this.totalItemsCount / limit)
    let paginationLength = this.paginationDup(
      this.currentPage,
      dividedPagination
    )

    let currentIndex = this.showingArray[this.currentPage - 1]
    let lowerPagination = this.totalItemsCount && currentIndex ? currentIndex[0] + 1 : 0
    let upperPagination = this.totalItemsCount && currentIndex ? currentIndex[1] : 0

    this.lastPage = paginationLength[paginationLength.length - 1]
    this.firstPage = this.compactMobilePagination && this.isMobileView ? 1 : paginationLength[0]

    this.pagination = {
      dividedPagination: dividedPagination,
      paginationLength: paginationLength,
      lower: lowerPagination,
      upper: upperPagination,
    }
  }

  paginationDup(c: any, m: any) {
    let current = c
    let last = m

    if (this.compactMobilePagination && this.isMobileView) {
      return this.mobilePagination(current, last)
    }

    let delta = 5
    let left = current - delta
    let right = current + delta + 1
    let range: any = []
    let l
    this.rangeWithDots = []

    for (let i = 1; i <= last; i++) {
      if (i == 1 || i == last || (i >= left && i < right)) {
        range.push(i)
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          this.rangeWithDots.push(l + 1)
        } else if (i - l !== 1) {
          this.rangeWithDots.push('...')
        }
      }
      this.rangeWithDots.push(i)
      l = i
    }
    return this.rangeWithDots
  }

  private mobilePagination(current: number, last: number): any[] {
    const visiblePageCount = 4
    if (last <= visiblePageCount) {
      return Array.from({ length: last }, (_value, index) => index + 1)
    }

    const maximumStart = last - visiblePageCount + 1
    const start = Math.min(Math.max(1, current <= 3 ? 1 : current - 1), maximumStart)
    const pages = Array.from({ length: visiblePageCount }, (_value, index) => start + index)
    const visibleLastPage = pages[pages.length - 1]

    if (visibleLastPage < last) {
      return [...pages, '...', last]
    }
    return pages
  }

  goToPage(page: number) {
    if (typeof page !== 'number' || !Number.isFinite(page)) {
      return
    }
    this.currentPage = page
    this.pageChange.emit({
      currentPage: this.currentPage,
      previousPage: this.previousPage,
      limit: this.defaultPaginationSize,
    })
    this.paginationInListing()
  }

  // TODO: May need to implement in future
  navigateToLastPage(page: number) {
    if (page != this.currentPage) {
      this.goToPage(page)
    }
  }

  // TODO: May need to implement in future
  navigateToFirstPage(page: number) {
    if (page != this.currentPage) {
      this.goToPage(page)
    }
  }

  navigateToNextPage(page: number) {
    if (
      page <=
      (this.pagination.paginationLength &&
        this.pagination.paginationLength[
        this.pagination.paginationLength.length - 1
        ])
    ) {
      this.currentPage = this.currentPage + 1
      this.previousPage = page
      this.goToPage(this.currentPage)
    }
  }

  navigateToPrevPage(page: number) {
    if (
      page <=
      (this.pagination.paginationLength &&
        this.pagination.paginationLength[
        this.pagination.paginationLength.length - 1
        ])
    ) {
      this.currentPage = this.currentPage - 1
      this.previousPage = page
      this.goToPage(this.currentPage)
    }
  }

  onChangePageSize(event: any) {
    this.defaultPaginationSize = event.value
    this.currentPage = 1
    this.previousPage = 0
    this.paginationInListing()
    this.pageChange.emit({
      currentPage: this.currentPage,
      previousPage: this.previousPage,
      limit: this.defaultPaginationSize,
    })
  }
}
