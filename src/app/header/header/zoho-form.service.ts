import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable, of } from 'rxjs'
import { ConfigurationsService } from '@sunbird-cb/utils-v2'
import { environment } from '../../../environments/environment'

const ENDPOINTS = {
  ENROLLMENT_API_BASE: '/apis/proxies/v8/learner/course/v4/user/enrollment/list/',
  CONTENT_HIERARCHY_API_BASE: '/apis/proxies/v8/course/v1/hierarchy/',
  ZOHO_CAPTCHA_API: 'https://desk.zoho.in/support/GenerateCaptcha?action=getNewCaptcha&_=',
}

const ENROLLMENT_CACHE_TTL_MS = 4 * 60 * 60 * 1000 // 4 hours
const HIERARCHY_CACHE_TTL_MS = 1 * 60 * 60 * 1000 // 1 hour
const IDB_NAME = 'zoho-form'
const IDB_STORE = 'enrollment'
const IDB_HIERARCHY_STORE = 'hierarchy'

@Injectable({
  providedIn: 'root',
})
export class ZohoFormService {
  certificateCourses: any[] = []
  comprehensiveCourses: any[] = []
  comprehensiveChildrenByIdentifier = new Map<string, any[]>()
  caCourseUnitIds: string[] = []
  enrolledCourseIds = new Set<string>()

  private allowedFileExtensions = [
    'jpg',
    'jpeg',
    'png',
    'svg',
    'doc',
    'pdf',
    'mp4',
  ];
  private userProfileData: any = null;

  // Attachment tracking
  private zsAttachedAttachmentsCount = 0;
  private zsAttachmentFileBrowserIdsList = [1, 2, 3, 4, 5];

  // Getter for attachment count (used in validation)
  getAttachedFilesCount(): number {
    return this.zsAttachedAttachmentsCount
  }

  custodianOrgId = ''

  constructor(
    private configSvc: ConfigurationsService,
    private http: HttpClient,
  ) {
    if (!this.userProfileData) {
      this.initializeUserData()
    }
  }

  private initializeUserData(): void {
    this.userProfileData = this.configSvc.unMappedUser
    this.custodianOrgId = environment.custodianOrgId || ''
  }

  // ===== Issue Type Handler =====
  handleIssueTypeChange(selectElement: any): void {
    try {
      const value = selectElement.value || ''
      const othersBlock = document.getElementById('others-block')
      const aparVisibleBlock = document.getElementById('apar-visible-block')
      const certificateFlowBlock = document.getElementById('certificate-flow-block')
      const comprehensiveLockBlock = document.getElementById('comprehensive-lock-block')
      const subjectInput = document.getElementById('subject-input') as HTMLInputElement

      // Show/hide the "Others" details field
      if (othersBlock) {
        if (value === 'Others') {
          othersBlock.classList.add('visible')
        } else {
          othersBlock.classList.remove('visible')
        }
      }

      // Handle APAR Training Plan visibility block
      if (aparVisibleBlock) {
        if (value === 'APAR Training Plan not visible') {
          this.showAparLoadingState(aparVisibleBlock)
          this.fetchAparTrainingPlanData().subscribe(
            (data: any) => {
              if (data) {
                this.renderAparBlock(data)
              } else {
                aparVisibleBlock.classList.remove('visible')
              }
            },
            () => aparVisibleBlock.classList.remove('visible'),
          )
        } else {
          aparVisibleBlock.classList.remove('visible')
        }
      }

      if (certificateFlowBlock) {
        if (value === 'Certificate not generated') {
          certificateFlowBlock.classList.add('visible')
          this.loadCertificateCourses()
          this.resetCertificateResult()
        } else {
          certificateFlowBlock.classList.remove('visible')
          this.resetCertificateResult()
        }
      }

      if (comprehensiveLockBlock) {
        if (value === 'Course completed but Comprehensive Assessment still locked') {
          comprehensiveLockBlock.classList.add('visible')
          this.loadComprehensiveCourses()
          this.resetComprehensiveResult()
        } else {
          comprehensiveLockBlock.classList.remove('visible')
          this.resetComprehensiveResult()
        }
      }

      // Update subject field — prefix is displayed in the separate span element
      if (subjectInput) {
        if (value && value !== '') {
          const selectedOption = (selectElement as HTMLSelectElement).options[
            (selectElement as HTMLSelectElement).selectedIndex
          ]
          subjectInput.value = selectedOption.text
        } else {
          subjectInput.value = ''
        }
      }
    } catch (error) {
      console.error('Error handling issue type change:', error)
    }
  }

  private showAparLoadingState(block: HTMLElement): void {
    block.classList.add('visible')
    const textEl = document.getElementById('apar-text')
    if (textEl) {
      textEl.textContent = 'Fetching your training plan data…'
    }
    const tbodyEl = document.getElementById('apar-courses-tbody')
    if (tbodyEl) {
      tbodyEl.innerHTML =
        '<tr><td colspan="3" style="text-align:center;padding:12px;color:var(--ink-3)">Loading…</td></tr>'
    }
  }

  private fetchAparTrainingPlanData(): Observable<any> {
    try {
      const raw = localStorage.getItem('cbpData')
      const cbpData: any[] = raw ? JSON.parse(raw) : []

      const courses = cbpData
        .filter((course: any) => course?.isApar)
        .map((course: any) => ({
          name: course?.name,
          identifier: course?.identifier || '',
          isApar: course?.isApar === true,
        }))

      const profileUrl = `${window.location.origin}/app/person-profile/me#mandatorySection`
      const profileDetails = this.userProfileData?.profileDetails || {}
      const empDetails = profileDetails?.employmentDetails || {}
      const profDetail = Array.isArray(profileDetails?.professionalDetails) && profileDetails?.professionalDetails.length ? profileDetails?.professionalDetails[0] : (profileDetails?.professionalDetails || {})
      const profileStatus = String(profileDetails?.profileStatus || '').toLowerCase()
      const hasOrg = !!(empDetails?.departmentName || profileDetails?.personalDetails?.orgId)
      const hasGroup = !!profDetail?.group
      const isVerified = profileStatus === 'verified'

      let orgUpdateText: string
      let orgUpdateUrl = profileUrl
      let orgUpdateLabel = 'Update Profile'
      let aparTitle = 'APAR Training Plan is Visible'
      let aparText = ''

      if (this.checkIfUserCustodianOrg()) {
        aparTitle = 'APAR Training Plan Not Visible'
        aparText = 'You are currently mapped to an incorrect organization. Please raise a transfer request to your correct organization to view APAR training plans.'
        orgUpdateText = 'You are in the wrong organization. Please submit a transfer request to your proper organization. After transfer approval, APAR training plans will be visible.'
      } else if (!isVerified || !hasGroup || !hasOrg) {
        aparTitle = 'APAR Training Plan Not Visible'
        aparText = 'Your profile is not up-to-date. Please update your organization, designation, and group details and contact your nodal officer to approve your profile.'
        orgUpdateText = 'Your profile is not up-to-date. Please update your profile and talk to your nodal officer to approve the profile.'
      } else {
        orgUpdateText = `Your profile details are verified, Still not able to view your APAR course assignments? Please raise the support ticket or update the profile details`
      }

      const aparCount = courses.filter((c: any) => c?.isApar)?.length
      if (!aparText) {
        aparText = aparCount > 0
          ? `We found ${aparCount} APAR course(s) assigned to your account for the current cycle (2025-26). Your training plan is active and visible.`
          : 'No APAR courses are currently assigned to your account for this cycle.'
      }

      return of({
        title: aparTitle,
        text: aparText,
        courses,
        steps: [
          'Navigate to: My Profile → Training Plan',
          'Ensure you are logged in with ' + (this.userProfileData?.profileDetails?.personalDetails?.primaryEmail || 'your registered email'),
          'Check that the APAR cycle 2025-26 is selected',
          'If still not visible, clear browser cache and retry',
        ],
        orgUpdateText,
        orgUpdateUrl,
        orgUpdateLabel,
      })
    } catch {
      return of(null)
    }
  }

