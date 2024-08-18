import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { AppSettings, defaults } from '../settings';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { LocalStorageService } from '@shared';
import { User } from 'app/model/user.model';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {

  constructor(
    private localStorage: LocalStorageService, 
    private http: HttpClient
  ) { 
    let user = <User>this.localStorage.get('user');
    if(user._id){
      this.getUserSetting();
    }
  }

  private _options = defaults;

  get notify(): Observable<any> {
    return this._notify$.asObservable();
  }
  private _notify$ = new BehaviorSubject<any>({});
  settingChange$ = new BehaviorSubject<AppSettings>(defaults);

  setLayout(options?: AppSettings): AppSettings {
    this._options = Object.assign(defaults, options);    
    return this._options;
  }

  setNavState(type: string, value: boolean) {
    this._notify$.next({ type, value } as any);
  }

  getOptions(): AppSettings {
    return this._options;
  }

  setLanguage(lang: string) {
    this._options.language = lang;
    this.settingChange$.next(this._options);
    this._notify$.next({ lang });
  }

  setNewSetting(options: AppSettings){
    let api: string = `usersetting:set`;
    this.http.post<AppSettings>(environment.SERVER_URL, {api_name: api, setting: options}, {observe: 'body'}).subscribe((data) => {
      console.log('User setting updated: ', data);
    });
  }

  getUserSetting(){
    let api: string = `usersetting:get`;
    this.http.post<AppSettings>(environment.SERVER_URL, {api_name: api}, {observe: 'body'}).subscribe((data) => {
      this._options = data;
      this.settingChange$.next(this._options);
    });
  }
}
