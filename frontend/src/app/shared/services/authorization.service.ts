import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { Action } from 'app/model/action.model';
import { interval, BehaviorSubject } from 'rxjs';

@Injectable({providedIn: 'root'})
export class AuthorizationService {
    constructor(private http: HttpClient) { 
        this.allowActionsChange$.subscribe(actions => {
            this.allowActions = actions;
            this.allowActionsReady$.next(true);
        });
    }

    private allowActions: Partial<Action>[] = [];
    allowActionsChange$ = new BehaviorSubject<Partial<Action>[]>([]);
    allowActionsReady$ = new BehaviorSubject<boolean>(false);

    getAllowActionsOnModule(modulePath: string) {
        let api: string = `permission:get-actions-by-module`;
        return this.http.post<{actions: Partial<Action>[]}>(environment.SERVER_URL, { path: modulePath, api_name: api }, { observe: "body" });
    }

    isAuthorized = (action: string) => this.allowActions.find(act => act.code == action);
    
}