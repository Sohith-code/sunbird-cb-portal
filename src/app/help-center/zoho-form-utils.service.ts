import { Injectable } from '@angular/core'

const IDB_NAME = 'zoho-form'
const IDB_STORE = 'enrollment'
const IDB_HIERARCHY_STORE = 'hierarchy'
const ENROLLMENT_CACHE_TTL_MS = 4 * 60 * 60 * 1000 // 4 hours
const HIERARCHY_CACHE_TTL_MS = 1 * 60 * 60 * 1000 // 1 hour
const RECENT_ENROLLMENT_WINDOW_MS = 10 * 60 * 1000

@Injectable({
  providedIn: 'root',
})
export class ZohoFormUtilsService {
  escapeHtml(str: string): string {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  normalizeStatus(value: any, progress: number): string {
    const status = String(value ?? '').toLowerCase()
    if (status === '2' || status === 'completed' || status === 'complete') {
      return 'completed'
    }
    if (status === '1' || status === 'in-progress' || status === 'in progress') {
      return 'in progress'
    }
    return progress >= 100 ? 'completed' : 'in progress'
  }

  getNormalizedIdentifier(identifier: any): string {
    return String(identifier || '').trim().toLowerCase()
  }

  parseCaIdentifiers(data: any): string[] {
    let parsedValue = data

    if (typeof parsedValue === 'string') {
      try {
        parsedValue = JSON.parse(parsedValue)
      } catch {
        parsedValue = []
      }
    }

    if (!Array.isArray(parsedValue)) {
      return []
    }

    return parsedValue
      .map((item: any) => {
        if (typeof item === 'string') {
          return item.trim()
        }
        return String(item?.identifier || item?.content?.identifier || item?.courseId || '').trim()
      })
      .filter((identifier: string) => !!identifier)
  }

  getEnrolledCourseIdsFromList(courses: any[]): Set<string> {
    const ids = (courses || [])
      .map((item: any) => this.getNormalizedIdentifier(item?.identifier || item?.content?.identifier || item?.courseId))
      .filter((id: string) => !!id)
    return new Set(ids)
  }

  getMatchedEnrollment(courses: any[], collectionId: string): any | null {
    if (!Array.isArray(courses) || !collectionId) {
      return null
    }

    return courses.find((course: any) => {
      const identifier = course?.content?.identifier || course?.identifier || course?.courseId || ''
      return identifier === collectionId
    }) || null
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

  getCaIdentifiers(): Promise<string[]> {
    return this.openEnrollmentCache()
      .then(db => {
        return new Promise<string[]>((resolve, reject) => {
          const req = db
            .transaction(IDB_STORE, 'readonly')
            .objectStore(IDB_STORE)
            .get('comprehensiveAssessmentIdentifiers')

          req.onsuccess = () => resolve(this.parseCaIdentifiers(req.result?.data))
          req.onerror = () => reject(req.error)
        })
      })
      .catch(() => [])
  }

  getHierarchyCache(courseId: string): Promise<any[] | null> {
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

  setHierarchyCache(courseId: string, children: any[]): void {
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

  private getEnrollmentCacheTtlMs(listType: 'completed' | 'inprogress', configSvc?: any): number {
    if (configSvc) {
      const configKey = this.getEnrollmentTimeCheckKey(listType)
      const configuredTtl = Number(configSvc.globalConfig?.apiCaching?.[configKey])
      return configuredTtl > 0 ? configuredTtl : ENROLLMENT_CACHE_TTL_MS
    }
    return ENROLLMENT_CACHE_TTL_MS
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

  private clearTimeCheckValue(key: string): void {
    try {
      const saved = localStorage.getItem('timeCheck')
      const parsed = saved ? JSON.parse(saved) : {}
      if (parsed && Object.prototype.hasOwnProperty.call(parsed, key)) {
        delete parsed[key]
        localStorage.setItem('timeCheck', JSON.stringify(parsed))
      }
    } catch {
      // silently ignore cache clear failures
    }
  }

  getEnrollmentCache(userId: string, listType: 'completed' | 'inprogress', configSvc?: any): Promise<any[] | null> {
    const timeCheckKey = this.getEnrollmentTimeCheckKey(listType)
    const lastUpdated = this.getTimeCheckValue(timeCheckKey)
    const ttlMs = this.getEnrollmentCacheTtlMs(listType, configSvc)

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

  setEnrollmentCache(userId: string, data: any[], listType: 'completed' | 'inprogress'): void {
    const storeKey = this.getEnrollmentStoreKey(userId, listType)
    const timeCheckKey = this.getEnrollmentTimeCheckKey(listType)

    this.openEnrollmentCache()
      .then(db => {
        db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put({ data, timestamp: new Date().getTime() }, storeKey)
        this.setTimeCheckValue(timeCheckKey)
      })
      .catch(() => { /* silently ignore cache write failures */ })
  }

  async clearEnrollmentCacheForUser(userId: string): Promise<void> {
    if (!userId) {
      return Promise.resolve()
    }

    this.clearTimeCheckValue(this.getEnrollmentTimeCheckKey('completed'))
    this.clearTimeCheckValue(this.getEnrollmentTimeCheckKey('inprogress'))

    const completedStoreKey = this.getEnrollmentStoreKey(userId, 'completed')
    const inprogressStoreKey = this.getEnrollmentStoreKey(userId, 'inprogress')

    return await this.openEnrollmentCache()
      .then(db => new Promise<void>(resolve => {
        const store = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE)
        const completedReq = store.delete(completedStoreKey)
        const inprogressReq = store.delete(inprogressStoreKey)

        let pending = 2
        const finalize = () => {
          pending -= 1
          if (pending === 0) {
            resolve()
          }
        }

        completedReq.onsuccess = finalize
        completedReq.onerror = finalize
        inprogressReq.onsuccess = finalize
        inprogressReq.onerror = finalize
      }))
      .catch(() => Promise.resolve())
  }

  clearEnrollmentCacheIfRecentAccess(userId: string, courses: any[], collectionId: string): boolean {
    if (!userId || !this.isRecentEnrollmentAccess(courses, collectionId)) {
      return false
    }

    this.clearEnrollmentCacheForUser(userId)
    return true
  }

  isRecentEnrollmentAccess(courses: any[], collectionId: string): boolean {
    const matchedCourse = this.getMatchedEnrollment(courses, collectionId)
    const lastContentAccessTime = matchedCourse?.lastContentAccessTime
    if (!lastContentAccessTime) {
      return true
    }

    const accessTime = new Date(lastContentAccessTime).getTime()
    if (Number.isNaN(accessTime)) {
      return false
    }

    return (Date.now() - accessTime) < RECENT_ENROLLMENT_WINDOW_MS
  }
}
