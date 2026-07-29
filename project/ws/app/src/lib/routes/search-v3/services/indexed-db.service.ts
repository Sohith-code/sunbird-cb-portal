import { Injectable } from '@angular/core'

@Injectable({
  providedIn: 'root'
})
export class IndexedDbService {
  private dbName = 'SearchV3DB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB()
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        console.error('IndexedDB error:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object store for enrollment details
        if (!db.objectStoreNames.contains('enrollmentDetails')) {
          db.createObjectStore('enrollmentDetails', { keyPath: 'id' })
        }
      }
    })
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initDB()
    }
    return this.db!
  }

  async setEnrollmentDetails(data: any): Promise<void> {
    try {
      const db = await this.ensureDB()
      const transaction = db.transaction(['enrollmentDetails'], 'readwrite')
      const store = transaction.objectStore('enrollmentDetails')

      // Store with a fixed key
      const request = store.put({ id: 'current', enrollmentDetails: data })

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          console.log('Enrollment details stored in IndexedDB')
          resolve()
        }
        request.onerror = () => {
          console.error('Error storing enrollment details:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.error('Error in setEnrollmentDetails:', error)
      throw error
    }
  }

  async getEnrollmentDetails(): Promise<any> {
    try {
      const db = await this.ensureDB()
      const transaction = db.transaction(['enrollmentDetails'], 'readonly')
      const store = transaction.objectStore('enrollmentDetails')
      const request = store.get('current')

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          if (request.result) {
            console.log('Enrollment details retrieved from IndexedDB')
            resolve(request.result.enrollmentDetails)
          } else {
            resolve(null)
          }
        }
        request.onerror = () => {
          console.error('Error retrieving enrollment details:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.error('Error in getEnrollmentDetails:', error)
      return null
    }
  }

  async clearEnrollmentDetails(): Promise<void> {
    try {
      const db = await this.ensureDB()
      const transaction = db.transaction(['enrollmentDetails'], 'readwrite')
      const store = transaction.objectStore('enrollmentDetails')
      const request = store.delete('current')

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          console.log('Enrollment details cleared from IndexedDB')
          resolve()
        }
        request.onerror = () => {
          console.error('Error clearing enrollment details:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.error('Error in clearEnrollmentDetails:', error)
      throw error
    }
  }
}