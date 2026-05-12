import { Component, OnInit } from '@angular/core'

import {
  RoleTab,
  ContentTab,
  VideoTutorial,
  HowToGuide,
  FaqItem,
  Category,
} from './help-center.model'
import { HelpCenterService } from '../../help-center.service'



@Component({
  selector: 'app-help-center',
  templateUrl: './help-center.component.html',
  styleUrls: ['./help-center.component.scss'],
  standalone: false
})
export class HelpCenterComponent implements OnInit {


  gridSearch = '';


  searchQuery = '';

  activeRoleTab: RoleTab = 'learner';
  activeContentTab: ContentTab = 'all';

  // Section expand/collapse state
  videoSectionOpen = true;
  guidesSectionOpen = true;
  faqSectionOpen = true;

  // Active category filters
  activeVideoCategory = 'all';
  activeGuideCategory = 'all';
  activeFaqCategory = 'all';

  helpCenterData: any = null;
  enabledSections: any = {};

  roleTabs: any[] = [];
  contentTabs: any[] = [];

  constructor(private helpCenterSvc: HelpCenterService) { }

  ngOnInit() {
    this.helpCenterSvc.fetchHelpCenterConfig().subscribe((config: any) => {
      this.helpCenterData = config
      if (this.helpCenterData) {
        this.roleTabs = this.helpCenterData.roleTabs || []
        this.contentTabs = this.helpCenterData.contentTabs || []
        this.enabledSections = this.helpCenterData.enabledSections || {}
      }
    })
  }

  isSectionEnabled(section: string): boolean {
    return this.enabledSections[section] !== false
  }

  get filteredVideos(): VideoTutorial[] {
    let videos =
      this.activeVideoCategory === 'all'
        ? this.allVideos
        : this.allVideos.filter((v) => v.category === this.activeVideoCategory)

    if (!this.searchQuery.trim()) return videos

    const q = this.searchQuery.toLowerCase()

    return videos.filter((v) =>
      v.title.toLowerCase().includes(q)
    )
  }

