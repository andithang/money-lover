import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { CONSTS } from 'app/consts';
import { Action } from 'app/model/action.model';

@Injectable({providedIn: 'root'})
export class ActionService {
    constructor(
        private http: HttpClient
    ) { }

    getListActions(search: string = "", page: number = 0, size: number = CONSTS.page_size){
        const api_name: string = "action:get-list";
        return this.http.post<{results: Action[], total: number}>(environment.SERVER_URL, { api_name, search, page, size }, { observe: "body" });
    }

    addAction(action: Partial<Action>){
        const api_name: string = "action:create";
        return this.http.post<Action>(environment.SERVER_URL, { api_name, ...action }, { observe: "body" });
    }

    updateAction(action: Partial<Action>){
        const api_name: string = "action:update";
        return this.http.post<Action>(environment.SERVER_URL, { api_name, ...action }, { observe: "body" });
    }

    deleteAction(ids: string[]){
        const api_name: string = "action:delete-many";
        return this.http.post<Action[]>(environment.SERVER_URL, { api_name, ids }, { observe: "body" });
    }

    changeStatusAction(ids: string[], status: 0 | 1){
        const api_name: string = "action:update-status";
        return this.http.post<Action[]>(environment.SERVER_URL, { api_name, ids, status }, { observe: "body" });
    }

    getAction(id: string){
        const api_name: string = "action:get-one";
        return this.http.post<Action>(environment.SERVER_URL, { api_name, id }, { observe: "body" });
    }

    getActionsByIds(ids: string[]){
        const api_name: string = "action:get-many";
        return this.http.post<{results: Action[]}>(environment.SERVER_URL, { api_name, ids }, { observe: "body" });
    }
    
}