  checkIfUserCustodianOrg(): boolean {
    return this.custodianOrgId === (this.userProfileData?.profileDetails?.personalDetails?.orgId || '')
  }

  private renderAparBlock(data: any): void {
    if (!data) return
    const aparVisibleBlock = document.getElementById('apar-visible-block')
    if (!aparVisibleBlock) return

    aparVisibleBlock.classList.add('visible')

    const titleEl = document.getElementById('apar-title')
    const textEl = document.getElementById('apar-text')
    const labelEl = document.getElementById('apar-course-count-label')
    const tbodyEl = document.getElementById('apar-courses-tbody')
    const dotListEl = document.getElementById('apar-dot-list')

    if (data.title !== undefined && titleEl) {
      titleEl.textContent = data.title
    }
    if (data.text !== undefined && textEl) {
      textEl.textContent = data.text
    }

    if (Array.isArray(data.courses) && tbodyEl) {
      const count = data.courses.length
      if (labelEl) {
        labelEl.textContent = `View ${count} Assigned Course${count === 1 ? '' : 's'}`
      }
      tbodyEl.innerHTML = data.courses
        .map((course: any, i: number) => {
          const badge = course.isApar
            ? '<span class="apar-badge-yes">Yes</span>'
            : '<span style="color:#8892A4;font-size:11px;">No</span>'
          const tocUrl = course.identifier ? `${window.location.origin}/app/toc/${encodeURIComponent(course.identifier)}/overview` : ''
          const nameCell = tocUrl
            ? `<a href="${this.escapeHtml(tocUrl)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(course.name || '')}</a>`
            : this.escapeHtml(course.name || '')
          return `<tr>
            <td class="apar-row-num">${i + 1}</td>
            <td>${nameCell}</td>
            <td>${badge}</td>
          </tr>`
        })
        .join('')
      const tableHead = aparVisibleBlock.querySelector('.apar-courses-head')
      const tableBody = aparVisibleBlock.querySelector('.apar-courses-body')
      if (tableHead) tableHead.classList.remove('expanded')
      if (tableBody) tableBody.classList.remove('expanded')
    }

    if (Array.isArray(data.steps) && dotListEl) {
      dotListEl.innerHTML = data.steps
        .map((step: string) => `<li>${this.escapeHtml(step)}</li>`)
        .join('')
    }

    const profileMetaEl = document.getElementById('apar-check-user-meta')
    if (profileMetaEl && data.orgUpdateText !== undefined) {
      const metaText = data.orgUpdateText
      const metaUrl = data.orgUpdateUrl || `${window.location.origin}/app/person-profile/me#mandatorySection`
      const metaLabel = data.orgUpdateLabel || 'Update Profile'
      profileMetaEl.innerHTML = `<p class="apar-meta-text">${this.escapeHtml(metaText)}</p>`
        + `<a class="mini-action-btn primary" href="${this.escapeHtml(metaUrl)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(metaLabel)}</a>`
    }
  }