  get filteredGuides(): HowToGuide[] {
    let guides =
      this.activeGuideCategory === 'all'
        ? this.allGuides
        : this.allGuides.filter((g) => g.category === this.activeGuideCategory)

    if (!this.searchQuery.trim()) return guides

    const q = this.searchQuery.toLowerCase()

    return guides.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        (g.titleHindi && g.titleHindi.toLowerCase().includes(q))
    )
  }

  get filteredFaqs(): FaqItem[] {
    const byCategory =
      this.activeFaqCategory === 'all'
        ? this.allFaqs
        : this.allFaqs.filter((f) => f.category === this.activeFaqCategory)
    if (!this.searchQuery.trim()) return byCategory
    const q = this.searchQuery.toLowerCase()
    return byCategory.filter(
      (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
    )
  }

  get showVideos(): boolean {
    const hasData = this.filteredVideos.length > 0

    if (this.searchQuery.trim()) {
      return hasData // 👈 only show if results exist
    }

    return this.activeContentTab === 'all' || this.activeContentTab === 'videos'
  }

  get showGuides(): boolean {
    const hasData = this.filteredGuides.length > 0

    if (this.searchQuery.trim()) {
      return hasData
    }

    return this.activeContentTab === 'all' || this.activeContentTab === 'guides'
  }

  get showFaqs(): boolean {
    const hasData = this.filteredFaqs.length > 0

    if (this.searchQuery.trim()) {
      return hasData
    }

    return this.activeContentTab === 'all' || this.activeContentTab === 'faqs'
  }

  setRoleTab(tab: RoleTab): void {
    this.activeRoleTab = tab

    this.activeContentTab = 'all'

    this.activeVideoCategory = 'all'
    this.activeGuideCategory = 'all'
    this.activeFaqCategory = 'all'

    this.videoSectionOpen = true
    this.guidesSectionOpen = true
    this.faqSectionOpen = true

    // 🔥 Force refresh (optional but safe)
    this.searchQuery = ''
  }

  setContentTab(tab: ContentTab): void {
    this.activeContentTab = tab

    if (tab === 'videos') {
      this.videoSectionOpen = true
      this.guidesSectionOpen = true
      this.faqSectionOpen = true
    } else if (tab === 'guides') {
      this.videoSectionOpen = true
      this.guidesSectionOpen = true
      this.faqSectionOpen = true
    } else if (tab === 'faqs') {
      this.videoSectionOpen = true
      this.guidesSectionOpen = true
      this.faqSectionOpen = true
    }
  }

  toggleSection(section: 'video' | 'guides' | 'faq'): void {
    if (section === 'video') this.videoSectionOpen = !this.videoSectionOpen
    if (section === 'guides') this.guidesSectionOpen = !this.guidesSectionOpen
    if (section === 'faq') this.faqSectionOpen = !this.faqSectionOpen
  }

  toggleFaq(faq: FaqItem): void {
    faq.isOpen = !faq.isOpen
  }

  onSearch(event: Event): void {
    this.searchQuery = (event.target as HTMLInputElement).value
  }

  getVideoCount(catId: string): number {
    let list =
      catId === 'all'
        ? this.allVideos
        : this.allVideos.filter(v => v.category === catId)

    if (!this.searchQuery.trim()) return list.length

    const q = this.searchQuery.toLowerCase()

    return list.filter(v => v.title.toLowerCase().includes(q)).length
  }

  getGuideCount(catId: string): number {
    let list =
      catId === 'all'
        ? this.allGuides
        : this.allGuides.filter(g => g.category === catId)

    if (!this.searchQuery.trim()) return list.length

    const q = this.searchQuery.toLowerCase()

    return list.filter(g =>
      g.title.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      (g.titleHindi && g.titleHindi.toLowerCase().includes(q))
    ).length
  }

  getFaqCount(catId: string): number {
    let list =
      catId === 'all'
        ? this.allFaqs
        : this.allFaqs.filter(f => f.category === catId)

    if (!this.searchQuery.trim()) return list.length

    const q = this.searchQuery.toLowerCase()

    return list.filter(f =>
      f.question.toLowerCase().includes(q) ||
      f.answer.toLowerCase().includes(q)
    ).length
  }

  get allGuides(): HowToGuide[] {
    return (this.helpCenterData?.howToGuidesMap && this.helpCenterData.howToGuidesMap[this.activeRoleTab]) || []
  }

  get allVideos(): VideoTutorial[] {
    return (this.helpCenterData?.videoTutorialsMap && this.helpCenterData.videoTutorialsMap[this.activeRoleTab]) || []
  }

  get allFaqs(): FaqItem[] {
    return (this.helpCenterData?.faqItemsMap && this.helpCenterData.faqItemsMap[this.activeRoleTab]) || []
  }

  openVideo(video: VideoTutorial): void {
    if (video.youtubeUrl) {
      window.open(video.youtubeUrl, '_blank')
    }
  }

  openPDF(pdf: any): void {
    if (pdf) {
      window.open(pdf.pdfUrl, '_blank')
    }
  }

  getYoutubeThumbnail(url: string): string {
    if (!url) return ''

    const match = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/
    )

    const videoId = match ? match[1] : null

    return videoId
      ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      : ''
  }

  get videoCategories(): Category[] {
    return (this.helpCenterData?.videoCategoriesMap && this.helpCenterData.videoCategoriesMap[this.activeRoleTab]) || []
  }

  get guideCategories(): Category[] {
    return (this.helpCenterData?.guideCategoriesMap && this.helpCenterData.guideCategoriesMap[this.activeRoleTab]) || []
  }

  get faqCategories(): Category[] {
    return (this.helpCenterData?.faqCategoriesMap && this.helpCenterData.faqCategoriesMap[this.activeRoleTab]) || []
  }


  get hasAnySearchResult(): boolean {
    if (!this.searchQuery.trim()) return true

    return (
      this.filteredVideos.length > 0 ||
      this.filteredGuides.length > 0 ||
      this.filteredFaqs.length > 0
    )
  }

  clearSearch(): void {
    this.searchQuery = ''
  }



}
