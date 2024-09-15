import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  HostBinding,
  ElementRef,
  Inject,
  Optional,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { BreakpointObserver } from '@angular/cdk/layout';
import { OverlayContainer } from '@angular/cdk/overlay';
import { Directionality } from '@angular/cdk/bidi';
import { MatSidenav, MatSidenavContent } from '@angular/material/sidenav';
import { StartupService } from '@core';

import { SettingsService, AppSettings } from '@core';
import { AppDirectionality, LocalStorageService } from '@shared';
import { WSLambdaService } from '@shared/services/ws-lambda.service';
import { PermissionService } from 'app/routes/sysytem/permission/permission.service';

const MOBILE_MEDIAQUERY = 'screen and (max-width: 599px)';
const TABLET_MEDIAQUERY = 'screen and (min-width: 600px) and (max-width: 959px)';
const MONITOR_MEDIAQUERY = 'screen and (min-width: 960px)';

@Component({
  selector: 'app-admin-layout',
  templateUrl: './admin-layout.component.html',
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  @ViewChild('sidenav', { static: true }) sidenav: MatSidenav;
  @ViewChild('content', { static: true }) content: MatSidenavContent;

  options = this.settings.getOptions();

  private layoutChanges: Subscription;

  private isMobileScreen = false;
  get isOver(): boolean {
    return this.isMobileScreen;
  }

  private contentWidthFix = true;
  @HostBinding('class.matero-content-width-fix') get isContentWidthFix() {
    return (
      this.contentWidthFix &&
      this.options.navPos === 'side' &&
      this.options.sidenavOpened &&
      !this.isOver
    );
  }

  private collapsedWidthFix = true;
  @HostBinding('class.matero-sidenav-collapsed-fix') get isCollapsedWidthFix() {
    return (
      this.collapsedWidthFix &&
      (this.options.navPos === 'top' || (this.options.sidenavOpened && this.isOver))
    );
  }

  constructor(
    private router: Router,
    private breakpointObserver: BreakpointObserver,
    private overlay: OverlayContainer,
    private element: ElementRef,
    private settings: SettingsService,
    private wsLambda: WSLambdaService,
    @Optional() @Inject(DOCUMENT) private _document: Document,
    @Inject(Directionality) public dir: AppDirectionality, 
    private startUpService: StartupService,
    private localStorage: LocalStorageService,
    private permissionService: PermissionService
  ) {
    this.dir.value = this.options.dir;
    this._document.body.dir = this.dir.value;

    this.layoutChanges = this.breakpointObserver
      .observe([MOBILE_MEDIAQUERY, TABLET_MEDIAQUERY, MONITOR_MEDIAQUERY])
      .subscribe(state => {
        // SidenavOpened must be reset true when layout changes
        this.options.sidenavOpened = true;

        this.isMobileScreen = state.breakpoints[MOBILE_MEDIAQUERY];
        this.options.sidenavCollapsed = state.breakpoints[TABLET_MEDIAQUERY];
        this.contentWidthFix = state.breakpoints[MONITOR_MEDIAQUERY];
      });

    // TODO: Scroll top to container
    this.router.events.pipe(takeUntil(this.destroy$)).subscribe(evt => {
      if (evt instanceof NavigationEnd) {
        this.content.scrollTo({ top: 0 });
      }
    });
  }

  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.getUserPermission();
    if(this.localStorage.get("user") && this.localStorage.get("user").token){
      this.startUpService.load();
      this.wsLambda.initClient();
    }    
    setTimeout(() => (this.contentWidthFix = this.collapsedWidthFix = false));
    this.settings.settingChange$.pipe(takeUntil(this.destroy$)).subscribe(options => {
      this.receiveOptions(options, false);
    })
  }

  ngOnDestroy() {
    this.layoutChanges.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleCollapsed() {
    this.options.sidenavCollapsed = !this.options.sidenavCollapsed;
    this.resetCollapsedState();
  }

  resetCollapsedState(timer = 400) {
    // TODO: Trigger when transition end
    setTimeout(() => {
      this.settings.setNavState('collapsed', this.options.sidenavCollapsed);
    }, timer);
  }

  sidenavCloseStart() {
    this.contentWidthFix = false;
  }

  sidenavOpenedChange(isOpened: boolean) {
    this.options.sidenavOpened = isOpened;
    this.settings.setNavState('opened', isOpened);

    this.collapsedWidthFix = !this.isOver;
    this.resetCollapsedState();
  }

  // Demo purposes only
  /**
   * @param updateOptions true when it comes from user interaction, not when getting data from server
   */
  receiveOptions(options: AppSettings, updateOptions: boolean = true): void {
    this.settings.setLayout(options);
    this.options = options;
    if(updateOptions) this.settings.setNewSetting(options);
    this.toggleDarkTheme(options);
    this.toggleDirection(options);
  }

  toggleDarkTheme(options: AppSettings) {
    if (options.theme === 'dark') {
      this.element.nativeElement.classList.add('theme-dark');
      this.overlay.getContainerElement().classList.add('theme-dark');
    } else {
      this.element.nativeElement.classList.remove('theme-dark');
      this.overlay.getContainerElement().classList.remove('theme-dark');
    }
  }

  toggleDirection(options: AppSettings) {
    this.dir.value = options.dir;
    this._document.body.dir = this.dir.value;
  }

  getUserPermission(){
    this.permissionService.getActionsOnModule(location.pathname).subscribe(res => {
      this.permissionService.actions = res.actions;
    })
  }
}
