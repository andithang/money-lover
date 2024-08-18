import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { environment } from '@env/environment';

import { AdminLayoutComponent } from '../theme/admin-layout/admin-layout.component';
import { AuthLayoutComponent } from '../theme/auth-layout/auth-layout.component';
import { LoginComponent } from './sessions/login/login.component';
import { RegisterComponent } from './sessions/register/register.component';
import { RedirectComponent } from './sysytem/redirect/redirect.component';
import { AccountGuardService } from '@shared';
import { AuthByQuestionComponent } from '@shared/components/auth-by-question/auth-by-question.component';
import { SentEmailChangePassComponent } from './sessions/change-password/sent-email-change-pass.component';
import { ChangePasswordComponent } from './sessions/change-password/change-password.component';
import { SentEmailResetPasswordComponent } from './sessions/forgot-password/sent-email-reset-password.component';
import { ForgotPasswordComponent } from './sessions/forgot-password/forgot-password.component';

const routes: Routes = [
  {
    path: "money-lover",
    component: AdminLayoutComponent,
    loadChildren: () => import('./money-lover/money-lover.module').then(m => m.MoneyLoverModule),
    data: { title: 'Money Lover', titleI18n: 'money-lover' },
  },
  {
    path: 'auth',
    component: AuthLayoutComponent,
    children: [
      { path: 'login', component: LoginComponent, data: { title: 'Login', titleI18n: 'login' } },
      {
        path: 'register',
        component: RegisterComponent,
        data: { title: 'Register', titleI18n: 'register' },
      },
      {
        path: 'auth-question',
        component: AuthByQuestionComponent,
        canActivate: [AccountGuardService],
        data: { title: 'Auth by question', titleI18n: 'auth-question' },
      },
      {
        path: 'sent-email-change-pass',
        canActivate: [AccountGuardService],
        component: SentEmailChangePassComponent,
      },
      {
        path: 'change-password',
        canActivate: [AccountGuardService],
        component: ChangePasswordComponent,
      },
      {
        path: "request-reset-password",
        component: SentEmailResetPasswordComponent
      },
      {
        path: "forgot-password",
        component: ForgotPasswordComponent
      },
      { path: '**', redirectTo: 'login' }
    ],
  },
  {
    path: 'redirect',
    component: RedirectComponent
  },
  {
    path: 'profile',
    canActivate: [AccountGuardService],
    loadChildren: () => import('./profile/profile.module').then(m => m.ProfileModule),
    data: { title: 'Profile', titleI18n: 'profile' },
  },
  {
    path: "error",
    loadChildren: () => import('./sessions/sessions.module').then(m => m.SessionsModule)
  },
  { path: "", redirectTo: "money-lover", pathMatch: "full" },
  { path: '**', redirectTo: 'error' },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      useHash: environment.useHash,
    }),
  ],
  exports: [RouterModule],
})
export class RoutesRoutingModule {}
