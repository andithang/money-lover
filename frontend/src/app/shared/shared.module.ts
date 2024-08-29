import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MaterialModule } from '../material.module';
import { MaterialExtensionsModule } from '../material-extensions.module';
import { FlexLayoutModule } from '@angular/flex-layout';
import { NgProgressModule } from 'ngx-progressbar';
import { NgProgressHttpModule } from 'ngx-progressbar/http';
import { NgProgressRouterModule } from 'ngx-progressbar/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { FormlyModule } from '@ngx-formly/core';
import { FormlyMaterialModule } from '@ngx-formly/material';
import { ToastrModule } from 'ngx-toastr';
import { TranslateModule } from '@ngx-translate/core';

import { BreadcrumbComponent } from './components/breadcrumb/breadcrumb.component';
import { PageHeaderComponent } from './components/page-header/page-header.component';
import { ErrorCodeComponent } from './components/error-code/error-code.component';
import { MLIconComponent } from './components/money-lover/icon/icon.component';
import { ConfirmDeletionComponent } from './components/confirm-deletion/confirm-deletion.component';
import { NumberFormatDirective } from './directives/number-foramat.directive';
import { AppLoadingComponent } from './components/money-lover/app-loading/app-loading.component';
import { FormatNumberPipe } from './pipes/number-format.pipe';
import { UploadComponent } from './components/money-lover/upload/upload.component';
import { LevelRolePipe } from './pipes/level.pipe';
import { EmptyComponent } from './components/empty/empty.component';
import { AuthByQuestionComponent } from './components/auth-by-question/auth-by-question.component';
import { ChangeSecurityQuestionComponent } from './components/change-security-quesion/change-security-question.component';
import { SecurityQuestionComponent } from './components/security-question/security-question.component';
import { FormErrorPipe } from './pipes/form-error.pipe';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { CalendarRangeComponent } from './components/calendar-range/calendar-range.component';
import { AccessCheckerDirective } from './directives/has-access.directive';

const THIRD_MODULES = [
  MaterialModule,
  MaterialExtensionsModule,
  FlexLayoutModule,
  NgProgressModule,
  NgProgressRouterModule,
  NgProgressHttpModule,
  NgSelectModule,
  FormlyModule,
  FormlyMaterialModule,
  ToastrModule,
  TranslateModule
];
const COMPONENTS = [BreadcrumbComponent, PageHeaderComponent, ErrorCodeComponent, MLIconComponent, ConfirmDeletionComponent, AppLoadingComponent, UploadComponent, EmptyComponent, AuthByQuestionComponent, ChangeSecurityQuestionComponent, SecurityQuestionComponent, CalendarRangeComponent];
const COMPONENTS_DYNAMIC = [];
const DIRECTIVES = [NumberFormatDirective, AccessCheckerDirective];
const PIPES = [FormatNumberPipe, LevelRolePipe, FormErrorPipe];

@NgModule({
  declarations: [...COMPONENTS, ...COMPONENTS_DYNAMIC, ...DIRECTIVES, ...PIPES],
  imports: [CommonModule, FormsModule, NgxSkeletonLoaderModule, RouterModule, ReactiveFormsModule, ...THIRD_MODULES],
  exports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ReactiveFormsModule,
    ...THIRD_MODULES,
    ...COMPONENTS,
    ...DIRECTIVES,
    ...PIPES,
  ],
  entryComponents: COMPONENTS_DYNAMIC,
})
export class SharedModule {}
