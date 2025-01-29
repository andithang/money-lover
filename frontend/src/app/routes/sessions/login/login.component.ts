import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@core/authentication/authentication.service';
import { environment } from '@env/environment';
import { LocalStorageService } from '@shared';
import { CONSTS } from 'app/consts';
import { User } from 'app/model/user.model';
import { ToastrService } from 'ngx-toastr';
import { takeUntil, Subject } from 'rxjs';
import { WSLambdaService } from '@shared/services/ws-lambda.service';
import { SettingsService } from '@core';

/**
 * information about browser and os
 */
declare let platform: any;

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['login.component.scss'],
  providers: [AuthService]
})
export class LoginComponent implements OnInit, OnDestroy {
  reactiveForm: FormGroup;

  constructor(
    private fb: FormBuilder, 
    private router: Router, 
    private authService: AuthService, 
    private localStorage: LocalStorageService, 
    private settingService: SettingsService,
    private route: ActivatedRoute,
    private wsLambda: WSLambdaService,
    private toastService: ToastrService) {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if(!params.reload){
        // reload the google script to show "Sign in with google" button
        window.location.href = location.href + '?reload=true';
        return;
      }
    });
    this.reactiveForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });
  }

  googleLoginUri: string = '';
  private destroy$ = new Subject();
  /**
   * email received from username and password correct
   */
  receivedEmail: string = '';
  /**
   * random key returned with receivedEmail
   */
  rd: string = '';

  ngOnInit() {     
    this.googleLoginUri = environment.GOOGLE_LOGIN_URI + '?redirect_fe_uri='+environment.MoneyLoverURL+'/redirect' + '&gatewayForward=true';
    this.localStorage.clear();
    this.wsLambda.endConnection();
  }

  ngOnDestroy(): void {
      this.destroy$.next(true);
      this.destroy$.complete();
  }

  login() {
    const { username, password } = this.reactiveForm.value;
    this.authService.login(username, password, platform).subscribe(res => {
      if (res && Object.keys(res).includes('_id')) {
        this.localStorage.set('user', res);
        this.settingService.getUserSetting();
        if ((<User>res).level === CONSTS.auth.ADMIN || (<User>res).level === CONSTS.auth.SYSTEM) {
          this.router.navigateByUrl('/money-lover/admin');
        }
        else {
          this.router.navigateByUrl('/money-lover/');
        }
      }
      else {
        if(Object.keys(res).includes('email') && Object.keys(res).includes('rd')){
          this.receivedEmail = res.email;
          this.rd = (<{email: string, rd: string}>res).rd;
        }
        else {
          this.toastService.error('Đăng nhập thất bại. Vui lòng thử lại');
        }
      }
    });
  }

  loginWith(appName: string) {
    switch (appName) {
      case 'github':
        window.location.href = `${environment.PassportLoginServerURL}/github?callbackUrl=${environment.MoneyLoverURL}/redirect&failbackUrl=${environment.MoneyLoverURL}/auth/login`;
        break;

      default:
        break;
    }
  }
}
