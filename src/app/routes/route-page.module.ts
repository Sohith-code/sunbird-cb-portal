import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { PageModule, PageComponent } from '@sunbird-cb/collection'
import { ExploreDetailResolve, PageResolve, PageNameResolve, ModuleNameResolve } from '@sunbird-cb/utils-v2'
import { GeneralGuard } from '../guards/general.guard'
import { AppTocResolverService } from '@sunbird-cb/toc'
// import { AppHomePageResolverService } from '../services/app-home-page-resolver.service'
import { HomeResolverService } from '../home/home/home-resolver.service'
import { FormMicroSiteDataService } from '../services/form-micro-site-data.service'
import { CustomHomeFormResolverService } from '../component/custom-home/resolvers/custom-home-form-resolver.service'

const routes: Routes = [
  {
    path: 'toc',
    redirectTo: '/',
    pathMatch: 'full',
  },
  {
    path: 'toc/:id',
    data: {
      pageType: 'page',
      pageKey: 'toc',
      pageId: 'page/toc/:id',
      module: 'Learn',
    },
    resolve: {
      pageData: PageResolve,
      content: AppTocResolverService,
    },
    runGuardsAndResolvers: 'paramsChange',
    component: PageComponent,
    canActivate: [GeneralGuard],
  },
  {
    path: 'custom-home',
    loadChildren: () => import('./route-custom-home.module').then(m => m.RouteCustomHomeModule),
    data: {
      pageType: 'feature',
      pageKey: 'custom-home',
      pageId: 'app/custom-home',
      module: 'CUSTOM_HOME',
    },
    resolve: {
      pageData: CustomHomeFormResolverService,
    },
    canActivate: [GeneralGuard],
  },
  {
    path: 'home',
    loadChildren: () => import('../home/home.module').then(m => m.HomeModule),
    data: {
      pageType: 'page',
      pageKey: 'home',
      pageId: 'page/home',
      module: 'Home',
    },
    resolve: {
      microSiteData: FormMicroSiteDataService,
      // pageData: AppHomePageResolverService,
    },
    canActivate: [GeneralGuard],
  },
  {
    path: 'cbp',
    loadChildren: () => import('../cbp/cbp.module').then(m => m.CbpModule),
    data: {
      pageType: 'page',
      pageKey: 'cbp',
    },
    resolve: {
      pageData: PageResolve,
      module: ModuleNameResolve,
      pageId: PageNameResolve,
    },
    canActivate: [GeneralGuard],
  },
  {
    path: 'recommended-learnings',
    loadChildren: () => import('../recommende-learnings/recommende-learnings.module').then(m => m.RecommendeLearningsModule),
    data: {
      pageType: 'page',
      pageKey: 'recommende-learnings',
    },
    resolve: {
      pageData: PageResolve,
      module: ModuleNameResolve,
      pageId: PageNameResolve,
    },
    canActivate: [GeneralGuard],
  },
  {
    path: 'competency-passbook',
    loadChildren: () => import('../competency-passbook/competency-passbook.module').then(m => m.CompetencyPassbookModule),
    data: {
      pageType: 'page',
      pageKey: 'competency-passbook',
    },
    resolve: {
      pageData: PageResolve,
      module: ModuleNameResolve,
      pageId: PageNameResolve,
      home: HomeResolverService,
    },
    canActivate: [GeneralGuard],
  },
  {
    path: ':id',
    component: PageComponent,
    data: {
      pageType: 'page',
      pageKey: 'id',
    },
    resolve: {
      pageData: PageResolve,
      module: ModuleNameResolve,
      pageId: PageNameResolve,
    },
    canActivate: [GeneralGuard],
  },
  {
    path: 'explore/:tags',
    data: {
      pageType: 'page',
      pageKey: 'catalog-details',
      pageId: 'page/explore/:topic',
      module: 'Learn',
    },
    resolve: {
      pageData: ExploreDetailResolve,
      module: PageNameResolve,
    },
    component: PageComponent,
    canActivate: [GeneralGuard],
  },
]

@NgModule({
  imports: [
    PageModule,
    RouterModule.forChild(routes),
  ],
  providers: [ExploreDetailResolve],
})
export class RoutePageModule { }
