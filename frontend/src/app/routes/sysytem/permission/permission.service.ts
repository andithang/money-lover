import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { CONSTS } from 'app/consts';
import { Action } from 'app/model/action.model';
import { ModuleAction } from 'app/model/module-action';
import { Permission } from 'app/model/permission.model';

@Injectable({providedIn: 'root'})
export class PermissionService {
    constructor(
        private http: HttpClient
    ) { }

    actions: Action[] = [];

    getListPermissions(search: string = "", page: number = 0, size: number = CONSTS.page_size){
        const api_name: string = "permission:get-list";
        return this.http.post<{results: Permission[], total: number}>(environment.SERVER_URL, { api_name, search, page, size }, { observe: "body" });
    }

    addPermission(permission: Partial<Permission>){
        const api_name: string = "permission:create";
        return this.http.post<Permission>(environment.SERVER_URL, { api_name, ...permission }, { observe: "body" });
    }

    updatePermission(permission: Partial<Permission>){
        const api_name: string = "permission:update";
        return this.http.post<Permission>(environment.SERVER_URL, { api_name, ...permission }, { observe: "body" });
    }

    deletePermission(ids: string[]){
        const api_name: string = "permission:delete-many";
        return this.http.post<Permission[]>(environment.SERVER_URL, { api_name, ids }, { observe: "body" });
    }

    changeStatusPermission(ids: string[], status: 0 | 1){
        const api_name: string = "permission:update-status";
        return this.http.post<Permission[]>(environment.SERVER_URL, { api_name, ids, status }, { observe: "body" });
    }

    getPermission(id: string){
        const api_name: string = "permission:get-one";
        return this.http.post<Permission>(environment.SERVER_URL, { api_name, id }, { observe: "body" });
    }

    getModuleActionsPermission(_id: string, page: number = 0, size: number = CONSTS.page_size){
        const api_name: string = "permission:get-moduleactions-by-permission";
        return this.http.post<{results: ModuleAction[], total: number}>(environment.SERVER_URL, { api_name, _id, page, size }, { observe: "body" });
    }

    getActionsOnModule(module: string){
        const api_name: string = "permission:get-actions-by-module";
        return this.http.post<{actions: Action[]}>(environment.SERVER_URL, { api_name, path: module }, { observe: "body" });
    }
    
}