  private escapeHtml(str: string): string {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  private normalizeStatus(value: any, progress: number): string {
    const status = String(value ?? '').toLowerCase()
    if (status === '2' || status === 'completed' || status === 'complete') {
      return 'completed'
    }
    if (status === '1' || status === 'in-progress' || status === 'in progress') {
      return 'in progress'
    }
    return progress >= 100 ? 'completed' : 'in progress'
  }

  private getComprehensiveChildren(item: any): any[] {
    const identifier = item?.identifier
    if (identifier && this.comprehensiveChildrenByIdentifier.has(identifier)) {
      return this.comprehensiveChildrenByIdentifier.get(identifier) || []
    }
    return []
  }

  private loadComprehensiveChildrenForCourse(courseId: string): Promise<any[]> {
    if (!courseId) {
      return Promise.resolve([])
    }

    if (this.comprehensiveChildrenByIdentifier.has(courseId)) {
      return Promise.resolve(this.comprehensiveChildrenByIdentifier.get(courseId) || [])
    }

    return this.getHierarchyCache(courseId).then(cached => {
      if (cached !== null) {
        this.comprehensiveChildrenByIdentifier.set(courseId, cached)
        return cached
      }

      const url = `${ENDPOINTS.CONTENT_HIERARCHY_API_BASE}${courseId}?hierarchyType=detail`
      return new Promise<any[]>(resolve => {
        this.http.get(url).subscribe(
          (res: any) => {
            const content = res?.result?.content
            const identifier = content?.identifier || courseId
            const children = Array.isArray(content?.children) ? content.children : []
            this.setHierarchyCache(identifier, children)
            this.comprehensiveChildrenByIdentifier.set(identifier, children)
            resolve(children)
          },
          () => {
            resolve([])
          },
        )
      })
    })
  }

  private getEnrolledCourseIdsFromList(courses: any[]): Set<string> {
    const ids = (courses || [])
      .map((item: any) => item?.identifier || item?.content?.identifier || item?.courseId)
      .filter((id: string) => !!id)
    return new Set(ids)
  }

  private logEnrollmentCourses(statusLabel: string, courses: any[]): void {
    console.log(`[ZohoFormService] ${statusLabel} enrollment courses`, (courses || []).map((item: any) => ({
      identifier: item?.identifier || item?.content?.identifier || item?.courseId || '',
      name: item?.name || item?.content?.name || 'Untitled Course',
      progress: Number(item?.completionPercentage ?? item?.completion_percentage ?? item?.progress ?? 0),
      status: item?.status || item?.contentStatus || statusLabel,
    })))
  }

  private mergeUniqueEnrollmentCourses(...courseLists: any[][]): any[] {
    const mergedCourses = ([] as any[]).concat(...courseLists)
    return mergedCourses.filter((course: any, index: number, self: any[]) => {
      const identifier = course?.identifier || course?.content?.identifier || course?.courseId || ''
      return !!identifier && index === self.findIndex((item: any) => {
        const itemIdentifier = item?.identifier || item?.content?.identifier || item?.courseId || ''
        return itemIdentifier === identifier
      })
    })
  }

  private fetchEnrollmentCourses(userId: string, status: 'Completed' | 'In-Progress'): Promise<any[] | null> {
    const requestPayload = {
      request: {
        retiredCoursesEnabled: true,
        status,
        limit: 50,
      },
    }
    const url = `${ENDPOINTS.ENROLLMENT_API_BASE}${userId}`

    return new Promise<any[] | null>(resolve => {
      this.http.post(url, requestPayload).subscribe(
        (res: any) => {
          const courses = res?.result?.courses || []
          this.logEnrollmentCourses(status, courses)
          resolve(courses)
        },
        () => resolve(null),
      )
    })
  }

  private getMergedEnrollmentCourses(userId: string): Promise<any[]> {
    return Promise.all([
      this.getEnrollmentCache(userId, 'completed'),
      this.getEnrollmentCache(userId, 'inprogress'),
    ])
      .then(([completedCached, inProgressCached]) => {
        if (completedCached !== null && inProgressCached !== null) {
          return this.mergeUniqueEnrollmentCourses(completedCached, inProgressCached)
        }

        return Promise.all([
          completedCached !== null
            ? Promise.resolve(completedCached)
            : this.fetchEnrollmentCourses(userId, 'Completed').then(courses => {
              const completedCourses = courses || []
              if (courses !== null) {
                this.setEnrollmentCache(userId, completedCourses, 'completed')
              }
              return completedCourses
            }),
          inProgressCached !== null
            ? Promise.resolve(inProgressCached)
            : this.fetchEnrollmentCourses(userId, 'In-Progress').then(courses => {
              const inProgressCourses = courses || []
              if (courses !== null) {
                this.setEnrollmentCache(userId, inProgressCourses, 'inprogress')
              }
              return inProgressCourses
            }),
        ]).then(([completedCourses, inProgressCourses]) => {
          return this.mergeUniqueEnrollmentCourses(completedCourses, inProgressCourses)
        })
      })
      .catch(() => [])
  }

  private populateCertificateCourseSelect(): void {
    const select = document.getElementById('certificate-course-select') as HTMLSelectElement
    if (!select) return

    select.innerHTML = '<option value="">Choose from enrolled courses…</option>'
    this.certificateCourses.forEach((course, index) => {
      const option = document.createElement('option')
      const statusLabel = course.status === 'completed' ? 'Completed' : 'In Progress'
      option.value = String(index)
      option.textContent = `${course.name} (${statusLabel} · ${course.progress}%)`
      select.appendChild(option)
    })

    if (!this.certificateCourses.length) {
      const option = document.createElement('option')
      option.value = ''
      option.textContent = 'No enrolled courses found'
      select.appendChild(option)
    }
  }

  // ===== IndexedDB cache helpers =====

  private openEnrollmentCache(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 2)
      req.onupgradeneeded = (e: any) => {
        const db: IDBDatabase = e.target.result
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE)
        }
        if (!db.objectStoreNames.contains(IDB_HIERARCHY_STORE)) {
          db.createObjectStore(IDB_HIERARCHY_STORE)
        }
      }
      req.onsuccess = (e: any) => resolve(e.target.result)
      req.onerror = () => reject(req.error)
    })
  }

  private getHierarchyCache(courseId: string): Promise<any[] | null> {
    return this.openEnrollmentCache()
      .then(db => new Promise<any[] | null>(resolve => {
        const req = db.transaction(IDB_HIERARCHY_STORE, 'readonly').objectStore(IDB_HIERARCHY_STORE).get(courseId)
        req.onsuccess = (e: any) => {
          const record = e.target.result
          if (record && (Date.now() - record.timestamp) < HIERARCHY_CACHE_TTL_MS) {
            resolve(record.data)
          } else {
            resolve(null)
          }
        }
        req.onerror = () => resolve(null)
      }))
      .catch(() => null)
  }

  private setHierarchyCache(courseId: string, children: any[]): void {
    this.openEnrollmentCache()
      .then(db => {
        db.transaction(IDB_HIERARCHY_STORE, 'readwrite')
          .objectStore(IDB_HIERARCHY_STORE)
          .put({ data: children, timestamp: Date.now() }, courseId)
      })
      .catch(() => { /* silently ignore cache write failures */ })
  }

  private getEnrollmentTimeCheckKey(listType: 'completed' | 'inprogress'): 'zohoEnrollmentCompletedList' | 'zohoEnrollmentInprogressList' {
    return listType === 'completed' ? 'zohoEnrollmentCompletedList' : 'zohoEnrollmentInprogressList'
  }

  private getEnrollmentStoreKey(userId: string, listType: 'completed' | 'inprogress'): string {
    return `${userId}:enrollment-${listType}`
  }

  private getEnrollmentCacheTtlMs(listType: 'completed' | 'inprogress'): number {
    const configKey = this.getEnrollmentTimeCheckKey(listType)
    const configuredTtl = Number(this.configSvc.globalConfig?.apiCaching?.[configKey])
    return configuredTtl > 0 ? configuredTtl : ENROLLMENT_CACHE_TTL_MS
  }

  private getTimeCheckValue(key: string): number | null {
    try {
      const saved = localStorage.getItem('timeCheck')
      const parsed = saved ? JSON.parse(saved) : {}
      const value = Number(parsed?.[key])
      return value > 0 ? value : null
    } catch {
      return null
    }
  }

  private setTimeCheckValue(key: string): void {
    try {
      const saved = localStorage.getItem('timeCheck')
      const parsed = saved ? JSON.parse(saved) : {}
      parsed[key] = new Date().getTime()
      localStorage.setItem('timeCheck', JSON.stringify(parsed))
    } catch {
      const parsed: any = {}
      parsed[key] = new Date().getTime()
      localStorage.setItem('timeCheck', JSON.stringify(parsed))
    }
  }

  private getEnrollmentCache(userId: string, listType: 'completed' | 'inprogress'): Promise<any[] | null> {
    const timeCheckKey = this.getEnrollmentTimeCheckKey(listType)
    const lastUpdated = this.getTimeCheckValue(timeCheckKey)
    const ttlMs = this.getEnrollmentCacheTtlMs(listType)

    if (!lastUpdated || (new Date().getTime() - lastUpdated) >= ttlMs) {
      return Promise.resolve(null)
    }

    const storeKey = this.getEnrollmentStoreKey(userId, listType)
    return this.openEnrollmentCache()
      .then(
        db => new Promise<any[] | null>(resolve => {
          const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(storeKey)
          req.onsuccess = (e: any) => {
            const record = e.target.result
            resolve(record?.data || null)
          }
          req.onerror = () => resolve(null)
        }),
      )
      .catch(() => null)
  }

  private setEnrollmentCache(userId: string, data: any[], listType: 'completed' | 'inprogress'): void {
    const storeKey = this.getEnrollmentStoreKey(userId, listType)
    const timeCheckKey = this.getEnrollmentTimeCheckKey(listType)

    this.openEnrollmentCache()
      .then(db => {
        db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put({ data, timestamp: new Date().getTime() }, storeKey)
        this.setTimeCheckValue(timeCheckKey)
      })
      .catch(() => { /* silently ignore cache write failures */ })
  }

  // ===== Course loading =====

  private mapEnrollmentCourses(courses: any[]): any[] {
    const baseUrl = window.location.origin
    return courses.map((item: any) => {
      const identifier = item?.content?.identifier || item?.identifier || item?.courseId || ''
      const name = item?.content?.name || item?.name || identifier || 'Untitled Course'
      const progress = Number(item?.completionPercentage ?? item?.completion_percentage ?? item?.progress ?? 0)
      const hasCertificate = Array.isArray(item?.issuedCertificates) && item.issuedCertificates.length > 0
      const rawStatus = Number(item?.status ?? 0)
      return {
        id: identifier,
        name,
        rawStatus,
        status: this.normalizeStatus(item?.status, progress),
        progress,
        hasCertificate,
        certificateUrl: `${baseUrl}/app/toc/${identifier}/overview`,
        pendingResources: progress >= 100 ? [] : [
          'Complete remaining modules',
          'Complete final assessment',
        ],
      }
    })
  }

  private loadCertificateCourses(): void {
    const select = document.getElementById('certificate-course-select') as HTMLSelectElement
    if (select) {
      select.innerHTML = '<option value="">Loading enrolled courses…</option>'
      select.disabled = true
    }

    const userId = this.userProfileData?.userId || this.userProfileData?.profileDetails?.userId
    if (!userId) {
      this.certificateCourses = []
      this.populateCertificateCourseSelect()
      if (select) select.disabled = false
      return
    }

    this.getMergedEnrollmentCourses(userId).then(courses => {
      this.logEnrollmentCourses('Certificate flow (completed + in-progress merged)', courses)
      this.certificateCourses = this.mapEnrollmentCourses(courses)
      this.populateCertificateCourseSelect()
      if (select) select.disabled = false
    }).catch(() => {
      this.certificateCourses = []
      this.populateCertificateCourseSelect()
      if (select) select.disabled = false
    })
  }

  handleCertificateCourseSelect(): void {
    const select = document.getElementById('certificate-course-select') as HTMLSelectElement
    if (!select || select.value === '') {
      this.resetCertificateResult()
      return
    }

    const course = this.certificateCourses[parseInt(select.value, 10)]
    if (!course) {
      this.resetCertificateResult()
      return
    }

    const rawStatus = Number(course.rawStatus ?? 0)

    if (course.status === 'completed' && course.hasCertificate) {
      this.renderCertificateResult({
        type: 'resolved',
        title: `Certificate is ${course.hasCertificate ? 'Generated' : 'Not generated'}`,
        text: `The certificate for "${course.name}" is already available in your profile. You can download it directly from the course overview.`,
        steps: [
          `Course: ${course.name}`,
          `Completion status: Completed (${course.progress}%)`,
          `Certificate status: ${course.hasCertificate ? 'Generated' : 'Not generated'}`,
          'If it does not appear in your profile immediately, retry after a short sync delay.',
        ],
        actions: [
          {
            label: 'Download Certificate',
            type: 'link',
            href: course.certificateUrl,
            cls: 'primary',
          },
        ],
      })
      return
    }

    if ((rawStatus === 2 || course.status === 'completed') && course.progress >= 100 && !course.hasCertificate) {
      this.renderCertificateResult({
        type: 'error',
        title: 'Certificate Generation In Progress',
        text: 'Your course is completed, but the certificate has not been generated yet. It may take up to 24 hours to view or download the certificate.',
        steps: [
          `Course: ${course.name}`,
          `Completion status: Completed (${course.progress}%)`,
          'Enrollment status: Completed',
          'Certificate status: Not generated yet',
          'Please wait up to 24 hours and then check the course page again.',
        ],
        actions: [],
      })
      return
    }

    const steps = [
      `Course: ${course.name}`,
      `Completion status: In Progress (${course.progress}%)`,
      'The certificate is not available yet because the course resources are still pending completion.',
    ]

    if (course.pendingResources && course.pendingResources.length) {
      course.pendingResources.forEach((resource: string) => {
        steps.push(`Pending: ${resource}`)
      })
    }

    if (rawStatus === 1 && !course.hasCertificate) {
      this.renderCertificateResult({
        type: 'partial',
        title: 'Course Not Yet Completed',
        text: 'Some resources or assessments are still pending. Please complete them from the course page to make the certificate available.',
        steps,
        actions: [
          {
            label: 'Complete Course',
            type: 'link',
            href: course.certificateUrl,
            cls: 'secondary',
          },
        ],
      })
      return
    }

    this.renderCertificateResult({
      type: 'partial',
      title: 'Course Not Yet Completed',
      text: 'This enrolled course is still in progress, so the certificate is not available yet. Complete the remaining learning items first.',
      steps,
      actions: [
        {
          label: 'Resume Course',
          type: 'link',
          href: course.certificateUrl,
          cls: 'secondary',
        },
      ],
    })
  }

  private resetCertificateResult(): void {
    const result = document.getElementById('certificate-result')
    const title = document.getElementById('certificate-result-title')
    const text = document.getElementById('certificate-result-text')
    const steps = document.getElementById('certificate-step-list')
    const actions = document.getElementById('certificate-action-row')
    const select = document.getElementById('certificate-course-select') as HTMLSelectElement
    const issueType = document.getElementById('CASECF28') as HTMLSelectElement

    if (result) result.className = 'certificate-result'
    if (title) title.textContent = ''
    if (text) text.textContent = ''
    if (steps) steps.innerHTML = ''
    if (actions) actions.innerHTML = ''
    if (select && issueType && issueType.value !== 'Certificate not generated') {
      select.value = ''
    }
  }

  private renderCertificateResult(data: any): void {
    const result = document.getElementById('certificate-result')
    const title = document.getElementById('certificate-result-title')
    const text = document.getElementById('certificate-result-text')
    const steps = document.getElementById('certificate-step-list')
    const actions = document.getElementById('certificate-action-row')

    if (!result || !title || !text || !steps || !actions) return

    result.className = `certificate-result ${data.type || ''} visible`
    title.textContent = data.title || ''
    text.textContent = data.text || ''
    steps.innerHTML = (data.steps || [])
      .map((step: string) => `<li>${this.escapeHtml(step)}</li>`)
      .join('')

    actions.innerHTML = (data.actions || []).map((action: any) => {
      if (action.type === 'link') {
        return `<a class="mini-action-btn ${this.escapeHtml(action.cls || 'primary')}" href="${this.escapeHtml(action.href || '#')}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(action.label || 'Open')}</a>`
      }
      return `<button type="button" class="mini-action-btn ${this.escapeHtml(action.cls || 'primary')}">${this.escapeHtml(action.label || 'Open')}</button>`
    }).join('')
  }

  // ===== Comprehensive Assessment Handlers =====

  private loadComprehensiveCourses(): void {
    const select = document.getElementById('comprehensive-course-select') as HTMLSelectElement
    const baseUrl = window.location.origin

    try {
      const rawIdentifiers = localStorage.getItem('comprehensiveAssessmentIdentifiers')
      const parsedIdentifiers = rawIdentifiers ? JSON.parse(rawIdentifiers) : []
      this.caCourseUnitIds = Array.isArray(parsedIdentifiers)
        ? parsedIdentifiers
          .map((item: any) => typeof item === 'string' ? item : item?.identifier || item?.content?.identifier || item?.courseId || '')
          .filter((id: string) => !!id)
        : []

      const userId = this.userProfileData?.userId || this.userProfileData?.profileDetails?.userId

      debugger
      const finalizeComprehensiveCourses = (enrollmentCourses: any[] = []) => {
        const enrolledIds = this.getEnrolledCourseIdsFromList(enrollmentCourses)
        const enrollmentById = new Map<string, any>()

          ; (enrollmentCourses || []).forEach((course: any) => {
            const identifier = course?.content?.identifier || course?.identifier || course?.courseId || ''
            if (identifier) {
              enrollmentById.set(identifier, course)
            }
          })
        const matchedIdentifiers = this.caCourseUnitIds.filter((identifier: string) => enrolledIds.has(identifier))
        this.enrolledCourseIds = new Set<string>(matchedIdentifiers)

        this.comprehensiveCourses = matchedIdentifiers.map((identifier: string) => {
          const course = enrollmentById.get(identifier) || {}
          const progress = Number(course?.completionPercentage ?? course?.completion_percentage ?? course?.progress ?? 0)
          const status = this.normalizeStatus(course?.status, progress)
          return {
            name: course?.content?.name || course?.name || identifier || 'Untitled Program',
            completionDate: `${status === 'completed' ? 'Completed' : 'In Progress'} · ${progress}%`,
            identifier,
            status,
            progress,
            category: 'Comprehensive Assessment Program',
            assessmentUrl: `${baseUrl}/app/toc/${encodeURIComponent(identifier)}/overview`,
            children: this.getComprehensiveChildren({ identifier }),
          }
        })
        this.populateComprehensiveCourseSelect()
        if (select) select.disabled = false
      }

      if (!userId) {
        this.enrolledCourseIds = new Set<string>()
        this.comprehensiveChildrenByIdentifier.clear()
        finalizeComprehensiveCourses([])
        return
      }

      this.getMergedEnrollmentCourses(userId).then(courses => {
        this.logEnrollmentCourses('Comprehensive flow (enrolled identifiers only)', courses)
        finalizeComprehensiveCourses(courses)
      }).catch(() => {
        this.comprehensiveCourses = []
        this.populateComprehensiveCourseSelect()
        if (select) select.disabled = false
      })
      return
    } catch {
      this.comprehensiveCourses = []
    }

    this.populateComprehensiveCourseSelect()
    if (select) select.disabled = false
  }

  private populateComprehensiveCourseSelect(): void {
    const select = document.getElementById('comprehensive-course-select') as HTMLSelectElement
    if (!select) return
    select.innerHTML = '<option value="">Choose from assessment programs</option>'
    this.comprehensiveCourses.forEach((course, index) => {
      const option = document.createElement('option')
      option.value = String(index)
      option.textContent = `${course.name}`
      select.appendChild(option)
    })
    if (!this.comprehensiveCourses.length) {
      const empty = document.createElement('option')
      empty.value = ''
      empty.textContent = 'No comprehensive assessment programs found'
      select.appendChild(empty)
    }
  }

  handleComprehensiveCourseSelect(): void {
    const select = document.getElementById('comprehensive-course-select') as HTMLSelectElement
    if (!select || select.value === '') {
      this.resetComprehensiveResult()
      return
    }
    const course = this.comprehensiveCourses[parseInt(select.value, 10)]
    if (!course) {
      this.resetComprehensiveResult()
      return
    }

    this.loadComprehensiveChildrenForCourse(course.identifier)
      .then((children: any[]) => {
        course.children = children
        const assessmentChild = children.find((ch: any) => {
          const cat = (ch.courseCategory || ch.primaryCategory || '').toLowerCase()
          return cat.indexOf('assessment') > -1
        })
        const allLearningCompleted = children
          .filter((ch: any) => {
            const cat = (ch.courseCategory || ch.primaryCategory || '').toLowerCase()
            return cat.indexOf('assessment') === -1
          })
          .every((ch: any) => (Number(ch.completion_percentage) || 0) >= 100)
        const isAssessmentUnlocked = !!assessmentChild && (assessmentChild.status || '').toLowerCase() === 'completed'
        let resultType = 'partial'
        if (isAssessmentUnlocked) {
          resultType = 'resolved'
        } else if (allLearningCompleted) {
          resultType = 'error'
        } else if (!children.length && course.status === 'completed') {
          resultType = 'error'
        }

        this.renderComprehensiveResult({
          type: resultType,
          title: 'Assessment Program: ' + course.name,
          text: 'Category: ' + course.category + ' — Overall Progress: ' + course.progress + '% — ' + children.length + ' child course(s) found.',
          steps: [
            'Assessment: ' + course.name,
            'Category: ' + course.category,
            'Overall Status: ' + (course.status === 'completed' ? 'Completed' : 'In Progress'),
            'Child Courses: ' + children.length,
          ],
          actions: isAssessmentUnlocked
            ? [{ label: 'Open Assessment', type: 'link', href: course.assessmentUrl, cls: 'primary' }]
            : [],
          extraHtml: this.buildComprehensiveChildTable(children),
        })
      })
  }

  private resetComprehensiveResult(): void {
    const result = document.getElementById('comprehensive-result')
    const title = document.getElementById('comprehensive-result-title')
    const text = document.getElementById('comprehensive-result-text')
    const extra = document.getElementById('comprehensive-extra')
    const steps = document.getElementById('comprehensive-step-list')
    const actions = document.getElementById('comprehensive-action-row')
    const select = document.getElementById('comprehensive-course-select') as HTMLSelectElement
    const issueType = document.getElementById('CASECF28') as HTMLSelectElement
    if (result) result.className = 'certificate-result'
    if (title) title.textContent = ''
    if (text) text.textContent = ''
    if (extra) extra.innerHTML = ''
    if (steps) steps.innerHTML = ''
    if (actions) actions.innerHTML = ''
    if (select && issueType && issueType.value !== 'Course completed but Comprehensive Assessment still locked') {
      select.value = ''
    }
  }

  private renderComprehensiveResult(data: any): void {
    const result = document.getElementById('comprehensive-result')
    const title = document.getElementById('comprehensive-result-title')
    const text = document.getElementById('comprehensive-result-text')
    const extra = document.getElementById('comprehensive-extra')
    const steps = document.getElementById('comprehensive-step-list')
    const actions = document.getElementById('comprehensive-action-row')
    if (!result || !title || !text || !steps || !actions || !extra) return
    result.className = `certificate-result ${data.type || ''} visible`
    title.textContent = data.title || ''
    text.textContent = data.text || ''
    extra.innerHTML = data.extraHtml || ''
    steps.innerHTML = (data.steps || []).map((step: string) => `<li>${this.escapeHtml(step)}</li>`).join('')
    actions.innerHTML = (data.actions || []).map((action: any) => {
      if (action.type === 'link') {
        return `<a class="mini-action-btn ${this.escapeHtml(action.cls || 'primary')}" href="${this.escapeHtml(action.href || '#')}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(action.label || 'Open')}</a>`
      }
      return `<button type="button" class="mini-action-btn ${this.escapeHtml(action.cls || 'primary')}">${this.escapeHtml(action.label || 'Open')}</button>`
    }).join('')
  }

  private buildComprehensiveChildTable(children: any[]): string {
    if (!children || children.length === 0) return ''
    const rows = children.map((child: any, i: number) => {
      const status = (child.status || '').toLowerCase()
      let statusBadge = '<span class="ca-badge-progress">In Progress</span>'
      if (status === 'completed') {
        statusBadge = '<span class="ca-badge-completed">Completed</span>'
      } else if (status === 'not enrolled' || status === 'not started') {
        statusBadge = '<span class="ca-badge-locked">Not Enrolled</span>'
      }
      return `<tr><td class="ca-row-num">${i + 1}</td><td>${this.escapeHtml(child.name || 'N/A')}</td><td>${this.escapeHtml(child.courseCategory || child.primaryCategory || 'N/A')}</td><td>${statusBadge}</td></tr>`
    }).join('')
    return `<div class="ca-child-wrap"><button type="button" class="ca-child-toggle expanded" onclick="toggleComprehensiveChildTable(this)"><span>View ${children.length} Child Course${children.length === 1 ? '' : 's'}</span><span class="ca-child-arrow">&#9662;</span></button><div class="ca-child-body expanded"><table class="ca-child-table"><thead><tr><th>#</th><th>Course Name</th><th>Category</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></div>`
  }

  // ===== Organisation Handlers =====
  toggleCentreState(radioElement: any): void {
    try {
      const ministryBlock = document.getElementById('ministry-block')
      const ministryLabel = document.getElementById('ministry-label')
      const ministryInput = document.getElementById(
        'ministry-input',
      ) as HTMLInputElement
      const btnCentre = document.getElementById('btn-centre')
      const btnState = document.getElementById('btn-state')

      if (ministryBlock && ministryLabel && ministryInput) {
        ministryBlock.classList.add('visible')

        // Remove active class from both buttons
        if (btnCentre) btnCentre.classList.remove('active')
        if (btnState) btnState.classList.remove('active')

        if (radioElement.value === 'Centre') {
          if (btnCentre) btnCentre.classList.add('active')
          ministryLabel.textContent = 'Ministry / Department / Organization'
          ministryInput.placeholder = 'Enter ministry, department or organization name'
        } else if (radioElement.value === 'State') {
          if (btnState) btnState.classList.add('active')
          ministryLabel.textContent = 'State / Department / Organization'
          ministryInput.placeholder =
            'Enter state, department or organization name'
        }
      }
    } catch (_error) {
    }
  }

  // ===== Service Details Handlers =====
  toggleAIS(checkboxElement: any): void {
    try {
      const aisBlock = document.getElementById('ais-block')
      const aisLabelText = document.getElementById('ais-label-text')
      const hiddenSelect = document.getElementById(
        'CASECF29',
      ) as HTMLSelectElement

      if (aisBlock && aisLabelText && hiddenSelect) {
        if (checkboxElement.checked) {
          aisBlock.classList.add('visible')
          aisLabelText.textContent = 'Yes'
          hiddenSelect.value = 'Yes'
          // Populate batch years when AIS is enabled
          const batchYearSelect = document.getElementById('CASECF27') as HTMLSelectElement
          if (batchYearSelect) {
            this.ensureBatchYearsPopulated(batchYearSelect)
          }
        } else {
          aisBlock.classList.remove('visible')
          aisLabelText.textContent = 'No'
          hiddenSelect.value = 'No'
          // Clear AIS fields
          this.clearSelectValue('CASECF24')
          this.clearSelectValue('CASECF27')
          this.clearSelectValue('CASECF26')
        }
      }
    } catch (_error) {
    }
  }

  // ===== Attachment Handler =====
  initializeAttachmentZone(): void {
    // Set up click handler for attachment zone after DOM is ready
    setTimeout(() => {
      const zone = document.querySelector('.attachment-zone') as HTMLElement
      if (zone) {
        zone.onclick = () => {
          this.triggerFileInputClick()
        }
      }
    }, 100)
  }

  private triggerFileInputClick(): void {
    if (this.zsAttachmentFileBrowserIdsList.length > 0) {
      const nextId = this.zsAttachmentFileBrowserIdsList[0]
      const fileInput = document.getElementById('zsattachment_' + nextId) as HTMLInputElement
      if (fileInput) {
        fileInput.click()
      }
    }
  }

  handleFileAttachment(filePath: string, element: any): void {
    if (!filePath) return

    const els = element.files
    if (els && els[0]) {
      const size = els[0].size / (1024 * 1024)
      if (size > 20) {
        element.value = ''
        alert('Maximum allowed file size is 20MB.')
        return
      }
    }

    const fileName =
      filePath.indexOf('\\') > -1 ? filePath.split('\\').pop() : filePath
    if (!fileName) return

    const parts = fileName.split('.')
    const ext = parts[parts.length - 1]?.toLowerCase() || ''

    if (!this.allowedFileExtensions.includes(ext)) {
      element.value = ''
      alert('Only .jpg, .jpeg, .png, .svg, .doc, .pdf, .mp4 files are supported')
      return
    }

    // Get the current file input ID and remove it from available list
    const elementId = element.id
    const curId = parseInt(elementId.split('_')[1], 10)
    const removeIdx = this.zsAttachmentFileBrowserIdsList.indexOf(curId)
    if (removeIdx > -1) {
      this.zsAttachmentFileBrowserIdsList.splice(removeIdx, 1)
    }

    // Add file to display
    this.addFileToDisplay(fileName, curId)
    this.zsAttachedAttachmentsCount++
  }

  private addFileToDisplay(fileName: string, fileId: number): void {
    const container = document.getElementById('zsFileBrowseAttachments')
    if (!container) return

    const fileDiv = document.createElement('div')
    fileDiv.className = 'filenamecls'
    fileDiv.id = 'file_' + fileId

    const fileNameSpan = document.createElement('span')
    fileNameSpan.textContent = fileName

    const closeLink = document.createElement('a')
    closeLink.href = 'javascript:;'
    closeLink.className = 'zsfilebrowseAttachment'
    closeLink.id = 'fileclose_' + fileId
    closeLink.textContent = '×'
    closeLink.onclick = () => this.removeFileAttachment(fileId)

    fileDiv.appendChild(fileNameSpan)
    fileDiv.appendChild(closeLink)
    container.appendChild(fileDiv)
  }

  removeFileAttachment(fileId: number): void {
    const fileInput = document.getElementById('zsattachment_' + fileId) as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }

    const fileDiv = document.getElementById('file_' + fileId)
    if (fileDiv) {
      fileDiv.remove()
    }

    this.zsAttachedAttachmentsCount--
    this.zsAttachmentFileBrowserIdsList.push(fileId)
    this.zsAttachmentFileBrowserIdsList.sort((a, b) => a - b)
  }

  resetAttachmentState(): void {
    this.zsAttachedAttachmentsCount = 0
    this.zsAttachmentFileBrowserIdsList = [1, 2, 3, 4, 5]

    const container = document.getElementById('zsFileBrowseAttachments')
    if (container) {
      container.innerHTML = ''
    }

    // Reset all file inputs
    for (let i = 1; i <= 5; i++) {
      const fileInput = document.getElementById('zsattachment_' + i) as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }
    }
  }

  // ===== Captcha Handler =====
  loadCaptcha(): void {
    try {
      const webFormxhr = new XMLHttpRequest()
      webFormxhr.open(
        'GET',
        ENDPOINTS.ZOHO_CAPTCHA_API + new Date().getTime(),
        true,
      )
      webFormxhr.onreadystatechange = () => {
        if (webFormxhr.readyState === 4 && webFormxhr.status === 200) {
          try {
            const response = JSON.parse(webFormxhr.responseText)
            this.updateCaptchaDisplay(response)
          } catch (e) {
            console.error('Error parsing captcha response:', e)
          }
        }
      }
      webFormxhr.send()
    } catch (error) {
      console.error('Error loading Zoho captcha:', error)
    }
  }

  private updateCaptchaDisplay(response: any): void {
    const zsCaptchaUrl = document.getElementById('zsCaptchaUrl')
    if (zsCaptchaUrl) {
      (zsCaptchaUrl as HTMLImageElement).src = response.captchaUrl
      zsCaptchaUrl.style.display = 'block'
    }

    const xJdfEaS = document.getElementsByName(
      'xJdfEaS',
    )[0] as HTMLInputElement
    if (xJdfEaS) {
      xJdfEaS.value = response.captchaDigest
    }

    const zsCaptchaLoading = document.getElementById('zsCaptchaLoading')
    if (zsCaptchaLoading) {
      zsCaptchaLoading.style.display = 'none'
    }

    const zsCaptcha = document.getElementById('zsCaptcha')
    if (zsCaptcha) {
      zsCaptcha.style.display = 'block'
    }
  }

  // ===== Form Reset =====
  resetForm(formId: string): void {
    try {
      const form = document.forms.namedItem('zsWebToCase_' + formId,) as HTMLFormElement
      if (form) form.reset()

      document
        .getElementById('zsSubmitButton_120349000138968626')
        ?.removeAttribute('disabled')

      // Reset all conditional blocks
      this.resetAISBlock()
      this.resetMinistryBlock()
      this.resetOthersBlock()
      this.resetAparBlock()
      this.resetCertificateFlowBlock()
      this.resetComprehensiveLockBlock()
      this.resetSubjectField()
      this.resetConsentCheckbox()
      this.resetAttachmentState()
    } catch (error) {
      console.error('Error resetting Zoho form:', error)
    }
  }

  private resetAISBlock(): void {
    document.getElementById('ais-block')?.classList.remove('visible')
    const aisToggle = document.getElementById('ais-toggle') as HTMLInputElement
    if (aisToggle) aisToggle.checked = false

    const aisLabelText = document.getElementById('ais-label-text')
    if (aisLabelText) aisLabelText.textContent = 'No'

    const hiddenSelect = document.getElementById('CASECF29',) as HTMLSelectElement
    if (hiddenSelect) hiddenSelect.value = 'No'
  }

  private resetMinistryBlock(): void {
    document.getElementById('ministry-block')?.classList.remove('visible')
    document.getElementById('btn-centre')?.classList.remove('active')
    document.getElementById('btn-state')?.classList.remove('active')
  }

  private resetOthersBlock(): void {
    document.getElementById('others-block')?.classList.remove('visible')
  }

  private resetSubjectField(): void {
    const subjectInput = document.getElementById('subject-input') as HTMLInputElement
    if (subjectInput) subjectInput.value = ''
  }

  private resetAparBlock(): void {
    const aparVisibleBlock = document.getElementById('apar-visible-block')
    if (aparVisibleBlock) aparVisibleBlock.classList.remove('visible')
  }

  private resetCertificateFlowBlock(): void {
    const certificateFlowBlock = document.getElementById('certificate-flow-block')
    if (certificateFlowBlock) certificateFlowBlock.classList.remove('visible')
    this.resetCertificateResult()
  }

  private resetComprehensiveLockBlock(): void {
    const comprehensiveLockBlock = document.getElementById('comprehensive-lock-block')
    if (comprehensiveLockBlock) comprehensiveLockBlock.classList.remove('visible')
    this.resetComprehensiveResult()
  }

  private resetConsentCheckbox(): void {
    const consentCheckbox = document.getElementById('consent-checkbox',) as HTMLInputElement
    if (consentCheckbox) consentCheckbox.checked = true
  }

  clearSelectValue(elementId: string): void {
    const selectElement = document.getElementById(elementId,) as HTMLSelectElement
    if (selectElement) {
      selectElement.value = ''
    }
  }

  // ===== AIS Data Retrieval =====
  getBatchYear(): string {
    try {
      const batchYearSelect = document.getElementById(
        'CASECF27',
      ) as HTMLSelectElement
      if (batchYearSelect) {
        // Ensure batch year options are populated
        this.ensureBatchYearsPopulated(batchYearSelect)
        return batchYearSelect.value
      }
      return ''
    } catch (error) {
      console.error('Error retrieving batch year:', error)
      return ''
    }
  }

  getAISValues(): any {
    try {
      const serviceSelect = document.getElementById(
        'CASECF24',
      ) as HTMLSelectElement
      const batchYearSelect = document.getElementById(
        'CASECF27',
      ) as HTMLSelectElement
      const cadreSelect = document.getElementById(
        'CASECF26',
      ) as HTMLSelectElement

      // Ensure batch year options are populated
      if (batchYearSelect) {
        this.ensureBatchYearsPopulated(batchYearSelect)
      }

      return {
        service: serviceSelect ? serviceSelect.value : '',
        batchYear: batchYearSelect ? batchYearSelect.value : '',
        cadre: cadreSelect ? cadreSelect.value : '',
      }
    } catch (error) {
      console.error('Error retrieving AIS values:', error)
      return { service: '', batchYear: '', cadre: '' }
    }
  }

  private ensureBatchYearsPopulated(selectElement: HTMLSelectElement): void {
    try {
      if (selectElement.options.length > 1) {
        return
      }

      // Populate batch years from 1960 to 2026, skipping 1961
      for (let y = 1960; y <= 2026; y++) {
        if (y === 1961) continue
        const opt = document.createElement('option')
        opt.value = y.toString()
        opt.text = y.toString()
        selectElement.appendChild(opt)
      }
    } catch (error) {
      console.error('Error populating batch years:', error)
    }
  }

  patchUserDataFromConfig(): void {
    if (!this.userProfileData) return

    const personalDetails =
      this.userProfileData['profileDetails']['personalDetails'] || {}
    const professionalDetails =
      this.userProfileData['profileDetails']['professionalDetails'] || {}

    // Map user data directly from profile
    const userData = {
      name: personalDetails['firstname'] || '',
      email: personalDetails['primaryEmail'] || '',
      phone: personalDetails['mobile'] || '',
      designation: professionalDetails?.length
        ? professionalDetails[0]['designation']
        : '',
    }

    const contactNameInput = document.querySelector(
      'input[name="Contact Name"]',
    ) as HTMLInputElement
    if (contactNameInput && userData.name) {
      contactNameInput.value = userData.name
      contactNameInput.readOnly = true
      contactNameInput.dispatchEvent(new Event('change', { bubbles: true }))
    }

    const emailInput = document.querySelector(
      'input[name="Email"]',
    ) as HTMLInputElement
    if (emailInput && userData.email) {
      emailInput.value = userData.email
      emailInput.readOnly = true
      emailInput.dispatchEvent(new Event('change', { bubbles: true }))
    }

    const phoneInput = document.querySelector(
      'input[name="Phone"]',
    ) as HTMLInputElement
    if (phoneInput && userData.phone) {
      phoneInput.value = userData.phone
      phoneInput.readOnly = true
      phoneInput.dispatchEvent(new Event('change', { bubbles: true }))
    }

    const designationInput = document.querySelector(
      'input[name="Designation"]',
    ) as HTMLInputElement
    if (designationInput && userData.designation) {
      designationInput.value = userData.designation
      designationInput.dispatchEvent(new Event('change', { bubbles: true }))
    }
  }

  private readonly SUBJECT_PREFIX = 'APAR/CA issue - '

  // ===== Form Validation and Submission =====
  validateAndSubmitForm(): boolean {
    try {
      // Prepend subject prefix before validation (prefix lives in a span, not the input)
      const subjectInput = document.getElementById('subject-input') as HTMLInputElement
      if (subjectInput && subjectInput.value && !subjectInput.value.startsWith(this.SUBJECT_PREFIX)) {
        subjectInput.value = this.SUBJECT_PREFIX + subjectInput.value
      }

      const mandatoryFields = ['Contact Name', 'Email', 'Phone', 'Subject', 'Issues related to Training Plan and Comprehensive']
      const form = document.forms.namedItem('zsWebToCase_120349000138968626') as HTMLFormElement

      if (!form) {
        console.error('Form not found')
        return false
      }

      // Validate mandatory fields
      for (const fieldName of mandatoryFields) {
        const field = form[fieldName] as HTMLInputElement
        if (!field || !field.value.trim()) {
          const fieldLabel = fieldName === 'Contact Name' ? 'Name' : fieldName
          alert(`${fieldLabel} cannot be empty`)
          if (field) field.focus()
          return false
        }

        // Email validation
        if (fieldName === 'Email') {
          const emailRegex = /^([\w_][\w\-_.+'&]*)@(?=.{4,256}$)(([\w]+)([\-_]*[\w])*[\.])+[a-zA-Z]{2,22}$/
          if (!emailRegex.test(field.value)) {
            alert('Enter a valid email address')
            field.focus()
            return false
          }
        }
        if (fieldName === 'Phone') {
          var phone = field.value.trim()
          if (!/^\d{10}$/.test(phone)) {
            alert('Enter a valid 10 digit phone number')
            field.focus()
            return false
          }
        }
      }

      // Check if Centre/State is selected and validate accordingly
      const centreRadio = document.getElementById('CASECF21_centre') as HTMLInputElement
      const stateRadio = document.getElementById('CASECF21_state') as HTMLInputElement

      if ((!centreRadio || !centreRadio.checked) && (!stateRadio || !stateRadio.checked)) {
        alert('Please select Centre or State')
        return false
      }

      // If Centre or State is selected, validate the Ministry/Organization field
      const ministryInput = document.getElementById('ministry-input') as HTMLInputElement
      if (!ministryInput || !ministryInput.value.trim()) {
        if (centreRadio && centreRadio.checked) {
          alert('Ministry / Department / Organization cannot be empty')
        } else if (stateRadio && stateRadio.checked) {
          alert('State / Department / Organization cannot be empty')
        }
        if (ministryInput) ministryInput.focus()
        return false
      }

      // Check if AIS checkbox is selected, then validate AIS fields
      const aisToggle = document.getElementById('ais-toggle') as HTMLInputElement
      if (aisToggle && aisToggle.checked) {
        const aisMandatoryFields = ['CASECF24', 'CASECF27', 'CASECF26'] // Service, Batch Year, Cadre
        for (const fieldId of aisMandatoryFields) {
          const field = document.getElementById(fieldId) as HTMLSelectElement
          if (!field || !field.value.trim()) {
            let fieldLabel = ''
            if (fieldId === 'CASECF24') fieldLabel = 'AIS Service'
            else if (fieldId === 'CASECF27') fieldLabel = 'Batch Year'
            else if (fieldId === 'CASECF26') fieldLabel = 'Cadre'
            alert(`${fieldLabel} cannot be empty`)
            if (field) field.focus()
            return false
          }
        }
      }

      const sparrowEmailInput = document.querySelector(
        'input[name="Enter Sparrow Email ID"]',
      ) as HTMLInputElement

      if (sparrowEmailInput && sparrowEmailInput.value.trim()) {
        const sparrowEmail = sparrowEmailInput.value.trim()

        const sparrowRegex =
          /^([\w_][\w\-_.+'&]*)@(?=.{4,256}$)(([\w]+)([\-_]*[\w])*[\.])+[a-zA-Z]{2,22}$/

        if (!sparrowRegex.test(sparrowEmail)) {
          alert('Enter a valid Sparrow email ID')
          sparrowEmailInput.focus()
          return false
        }
      }



      // Validate captcha
      const captchaField = form['zsWebFormCaptchaWord'] as HTMLInputElement
      if (!captchaField || !captchaField.value.trim()) {
        alert('Please enter the captcha code.')
        if (captchaField) captchaField.focus()
        return false
      }



      // Disable submit button
      const submitBtn = document.getElementById('zsSubmitButton_120349000138968626') as HTMLButtonElement
      if (submitBtn) {
        submitBtn.disabled = true
      }

      return true
    } catch (error) {
      console.error('Error validating form:', error)
      return false
    }
  }
}
