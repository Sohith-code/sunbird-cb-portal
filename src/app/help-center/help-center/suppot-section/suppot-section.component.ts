import { Component, HostListener, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core'
import { ZohoFormService } from '../../../header/header/zoho-form.service'
import { DialogBoxComponent as ZohoDialogComponent } from '@ws/app/src/lib/routes/profile-v3/components/dialog-box/dialog-box.component'
import { HttpClient } from '@angular/common/http'
import { DomSanitizer } from '@angular/platform-browser'
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog'
import { MatSnackBar } from '@angular/material/snack-bar'
interface Admin {
  name: string
  designation: string
  email: string
  mobile: string
}

interface PhoneNumber {
  number: string
  label?: string
  clickEnabled?: boolean
  copyEnabled?: boolean
}
interface StateData {
  region: string
  admins: Admin[]
}

@Component({
  selector: 'app-suppot-section',
  templateUrl: './suppot-section.component.html',
  styleUrls: ['./suppot-section.component.scss'],
})
export class SuppotSectionComponent implements OnInit, OnChanges {

  @Input() enabledSections: any = {};
  @Input() helpCenterData: any = null;

  filteredStates: string[] = [];

  selectedState: any | null = null;

  gridSearch = '';

  @HostListener('document:keydown.escape')
  onEsc() {
    this.closeStateModal()
  }

  stateContacts: Record<string, StateData> = {}
  utStates: Set<string> = new Set()
  activeRegion = 'all'
  phoneNumbers: PhoneNumber[] = [];
  supportHours = '8:00 AM – 8:00 PM IST';

  features = [
    { icon: 'shield', label: 'Dedicated Expert Team' },
    { icon: 'headset_mic', label: 'Multi-Channel Support' },
    { icon: 'bolt', label: 'Quick Resolution' },
  ];
  zohoHtml: any
  zohoUrl: any = '/assets/static-data/support-html/zoho_karmayogi_form.html'
  constructor(private zohoFormService: ZohoFormService, private http: HttpClient,
    private sanitizer: DomSanitizer, public dialog: MatDialog, private snackBar: MatSnackBar) {

  }

  isSectionEnabled(section: string): boolean {
    return this.enabledSections[section] !== false
  }

  ngOnInit() {
    // Load Zoho form HTML
    this.http.get(this.zohoUrl, { responseType: 'text' }).subscribe(res => {
      this.zohoHtml = this.sanitizer.bypassSecurityTrustHtml(res)
    })

    this.bindConfig()
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['helpCenterData'] && changes['helpCenterData'].currentValue) {
      this.bindConfig()
    }
  }

  private bindConfig() {
    if (this.helpCenterData) {
      if (this.helpCenterData.stateContacts) {
        this.stateContacts = this.helpCenterData.stateContacts
      }
      if (this.helpCenterData.utStates) {
        this.utStates = new Set(this.helpCenterData.utStates)
      }
      if (this.helpCenterData.supportSection) {
        const support = this.helpCenterData.supportSection
        if (support.phoneNumbers) this.phoneNumbers = support.phoneNumbers
        if (support.supportHours) this.supportHours = support.supportHours
        if (support.features) this.features = support.features
      }
    }

    this.applyFilters()
  }
  onCall(number: string): void {
    const digits = number.replace(/\s/g, '')
    window.location.href = `tel:${digits}`
  }

  onCallNow(): void {
    window.location.href = 'tel:+919990141256'
  }

  copyToClipboard(text: string): void {
    const show = () => this.snackBar.open('Copied!', '', { duration: 2000, panelClass: 'copy-snackbar' })
    navigator.clipboard.writeText(text).then(() => show()).catch(() => {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      show()
    })
  }

  onRaiseTicket(): void {
    // Navigate to ticket form or external URL
    // window.open('https://igot.gov.in/support', '_blank');
    this.dialog.open(ZohoDialogComponent, {
      width: 'auto',
      height: '100vh',
      maxWidth: '100vw',
      position: {
        top: '0',
        right: '0'
      },
      panelClass: 'right-side-dialog',
      data: {
        view: 'zohoform',
        value: this.zohoHtml,
      },
    })
    setTimeout(() => {
      this.initializeZohoForm()
    }, 300)
  }

  private initializeZohoForm(): void {
    try {
      // Expose all form handlers to window for HTML event bindings
      (window as any).handleIssueType = (sel: any) => { this.zohoFormService.handleIssueTypeChange(sel); return true }
      (window as any).toggleCentreState = (sel: any) => { this.zohoFormService.toggleCentreState(sel); return true }
      (window as any).toggleAIS = (sel: any) => { this.zohoFormService.toggleAIS(sel); return true }
      (window as any).zsRenderBrowseFileAttachment = (filePath: string, element: any) => { this.zohoFormService.handleFileAttachment(filePath, element); return true }
      (window as any).zsRegenerateCaptcha = () => { this.zohoFormService.loadCaptcha(); return true }
      (window as any).zsResetWebForm = (id: string) => { this.zohoFormService.resetForm(id); return true }
      (window as any).zsValidateMandatoryFields = () => { return this.zohoFormService.validateAndSubmitForm() }
      (window as any).zsGetAttachedFilesCount = () => { return this.zohoFormService.getAttachedFilesCount() }
      (window as any).handleCertificateCourseSelect = () => { this.zohoFormService.handleCertificateCourseSelect(); return true }
        ; (window as any).handleComprehensiveCourseSelect = () => { this.zohoFormService.handleComprehensiveCourseSelect(); return true }
        ; (window as any).toggleComprehensiveChildTable = (btn: HTMLElement) => {
          btn.classList.toggle('expanded')
          const body = btn.nextElementSibling as HTMLElement
          if (body) body.classList.toggle('expanded')
        }
        ; (window as any).toggleAparCourseTable = (btn: HTMLElement) => {
          btn.classList.toggle('expanded')
          const body = btn.nextElementSibling as HTMLElement
          if (body) body.classList.toggle('expanded')
        }

      this.zohoFormService.loadCaptcha()
      this.zohoFormService.patchUserDataFromConfig()
      this.zohoFormService.initializeAttachmentZone()
    } catch (error) {
      console.error('Error initializing Zoho form:', error)
      this.zohoFormService.loadCaptcha()
    }
  }

  getInitials(name: string): string {
    return name.split(' ')
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase()
  }

  applyFilters() {
    if (!this.stateContacts) {
      this.filteredStates = []
      return
    }

    let states = Object.keys(this.stateContacts).sort()

    if (this.activeRegion !== 'all') {
      states = states.filter(
        s => this.stateContacts[s]?.region === this.activeRegion
      )
    }

    if (this.gridSearch) {
      states = states.filter(s =>
        s.toLowerCase().includes(this.gridSearch.toLowerCase())
      )
    }

    this.filteredStates = states
  }

  filterRegion(region: string) {
    this.activeRegion = region
    this.applyFilters()
  }

  filterStateGrid(value: string) {
    this.gridSearch = value
    this.applyFilters()
  }

  openStateModal(state: string) {
    this.selectedState = state
  }

  closeStateModal() {
    this.selectedState = null
  }

  formatPhone(mobile: string): string {
    return mobile.replace(/\s/g, '')
  }

  get selectedStateData(): StateData | null {
    return this.selectedState ? this.stateContacts[this.selectedState] : null
  }

}