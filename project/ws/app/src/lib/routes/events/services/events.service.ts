import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable, Subject } from 'rxjs'
import { environment } from 'src/environments/environment'

const API_END_POINTS = {
  EVENT_READ: `/apis/proxies/v8/event/v4/read`,
  GET_EVENTS: '/apis/proxies/v8/sunbirdigot/search',
  ENROLL_EVENT: '/apis/proxies/v8/event/batch/enroll',
  CONTENT_STATE_UPDATE: (eventId: string) => `/apis/proxies/v8/event-progres/${eventId}`,
  ALL_EVENT_ENROLL_LIST: (userId: string) => `/apis/proxies/v8/v1/user/events/list/${userId}`,
  IS_ENROLLED: (userId: string, eventId: string, batchId?: string) => 
    `/apis/proxies/v8/user/event/read/${userId}?eventId=${eventId}&batchId=${batchId}`
}

@Injectable({
  providedIn: 'root',
})
export class EventService {
  eventEnrollEvent = new Subject()
  constructor(private http: HttpClient) { }

  getEventData(eventId: any): Observable<any> {
    return this.http.get<any>(`${API_END_POINTS.EVENT_READ}/${eventId}`)
  }

  getEventsList(req: any) {
    return this.http.post<any>(`${API_END_POINTS.GET_EVENTS}`, req)
  }

  getPublicUrl(url: string): string {
    const mainUrl = url.split('/content').pop() || ''
    return `${environment.contentHost}/${environment.contentBucket}/content${mainUrl}`
  }

  AllEventEnrollList(userId: string): Observable<any> {
    return this.http.get<any>(`${API_END_POINTS.ALL_EVENT_ENROLL_LIST(userId)}`)
  }

  getIsEnrolled(userId: string, eventId: string, batchId?: string): Observable<any> {
    return this.http.get<any>(`${API_END_POINTS.IS_ENROLLED(userId, eventId, batchId)}`)
  }

  enrollEvent(req: any) {
    return this.http.post<any>(`${API_END_POINTS.ENROLL_EVENT}`, req)
  }

  contentStateUpdate(req: any) {
    return this.http.patch<any>(`${API_END_POINTS.CONTENT_STATE_UPDATE}`, req)
  }
}
