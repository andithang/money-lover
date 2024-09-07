import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { Action } from 'app/model/action.model';
import { interval, BehaviorSubject, ReplaySubject } from 'rxjs';

@Injectable({providedIn: 'root'})
export class AuthorizationService {
    constructor(private http: HttpClient) { 
        this.allowActionsChange$.subscribe(actions => {
            const cache: {[key: string]: boolean} = {};
            actions.forEach(act => {
                cache[act.code] = true;
            });
            this.actionCache = cache; // DO NOT CACHE THE PREVIOUS PAGE PERMISSION
            this.allowActionsReady$.next(true);
        });
    }

    private actionCache: {[key: string]: boolean} = {};
    allowActionsChange$ = new ReplaySubject<Partial<Action>[]>(1);
    allowActionsReady$ = new BehaviorSubject<boolean>(false);

    getAllowActionsOnModule(modulePath: string) {
        let api: string = `permission:get-actions-by-module`;
        return this.http.post<{actions: Partial<Action>[]}>(environment.SERVER_URL, { path: modulePath, api_name: api }, { observe: "body" });
    }

    isAuthorized = (action: string) => this.actionCache[action];
    
}