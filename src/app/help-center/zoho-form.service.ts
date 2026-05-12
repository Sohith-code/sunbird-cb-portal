import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable, of } from 'rxjs'
import { ConfigurationsService } from '@sunbird-cb/utils-v2'
import { environment } from '../../environments/environment'
import { ZohoFormUtilsService } from './zoho-form-utils.service'

const ENDPOINTS = {
  ENROLLMENT_API_BASE: '/apis/proxies/v8/learner/course/v4/user/enrollment/list/',
  CONTENT_HIERARCHY_API_BASE: '/apis/proxies/v8/course/v1/hierarchy/',
  ZOHO_CAPTCHA_API: 'https://desk.zoho.in/support/GenerateCaptcha?action=getNewCaptcha&_=',
}

@Injectable({
  providedIn: 'root',
})
export class ZohoFormService {
  certificateCourses: any[] = []
  comprehensiveCourses: any[] = []
  comprehensiveChildrenByIdentifier = new Map<string, any[]>()
  caCourseUnitIds: string[] = []
  enrolledCourseIds = new Set<string>()
  private hasOnlyIssuedCertificateCourses = false

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
    private zohoUtils: ZohoFormUtilsService,
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
        } else if (value === 'Course progress is not updating') {
          certificateFlowBlock.classList.add('visible')
          this.loadCourseProgressCourses()
          this.resetCertificateResult()
        } else if (value === 'Unable to download certificate') {
          certificateFlowBlock.classList.add('visible')
          this.loadCompletedCourses()
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

  private getCurrentIssueTypeValue(): string {
    const issueType = document.getElementById('CASECF28') as HTMLSelectElement
    return issueType?.value || ''
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
      const aparCount = courses.filter((c: any) => c?.isApar)?.length

      let orgUpdateText: string
      let orgUpdateUrl = profileUrl
      let orgUpdateLabel = 'Update Profile'
      let aparTitle = aparCount > 0 ? 'APAR Training Plan is Visible' : 'APAR Training Plan Not Visible'
      let aparText = ''

      if (this.checkIfUserCustodianOrg() && aparCount === 0) {
        aparTitle = aparTitle
        aparText = ''
        orgUpdateText = 'You are in the wrong organization. Please submit a transfer request to your proper organization. After transfer approval, APAR training plans will be visible.'
      } else if ((!isVerified || !hasGroup || !hasOrg) && aparCount === 0) {
        aparTitle = aparTitle
        aparText = ''
        orgUpdateText = 'Your profile is not up-to-date. Please update your profile and reach out to your nodal officer to approve the profile.'
      } else {
        orgUpdateText = `Still not able to view your APAR course assignments? Please raise the support ticket or update the profile details`
      }

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
          'Ensure you are logged in with ' + (this.userProfileData?.profileDetails?.personalDetails?.primaryEmail || 'your registered email'),
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
    if (!this.custodianOrgId || !this.userProfileData || !this.userProfileData?.ministryOrStateId) {
      return false
    }
    return this.custodianOrgId === (this.userProfileData?.ministryOrStateId || '')
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

    const isTrainingPlanNotVisible = String(data?.title || '').toLowerCase().includes('not visible')
    aparVisibleBlock.classList.toggle('apar-theme-not-visible', isTrainingPlanNotVisible)
    aparVisibleBlock.classList.toggle('apar-theme-visible', !isTrainingPlanNotVisible)

    if (Array.isArray(data.courses) && tbodyEl) {
      const count = data.courses.length
      const tableHead = aparVisibleBlock.querySelector('.apar-courses-head') as HTMLElement | null
      const tableBody = aparVisibleBlock.querySelector('.apar-courses-body') as HTMLElement | null

      if (count === 0) {
        if (labelEl) {
          labelEl.textContent = ''
          labelEl.style.display = 'none'
        }
        if (tableHead) tableHead.style.display = 'none'
        if (tableBody) tableBody.style.display = 'none'
        tbodyEl.innerHTML = ''
      } else {
        if (labelEl) {
          labelEl.style.display = ''
        }
        if (tableHead) tableHead.style.display = ''
        if (tableBody) tableBody.style.display = ''
      }

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
            ? `<a href="${this.zohoUtils.escapeHtml(tocUrl)}" target="_blank" rel="noopener noreferrer">${this.zohoUtils.escapeHtml(course.name || '')}</a>`
            : this.zohoUtils.escapeHtml(course.name || '')
          return `<tr>
            <td class="apar-row-num">${i + 1}</td>
            <td>${nameCell}</td>
            <td>${badge}</td>
          </tr>`
        })
        .join('')
      if (tableHead) tableHead.classList.remove('expanded')
      if (tableBody) tableBody.classList.remove('expanded')
    }

    if (Array.isArray(data.steps) && dotListEl) {
      dotListEl.innerHTML = data.steps
        .map((step: string) => `<li>${this.zohoUtils.escapeHtml(step)}</li>`)
        .join('')
    }

    const profileMetaEl = document.getElementById('apar-check-user-meta')
    if (profileMetaEl && data.orgUpdateText !== undefined) {
      const metaText = data.orgUpdateText
      const metaUrl = data.orgUpdateUrl || `${window.location.origin}/app/person-profile/me#mandatorySection`
      const metaLabel = data.orgUpdateLabel || 'Update Profile'
      profileMetaEl.innerHTML = `<p class="apar-meta-text">${this.zohoUtils.escapeHtml(metaText)}</p>`
        + `<a class="mini-action-btn primary" href="${this.zohoUtils.escapeHtml(metaUrl)}" target="_blank" rel="noopener noreferrer">${this.zohoUtils.escapeHtml(metaLabel)}</a>`
    }
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

    return this.zohoUtils.getHierarchyCache(courseId).then(cached => {
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
            this.zohoUtils.setHierarchyCache(identifier, children)
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

  private fetchEnrollmentCourses(userId: string, status: 'Completed' | 'In-Progress'): Promise<any[] | null> {
    const requestPayload = {
      request: {
        retiredCoursesEnabled: false,
        status,
        limit: 100,
      },
    }
    const url = `${ENDPOINTS.ENROLLMENT_API_BASE}${userId}`

    return new Promise<any[] | null>(resolve => {
      this.http.post(url, requestPayload).subscribe(
        (res: any) => {
          const courses = res?.result?.courses || []
          resolve(courses)
        },
        () => resolve(null),
      )
    })
  }

  private getCompletedEnrollmentCourses(userId: string): Promise<any[]> {
    return this.zohoUtils.getEnrollmentCache(userId, 'completed', this.configSvc)
      .then(completedCached => {
        if (completedCached !== null) {
          return completedCached
        }
        return this.fetchEnrollmentCourses(userId, 'Completed').then(courses => {
          const completedCourses = courses || []
          if (courses !== null) {
            this.zohoUtils.setEnrollmentCache(userId, completedCourses, 'completed')
          }
          return completedCourses
        })
      })
      .catch(() => [])
  }

  private getInprogressEnrollmentCourses(userId: string): Promise<any[]> {
    return this.zohoUtils.getEnrollmentCache(userId, 'inprogress', this.configSvc)
      .then(inprogressCached => {
        if (inprogressCached !== null) {
          return inprogressCached
        }
        return this.fetchEnrollmentCourses(userId, 'In-Progress').then(courses => {
          const inprogressCourses = courses || []
          if (courses !== null) {
            this.zohoUtils.setEnrollmentCache(userId, inprogressCourses, 'inprogress')
          }
          return inprogressCourses
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
      option.value = String(index)
      option.textContent = `${course.name} (Completed · ${course.progress}%)`
      select.appendChild(option)
    })

    if (!this.certificateCourses.length) {
      const option = document.createElement('option')
      option.value = ''
      option.textContent = this.hasOnlyIssuedCertificateCourses
        ? 'All completed contents already have certificates'
        : 'No enrolled courses found'
      select.appendChild(option)
    }
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
        status: this.zohoUtils.normalizeStatus(item?.status, progress),
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
      this.hasOnlyIssuedCertificateCourses = false
      this.certificateCourses = []
      this.populateCertificateCourseSelect()
      if (select) select.disabled = false
      return
    }

    const issueType = this.getCurrentIssueTypeValue()
    const isProgressIssue = issueType === 'Course progress is not updating'

    const finalize = (courses: any[]) => {
      if (isProgressIssue) {
        const uniqueById = new Map<string, any>()
        const addCourses = (courseList: any[]) => {
          ; (courseList || []).forEach((course: any) => {
            const id = this.zohoUtils.getNormalizedIdentifier(course?.content?.identifier || course?.identifier || course?.courseId)
            if (id && !uniqueById.has(id)) {
              uniqueById.set(id, course)
            }
          })
        }

        addCourses(courses || [])
        this.certificateCourses = this.mapEnrollmentCourses(Array.from(uniqueById.values()))
        this.hasOnlyIssuedCertificateCourses = false
      } else {
        const mappedCourses = this.mapEnrollmentCourses(courses)
        this.certificateCourses = mappedCourses.filter(c => !c.hasCertificate)
        this.hasOnlyIssuedCertificateCourses = mappedCourses.length > 0 && this.certificateCourses.length === 0
      }

      this.populateCertificateCourseSelect()
      if (select) select.disabled = false
    }

    if (isProgressIssue) {
      Promise.all([
        this.getCompletedEnrollmentCourses(userId),
        this.getInprogressEnrollmentCourses(userId),
      ]).then(([completed, inprogress]) => {
        const combined = [...(completed || []), ...(inprogress || [])]
        finalize(combined)
      }).catch(() => {
        this.hasOnlyIssuedCertificateCourses = false
        this.certificateCourses = []
        this.populateCertificateCourseSelect()
        if (select) select.disabled = false
      })
    } else {
      this.getCompletedEnrollmentCourses(userId).then(courses => {
        finalize(courses)
      }).catch(() => {
        this.hasOnlyIssuedCertificateCourses = false
        this.certificateCourses = []
        this.populateCertificateCourseSelect()
        if (select) select.disabled = false
      })
    }
  }

  private loadCourseProgressCourses(): void {
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

    Promise.all([
      this.getCompletedEnrollmentCourses(userId),
      this.getInprogressEnrollmentCourses(userId),
    ]).then(([completed, inprogress]) => {
      const uniqueCourses = new Map<string, any>()
      const appendCourses = (courses: any[]) => {
        ; (courses || []).forEach((course: any) => {
          const identifier = course?.content?.identifier || course?.identifier || course?.courseId || ''
          const id = this.zohoUtils.getNormalizedIdentifier(identifier)
          if (id && !uniqueCourses.has(id)) {
            uniqueCourses.set(id, course)
          }
        })
      }

      appendCourses(completed || [])
      appendCourses(inprogress || [])
      this.certificateCourses = this.mapEnrollmentCourses(Array.from(uniqueCourses.values()))
      this.populateCertificateCourseSelect()
      if (select) select.disabled = false
    }).catch(() => {
      this.certificateCourses = []
      this.populateCertificateCourseSelect()
      if (select) select.disabled = false
    })
  }

  private loadCompletedCourses(): void {
    const select = document.getElementById('certificate-course-select') as HTMLSelectElement
    if (select) {
      select.innerHTML = '<option value="">Loading completed courses…</option>'
      select.disabled = true
    }

    const userId = this.userProfileData?.userId || this.userProfileData?.profileDetails?.userId
    if (!userId) {
      this.certificateCourses = []
      this.populateCertificateCourseSelect()
      if (select) select.disabled = false
      return
    }

    this.getCompletedEnrollmentCourses(userId).then(courses => {
      this.certificateCourses = this.mapEnrollmentCourses(courses || [])
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

    console.log('Selected course data:', course)

    const issueType = this.getCurrentIssueTypeValue()
    if (issueType === 'Course progress is not updating') {
      this.renderCourseProgressResult(course)
      return
    }

    if (issueType === 'Unable to download certificate') {
      this.renderDownloadCertificateResult(course)
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
    if (select && issueType && issueType.value !== 'Certificate not generated' && issueType.value !== 'Course progress is not updating') {
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
      .map((step: string) => `<li>${this.zohoUtils.escapeHtml(step)}</li>`)
      .join('')

    actions.innerHTML = (data.actions || []).map((action: any) => {
      if (action.type === 'link') {
        return `<a class="mini-action-btn ${this.zohoUtils.escapeHtml(action.cls || 'primary')}" href="${this.zohoUtils.escapeHtml(action.href || '#')}" target="_blank" rel="noopener noreferrer">${this.zohoUtils.escapeHtml(action.label || 'Open')}</a>`
      }
      return `<button type="button" class="mini-action-btn ${this.zohoUtils.escapeHtml(action.cls || 'primary')}">${this.zohoUtils.escapeHtml(action.label || 'Open')}</button>`
    }).join('')
  }

  private renderCourseProgressResult(course: any): void {
    const progress = Number(course.progress ?? 0)
    const statusLabel = course.status === 'completed' ? 'Completed' : 'In Progress'
    const commonSteps = [
      `Course: ${course.name}`,
      `Recorded progress: ${progress}%`,
      `Status: ${statusLabel}`,
    ]
    const actions = [
      {
        label: 'Open Course',
        type: 'link',
        href: course.certificateUrl,
        cls: 'secondary',
      },
    ]

    if (course.status === 'completed') {
      this.renderCertificateResult({
        type: 'resolved',
        title: 'Course completed — progress is recorded',
        text: `Your selected course is marked complete with ${progress}% progress. If the dashboard still shows old progress, refresh the page or wait a short while for system sync.`,
        steps: [
          ...commonSteps,
          'If the issue remains, please continue with your support request including the course details.',
        ],
        actions,
      })
      return
    }

    const isZeroProgress = progress === 0
    this.renderCertificateResult({
      type: 'partial',
      title: 'Course progress is not updating',
      text: isZeroProgress
        ? `No progress has been recorded for "${course.name}" yet. Please continue the course and allow a few minutes for the platform to sync your updates.`
        : `Your selected course shows ${progress}% progress. If additional activity is not reflected yet, refresh the course page or wait a short while for the update to appear.`,
      steps: [
        ...commonSteps,
        'Try clearing browser cache and reloading the course page if progress remains stale.',
      ],
      actions,
    })
  }

  private renderDownloadCertificateResult(course: any): void {
    const progress = Number(course.progress ?? 0)
    const statusLabel = course.status === 'completed' ? 'Completed' : 'In Progress'
    const commonSteps = [
      `Course: ${course.name}`,
      `Recorded progress: ${progress}%`,
      `Status: ${statusLabel}`,
    ]
    const actions = [
      {
        label: 'Open Course',
        type: 'link',
        href: course.certificateUrl,
        cls: 'secondary',
      },
    ]

    if (course.status !== 'completed') {
      this.renderCertificateResult({
        type: 'partial',
        title: 'Certificate not available',
        text: `The selected course "${course.name}" is not yet completed. Certificates are only available for completed courses.`,
        steps: [
          ...commonSteps,
          'Complete all course resources to become eligible for a certificate.'
        ],
        actions,
      })
      return
    }

    // Check if all resources are completed
    const allResourcesCompleted = this.checkAllResourcesCompleted(course)
    if (!allResourcesCompleted) {
      this.renderCertificateResult({
        type: 'partial',
        title: 'Certificate pending resource completion',
        text: `Your course "${course.name}" is marked complete, but some resources may still be processing. Certificate availability will be updated within 24 hours.`,
        steps: [
          ...commonSteps,
          'All course resources must be fully processed before certificates become available.',
          'Please check back in 24 hours if the certificate download is still not working.',
          'If the issue persists beyond 24 hours, please continue with your support request.',
        ],
        actions,
      })
      return
    }

    // Course is completed and all resources are done
    this.renderCertificateResult({
      type: 'resolved',
      title: 'Certificate should be available',
      text: `If you're still unable to download the certificate, please check back in 24 hours if the certificate download is still not working.`,
      steps: [
        ...commonSteps,
        'All resources have been completed and processed.',
        'If certificate download is still not working, please continue with your support request for technical assistance.',
      ],
      actions,
    })
  }

  private checkAllResourcesCompleted(course: any): boolean {
    // This is a placeholder - in a real implementation, you'd check the course's resource completion status
    // For now, we'll assume resources are completed if the course is marked as completed
    return course.status === 'completed'
  }

  // ===== Comprehensive Assessment Handlers =====
  private loadComprehensiveCourses(): void {
    const select = document.getElementById('comprehensive-course-select') as HTMLSelectElement
    const baseUrl = window.location.origin

    if (select) {
      select.innerHTML = '<option value="">Loading assessment programs...</option>'
      select.disabled = true
    }

    const userId = this.userProfileData?.userId || this.userProfileData?.profileDetails?.userId

    const finalizeComprehensiveCourses = (enrollmentCourses: any[] = []) => {
      const enrolledIds = this.zohoUtils.getEnrolledCourseIdsFromList(enrollmentCourses)
      const enrollmentById = new Map<string, any>()

        ; (enrollmentCourses || []).forEach((course: any) => {
          const identifier = course?.content?.identifier || course?.identifier || course?.courseId || ''
          const normalizedIdentifier = this.zohoUtils.getNormalizedIdentifier(identifier)
          if (identifier) {
            enrollmentById.set(normalizedIdentifier, course)
          }
        })
      const matchedIdentifiers = this.caCourseUnitIds
        .map((identifier: string) => {
          const normalizedIdentifier = this.zohoUtils.getNormalizedIdentifier(identifier)
          if (!normalizedIdentifier || !enrolledIds.has(normalizedIdentifier)) {
            return ''
          }
          const enrolledCourse = enrollmentById.get(normalizedIdentifier)
          return enrolledCourse?.content?.identifier || enrolledCourse?.identifier || enrolledCourse?.courseId || identifier
        })
        .filter((identifier: string) => !!identifier)
      this.enrolledCourseIds = new Set<string>(matchedIdentifiers)

      this.comprehensiveCourses = matchedIdentifiers.map((identifier: string) => {
        const course = enrollmentById.get(this.zohoUtils.getNormalizedIdentifier(identifier)) || {}
        const progress = Number(course?.completionPercentage ?? course?.completion_percentage ?? course?.progress ?? 0)
        const status = this.zohoUtils.normalizeStatus(course?.status, progress)
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

    this.zohoUtils.getCaIdentifiers()
      .then((parsedIdentifiers: string[]) => {
        this.caCourseUnitIds = parsedIdentifiers

        if (!userId) {
          this.enrolledCourseIds = new Set<string>()
          this.comprehensiveChildrenByIdentifier.clear()
          finalizeComprehensiveCourses([])
          return
        }

        this.getInprogressEnrollmentCourses(userId).then(courses => {
          finalizeComprehensiveCourses(courses)
        }).catch(() => {
          this.comprehensiveCourses = []
          this.populateComprehensiveCourseSelect()
          if (select) select.disabled = false
        })
      })
      .catch(() => {
        this.comprehensiveCourses = []
        this.populateComprehensiveCourseSelect()
        if (select) select.disabled = false
      })
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
    steps.innerHTML = (data.steps || []).map((step: string) => `<li>${this.zohoUtils.escapeHtml(step)}</li>`).join('')
    actions.innerHTML = (data.actions || []).map((action: any) => {
      if (action.type === 'link') {
        return `<a class="mini-action-btn ${this.zohoUtils.escapeHtml(action.cls || 'primary')}" href="${this.zohoUtils.escapeHtml(action.href || '#')}" target="_blank" rel="noopener noreferrer">${this.zohoUtils.escapeHtml(action.label || 'Open')}</a>`
      }
      return `<button type="button" class="mini-action-btn ${this.zohoUtils.escapeHtml(action.cls || 'primary')}">${this.zohoUtils.escapeHtml(action.label || 'Open')}</button>`
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
      return `<tr><td class="ca-row-num">${i + 1}</td><td>${this.zohoUtils.escapeHtml(child.name || 'N/A')}</td><td>${this.zohoUtils.escapeHtml(child.courseCategory || child.primaryCategory || 'N/A')}</td><td>${statusBadge}</td></tr>`
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

      const sparrowEmailInput = document.querySelector('input[name="Enter Sparrow Email ID"]',) as HTMLInputElement

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
